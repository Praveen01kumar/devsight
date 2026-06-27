/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal } from '@angular/core';
import * as duckdb from '@duckdb/duckdb-wasm';
import { tableFromIPC, compressionRegistry, CompressionType } from 'apache-arrow';
// @ts-expect-error lz4js doesn't have official types
import * as lz4js from 'lz4js';
import { parseAvroOCF } from './avro-decoder';
import { ColumnInfo, QueryResult, TableInfo, QueryHistoryItem } from './interfaces';

// Register decompression codec for Feather/Arrow compressed files (e.g. from pyarrow/pandas)
try {
  compressionRegistry.set(CompressionType.LZ4_FRAME, {
    decode(data: Uint8Array): Uint8Array {
      return lz4js.decompress(data);
    }
  });
} catch (e) {
  console.warn('Failed to register LZ4 compression codec in Apache Arrow:', e);
}

const DUCKDB_BUNDLES = {
  mvp: {
    mainModule: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/dist/duckdb-mvp.wasm',
    mainWorker: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/dist/duckdb-browser-mvp.worker.js',
  },
  eh: {
    mainModule: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/dist/duckdb-eh.wasm',
    mainWorker: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/dist/duckdb-browser-eh.worker.js',
  },
};

@Injectable({
  providedIn: 'root',
})
export class DuckDbService {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;

  isInitialized = signal<boolean>(false);
  isInitializing = signal<boolean>(false);
  error = signal<string | null>(null);
  tables = signal<TableInfo[]>([]);
  queryHistory = signal<QueryHistoryItem[]>([]);
  activeQueriesCount = signal<number>(0);

  constructor() {
    this.loadHistoryFromStorage();
  }

  async init(): Promise<void> {
    if (this.isInitialized() || this.isInitializing()) return;

    this.isInitializing.set(true);
    this.error.set(null);

    try {
      // 1. Select the bundle
      const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
      
      // 2. Setup cross-origin worker proxy
      const workerCode = `importScripts("${bundle.mainWorker}");`;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      // 3. Instantiate DuckDB
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      this.db = db;
      this.conn = await db.connect();
      
      // Enable auto-install and auto-load of extensions (e.g. json, parquet) from DuckDB CDN
      try {
        await this.conn.query(`
          SET autoinstall_known_extensions=1;
          SET autoload_known_extensions=1;
        `);
      } catch (e) {
        console.warn('Failed to configure autoloading of extensions on connection:', e);
      }
      
      this.isInitialized.set(true);
      this.isInitializing.set(false);
      
      // Refresh tables (should be empty initially)
      await this.refreshTables();
    } catch (err: unknown) {
      console.error('Failed to initialize DuckDB:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      this.error.set(errMsg || 'Failed to initialize DuckDB in browser.');
      this.isInitializing.set(false);
    }
  }

  async runQuery(sql: string): Promise<QueryResult> {
    if (!this.conn) {
      throw new Error('DuckDB is not initialized yet. Please wait.');
    }

    const startTime = performance.now();
    this.activeQueriesCount.update((c) => c + 1);

    try {
      const resultTable = await this.conn.query(sql);
      const duration = performance.now() - startTime;
      
      const columns = resultTable.schema.fields.map((f) => f.name);
      const rows: Record<string, unknown>[] = [];

      for (let i = 0; i < resultTable.numRows; i++) {
        const row = resultTable.get(i);
        if (!row) continue;

        const plainRow: Record<string, unknown> = {};
        for (const col of columns) {
          let val = row[col];
          // Process special data types
          if (typeof val === 'bigint') {
            // Safe convert to Number if it fits, else String
            val = val <= BigInt(Number.MAX_SAFE_INTEGER) && val >= BigInt(Number.MIN_SAFE_INTEGER)
              ? Number(val)
              : val.toString();
          } else if (val instanceof Uint8Array) {
            val = `[Binary: ${val.length} bytes]`;
          } else if (val !== null && typeof val === 'object' && val.constructor?.name === 'Date') {
            val = (val as Date).toISOString();
          } else if (val !== null && typeof val === 'object') {
            // General custom object stringification
            try {
              val = JSON.stringify(val);
            } catch {
              val = String(val);
            }
          }
          plainRow[col] = val;
        }
        rows.push(plainRow);
      }

      const queryResult: QueryResult = {
        columns,
        rows,
        duration,
        rowsCount: resultTable.numRows,
      };

      // Add to query history (exclude standard checks/metadata queries)
      const lowerSql = sql.trim().toLowerCase();
      if (!lowerSql.startsWith('describe ') && 
          !lowerSql.startsWith('show ') && 
          !lowerSql.startsWith('select * from pg_tables') && 
          !lowerSql.includes('duckdb_tables') &&
          !lowerSql.includes('duckdb_columns')) {
        this.addHistoryItem(sql, duration, resultTable.numRows);
      }

      // Check if schemas were modified, refresh table list
      await this.refreshTables();

      return queryResult;
    } catch (err: unknown) {
      // Refresh tables just in case a table was partially dropped/renamed
      await this.refreshTables();
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(errMsg || 'Database error occurred during query execution.');
    } finally {
      this.activeQueriesCount.update((c) => Math.max(0, c - 1));
    }
  }

  async importFile(file: File): Promise<TableInfo> {
    if (!this.db || !this.conn) {
      throw new Error('DuckDB is not initialized. Please wait.');
    }

    const tableName = this.sanitizeTableName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a copy of the array buffer for DuckDB registration, because
    // registerFileBuffer transfers the underlying buffer to the DuckDB-Wasm worker,
    // which detaches it in the main thread.
    const fileBytesForDuckDB = new Uint8Array(arrayBuffer.slice(0));
    await this.db.registerFileBuffer(file.name, fileBytesForDuckDB);

    // Keep the original buffer intact for Arrow parsing on the main thread
    const fileBytesForArrow = new Uint8Array(arrayBuffer);

    // Formulate a query depending on the extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    let query = '';
    const startTime = performance.now();

    if (ext === 'arrow' || ext === 'feather') {
      try {
        const arrowTable = tableFromIPC(fileBytesForArrow);
        await this.conn.insertArrowTable(arrowTable as any, { name: tableName });
      } catch (err) {
        console.warn(`JS arrow parsing failed for ${file.name}, trying native DuckDB read_ipc:`, err);
        try {
          // Fallback to DuckDB native read_ipc using virtual filesystem
          await this.conn.query(`CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_ipc('${file.name}')`);
        } catch (ipcErr) {
          console.warn(`read_ipc failed for ${file.name}, trying generic SELECT:`, ipcErr);
          try {
            // Generic select fallback
            await this.conn.query(`CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM '${file.name}'`);
          } catch (genericErr) {
            throw new Error(`Failed to import ${file.name}. JS error: ${(err as Error).message}. Native read_ipc error: ${(ipcErr as Error).message}. Generic select error: ${(genericErr as Error).message}`);
          }
        }
      }
    } else {
      if (ext === 'parquet' || ext === 'pq') {
        query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_parquet('${file.name}')`;
        await this.conn.query(query);
      } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${file.name}')`;
        await this.conn.query(query);
      } else if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson') {
        query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${file.name}')`;
        await this.conn.query(query);
      } else if (ext === 'avro') {
        try {
          const records = parseAvroOCF(arrayBuffer);
          if (records.length === 0) {
            throw new Error('Avro file contains no records.');
          }
          const tempJsonName = `_temp_${tableName}_avro.json`;
          const jsonContent = JSON.stringify(records);
          await this.db.registerFileBuffer(tempJsonName, new TextEncoder().encode(jsonContent));
          query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${tempJsonName}')`;
          await this.conn.query(query);
          try {
            await this.db.registerFileBuffer(tempJsonName, new Uint8Array(0));
          } catch (cleanupErr) {
            console.warn('Failed to clean up temporary Avro JSON file:', cleanupErr);
          }
        } catch (err) {
          console.warn(`JS Avro parsing failed for ${file.name}, trying native read_avro:`, err);
          try {
            query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_avro('${file.name}')`;
            await this.conn.query(query);
          } catch (nativeErr) {
            throw new Error(`Failed to import Avro file ${file.name}. JS error: ${(err as Error).message}. Native read_avro error: ${(nativeErr as Error).message}`);
          }
        }
      } else if (ext === 'orc') {
        try {
          query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_orc('${file.name}')`;
          await this.conn.query(query);
        } catch (err) {
          console.warn(`Native read_orc failed for ${file.name}, trying generic SELECT:`, err);
          try {
            query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM '${file.name}'`;
            await this.conn.query(query);
          } catch (genericErr) {
            throw new Error(`Failed to import ORC file ${file.name}. Native read_orc error: ${(err as Error).message}. Generic select error: ${(genericErr as Error).message}`);
          }
        }
      } else {
        // Default auto-detect
        query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM '${file.name}'`;
        await this.conn.query(query);
      }
    }
    const importDuration = performance.now() - startTime;

    console.log(`Imported ${file.name} as table "${tableName}" in ${importDuration.toFixed(1)}ms`);

    // Get imported table details
    const countRes = await this.conn.query(`SELECT COUNT(*)::BIGINT as cnt FROM "${tableName}"`);
    const numRows = Number(countRes.get(0)?.['cnt'] || 0);

    const colsRes = await this.conn.query(`DESCRIBE "${tableName}"`);
    const numCols = colsRes.numRows;

    await this.refreshTables();

    return {
      name: tableName,
      rows: numRows,
      columns: numCols,
      createdTime: Date.now(),
    };
  }

  async getSchema(tableName: string): Promise<ColumnInfo[]> {
    if (!this.conn) return [];
    try {
      const res = await this.conn.query(`DESCRIBE "${tableName}"`);
      const cols: ColumnInfo[] = [];
      for (let i = 0; i < res.numRows; i++) {
        const row = res.get(i);
        if (!row) continue;

        // DuckDB describe yields: column_name, column_type, null, key, default, extra
        cols.push({
          name: String(row['column_name']),
          type: String(row['column_type']),
          nullable: String(row['null']) === 'YES',
          unique: false,
          primaryKey: String(row['key']) === 'PRI',
        });
      }

      // Try fetching basic column statistics in parallel safely
      for (const col of cols) {
        try {
          const statsRes = await this.conn.query(
            `SELECT 
              MIN("${col.name}")::VARCHAR as min_val, 
              MAX("${col.name}")::VARCHAR as max_val,
              COUNT(*)::BIGINT - COUNT("${col.name}")::BIGINT as null_cnt
             FROM "${tableName}"`
          );
          if (statsRes.numRows > 0) {
            const stats = statsRes.get(0);
            if (stats) {
              col.min = stats['min_val'];
              col.max = stats['max_val'];
              col.nullCount = Number(stats['null_cnt'] || 0);
            }
          }
        } catch {
          // Ignore statistics errors (e.g. for complex columns)
        }
      }

      return cols;
    } catch (err) {
      console.error(`Failed to get schema for ${tableName}:`, err);
      return [];
    }
  }

  async refreshTables(): Promise<void> {
    if (!this.conn) return;

    try {
      const res = await this.conn.query(`
        SELECT 
          table_name
        FROM information_schema.tables 
        WHERE table_schema = 'main'
      `);

      const tablesList: TableInfo[] = [];
      for (let i = 0; i < res.numRows; i++) {
        const row = res.get(i);
        if (!row) continue;
        const name = String(row['table_name']);

        // Get exact counts
        let exactRows = 0;
        let numCols = 0;
        try {
          const countRes = await this.conn.query(`SELECT COUNT(*)::BIGINT as cnt FROM "${name}"`);
          exactRows = Number(countRes.get(0)?.['cnt'] || 0);

          const colCountRes = await this.conn.query(`SELECT COUNT(*)::BIGINT as cnt FROM information_schema.columns WHERE table_name = '${name}'`);
          numCols = Number(colCountRes.get(0)?.['cnt'] || 0);
        } catch {
          exactRows = 0;
        }

        tablesList.push({
          name,
          rows: exactRows,
          columns: numCols,
          createdTime: Date.now(),
        });
      }

      this.tables.set(tablesList);
    } catch (err) {
      console.error('Failed to refresh tables:', err);
    }
  }

  async removeTable(tableName: string): Promise<void> {
    if (!this.conn) return;
    await this.conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await this.refreshTables();
  }

  async renameTable(oldName: string, newName: string): Promise<void> {
    if (!this.conn) return;
    const sanitized = this.sanitizeTableName(newName);
    if (!sanitized) throw new Error('Invalid table name');
    await this.conn.query(`ALTER TABLE "${oldName}" RENAME TO "${sanitized}"`);
    await this.refreshTables();
  }

  async exportToBuffer(sql: string, format: 'csv' | 'json' | 'parquet'): Promise<{ buffer: Uint8Array; fileName: string }> {
    if (!this.db || !this.conn) {
      throw new Error('DuckDB is not initialized.');
    }

    const tempFile = `export_${Date.now()}.${format}`;
    let copySql = '';

    if (format === 'parquet') {
      copySql = `COPY (${sql}) TO '${tempFile}' (FORMAT PARQUET, COMPRESSION GZIP)`;
    } else if (format === 'csv') {
      copySql = `COPY (${sql}) TO '${tempFile}' (FORMAT CSV, HEADER)`;
    } else {
      copySql = `COPY (${sql}) TO '${tempFile}' (FORMAT JSON)`;
    }

    await this.conn.query(copySql);
    const buffer = await this.db.copyFileToBuffer(tempFile);
    
    // Clean up virtual file system after copy
    try {
      await this.db.dropFile(tempFile);
    } catch {
      // Ignore cleanup error
    }

    return {
      buffer,
      fileName: tempFile,
    };
  }

  async loadDemo(type: 'sales' | 'users' | 'events' | 'flights'): Promise<TableInfo> {
    if (!this.conn) {
      await this.init();
    }

    let sql = '';
    if (type === 'sales') {
      sql = `
        DROP TABLE IF EXISTS sales;
        CREATE TABLE sales AS
        SELECT
          (10001 + i)::VARCHAR as "Order ID",
          (CURRENT_DATE - i * INTERVAL '2 hours')::DATE as "Order Date",
          CASE (i % 8)
            WHEN 0 THEN 'John Doe'
            WHEN 1 THEN 'Jane Smith'
            WHEN 2 THEN 'Alice Johnson'
            WHEN 3 THEN 'Bob Brown'
            WHEN 4 THEN 'Charlie Green'
            WHEN 5 THEN 'David Miller'
            WHEN 6 THEN 'Emily Davis'
            ELSE 'Frank Wilson'
          END as "Customer Name",
          CASE (i % 3)
            WHEN 0 THEN 'Technology'
            WHEN 1 THEN 'Furniture'
            ELSE 'Office Supplies'
          END as "Category",
          CASE (i % 10)
            WHEN 0 THEN 'MacBook Pro 16'
            WHEN 1 THEN 'Office Ergonomic Chair'
            WHEN 2 THEN 'Super Notebook 120-Page'
            WHEN 3 THEN 'iPhone 15 Pro'
            WHEN 4 THEN 'Adjustable Standing Desk'
            WHEN 5 THEN 'Gel Pen Fine Point Set'
            WHEN 6 THEN 'iPad Air 256GB'
            WHEN 7 THEN 'Conference Table Solid Wood'
            WHEN 8 THEN 'Wireless Noise-Canceling Headphones'
            ELSE 'Premium Paper Pack A4'
          END as "Product",
          ROUND((10 + random() * 1500)::DECIMAL, 2) as "Sales",
          (1 + floor(random() * 5))::INT as "Quantity",
          ROUND((random() * 0.3)::DECIMAL, 2) as "Discount",
          ROUND((random() * 200 - 50)::DECIMAL, 2) as "Profit",
          CASE (i % 4)
            WHEN 0 THEN 'United States'
            WHEN 1 THEN 'United Kingdom'
            WHEN 2 THEN 'Germany'
            ELSE 'Canada'
          END as "Country"
        FROM generate_series(1, 1000) as t(i);
      `;
    } else if (type === 'users') {
      sql = `
        DROP TABLE IF EXISTS users;
        CREATE TABLE users AS
        SELECT
          (20001 + i)::VARCHAR as "User ID",
          CASE (i % 8)
            WHEN 0 THEN 'Alex Carter'
            WHEN 1 THEN 'Sophia Patel'
            WHEN 2 THEN 'Liam Chen'
            WHEN 3 THEN 'Emma Taylor'
            WHEN 4 THEN 'Noah Garcia'
            WHEN 5 THEN 'Olivia Martinez'
            WHEN 6 THEN 'Jackson Robinson'
            ELSE 'Mia Kowalski'
          END as "Name",
          LOWER(REPLACE(
            CASE (i % 8)
              WHEN 0 THEN 'Alex Carter'
              WHEN 1 THEN 'Sophia Patel'
              WHEN 2 THEN 'Liam Chen'
              WHEN 3 THEN 'Emma Taylor'
              WHEN 4 THEN 'Noah Garcia'
              WHEN 5 THEN 'Olivia Martinez'
              WHEN 6 THEN 'Jackson Robinson'
              ELSE 'Mia Kowalski'
            END, ' ', '.')) || i || '@example.com' as "Email",
          (18 + floor(random() * 60))::INT as "Age",
          CASE (i % 2) WHEN 0 THEN 'Male' ELSE 'Female' END as "Gender",
          CASE (i % 5)
            WHEN 0 THEN 'USA'
            WHEN 1 THEN 'Germany'
            WHEN 2 THEN 'India'
            WHEN 3 THEN 'Japan'
            ELSE 'Australia'
          END as "Country",
          (CURRENT_DATE - i * INTERVAL '6 hours')::DATE as "Joined Date",
          CASE (i % 3)
            WHEN 0 THEN 'Active'
            WHEN 1 THEN 'Pending'
            ELSE 'Inactive'
          END as "Status",
          CASE (i % 4)
            WHEN 0 THEN 'User'
            WHEN 1 THEN 'Manager'
            WHEN 2 THEN 'Admin'
            ELSE 'Contributor'
          END as "Role"
        FROM generate_series(1, 1000) as t(i);
      `;
    } else if (type === 'events') {
      sql = `
        DROP TABLE IF EXISTS events;
        CREATE TABLE events AS
        SELECT
          (30001 + i)::VARCHAR as "Event ID",
          (CURRENT_TIMESTAMP::TIMESTAMP - i * INTERVAL '5 minutes') as "Timestamp",
          (20001 + floor(random() * 100))::VARCHAR as "User ID",
          CASE (i % 5)
            WHEN 0 THEN 'page_view'
            WHEN 1 THEN 'button_click'
            WHEN 2 THEN 'add_to_cart'
            WHEN 3 THEN 'checkout'
            ELSE 'search_query'
          END as "Event Type",
          CASE (i % 4)
            WHEN 0 THEN '/home'
            WHEN 1 THEN '/products'
            WHEN 2 THEN '/cart'
            ELSE '/pricing'
          END as "Page",
          CASE (i % 3)
            WHEN 0 THEN 'Desktop'
            WHEN 1 THEN 'Mobile'
            ELSE 'Tablet'
          END as "Device",
          'session_' || floor(random() * 500) as "Session ID"
        FROM generate_series(1, 1500) as t(i);
      `;
    } else if (type === 'flights') {
      sql = `
        DROP TABLE IF EXISTS flights;
        CREATE TABLE flights AS
        SELECT
          (40001 + i)::VARCHAR as "Flight ID",
          CASE (i % 5)
            WHEN 0 THEN 'Delta Airlines'
            WHEN 1 THEN 'United Airlines'
            WHEN 2 THEN 'Lufthansa'
            WHEN 3 THEN 'Singapore Airlines'
            ELSE 'Emirates'
          END as "Airline",
          CASE (i % 4)
            WHEN 0 THEN 'JFK (New York)'
            WHEN 1 THEN 'LHR (London)'
            WHEN 2 THEN 'FRA (Frankfurt)'
            ELSE 'SFO (San Francisco)'
          END as "Origin",
          CASE (i % 4)
            WHEN 0 THEN 'LAX (Los Angeles)'
            WHEN 1 THEN 'CDG (Paris)'
            WHEN 2 THEN 'DXB (Dubai)'
            ELSE 'SIN (Singapore)'
          END as "Destination",
          (CURRENT_TIMESTAMP::TIMESTAMP + i * INTERVAL '15 minutes') as "Departure Time",
          (CURRENT_TIMESTAMP::TIMESTAMP + i * INTERVAL '15 minutes' + (2 + floor(random() * 10))::BIGINT * INTERVAL '1 hour') as "Arrival Time",
          FLOOR(random() * 180)::INT as "Delay Minutes",
          CASE
            WHEN FLOOR(random() * 180)::INT = 0 THEN 'On Time'
            WHEN FLOOR(random() * 180)::INT < 30 THEN 'Delayed'
            WHEN FLOOR(random() * 180)::INT < 120 THEN 'Severe Delay'
            ELSE 'Cancelled'
          END as "Status"
        FROM generate_series(1, 1200) as t(i);
      `;
    }

    await this.conn!.query(sql);
    await this.refreshTables();

    const t = this.tables().find((item) => item.name === type);
    return t || { name: type, rows: 1000, columns: 10, createdTime: Date.now() };
  }

  private sanitizeTableName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') // Replace spaces & special chars with underscore
      .replace(/^[^a-z]+/, '')     // Table names should start with a letter
      .replace(/_+/g, '_')         // Collapse multiple underscores
      .replace(/_$/, '');          // Remove trailing underscores
  }

  // --- QUERY HISTORY STORAGE ---
  private loadHistoryFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const hist = localStorage.getItem('duckdb_query_history');
      if (hist) {
        this.queryHistory.set(JSON.parse(hist));
      }
    } catch {
      // Fail silently
    }
  }

  private saveHistoryToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('duckdb_query_history', JSON.stringify(this.queryHistory()));
    } catch {
      // Fail silently
    }
  }

  addHistoryItem(query: string, duration: number, rowsCount: number): void {
    const newItem: QueryHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      query,
      timestamp: Date.now(),
      duration,
      rowsCount,
      isFavorite: false,
    };

    this.queryHistory.update((h) => [newItem, ...h.slice(0, 99)]);
    this.saveHistoryToStorage();
  }

  deleteHistoryItem(id: string): void {
    this.queryHistory.update((h) => h.filter((item) => item.id !== id));
    this.saveHistoryToStorage();
  }

  toggleFavoriteHistoryItem(id: string): void {
    this.queryHistory.update((h) =>
      h.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
    this.saveHistoryToStorage();
  }

  clearHistory(): void {
    this.queryHistory.set([]);
    this.saveHistoryToStorage();
  }
}
