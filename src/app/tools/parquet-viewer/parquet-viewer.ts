import { 
  ChangeDetectionStrategy, 
  Component, 
  ElementRef, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ViewChild, 
  signal, 
  computed, 
  effect, 
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import loader from '@monaco-editor/loader';
import { DuckDbService } from './services/duckdb';

import { ColumnInfo, QueryHistoryItem, QueryResult } from './services/interfaces';
import { SQL_EXAMPLES, SqlExample } from './services/sql-examples';
import { copyTextToClipboard, downloadBlob, sqlFormatter } from './services/helpers';

// Strong types for Monaco Editor to avoid explicit 'any'
interface MonacoEditor {
  getValue: () => string;
  setValue: (value: string) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
  onDidChangeModelContent: (listener: () => void) => void;
  dispose: () => void;
}

interface Monaco {
  editor: {
    create: (container: HTMLElement, options: Record<string, unknown>) => MonacoEditor;
    setTheme: (themeName: string) => void;
  };
  KeyMod: {
    CtrlCmd: number;
  };
  KeyCode: {
    Enter: number;
  };
  languages: {
    registerCompletionItemProvider: (languageId: string, provider: Record<string, unknown>) => void;
    registerHoverProvider: (languageId: string, provider: Record<string, unknown>) => void;
    CompletionItemKind: {
      Keyword: number;
      Class: number;
      Field: number;
    };
  };
}

interface QueryTab {
  id: string;
  name: string;
  sql: string;
}

@Component({
  selector: 'app-parquet-viewer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon],
  templateUrl: './parquet-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParquetViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  // Inject services
  duckDb = inject(DuckDbService);

  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef;

  // Monaco Editor state
  private editor: MonacoEditor | null = null;
  private monaco: Monaco | null = null;
  private tableColumnsCache: Record<string, ColumnInfo[]> = {};

  // UI state signals
  queryTabs = signal<QueryTab[]>([
    { id: '1', name: 'Query 1', sql: 'SELECT * FROM sales LIMIT 10;' }
  ]);
  activeTabId = signal<string>('1');
  
  // Selection/Focus states
  selectedTableName = signal<string>('sales');
  selectedTableSchema = signal<ColumnInfo[]>([]);
  isSchemaLoading = signal<boolean>(false);

  // Active query outcome signals
  activeResult = signal<QueryResult | null>(null);
  queryError = signal<string | null>(null);
  isQueryRunning = signal<boolean>(false);
  lastQueryExecuted = signal<string>('');

  // Native Grid search, sort, filter, and pagination
  quickSearchControl = new FormControl('');
  currentPage = signal<number>(0);
  pageSize = signal<number>(25);
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | null>(null);
  hiddenColumns = signal<Set<string>>(new Set());

  // Grid Cell selection for quick copies
  selectedCell = signal<{ rowIndex: number; columnName: string } | null>(null);

  // Drag & drop status
  isDragging = signal<boolean>(false);

  // Simple toast alert notification
  toastMessage = signal<string | null>(null);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Examples list
  sqlExamples: SqlExample[] = SQL_EXAMPLES;

  // Computed properties
  activeTab = computed(() => {
    return this.queryTabs().find((t) => t.id === this.activeTabId());
  });

  // Table statistics helper
  tableCount = computed(() => this.duckDb.tables().length);

  // Filtered and sorted rows
  processedRows = computed(() => {
    const result = this.activeResult();
    if (!result) return [];

    let rows = [...result.rows];

    // 1. Quick search filtering
    const searchVal = this.quickSearchControl.value?.trim().toLowerCase();
    if (searchVal) {
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchVal)
        )
      );
    }

    // 2. Sorting
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDir === 'asc' ? -1 : 1;
        if (strA > strB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  });

  // Paginated rows slice
  paginatedRows = computed(() => {
    const rows = this.processedRows();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return rows.slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.processedRows().length / this.pageSize());
  });

  constructor() {
    // Auto-save tabs to local storage
    effect(() => {
      const tabs = this.queryTabs();
      const activeId = this.activeTabId();
      if (typeof window !== 'undefined') {
        localStorage.setItem('duckdb_query_tabs', JSON.stringify(tabs));
        localStorage.setItem('duckdb_active_tab_id', activeId);
      }
    });
  }

  ngOnInit(): void {
    // Auto-initialize DuckDB on startup
    this.duckDb.init().then(async () => {
      // Load standard sales demo so the user has immediate data
      await this.loadDemoDataset('sales');
      // Pre-load other datasets in the background so they are available for JOINs and schema explorer immediately
      try {
        await this.duckDb.loadDemo('users');
        await this.duckDb.loadDemo('events');
        await this.duckDb.loadDemo('flights');
      } catch (err) {
        console.error('Error preloading demo tables:', err);
      }
      // Restore previously saved sessions if any
      this.restoreSession();
    });
  }

  ngAfterViewInit(): void {
    // Load Monaco Editor dynamically from CDN
    loader.init().then((monacoInstance) => {
      this.monaco = monacoInstance as unknown as Monaco;
      this.createEditor();
      this.registerSqlCompletions();
    }).catch((err) => {
      console.error('Failed to load Monaco editor:', err);
    });
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  // --- MONACO EDITOR INITIALIZATION ---
  private createEditor(): void {
    if (!this.editorContainer || !this.monaco) return;

    const active = this.activeTab();
    const initialSql = active ? active.sql : 'SELECT * FROM sales LIMIT 10;';

    this.editor = this.monaco.editor.create(this.editorContainer.nativeElement, {
      value: initialSql,
      language: 'sql',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 8 },
      tabSize: 2,
    });

    // Run query on Ctrl/Cmd + Enter
    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter, () => {
      this.runActiveQuery();
    });

    // Keep tabs SQL text synchronized on edit
    this.editor.onDidChangeModelContent(() => {
      if (this.editor) {
        const sql = this.editor.getValue();
        this.queryTabs.update((tabs) =>
          tabs.map((t) => (t.id === this.activeTabId() ? { ...t, sql } : t))
        );
      }
    });
  }

  private registerSqlCompletions(): void {
    if (!this.monaco) return;
    const monacoObj = this.monaco;

    interface MonacoSuggestion {
      label: string;
      kind: number;
      insertText: string;
      detail?: string;
      range?: unknown;
    }

    // Table & Column completion providers
    monacoObj.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: { getValueInRange: (range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }) => string }, position: { lineNumber: number; column: number }) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suggestions: MonacoSuggestion[] = [];

        // 1. Core SQL Keywords
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'JOIN', 
          'LEFT JOIN', 'INNER JOIN', 'ON', 'HAVING', 'COUNT', 'SUM', 'AVG', 
          'MIN', 'MAX', 'AS', 'WITH', 'RECURSIVE', 'PIVOT', 'UNPIVOT', 'DESCRIBE',
          'AND', 'OR', 'NOT', 'UNION', 'VALUES', 'DISTINCT', 'OVER', 'PARTITION BY'
        ];

        for (const kw of keywords) {
          suggestions.push({
            label: kw,
            kind: monacoObj.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range: undefined,
          });
        }

        // 2. Table suggestions
        const loadedTables = this.duckDb.tables();
        for (const tbl of loadedTables) {
          suggestions.push({
            label: tbl.name,
            kind: monacoObj.languages.CompletionItemKind.Class,
            insertText: tbl.name,
            detail: `Table (${tbl.rows.toLocaleString()} rows, ${tbl.columns} cols)`,
            range: undefined,
          });
        }

        // 3. Column suggestions based on "tablename." syntax
        const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
        if (match) {
          const tableName = match[1].toLowerCase();
          const cachedCols = this.tableColumnsCache[tableName];
          if (cachedCols) {
            for (const col of cachedCols) {
              suggestions.push({
                label: col.name,
                kind: monacoObj.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `${col.type} (from ${tableName})`,
                range: undefined,
              });
            }
          }
        } else {
          // General column matching
          for (const [tblName, cols] of Object.entries(this.tableColumnsCache)) {
            for (const col of cols) {
              suggestions.push({
                label: col.name,
                kind: monacoObj.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `${col.type} (Column in ${tblName})`,
                range: undefined,
              });
            }
          }
        }

        return { suggestions };
      },
    });

    // Interactive Hover Statistics Provider
    monacoObj.languages.registerHoverProvider('sql', {
      provideHover: (model: { getWordAtPosition: (pos: { lineNumber: number; column: number }) => { word: string } | null }, position: { lineNumber: number; column: number }) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const str = word.word.toLowerCase();
        
        // Match standard tables
        const tbl = this.duckDb.tables().find((t) => t.name.toLowerCase() === str);
        if (tbl) {
          return {
            contents: [
              { value: `**Table: ${tbl.name}**` },
              { value: `*Rows:* \`${tbl.rows.toLocaleString()}\`` },
              { value: `*Columns:* \`${tbl.columns}\`` },
              { value: `*Created:* \`${new Date(tbl.createdTime).toLocaleTimeString()}\`` },
            ],
          };
        }

        // Match columns
        for (const [tblName, cols] of Object.entries(this.tableColumnsCache)) {
          const col = cols.find((c) => c.name.toLowerCase() === str);
          if (col) {
            let statsVal = `*Type:* \`${col.type}\`  \n*Nullable:* \`${col.nullable ? 'Yes' : 'No'}\``;
            if (col.min !== undefined && col.min !== null) {
              statsVal += `  \n*Range:* \`[${col.min}, ${col.max}]\`  \n*Null Count:* \`${col.nullCount}\``;
            }
            return {
              contents: [
                { value: `**Column: ${col.name}** (Table: \`${tblName}\`)` },
                { value: statsVal },
              ],
            };
          }
        }

        return null;
      },
    });
  }

  // --- QUERY MANAGEMENT & TAB SYSTEM ---
  addTab(): void {
    const nextNum = Math.max(...this.queryTabs().map((t) => parseInt(t.id, 10) || 1)) + 1;
    const newTabId = String(nextNum);
    const newTab: QueryTab = {
      id: newTabId,
      name: `Query ${newTabId}`,
      sql: 'SELECT * FROM sales LIMIT 10;',
    };

    this.queryTabs.update((tabs) => [...tabs, newTab]);
    this.selectTab(newTabId);
    this.showToast('New query tab created');
  }

  closeTab(tabId: string, event: MouseEvent): void {
    event.stopPropagation();
    const tabs = this.queryTabs();
    if (tabs.length <= 1) {
      this.showToast('Must keep at least one active query tab');
      return;
    }

    this.queryTabs.update((t) => t.filter((item) => item.id !== tabId));

    if (this.activeTabId() === tabId) {
      const remainingTabs = this.queryTabs();
      this.selectTab(remainingTabs[remainingTabs.length - 1].id);
    }
  }

  selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
    const target = this.queryTabs().find((t) => t.id === tabId);
    if (target && this.editor) {
      this.editor.setValue(target.sql);
    }
  }

  loadExampleQuery(example: SqlExample): void {
    if (this.editor) {
      this.editor.setValue(example.sql);
      this.showToast(`Loaded: ${example.title}`);
    }
  }

  formatQuery(): void {
    if (this.editor) {
      const raw = this.editor.getValue();
      const formatted = sqlFormatter(raw);
      this.editor.setValue(formatted);
      this.showToast('SQL formatted successfully');
    }
  }

  // --- RUN QUERY LOGIC ---
  async runActiveQuery(): Promise<void> {
    if (!this.editor) return;
    const sql = this.editor.getValue().trim();
    if (!sql) {
      this.queryError.set('SQL statement cannot be empty.');
      return;
    }

    this.isQueryRunning.set(true);
    this.queryError.set(null);
    this.currentPage.set(0);
    this.selectedCell.set(null);

    try {
      const result = await this.duckDb.runQuery(sql);
      this.activeResult.set(result);
      this.lastQueryExecuted.set(sql);
      this.showToast(`Query completed: ${result.rowsCount} rows returned`);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      this.queryError.set(errMsg || 'Failed to execute query.');
      this.activeResult.set(null);
    } finally {
      this.isQueryRunning.set(false);
    }
  }

  // --- FILE & DATASET UPLOADING ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.importLocalFiles(files).catch((err) => {
        console.error('File import failed:', err);
      });
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importLocalFiles(input.files).catch((err) => {
        console.error('Files selection failed:', err);
      });
    }
  }

  async importLocalFiles(files: FileList): Promise<void> {
    const count = files.length;
    let importedCount = 0;

    for (let i = 0; i < count; i++) {
      const file = files[i];
      try {
        const table = await this.duckDb.importFile(file);
        importedCount++;
        this.selectedTableName.set(table.name);
        await this.loadSchemaForTable(table.name);
        
        // Auto run initial fetch
        if (this.editor) {
          const sql = `SELECT * FROM "${table.name}" LIMIT 50;`;
          this.editor.setValue(sql);
          await this.runActiveQuery();
        }
      } catch (err: unknown) {
        console.error(`Error importing ${file.name}:`, err);
        const errMsg = err instanceof Error ? err.message : String(err);
        this.showToast(`Error importing ${file.name}: ${errMsg}`);
      }
    }

    if (importedCount > 0) {
      this.showToast(`Imported ${importedCount} files successfully`);
    }
  }

  // --- DEMO LOADER ---
  async loadDemoDataset(type: 'sales' | 'users' | 'events' | 'flights'): Promise<void> {
    try {
      const table = await this.duckDb.loadDemo(type);
      this.selectedTableName.set(table.name);
      await this.loadSchemaForTable(table.name);
      
      if (this.editor) {
        this.editor.setValue(`SELECT * FROM ${table.name} LIMIT 25;`);
        await this.runActiveQuery();
      }
      this.showToast(`Demo dataset "${type}" loaded successfully`);
    } catch (err: unknown) {
      console.error(err);
      this.showToast(`Failed to load ${type} demo dataset.`);
    }
  }

  // --- SCHEMA EXPLORATION ---
  async selectAndExplorerTable(name: string): Promise<void> {
    this.selectedTableName.set(name);
    await this.loadSchemaForTable(name);
    if (this.editor) {
      this.editor.setValue(`SELECT * FROM "${name}" LIMIT 50;`);
      await this.runActiveQuery();
    }
  }

  async loadSchemaForTable(name: string): Promise<void> {
    this.isSchemaLoading.set(true);
    try {
      const schema = await this.duckDb.getSchema(name);
      this.selectedTableSchema.set(schema);
      this.tableColumnsCache[name.toLowerCase()] = schema;
    } catch (err) {
      console.error(err);
    } finally {
      this.isSchemaLoading.set(false);
    }
  }

  async dropTable(name: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (confirm(`Are you sure you want to drop the table "${name}"? This cannot be undone.`)) {
      await this.duckDb.removeTable(name);
      delete this.tableColumnsCache[name.toLowerCase()];
      this.showToast(`Table "${name}" dropped`);
      
      // Select another table if available
      const remaining = this.duckDb.tables();
      if (remaining.length > 0) {
        await this.selectAndExplorerTable(remaining[0].name);
      } else {
        this.selectedTableName.set('');
        this.selectedTableSchema.set([]);
        this.activeResult.set(null);
      }
    }
  }

  // --- RESULTS GRID UTILITIES ---
  sort(colName: string): void {
    if (this.sortColumn() === colName) {
      const currDir = this.sortDirection();
      if (currDir === 'asc') {
        this.sortDirection.set('desc');
      } else {
        this.sortColumn.set(null);
        this.sortDirection.set(null);
      }
    } else {
      this.sortColumn.set(colName);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(0);
  }

  toggleColumnVisibility(colName: string): void {
    const hidden = new Set(this.hiddenColumns());
    if (hidden.has(colName)) {
      hidden.delete(colName);
    } else {
      hidden.add(colName);
    }
    this.hiddenColumns.set(hidden);
  }

  selectCell(rowIndex: number, columnName: string): void {
    this.selectedCell.set({ rowIndex, columnName });
  }

  async copySelectedCellValue(val: unknown): Promise<void> {
    const success = await copyTextToClipboard(String(val));
    if (success) {
      this.showToast('Value copied to clipboard');
    }
  }

  async copyRowAsJson(row: Record<string, unknown>): Promise<void> {
    const success = await copyTextToClipboard(JSON.stringify(row, null, 2));
    if (success) {
      this.showToast('Row JSON copied to clipboard');
    }
  }

  async copyTableAsCsv(): Promise<void> {
    const res = this.activeResult();
    if (!res) return;

    const cols = res.columns.filter((c) => !this.hiddenColumns().has(c));
    const header = cols.join(',');
    const rows = this.processedRows().map((row) =>
      cols.map((c) => {
        const val = String(row[c] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );

    const csvContent = [header, ...rows].join('\n');
    const success = await copyTextToClipboard(csvContent);
    if (success) {
      this.showToast('Table CSV copied to clipboard');
    }
  }

  async copySchemaAsSql(): Promise<void> {
    const schema = this.selectedTableSchema();
    if (schema.length === 0) return;

    const columnsSql = schema
      .map((c) => `  "${c.name}" ${c.type}${c.nullable ? '' : ' NOT NULL'}`)
      .join(',\n');
    const sql = `CREATE TABLE ${this.selectedTableName()} (\n${columnsSql}\n);`;
    
    const success = await copyTextToClipboard(sql);
    if (success) {
      this.showToast('Schema CREATE TABLE statement copied');
    }
  }

  // --- RESULTS EXPORT ---
  async exportResults(format: 'csv' | 'json' | 'parquet'): Promise<void> {
    const sql = this.lastQueryExecuted();
    if (!sql) {
      this.showToast('No active query results to export');
      return;
    }

    try {
      this.showToast(`Formatting and exporting Parquet/CSV...`);
      const { buffer } = await this.duckDb.exportToBuffer(sql, format);
      
      const mimeTypes = {
        csv: 'text/csv',
        json: 'application/json',
        parquet: 'application/octet-stream',
      };

      downloadBlob(buffer, mimeTypes[format], `${this.selectedTableName() || 'export'}_dataset.${format}`);
      this.showToast(`Downloaded export.${format} successfully`);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      this.showToast(`Export failed: ${errMsg}`);
    }
  }

  // --- LOCAL HISTORY ACTIONS ---
  restoreSavedQuery(item: QueryHistoryItem): void {
    if (this.editor) {
      this.editor.setValue(item.query);
      this.runActiveQuery().catch((err) => {
        console.error('Active query run failed:', err);
      });
      this.showToast('Query restored from history');
    }
  }

  // --- PAGINATION HELPERS TO AVOID ARROW FUNCTIONS IN TEMPLATES ---
  prevPage(): void {
    this.currentPage.update((c) => Math.max(0, c - 1));
  }

  nextPage(): void {
    this.currentPage.update((c) => Math.min(this.totalPages() - 1, c + 1));
  }

  goToFirstPage(): void {
    this.currentPage.set(0);
  }

  goToLastPage(): void {
    this.currentPage.set(Math.max(0, this.totalPages() - 1));
  }

  onPageSizeChange(size: string): void {
    this.pageSize.set(parseInt(size, 10));
    this.currentPage.set(0);
  }

  // --- GENERAL STORAGE SESSIONS ---
  private restoreSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedTabs = localStorage.getItem('duckdb_query_tabs');
      const savedActiveId = localStorage.getItem('duckdb_active_tab_id');
      if (savedTabs) {
        this.queryTabs.set(JSON.parse(savedTabs));
      }
      if (savedActiveId) {
        this.activeTabId.set(savedActiveId);
        // Timeout to ensure monaco is fully ready
        setTimeout(() => {
          const active = this.activeTab();
          if (active && this.editor) {
            this.editor.setValue(active.sql);
          }
        }, 300);
      }
    } catch {
      // Fail silently
    }
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(message: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(message);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 2500);
  }

  // Help Template find safe Math operations
  get Math(): typeof Math {
    return Math;
  }

  // Help Template find safe parsing
  parseInt(val: string): number {
    return parseInt(val, 10);
  }
}
