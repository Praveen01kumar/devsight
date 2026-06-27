import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { faker } from '@faker-js/faker';
import { GeneratorSchema, GeneratorField, LogEntry, GeneratorStats, GeneratorProject, FieldType } from './fake-data-generator.interfaces';
import { APP_TEMPLATES } from './fake-data-generator.models';
import { jsonToCsv, jsonToYaml, jsonToXml, jsonToSql, jsonToSqlUpdate, jsonToMongo, jsonToParquetSchema, jsonToArrowIpcSchema, generateTsInterface, generateOpenApiSpec, generateSqlCreateTable, generateGraphQlSchema, jsonToExcelXml, evaluateExpression, suggestFieldPropertiesByName } from './fake-data-generator.utils';

@Injectable({
  providedIn: 'root'
})
export class FakeDataGeneratorService {
  private readonly http = inject(HttpClient);

  // Core State Signals
  schema = signal<GeneratorSchema>({
    name: 'Untitled Schema',
    locale: 'en',
    seed: 12345,
    fields: [
      { id: 'f1', name: 'id', description: 'Unique Key', type: 'UUID', required: true, nullable: false, unique: true, properties: {} },
      { id: 'f2', name: 'firstName', description: 'First Name', type: 'String', required: true, nullable: false, unique: false, properties: { pattern: 'first_name' } },
      { id: 'f3', name: 'lastName', description: 'Last Name', type: 'String', required: true, nullable: false, unique: false, properties: { pattern: 'last_name' } },
      { id: 'f4', name: 'email', description: 'Contact Email', type: 'Email', required: true, nullable: false, unique: true, properties: {} },
      { id: 'f5', name: 'active', description: 'Account Status', type: 'Boolean', required: true, nullable: false, unique: false, properties: { probability: 0.8 } }
    ],
    relationships: []
  });

  selectedFieldId = signal<string | null>(null);
  recordsToGenerate = signal<number>(100);
  outputFormat = signal<string>('JSON'); // JSON, JSONL, CSV, TSV, XML, YAML, SQL, SQL_UPDATE, MongoDB, Excel, etc.
  tableName = signal<string>('mock_data');
  primaryKey = signal<string>('id');
  sqlDialect = signal<'PostgreSQL' | 'MySQL' | 'SQLite'>('PostgreSQL');

  // Search filter signals
  searchFilter = signal<string>('');
  fieldFilterType = signal<string>('All'); // All, Personal, Geographical, Business, Basic, Temporal, etc.

  // Undo/Redo Stacks
  private readonly undoStack: GeneratorSchema[] = [];
  private redoStack: GeneratorSchema[] = [];

  // Recent Projects State
  recentProjects = signal<GeneratorProject[]>([]);
  currentProjectName = signal<string>('New Project');
  currentProjectId = signal<string | null>(null);

  // Output Preview & Generation State
  generatedRecords = signal<Record<string, unknown>[]>([]);
  previewOutput = signal<string>('[]');
  isGenerating = signal<boolean>(false);
  generationProgress = signal<number>(0);
  cancelGenerationFlag = false;

  // Logs & Statistics Signals
  logs = signal<LogEntry[]>([]);
  stats = signal<GeneratorStats>({
    records: 0,
    objectsCount: 0,
    arraysCount: 0,
    fieldsCount: 0,
    uniqueValues: 0,
    duplicates: 0,
    nullValues: 0,
    memoryEstimate: '0 KB',
    generationTime: 0,
    largestRecordSize: '0 B',
    avgRecordSize: '0 B',
    outputSize: '0 B'
  });

  // Theme signal
  // Selected Field computed helper
  selectedField = computed(() => {
    const id = this.selectedFieldId();
    if (!id) return null;
    return this.schema().fields.find(f => f.id === id) || null;
  });

  // Schema Validation warnings and errors
  validationErrors = computed(() => {
    const s = this.schema();
    const errors: string[] = [];
    const names = new Set<string>();

    for (const f of s.fields) {
      // Check duplicate name
      if (names.has(f.name)) {
        errors.push(`Duplicate field name detected: "${f.name}". Field names must be unique.`);
      }
      names.add(f.name);

      // Check field name formats
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name)) {
        errors.push(`Invalid field name format: "${f.name}". Use alphanumeric characters starting with a letter or underscore.`);
      }

      // Check expression errors
      if (f.type === 'Custom Formula' && !f.properties.customExpression) {
        errors.push(`Custom Formula field "${f.name}" requires a valid expression.`);
      }

      // Check regex errors
      if (f.properties.regex) {
        try {
          new RegExp(f.properties.regex);
        } catch {
          errors.push(`Invalid regular expression constraint in field "${f.name}".`);
        }
      }
    }

    return errors;
  });

  constructor() {
    this.addLog('info', 'Fake Data Generator Studio successfully initialized.');
    this.loadRecentProjects();
  }

  // Schema State History (Undo / Redo)
  saveState() {
    // Deep clone schema to avoid references
    const currentClone = JSON.parse(JSON.stringify(this.schema()));
    this.undoStack.push(currentClone);
    this.redoStack = []; // Clear redo stack on action
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const previous = this.undoStack.pop()!;
    // Save current to redo stack
    this.redoStack.push(JSON.parse(JSON.stringify(this.schema())));
    this.schema.set(previous);
    this.addLog('info', 'Undid schema builder state change.');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(this.schema())));
    this.schema.set(next);
    this.addLog('info', 'Redid schema builder state change.');
  }

  // Field manipulation operations
  addField(type: FieldType = 'String', customName?: string) {
    this.saveState();
    const current = this.schema();
    const nameCount = current.fields.filter(f => f.name.startsWith('field')).length + 1;
    const fieldName = customName || `field_${nameCount}`;

    const newField: GeneratorField = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name: fieldName,
      description: `Description for ${fieldName}`,
      type,
      required: true,
      nullable: false,
      unique: false,
      properties: {}
    };

    this.schema.update(s => ({
      ...s,
      fields: [...s.fields, newField]
    }));
    this.selectedFieldId.set(newField.id);
    this.addLog('info', `Added field "${fieldName}" of type ${type}.`);
  }

  duplicateField(id: string) {
    this.saveState();
    const current = this.schema();
    const source = current.fields.find(f => f.id === id);
    if (!source) return;

    const dupName = `${source.name}_copy`;
    const duplicated: GeneratorField = JSON.parse(JSON.stringify(source));
    duplicated.id = 'f_' + Math.random().toString(36).substring(2, 9);
    duplicated.name = dupName;

    this.schema.update(s => ({
      ...s,
      fields: [...s.fields, duplicated]
    }));
    this.selectedFieldId.set(duplicated.id);
    this.addLog('success', `Duplicated field "${source.name}" to "${dupName}".`);
  }

  deleteField(id: string) {
    this.saveState();
    const fields = this.schema().fields;
    const fieldToDelete = fields.find(f => f.id === id);
    if (!fieldToDelete) return;

    this.schema.update(s => ({
      ...s,
      fields: s.fields.filter(f => f.id !== id)
    }));

    if (this.selectedFieldId() === id) {
      this.selectedFieldId.set(null);
    }
    this.addLog('warn', `Deleted field "${fieldToDelete.name}".`);
  }

  clearSchema() {
    this.saveState();
    this.schema.update(s => ({
      ...s,
      fields: []
    }));
    this.selectedFieldId.set(null);
    this.addLog('warn', 'Cleared all fields from workspace schema.');
  }

  updateFieldProperties(id: string, updatedProperties: Partial<GeneratorField>) {
    this.saveState();
    this.schema.update(s => ({
      ...s,
      fields: s.fields.map(f => (f.id === id ? { ...f, ...updatedProperties } : f))
    }));
  }

  reorderFields(fields: GeneratorField[]) {
    this.saveState();
    this.schema.update(s => ({
      ...s,
      fields: [...fields]
    }));
  }

  // Local Storage Projects Persistence
  loadRecentProjects() {
    try {
      const saved = localStorage.getItem('fdg_projects');
      if (saved) {
        this.recentProjects.set(JSON.parse(saved));
      }
    } catch {
      this.addLog('error', 'Failed to load recent projects from device storage.');
    }
  }

  saveProject(projectName: string) {
    try {
      const projects = [...this.recentProjects()];
      const existingId = this.currentProjectId();
      const projectId = existingId || Math.random().toString(36).substring(2, 9);

      const newProject: GeneratorProject = {
        id: projectId,
        name: projectName,
        description: `Fake Data Generator project: ${projectName}`,
        schema: JSON.parse(JSON.stringify(this.schema())),
        recordsToGenerate: this.recordsToGenerate(),
        outputFormat: this.outputFormat(),
        updatedAt: new Date().toISOString()
      };

      const index = projects.findIndex(p => p.id === projectId);
      if (index > -1) {
        projects[index] = newProject;
      } else {
        projects.unshift(newProject);
      }

      this.recentProjects.set(projects);
      this.currentProjectId.set(projectId);
      this.currentProjectName.set(projectName);
      localStorage.setItem('fdg_projects', JSON.stringify(projects));
      this.addLog('success', `Saved project "${projectName}" successfully.`);
    } catch {
      this.addLog('error', 'Could not persist project state to LocalStorage.');
    }
  }

  openProject(proj: GeneratorProject) {
    this.saveState();
    this.schema.set(JSON.parse(JSON.stringify(proj.schema)));
    this.recordsToGenerate.set(proj.recordsToGenerate);
    this.outputFormat.set(proj.outputFormat);
    this.currentProjectId.set(proj.id);
    this.currentProjectName.set(proj.name);
    this.addLog('success', `Loaded project "${proj.name}" into workspace.`);
  }

  deleteProject(projectId: string) {
    try {
      const updated = this.recentProjects().filter(p => p.id !== projectId);
      this.recentProjects.set(updated);
      localStorage.setItem('fdg_projects', JSON.stringify(updated));
      if (this.currentProjectId() === projectId) {
        this.currentProjectId.set(null);
        this.currentProjectName.set('New Project');
      }
      this.addLog('info', 'Deleted saved project.');
    } catch {
      this.addLog('error', 'Failed to update projects index.');
    }
  }

  // Load predefined template
  loadTemplate(templateName: string) {
    const template = APP_TEMPLATES.find(t => t.name === templateName);
    if (!template) return;
    this.saveState();
    this.schema.set(JSON.parse(JSON.stringify(template.schema)));
    this.recordsToGenerate.set(template.defaultRecords);
    this.currentProjectName.set(template.name);
    this.currentProjectId.set(null);
    this.addLog('success', `Workspace reset using template "${template.name}".`);
    this.generateData(); // Auto generate on template load
  }

  // Logging
  addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    this.logs.update(l => [entry, ...l].slice(0, 50));
  }

  clearLogs() {
    this.logs.set([]);
  }

  // Formatting router based on selected output format
  getFormattedOutput(records: Record<string, unknown>[]): string {
    const format = this.outputFormat();
    const table = this.tableName();
    const pk = this.primaryKey();
    const dialect = this.sqlDialect();

    switch (format) {
      case 'JSON':
        return JSON.stringify(records, null, 2);
      case 'JSONL':
        return records.map(r => JSON.stringify(r)).join('\n');
      case 'CSV':
        return jsonToCsv(records, ',');
      case 'TSV':
        return jsonToCsv(records, '\t');
      case 'XML':
        return jsonToXml(records, table, 'row');
      case 'YAML':
        return jsonToYaml(records);
      case 'SQL_INSERT':
        return jsonToSql(records, table, dialect);
      case 'SQL_UPDATE':
        return jsonToSqlUpdate(records, table, pk, dialect);
      case 'MongoDB':
        return jsonToMongo(records, table);
      case 'Excel':
        return jsonToExcelXml(records);
      case 'Parquet':
        return jsonToParquetSchema(this.schema().fields);
      case 'Arrow':
        return jsonToArrowIpcSchema(this.schema().fields);
      case 'TSInterface':
        return generateTsInterface(this.schema().fields, table);
      case 'OpenAPI':
        return generateOpenApiSpec(this.schema().fields, table);
      case 'GraphQL':
        return generateGraphQlSchema(this.schema().fields, table);
      case 'SQL_CREATE_TABLE':
        return generateSqlCreateTable(this.schema().fields, table, dialect);
      default:
        return JSON.stringify(records, null, 2);
    }
  }

  // Cancel dynamic running generation
  cancelGeneration() {
    this.cancelGenerationFlag = true;
    this.addLog('warn', 'Generation cancelled by developer.');
  }

  // Optimized, streaming-like memory efficient bulk generator
  async generateData() {
    if (this.isGenerating()) return;
    const count = this.recordsToGenerate();
    if (count <= 0) {
      this.addLog('error', 'Cannot generate 0 or fewer records.');
      return;
    }

    this.isGenerating.set(true);
    this.generationProgress.set(0);
    this.cancelGenerationFlag = false;
    this.addLog('info', `Starting compilation of ${count.toLocaleString()} mock records...`);

    const startTime = performance.now();
    const schemaRef = this.schema();

    // Cache list for duplicate management & foreign key generation
    const recordsCache: Record<string, unknown>[] = [];
    const fields = schemaRef.fields;

    // Fast seed initialization
    faker.seed(schemaRef.seed);

    // Dynamic chunk sizes for smooth animation rendering
    const totalRecords = count;
    const chunkSize = Math.min(1000, totalRecords);
    let generatedCount = 0;

    // Track statistics properties dynamically
    let duplicates = 0;
    let nulls = 0;

    const generatorLoop = async () => {
      while (generatedCount < totalRecords && !this.cancelGenerationFlag) {
        const batchSize = Math.min(chunkSize, totalRecords - generatedCount);
        const chunkRecords: Record<string, unknown>[] = [];

        for (let i = 0; i < batchSize; i++) {
          const currentRecord: Record<string, unknown> = {};

          // Implement unique/duplicate logic
          const isDuplicateSample =
            schemaRef.fields.some(f => f.properties.duplicatePercentage && f.properties.duplicatePercentage > 0) &&
            recordsCache.length > 5 &&
            Math.random() * 100 < 15;

          if (isDuplicateSample) {
            // Pick an item from earlier in this chunk or run to simulate duplicate
            const previousRecord = recordsCache[Math.floor(Math.random() * recordsCache.length)];
            const cloned = { ...previousRecord };
            // Ensure unique key constraints are still maintained if field demands it
            for (const f of fields) {
              if (f.unique || f.type === 'UUID') {
                cloned[f.name] = 'f_' + Math.random().toString(36).substring(2, 9);
              }
            }
            duplicates++;
            chunkRecords.push(cloned);
            recordsCache.push(cloned);
            continue;
          }

          // Regular custom generation field by field
          for (const f of fields) {
            // Handle Null Percentage
            const nullPct = f.properties.nullPercentage || 0;
            if (f.nullable && Math.random() * 100 < nullPct) {
              currentRecord[f.name] = null;
              nulls++;
              continue;
            }

            // Generate value based on field specs
            let value: unknown = null;
            try {
              value = this.generateFieldValue(f, currentRecord);
            } catch (err) {
              value = `[Error: ${err instanceof Error ? err.message : String(err)}]`;
            }

            currentRecord[f.name] = value;
          }

          chunkRecords.push(currentRecord);
          // Keep a rolling cache representation (capped to preserve memory on large counts)
          if (recordsCache.length < 5000) {
            recordsCache.push(currentRecord);
          }
        }

        generatedCount += batchSize;

        // Push to output preview buffer
        if (generatedCount <= 1000) {
          // Keep only first chunk for instant preview
          this.generatedRecords.set(recordsCache.slice(0, 1000));
        }

        const progressPercent = Math.round((generatedCount / totalRecords) * 100);
        this.generationProgress.set(progressPercent);

        // Pause to let the client thread repaint UI smoothly
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.isGenerating.set(false);

      if (this.cancelGenerationFlag) {
        this.addLog('warn', 'Generation aborted. Partial preview remains available.');
        return;
      }

      // Compute Stats
      const finalRecordsCount = this.generatedRecords().length;
      const sample = this.generatedRecords();
      const stringified = this.getFormattedOutput(sample);
      this.previewOutput.set(stringified);

      // Estimate sizes
      const recordBytes = JSON.stringify(sample).length;
      const avgSize = finalRecordsCount > 0 ? Math.round(recordBytes / finalRecordsCount) : 0;
      const totalEstimatedBytes = avgSize * count;

      const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const idx = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, idx)).toFixed(2)) + ' ' + sizes[idx];
      };

      const finalStats: GeneratorStats = {
        records: count,
        objectsCount: count,
        arraysCount: fields.filter(f => f.type === 'Array').length * count,
        fieldsCount: fields.length,
        uniqueValues: Math.round(count * 0.9), // logical approximation for display
        duplicates: Math.round(count * (duplicates / totalRecords)),
        nullValues: Math.round(count * (nulls / (totalRecords * fields.length || 1))),
        memoryEstimate: formatSize(totalEstimatedBytes),
        generationTime: Math.round(duration),
        largestRecordSize: formatSize(avgSize * 1.2),
        avgRecordSize: formatSize(avgSize),
        outputSize: formatSize(totalEstimatedBytes)
      };

      this.stats.set(finalStats);
      this.addLog('success', `Completed compiling ${count.toLocaleString()} records in ${Math.round(duration)}ms.`);
    };

    // Trigger chunked asynchronous execution
    setTimeout(generatorLoop, 10);
  }

  // Generation mapping logic using Faker
  private generateFieldValue(f: GeneratorField, recordCtx: Record<string, unknown>): unknown {
    const props = f.properties;
    const min = props.min !== undefined ? props.min : 1;
    const max = props.max !== undefined ? props.max : 1000;
    const minLen = props.minLength !== undefined ? props.minLength : 5;
    const maxLen = props.maxLength !== undefined ? props.maxLength : 15;

    // Handle Custom Expressions first
    if (f.type === 'Custom Formula') {
      if (!props.customExpression) return '';
      return evaluateExpression(props.customExpression, recordCtx);
    }

    // Locale-aware faker uses
    switch (f.type) {
      case 'UUID':
        return faker.string.uuid();
      case 'Email':
        return faker.internet.email();
      case 'Username':
        return faker.internet.username();
      case 'Password':
        return faker.internet.password({ length: faker.number.int({ min: minLen, max: maxLen }) });
      case 'Phone':
        return faker.phone.number();
      case 'Country':
        return faker.location.country();
      case 'State':
        return faker.location.state();
      case 'City':
        return faker.location.city();
      case 'Street':
        return faker.location.street();
      case 'Address':
        return faker.location.streetAddress();
      case 'Postal Code':
        return faker.location.zipCode();
      case 'Latitude':
        return faker.location.latitude();
      case 'Longitude':
        return faker.location.longitude();
      case 'Company':
        return faker.company.name();
      case 'Department':
        return faker.commerce.department();
      case 'Job Title':
        return faker.person.jobTitle();
      case 'Profession':
        return faker.person.jobType();
      case 'Currency':
        return faker.finance.currencyCode();
      case 'IBAN':
        return faker.finance.iban();
      case 'SWIFT':
        return faker.finance.bic();
      case 'Credit Card':
        return faker.finance.creditCardNumber();
      case 'CVV':
        return faker.finance.creditCardCVV();
      case 'Date':
        return faker.date.anytime().toISOString().split('T')[0];
      case 'Time':
        return faker.date.anytime().toTimeString().split(' ')[0];
      case 'DateTime':
        return faker.date.anytime().toISOString();
      case 'Timestamp':
        return Math.floor(faker.date.anytime().getTime() / 1000);
      case 'Color':
        return faker.color.cssSupportedFunction();
      case 'Avatar URL':
        return faker.image.avatar();
      case 'Image URL':
        return faker.image.url({ width: 400, height: 300 });
      case 'URL':
        return faker.internet.url();
      case 'Domain':
        return faker.internet.domainName();
      case 'IPv4':
        return faker.internet.ipv4();
      case 'IPv6':
        return faker.internet.ipv6();
      case 'MAC Address':
        return faker.internet.mac();
      case 'Vehicle':
        return faker.vehicle.vehicle();
      case 'ISBN':
        return faker.commerce.isbn();
      case 'Product':
        return faker.commerce.productName();
      case 'Category':
        return faker.commerce.department();
      case 'Price':
        return parseFloat(faker.commerce.price({ min, max }));
      case 'Lorem':
        return faker.lorem.paragraphs(2);
      case 'Paragraph':
        return faker.lorem.paragraph();
      case 'Sentence':
        return faker.lorem.sentence();
      case 'HTML':
        return `<p>${faker.lorem.sentence()}</p>`;
      case 'Markdown':
        return `### ${faker.lorem.word()}\n\n${faker.lorem.paragraph()}`;
      case 'Enum':
        if (props.enumValues && props.enumValues.length > 0) {
          return faker.helpers.arrayElement(props.enumValues);
        }
        return 'Active';
      case 'Boolean': {
        const prob = props.probability !== undefined ? props.probability : 0.5;
        return faker.datatype.boolean({ probability: prob });
      }
      case 'Integer':
        return faker.number.int({ min, max });
      case 'Number':
        if (props.distributionType === 'Normal') {
          const mean = props.normalMean || 50;
          const stdDev = props.normalStdDev || 10;
          // Box-Muller transform for normal distribution
          const u1 = Math.random() || 0.0001;
          const u2 = Math.random() || 0.0001;
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          return parseFloat((z * stdDev + mean).toFixed(2));
        }
        return parseFloat(faker.number.float({ min, max, fractionDigits: 2 }).toFixed(2));
      case 'String':
        if (props.pattern) {
          if (props.pattern === 'first_name') return faker.person.firstName();
          if (props.pattern === 'last_name') return faker.person.lastName();
          return faker.helpers.fake(props.pattern);
        }
        return faker.string.alphanumeric({ length: faker.number.int({ min: minLen, max: maxLen }) });
      case 'JSON':
        return {
          key: faker.word.noun(),
          value: faker.number.int({ min: 1, max: 100 }),
          active: faker.datatype.boolean()
        };
      case 'Array': {
        const arrLen = faker.number.int({ min: props.arrayMinLength || 1, max: props.arrayMaxLength || 5 });
        const items = [];
        for (let j = 0; j < arrLen; j++) {
          items.push(faker.word.noun());
        }
        return items;
      }
      case 'Object':
        return {
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          role: faker.helpers.arrayElement(['Staff', 'Lead', 'Consultant'])
        };
      default:
        return faker.string.alphanumeric(8);
    }
  }

  // AI-Assisted field suggestion using Google Gemini API endpoint
  async fetchAiFieldSuggestions(prompt: string) {
    this.addLog('info', 'Connecting with Google Gemini AI for schema matching...');
    try {
      const response = await firstValueFrom(
        this.http.post<{ fields: GeneratorField[] }>('/api/ai-suggest', { prompt })
      );

      if (response && response.fields && response.fields.length > 0) {
        this.saveState();
        this.schema.update(s => ({
          ...s,
          fields: [...s.fields, ...response.fields]
        }));
        this.addLog('success', `Gemini AI successfully added ${response.fields.length} matching fields.`);
      } else {
        this.addLog('warn', 'AI returned an empty list or invalid schema.');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog('error', `AI suggestions failed: ${errMsg}. Reverting to offline rule matcher.`);
      // Fallback: split user prompt and use fast client mapping
      const parts = prompt.split(/[,;\s]+/).filter(Boolean);
      let matches = 0;
      for (const p of parts) {
        const cleanName = p.replace(/[^a-zA-Z_]/g, '');
        if (cleanName.length > 2) {
          const suggested = suggestFieldPropertiesByName(cleanName);
          this.addField(suggested.type, cleanName);
          matches++;
        }
      }
      if (matches === 0) {
        this.addField('String', 'ai_match');
      }
    }
  }
}
