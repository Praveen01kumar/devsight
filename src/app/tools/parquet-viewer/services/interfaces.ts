export interface Dataset {
  id: string;
  name: string;
  size: number;
  rows: number;
  columns: number;
  format: string;
  createdTime: number;
}

export interface TableInfo {
  name: string;
  rows: number;
  columns: number;
  createdTime: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  unique?: boolean;
  primaryKey?: boolean;
  min?: string | number | null;
  max?: string | number | null;
  nullCount?: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  duration: number; // in ms
  rowsCount: number;
  isFavorite: boolean;
  name?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  duration: number;
  rowsCount: number;
}

export interface QueryError {
  message: string;
}
