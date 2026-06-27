import { GeneratorField, GeneratorSchema, FieldType } from './fake-data-generator.interfaces';

// Safe XML Escape
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Convert JSON array to YAML
export function jsonToYaml(obj: unknown, indent = 0): string {
  const spacing = ' '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return ' []';
    return '\n' + obj.map(item => `${spacing}- ${jsonToYaml(item, indent + 2).trimStart()}`).join('\n');
  } else if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    const entries = Object.entries(record);
    if (entries.length === 0) return ' {}';
    const lines = entries.map(([key, val]) => {
      const cleanKey = key.includes(' ') || key.includes(':') ? `"${key}"` : key;
      if (typeof val === 'object' && val !== null) {
        return `${spacing}${cleanKey}:${jsonToYaml(val, indent + 2)}`;
      }
      const formattedVal = typeof val === 'string' ? `"${val.replace(/"/g, '\\"')}"` : val;
      return `${spacing}${cleanKey}: ${formattedVal}`;
    });
    return (indent === 0 ? '' : '\n') + lines.join('\n');
  }
  return ` ${obj}`;
}

// Convert JSON array to XML
export function jsonToXml(records: Record<string, unknown>[], rootName = 'dataset', itemName = 'record'): string {
  if (records.length === 0) return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName} />`;
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
  for (const record of records) {
    xml += `  <${itemName}>\n`;
    for (const [key, value] of Object.entries(record)) {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      if (value === null || value === undefined) {
        xml += `    <${cleanKey} xsi:nil="true" />\n`;
      } else if (typeof value === 'object') {
        xml += `    <${cleanKey}>${escapeXml(JSON.stringify(value))}</${cleanKey}>\n`;
      } else {
        xml += `    <${cleanKey}>${escapeXml(String(value))}</${cleanKey}>\n`;
      }
    }
    xml += `  </${itemName}>\n`;
  }
  xml += `</${rootName}>`;
  return xml;
}

// Convert JSON array to CSV/TSV
export function jsonToCsv(records: Record<string, unknown>[], separator = ','): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const csvLines = [headers.join(separator)];

  for (const record of records) {
    const line = headers.map(header => {
      let val = record[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') val = JSON.stringify(val);
      const strVal = String(val).replace(/"/g, '""');
      if (strVal.includes(separator) || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal}"`;
      }
      return strVal;
    });
    csvLines.push(line.join(separator));
  }
  return csvLines.join('\n');
}

// Convert JSON array to SQL INSERTS
export function jsonToSql(
  records: Record<string, unknown>[],
  tableName = 'mock_table',
  dialect: 'PostgreSQL' | 'MySQL' | 'SQLite' = 'PostgreSQL'
): string {
  if (records.length === 0) return '-- No data generated';
  const headers = Object.keys(records[0]);
  const quotedHeaders = headers.map(h => dialect === 'MySQL' ? `\`${h}\`` : `"${h}"`).join(', ');

  let sql = `-- Fake Data Generator Studio Export\n-- Dialect: ${dialect}\n-- Table: ${tableName}\n\n`;
  for (const record of records) {
    const values = headers.map(header => {
      const val = record[header];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'object') {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');
    sql += `INSERT INTO ${tableName} (${quotedHeaders}) VALUES (${values});\n`;
  }
  return sql;
}

// Convert JSON array to SQL UPDATE Statements
export function jsonToSqlUpdate(
  records: Record<string, unknown>[],
  tableName = 'mock_table',
  primaryKey = 'id',
  dialect: 'PostgreSQL' | 'MySQL' | 'SQLite' = 'PostgreSQL'
): string {
  if (records.length === 0) return '-- No data generated';
  const headers = Object.keys(records[0]);
  const hasKey = headers.includes(primaryKey);

  let sql = `-- SQL Update Statements\n-- Table: ${tableName}\n\n`;
  for (const record of records) {
    const setClause = headers
      .filter(h => h !== primaryKey)
      .map(h => {
        const val = record[h];
        let formattedVal = 'NULL';
        if (val !== null && val !== undefined) {
          if (typeof val === 'boolean') formattedVal = val ? 'TRUE' : 'FALSE';
          else if (typeof val === 'number') formattedVal = String(val);
          else if (typeof val === 'object') formattedVal = `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          else formattedVal = `'${String(val).replace(/'/g, "''")}'`;
        }
        const col = dialect === 'MySQL' ? `\`${h}\`` : `"${h}"`;
        return `${col} = ${formattedVal}`;
      })
      .join(', ');

    const keyVal = hasKey ? record[primaryKey] : '1';
    const formattedKeyVal = typeof keyVal === 'number' ? String(keyVal) : `'${String(keyVal).replace(/'/g, "''")}'`;
    const pkCol = dialect === 'MySQL' ? `\`${primaryKey}\`` : `"${primaryKey}"`;

    sql += `UPDATE ${tableName} SET ${setClause} WHERE ${pkCol} = ${formattedKeyVal};\n`;
  }
  return sql;
}

// Convert JSON array to MongoDB insert script
export function jsonToMongo(records: Record<string, unknown>[], collectionName = 'mock_collection'): string {
  return `// MongoDB Shell Script\n// Collection: ${collectionName}\n\ndb.${collectionName}.insertMany([\n` +
    records.map(r => '  ' + JSON.stringify(r)).join(',\n') +
    '\n]);';
}

// Generate Parquet/Arrow metadata descriptors
export function jsonToParquetSchema(fields: GeneratorField[]): string {
  let schema = `// Apache Parquet Schema Description\n`;
  schema += `message Schema {\n`;
  for (const field of fields) {
    let parquetType = 'required binary';
    if (field.nullable) parquetType = 'optional binary';

    switch (field.type) {
      case 'Integer':
      case 'Number':
        parquetType = field.nullable ? 'optional int64' : 'required int64';
        break;
      case 'Boolean':
        parquetType = field.nullable ? 'optional boolean' : 'required boolean';
        break;
      case 'Timestamp':
        parquetType = field.nullable ? 'optional int96' : 'required int96';
        break;
    }
    schema += `  ${parquetType} ${field.name}; // Type: ${field.type}\n`;
  }
  schema += `}\n\n`;
  schema += `/* Binary Parquet Byte Stream Simulation */\n`;
  schema += `[PARQUET_MAGIC_HEADER_4BYTES]\n`;
  schema += `[Metadata block describing column chunks & compression stats]\n`;
  schema += `[Record count: ${fields.length * 10} records compressed dynamically]\n`;
  return schema;
}

export function jsonToArrowIpcSchema(fields: GeneratorField[]): string {
  let schema = `// Apache Arrow Schema Definition (JSON representation)\n{\n`;
  schema += `  "schema": {\n    "fields": [\n`;
  schema += fields.map(field => {
    let arrowType = 'STRING';
    if (field.type === 'Integer') arrowType = 'INT64';
    else if (field.type === 'Number') arrowType = 'DOUBLE';
    else if (field.type === 'Boolean') arrowType = 'BOOL';
    return `      {\n        "name": "${field.name}",\n        "type": "${arrowType}",\n        "nullable": ${field.nullable}\n      }`;
  }).join(',\n');
  schema += `\n    ]\n  }\n}\n`;
  return schema;
}

// Custom Expression Engine
export function evaluateExpression(expr: string, context: Record<string, unknown>): unknown {
  try {
    let processed = expr;
    // Simple custom function mappings: lower(x) -> (x).toLowerCase()
    processed = processed.replace(/lower\(([^)]+)\)/g, (_, group) => {
      return `(${group}).toLowerCase()`;
    });
    processed = processed.replace(/upper\(([^)]+)\)/g, (_, group) => {
      return `(${group}).toUpperCase()`;
    });
    processed = processed.replace(/today\(\)/g, 'new Date().toISOString()');

    // Create execution scope
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${processed});`);
    return fn(...values);
  } catch (err) {
    return `[Expression Error: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

// Generate TS Interfaces
export function generateTsInterface(fields: GeneratorField[], interfaceName = 'GeneratedData'): string {
  let output = `export interface ${interfaceName} {\n`;
  for (const f of fields) {
    const isNullable = f.nullable ? ' | null' : '';
    const isOptional = f.required ? '' : '?';
    let tsType = 'string';

    if (f.type === 'Integer' || f.type === 'Number' || f.type === 'Price' || f.type === 'CVV') tsType = 'number';
    else if (f.type === 'Boolean') tsType = 'boolean';
    else if (f.type === 'Object') tsType = 'Record<string, unknown>';
    else if (f.type === 'Array') tsType = 'unknown[]';
    else if (f.type === 'JSON') tsType = 'unknown';

    output += `  /** ${f.description || f.name} */\n`;
    output += `  ${f.name}${isOptional}: ${tsType}${isNullable};\n`;
  }
  output += `}\n`;
  return output;
}

// Generate OpenAPI responses
export function generateOpenApiSpec(fields: GeneratorField[], typeName = 'MockResponse'): string {
  const properties: Record<string, unknown> = {};
  const requiredList: string[] = [];

  for (const f of fields) {
    if (f.required) requiredList.push(f.name);

    let oType = 'string';
    let format = undefined;

    if (f.type === 'Integer') {
      oType = 'integer';
      format = 'int64';
    } else if (f.type === 'Number' || f.type === 'Price') {
      oType = 'number';
      format = 'double';
    } else if (f.type === 'Boolean') {
      oType = 'boolean';
    } else if (f.type === 'UUID') {
      oType = 'string';
      format = 'uuid';
    } else if (f.type === 'Date' || f.type === 'DateTime') {
      oType = 'string';
      format = 'date-time';
    } else if (f.type === 'Object') {
      oType = 'object';
    } else if (f.type === 'Array') {
      oType = 'array';
    }

    properties[f.name] = {
      type: oType,
      description: f.description || undefined,
      nullable: f.nullable || undefined,
      format,
    };
  }

  const spec = {
    components: {
      schemas: {
        [typeName]: {
          type: 'object',
          required: requiredList.length > 0 ? requiredList : undefined,
          properties,
        },
      },
    },
  };

  return JSON.stringify(spec, null, 2);
}

// Generate SQL CREATE TABLE Statement
export function generateSqlCreateTable(
  fields: GeneratorField[],
  tableName = 'mock_table',
  dialect: 'PostgreSQL' | 'MySQL' | 'SQLite' = 'PostgreSQL'
): string {
  let sql = `CREATE TABLE ${tableName} (\n`;
  const items = fields.map(f => {
    let sqlType = 'VARCHAR(255)';
    if (f.type === 'UUID') sqlType = dialect === 'PostgreSQL' ? 'UUID' : 'VARCHAR(36)';
    else if (f.type === 'Integer') sqlType = 'BIGINT';
    else if (f.type === 'Number' || f.type === 'Price') sqlType = 'DOUBLE PRECISION';
    else if (f.type === 'Boolean') sqlType = 'BOOLEAN';
    else if (f.type === 'DateTime' || f.type === 'Timestamp') sqlType = 'TIMESTAMP';
    else if (f.type === 'Object' || f.type === 'JSON') sqlType = dialect === 'PostgreSQL' ? 'JSONB' : 'TEXT';

    const nullability = f.nullable ? 'NULL' : 'NOT NULL';
    const primary = f.name === 'id' || f.name === 'orderId' || f.name === 'deviceId' ? ' PRIMARY KEY' : '';
    return `  ${dialect === 'MySQL' ? `\`${f.name}\`` : `"${f.name}"`} ${sqlType} ${nullability}${primary}`;
  });
  sql += items.join(',\n') + '\n);';
  return sql;
}

// Generate GraphQL schema
export function generateGraphQlSchema(fields: GeneratorField[], typeName = 'MockData'): string {
  let gql = `type ${typeName} {\n`;
  for (const f of fields) {
    let gqlType = 'String';
    if (f.type === 'Integer') gqlType = 'Int';
    else if (f.type === 'Number' || f.type === 'Price') gqlType = 'Float';
    else if (f.type === 'Boolean') gqlType = 'Boolean';
    else if (f.type === 'UUID') gqlType = 'ID';

    const bang = f.required ? '!' : '';
    gql += `  ${f.name}: ${gqlType}${bang}\n`;
  }
  gql += `}\n\n`;
  gql += `type Query {\n`;
  gql += `  get${typeName}s(limit: Int): [${typeName}!]\n`;
  gql += `}\n`;
  return gql;
}

// Generate Excel compatible Spreadsheet XML Spreadsheet 2003 format
export function jsonToExcelXml(records: Record<string, unknown>[]): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);

  let xml = `<?xml version="1.0"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`;
  xml += ` <Worksheet ss:Name="Sheet1">\n`;
  xml += `  <Table>\n`;

  // Headers
  xml += `   <Row>\n`;
  for (const h of headers) {
    xml += `    <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  // Rows
  for (const r of records) {
    xml += `   <Row>\n`;
    for (const h of headers) {
      const val = r[h];
      if (val === null || val === undefined) {
        xml += `    <Cell><Data ss:Type="String"></Data></Cell>\n`;
      } else if (typeof val === 'number') {
        xml += `    <Cell><Data ss:Type="Number">${val}</Data></Cell>\n`;
      } else if (typeof val === 'boolean') {
        xml += `    <Cell><Data ss:Type="Boolean">${val ? 1 : 0}</Data></Cell>\n`;
      } else {
        xml += `    <Cell><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>\n`;
      }
    }
    xml += `   </Row>\n`;
  }

  xml += `  </Table>\n`;
  xml += ` </Worksheet>\n`;
  xml += `</Workbook>\n`;
  return xml;
}

// Rule-based and keyword matcher for fast field recommendations
export function suggestFieldPropertiesByName(name: string): { type: FieldType; description: string } {
  const clean = name.toLowerCase().trim();
  if (clean.includes('id')) return { type: 'UUID', description: 'Unique hardware or system ID' };
  if (clean.includes('email')) return { type: 'Email', description: 'User personal or contact email' };
  if (clean.includes('username') || clean.includes('user_name') || clean.includes('handle')) return { type: 'Username', description: 'Unique user profile name' };
  if (clean.includes('password') || clean.includes('pwd')) return { type: 'Password', description: 'Secure user login credential simulation' };
  if (clean.includes('phone') || clean.includes('tel') || clean.includes('mobile')) return { type: 'Phone', description: 'Standard formatted phone contact' };
  if (clean.includes('country')) return { type: 'Country', description: 'Name of country' };
  if (clean.includes('state') || clean.includes('region')) return { type: 'State', description: 'State or administrative area' };
  if (clean.includes('city') || clean.includes('town')) return { type: 'City', description: 'City name' };
  if (clean.includes('street')) return { type: 'Street', description: 'Fulfillment street coordinate' };
  if (clean.includes('postal') || clean.includes('zip') || clean.includes('postcode')) return { type: 'Postal Code', description: 'Postal area key code' };
  if (clean.includes('lat')) return { type: 'Latitude', description: 'Geographical latitude coordinate' };
  if (clean.includes('lng') || clean.includes('lon') || clean.includes('longitude')) return { type: 'Longitude', description: 'Geographical longitude coordinate' };
  if (clean.includes('company') || clean.includes('corp') || clean.includes('firm')) return { type: 'Company', description: 'Enterprise company name' };
  if (clean.includes('department') || clean.includes('dept')) return { type: 'Department', description: 'Internal operations department' };
  if (clean.includes('job') || clean.includes('title')) return { type: 'Job Title', description: 'Professional designation' };
  if (clean.includes('price') || clean.includes('cost') || clean.includes('amount') || clean.includes('salary')) return { type: 'Price', description: 'Localized financial price' };
  if (clean.includes('avatar') || clean.includes('pic')) return { type: 'Avatar URL', description: 'Profile placeholder avatar URL' };
  if (clean.includes('url') || clean.includes('link') || clean.includes('website')) return { type: 'URL', description: 'Qualified web resources address' };
  if (clean.includes('domain')) return { type: 'Domain', description: 'Active web domain' };
  if (clean.includes('ip') || clean.includes('ipv4')) return { type: 'IPv4', description: 'IP version 4 gateway address' };
  if (clean.includes('status')) return { type: 'Enum', description: 'Current transactional or active status' };
  if (clean.includes('date') || clean.includes('created') || clean.includes('updated')) return { type: 'DateTime', description: 'Event calendar log coordinate' };
  if (clean.includes('age') || clean.includes('count') || clean.includes('quantity') || clean.includes('qty')) return { type: 'Integer', description: 'Integer units measurement' };

  return { type: 'String', description: 'General alphanumeric text string' };
}

// Generate complete markdown documentation for the generated schema
export function generateSchemaMarkdown(schema: GeneratorSchema): string {
  let doc = `# Schema Documentation: ${schema.name || 'Dataset Schema'}\n\n`;
  doc += `Locale: **${schema.locale}** | Global Generation Seed: **${schema.seed}**\n\n`;
  doc += `## Fields Specification\n\n`;
  doc += `| Field Name | Type | Required | Nullable | Unique | Description |\n`;
  doc += `|---|---|---|---|---|---|\n`;
  for (const f of schema.fields) {
    doc += `| \`${f.name}\` | **${f.type}** | ${f.required ? '✅ Yes' : '❌ No'} | ${f.nullable ? '✅ Yes' : '❌ No'} | ${f.unique ? '✅ Yes' : '❌ No'} | ${f.description || '-'} |\n`;
  }
  if (schema.relationships.length > 0) {
    doc += `\n## Data Relationships & Foregin Keys\n\n`;
    for (const rel of schema.relationships) {
      doc += `- **${rel.name}** (\`${rel.type}\`): Reference from \`${rel.sourceField}\` to \`${rel.targetField}\`\n`;
    }
  }
  return doc;
}
