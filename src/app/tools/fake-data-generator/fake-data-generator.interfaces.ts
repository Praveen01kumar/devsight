export type FieldType =  | 'String'  | 'Number'  | 'Integer'  | 'Boolean'  | 'UUID'  | 'Email'  | 'Username'  | 'Password'  | 'Phone'  | 'Country'  | 'State'  | 'City'  | 'Street'  | 'Address'  | 'Postal Code'  | 'Latitude'  | 'Longitude'  | 'Company'  | 'Department'  | 'Job Title'  | 'Profession'  | 'Currency'  | 'IBAN'  | 'SWIFT'  | 'Credit Card'  | 'CVV'  | 'Date'  | 'Time'  | 'DateTime'  | 'Timestamp'  | 'Color'  | 'Avatar URL'  | 'Image URL'  | 'URL'  | 'Domain'  | 'IPv4'  | 'IPv6'  | 'MAC Address'  | 'Vehicle'  | 'ISBN'  | 'Product'  | 'Category'  | 'Price'  | 'Lorem'  | 'Paragraph'  | 'Sentence'  | 'HTML'  | 'Markdown'  | 'JSON'  | 'Enum'  | 'Array'  | 'Object'  | 'Custom Formula';

export interface FieldProperties {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  defaultValue?: string;
  seed?: number;
  prefix?: string;
  suffix?: string;
  pattern?: string;
  weight?: number;
  probability?: number;
  customExpression?: string;
  nullPercentage?: number; // 0, 5, 10, 25, 50 etc.
  duplicatePercentage?: number; // 0, 5, 10, 20, 50 etc.
  arrayMinLength?: number;
  arrayMaxLength?: number;
  arrayRandomLength?: boolean;
  enumValues?: string[]; // comma separated or list for Enum type
  objectFields?: GeneratorField[]; // for nested Object
  arrayItemType?: FieldType; // for nested Array items if simple
  arrayItemFields?: GeneratorField[]; // for nested Array items if object-based
  distributionType?: 'Uniform' | 'Normal' | 'Weighted' | 'Custom';
  normalMean?: number;
  normalStdDev?: number;
}

export interface GeneratorField {
  id: string;
  name: string;
  description: string;
  type: FieldType;
  required: boolean;
  nullable: boolean;
  unique: boolean;
  properties: FieldProperties;
  collapsed?: boolean;
  groupId?: string;
}

export interface DataRelationship {
  id: string;
  name: string;
  sourceField: string; // e.g. "orders.userId"
  targetField: string; // e.g. "users.id"
  type: 'OneToOne' | 'OneToMany' | 'ManyToMany';
}

export interface GeneratorSchema {
  fields: GeneratorField[];
  relationships: DataRelationship[];
  name: string;
  locale: string; // 'en' | 'in' | 'us' | 'uk' | 'de' | 'fr' | 'ca' | 'au' | 'jp' | 'br' | 'it' | 'es'
  seed: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface GeneratorStats {
  records: number;
  objectsCount: number;
  arraysCount: number;
  fieldsCount: number;
  uniqueValues: number;
  duplicates: number;
  nullValues: number;
  memoryEstimate: string;
  generationTime: number; // ms
  largestRecordSize: string;
  avgRecordSize: string;
  outputSize: string;
}

export interface GeneratorProject {
  id: string;
  name: string;
  description: string;
  schema: GeneratorSchema;
  recordsToGenerate: number;
  outputFormat: string; // 'JSON' | 'JSONL' | 'CSV' | 'TSV' | 'XML' | 'YAML' | 'SQL' | 'SQL_UPDATE' | 'MongoDB' | 'PostgreSQL' | 'MySQL' | 'SQLite' | 'Excel' | 'Parquet' | 'Arrow' | 'Feather' | 'Avro' | 'ORC'
  updatedAt: string;
}

export interface GeneratorTemplate {
  name: string;
  description: string;
  category: string;
  schema: GeneratorSchema;
  defaultRecords: number;
}
