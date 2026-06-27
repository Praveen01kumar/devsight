export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

export interface ComparisonOptions {
  ignoreWhitespace: boolean;
  ignorePropertyOrder: boolean;
  ignoreKeyCase: boolean;
  ignoreStringValueCase: boolean;
  ignoreArrayOrder: boolean;
  differencesOnly: boolean;
  ignoreEmptyLines: boolean;
  ignoreNullVsMissing: boolean;
  ignoreNumericPrecision: boolean;
  strictTypeComparison: boolean;
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  type: 'syntax' | 'duplicate_key' | 'trailing_comma' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DiffItem {
  id: number;
  path: string;
  type: 'added' | 'removed' | 'modified' | 'moved';
  oldValue: JSONValue | undefined;
  newValue: JSONValue | undefined;
  leftLineStart: number;
  leftLineEnd: number;
  rightLineStart: number;
  rightLineEnd: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface DiffNode {
  key: string;
  path: string;
  type: 'added' | 'removed' | 'modified' | 'moved' | 'none';
  children?: DiffNode[];
  diffItemId?: number;
}

export interface FileStats {
  filename: string;
  fileSize: number;
  objectsCount: number;
  arraysCount: number;
  propertiesCount: number;
  linesCount: number;
  charactersCount: number;
  validationStatus: 'valid' | 'invalid' | 'warning' | 'empty';
}

export interface ComparisonStats {
  totalDiffs: number;
  added: number;
  removed: number;
  modified: number;
  moved: number;
  equal: number;
  ignored: number;
  similarityPercentage: number;
  comparisonTime: number;
  workerTime: number;
  memoryEstimate: number;
  leftStats: FileStats;
  rightStats: FileStats;
}

export interface ComparisonResult {
  diffs: DiffItem[];
  tree: DiffNode;
  stats: ComparisonStats;
}

export interface LogMessage {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}
