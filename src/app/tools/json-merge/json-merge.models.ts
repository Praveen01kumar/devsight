export const DEFAULT_MERGE_OPTIONS: MergeOptions = {
  mode: 'deep',
  conflictResolution: 'takeLast',
  arrayMerge: 'concat',
  overwriteKeys: true,
  strictValidation: false,
  sortKeys: false
};

export const INITIAL_STATISTICS: MergeStatistics = {
  filesLoaded: 0,
  mergedSize: 0,
  objectsCount: 0,
  arraysCount: 0,
  propertiesCount: 0,
  mergeDuration: 0,
  memoryEstimate: 0,
  largestFile: null,
  smallestFile: null,
  maxDepth: 0
};

export const SAMPLE_JSONS: Record<string, string> = {
  userProfile: `{
  "id": "user_101",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "active": true,
  "roles": ["developer", "reviewer"],
  "metadata": {
    "theme": "dark",
    "notifications": true
  }
}`,
  userPreferences: `{
  "id": "user_101",
  "email": "jane.doe@work.com",
  "roles": ["admin"],
  "metadata": {
    "notifications": false,
    "lastLogin": "2026-06-25T12:00:00Z"
  },
  "settings": {
    "fontSize": 14,
    "compact": true
  }
}`
};
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue; }
export type JSONArray = JSONValue[];

export interface JSONConflict {
  id: string;
  path: string; // e.g., "root.metadata.theme"
  key: string;  // e.g., "theme"
  valA: JSONValue;
  valB: JSONValue;
  fileAName: string;
  fileBName: string;
}

export type MergeMode = 'deep' | 'shallow' | 'recursive' | 'smart';
export type ConflictResolution = 'takeFirst' | 'takeLast' | 'askUser' | 'keepBoth' | 'renameDuplicate';
export type ArrayMergeStrategy = 'append' | 'index' | 'unique' | 'concat';

export interface MergeOptions {
  mode: MergeMode;
  conflictResolution: ConflictResolution;
  arrayMerge: ArrayMergeStrategy;
  overwriteKeys: boolean;
  strictValidation: boolean;
  sortKeys: boolean;
}

export interface JSONValidationResult {
  isValid: boolean;
  error: string | null;
  warning: string | null;
  duplicateKeys: string[];
  objectCount: number;
  arrayCount: number;
  keysCount: number;
  depth: number;
  linesCount: number;
  charsCount: number;
}

export interface MergeInputFile {
  id: string;
  name: string;
  content: string;
  fileSize: number;
  isLargeFile: boolean; // > 100MB
  isValid: boolean;
  error: string | null;
  warning: string | null;
  duplicateKeys: string[];
  objectCount: number;
  arrayCount: number;
  keysCount: number;
  depth: number;
  linesCount: number;
  charsCount: number;
  isReadonly: boolean;
  wordWrap: 'on' | 'off';
  isFullscreen: boolean;
}

export interface MergeLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface MergeStatistics {
  filesLoaded: number;
  mergedSize: number;
  objectsCount: number;
  arraysCount: number;
  propertiesCount: number;
  mergeDuration: number; // in ms
  memoryEstimate: number; // in bytes
  largestFile: { name: string; size: number } | null;
  smallestFile: { name: string; size: number } | null;
  maxDepth: number;
}
