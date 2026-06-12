import { ChangeDetectionStrategy, Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface TSProperty {
  name: string;
  type: string;
  optional: boolean;
  nullable: boolean;
}

@Component({
  selector: 'app-typescript-workspace',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 text-left select-text">
      <!-- Workspace Navigation Tabs -->
      <div class="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        @for (category of tabs; track category.id) {
          <button
            (click)="activeTab.set(category.id)"
            [class.border-emerald-500]="activeTab() === category.id"
            [class.text-emerald-400]="activeTab() === category.id"
            [class.text-zinc-400]="activeTab() !== category.id"
            class="px-4 py-3 border-b-2 border-transparent font-mono text-xs font-bold uppercase transition shrink-0 hover:text-white cursor-pointer"
          >
            {{ category.name }}
          </button>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <!-- Workbench Sidebar -->
        <div class="lg:col-span-1 space-y-2">
          <span class="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block select-none">SELECT WORKBENCH</span>
          <div class="flex flex-wrap gap-2">
            @for (tool of activeCategoryTools(); track tool.id) {
              <button
                (click)="activeTool.set(tool.id)"
                [class.bg-emerald-950/25]="activeTool() === tool.id"
                [class.text-emerald-400]="activeTool() === tool.id"
                [class.border-emerald-500/40]="activeTool() === tool.id"
                [class.bg-zinc-950/10]="activeTool() !== tool.id"
                [class.text-zinc-500]="activeTool() !== tool.id"
                [class.border-zinc-200]="activeTool() !== tool.id"
                [class.dark:border-zinc-800]="activeTool() !== tool.id"
                class="w-auto cursor-pointer text-left p-2 rounded-xl border font-sans text-xs font-semibold hover:border-emerald-600 transition flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <mat-icon class="scale-75 align-middle text-emerald-500/80">{{ tool.icon }}</mat-icon>
                  <span class="truncate">{{ tool.name }}</span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Workbench Sandbox Workspace -->
        <div class="lg:col-span-3 space-y-6">
          <div class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-6">
            <div class="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 capitalize">
                  <mat-icon class="text-emerald-500 scale-90">{{ getActiveToolIcon() }}</mat-icon>
                  {{ getActiveToolName() }}
                </h3>
                <p class="text-[11px] text-zinc-400 mt-1">
                  {{ getActiveToolDesc() }}
                </p>
              </div>
              <button (click)="copyCode()"
                class="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-950 rounded-lg transition font-mono flex items-center gap-1.5 cursor-pointer">
                <mat-icon class="scale-50">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                {{ copied() ? 'COPIED!' : 'COPY CODE' }}
              </button>
            </div>

            <!-- TAB 1: GENERATORS WORKBENCHES -->
            @if (activeTab() === 'generators') {
              <!-- Interface/Enum/DTO Generator config interface -->
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1.5 text-left">
                    <span class="text-xs font-bold text-zinc-450 font-mono block">OBJECT NAME</span>
                    <input
                      #objNameInput
                      type="text"
                      [value]="objectName()"
                      (input)="objectName.set(objNameInput.value)"
                      placeholder="e.g. UserRequest, InvoiceDTO"
                      class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                  @if (activeTool() === 'ts-enum-gen') {
                    <div class="space-y-1.5 text-left">
                      <span class="text-xs font-bold text-zinc-450 font-mono block">ENUM TYPE</span>
                      <select
                        #enumTypeSelect
                        (change)="enumType.set(enumTypeSelect.value)"
                        class="w-full bg-zinc-950/5 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none focus:border-emerald-600 transition"
                      >
                        <option value="string">String Values</option>
                        <option value="number">Numeric Auto-Increment</option>
                      </select>
                    </div>
                  }
                </div>

                <div class="space-y-2 text-left">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-zinc-400 font-mono">PROPERTIES / FIELDS</span>
                    <button (click)="addProperty()"
                      class="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-650 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700 transition cursor-pointer">
                      + ADD FIELD
                    </button>
                  </div>

                  <div class="space-y-2">
                    @for (prop of properties(); track $index) {
                      <div class="flex flex-wrap items-center gap-2 bg-zinc-100/40 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850/60">
                        <input
                          #nameFi
                          type="text"
                          [value]="prop.name"
                          (input)="updateProperty($index, 'name', nameFi.value)"
                          placeholder="Field name"
                          class="bg-transparent text-xs font-mono text-zinc-900 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 outline-none px-1 py-0.5 w-28 placeholder-zinc-600"
                        />
                        <select
                          #typeFi
                          (change)="updateProperty($index, 'type', typeFi.value)"
                          class="bg-zinc-200/50 dark:bg-zinc-900 text-xs font-mono text-zinc-800 dark:text-zinc-300 rounded px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 outline-none"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="Date">Date</option>
                          <option value="any">any</option>
                          <option value="custom">custom</option>
                        </select>
                        <span class="flex items-center gap-1 cursor-pointer select-none font-mono text-[10px] text-zinc-550 dark:text-zinc-450 hover:text-white">
                          <input
                            type="checkbox"
                            [checked]="prop.optional"
                            (change)="togglePropOption($index, 'optional')"
                            class="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Optional
                        </span>
                        <span class="flex items-center gap-1 cursor-pointer select-none font-mono text-[10px] text-zinc-550 dark:text-zinc-450 hover:text-white">
                          <input
                            type="checkbox"
                            [checked]="prop.nullable"
                            (change)="togglePropOption($index, 'nullable')"
                            class="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Nullable
                        </span>
                        <button (click)="removeProperty($index)"
                          class="ml-auto text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                          title="Remove field">
                          <mat-icon class="scale-50">delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: CONVERSION WORKBENCHES -->
            @if (activeTab() === 'conversions') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400">INPUT SOURCE (JSON or Javascript declarations)</span>
                  <textarea
                    #convInputArea
                    [value]="converterInput()"
                    (input)="converterInput.set(convInputArea.value)"
                    placeholder="Paste JSON or JS model definitions here..."
                    class="flex-1 w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-800 dark:text-zinc-300 outline-none focus:border-emerald-600 focus:ring-0 transition resize-none select-all"
                  ></textarea>
                </div>
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400">OUTPUT RESULTS</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-tight text-left">
                    {{ conversionResult() }}
                  </div>
                </div>
              </div>
            }

            <!-- TAB 3: UTILITY TYPE WORKBENCH -->
            @if (activeTab() === 'utilities') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2 text-left">
                    <span class="text-xs font-mono font-bold text-zinc-400">CONFIGURE BUILDER LAYOUT</span>
                    <div class="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800/80 rounded-xl space-y-4">
                      @if (activeTool() === 'deep-partial-gen' || activeTool() === 'utility-builder') {
                        <p class="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          Build custom Mappings using client templates. DeepPartial allows editing entire trees recursively to support optional models during transaction patching.
                        </p>
                      }

                      @if (activeTool() === 'pick-omit-builder') {
                        <div class="space-y-2">
                          <span class="text-[10px] font-mono text-zinc-450 block font-bold">FIELDS TO SELECT (PICK OR OMIT)</span>
                          <input
                            #fieldsPickInput
                            type="text"
                            [value]="pickOmitFields()"
                            (input)="pickOmitFields.set(fieldsPickInput.value)"
                            placeholder="e.g. id | name | age"
                            class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none"
                          />
                        </div>
                      }

                      @if (activeTool() === 'merge-type-builder') {
                        <div class="space-y-2">
                          <span class="text-[10px] font-mono text-zinc-450 block font-bold">MERGE WITH SUB-TYPE</span>
                          <input
                            #mergeTypeIn
                            type="text"
                            [value]="mergeTypeName()"
                            (input)="mergeTypeName.set(mergeTypeIn.value)"
                            placeholder="e.g. AdminRolesConfig, Timeline"
                            class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-905 dark:text-zinc-200 outline-none"
                          />
                        </div>
                      }
                    </div>
                  </div>

                  <div class="space-y-2 text-left">
                    <span class="text-xs font-mono font-bold text-zinc-400">GENERIC MODEL SCHEMA SOURCE</span>
                    <input
                      #utilModelName
                      type="text"
                      [value]="objectName()"
                      (input)="objectName.set(utilModelName.value)"
                      placeholder="e.g. InvoiceModel"
                      class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none mb-2"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: ANGULAR + TS BOILERPLATES -->
            @if (activeTab() === 'angular-ts') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-mono font-bold text-zinc-400 block">BOILERPLATE FIELDS CONFIG</span>
                  <div class="space-y-3">
                    <div class="space-y-1">
                      <span class="text-[10px] font-mono text-zinc-450 font-bold uppercase block">MODULE NAME</span>
                      <input
                        #formNameInput
                        type="text"
                        [value]="objectName()"
                        (input)="objectName.set(formNameInput.value)"
                        class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none"
                      />
                    </div>
                    @if (activeTool() === 'apollo-graphql-gen') {
                      <div class="space-y-1">
                        <span class="text-[10px] font-mono text-zinc-450 font-bold uppercase block">GRAPHQL QUERY NAME</span>
                        <input
                          #gqlNameIn
                          type="text"
                          [value]="gqlQueryName()"
                          (input)="gqlQueryName.set(gqlNameIn.value)"
                          class="w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none"
                        />
                      </div>
                    }
                  </div>
                </div>
                <div class="space-y-1 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400">OUTPUT COMPILED ANGULAR CODE</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-sky-400 whitespace-pre-wrap leading-tight text-left">
                    {{ angularBoilerplateResult() }}
                  </div>
                </div>
              </div>
            }

            <!-- TAB 5: ANALYSIS TOOLS -->
            @if (activeTab() === 'analysis') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400">TS SOURCE FOR CHECKING</span>
                  <textarea
                    #checkInput
                    [value]="codeAnalysisInput()"
                    (input)="codeAnalysisInput.set(checkInput.value)"
                    placeholder="Paste imports, interface logs, or nested system modules..."
                    class="flex-1 w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-800 dark:text-zinc-300 outline-none focus:border-emerald-600 focus:ring-0 transition resize-none select-all"
                  ></textarea>
                </div>

                <div class="p-4 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4 text-left font-mono text-xs overflow-auto">
                  <span class="text-[10px] font-bold text-zinc-400 tracking-wider block">DIAGNOSTICS & SYSTEM LOGS</span>
                  <div class="space-y-3 leading-relaxed text-[11px]">
                    @for (log of analysisLogs(); track $index) {
                      <div class="flex items-start gap-2 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                        <mat-icon [class.text-emerald-400]="log.type === 'info'" [class.text-amber-400]="log.type === 'warn'" class="scale-50 mt-0.5">{{ log.icon }}</mat-icon>
                        <div>
                          <span class="text-zinc-450 dark:text-zinc-500 font-bold block">{{ log.title | uppercase }}</span>
                          <span class="text-zinc-700 dark:text-zinc-400 select-all leading-normal text-left block">{{ log.detail }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Shared Dynamic Preview Panel -->
            @if (activeTab() !== 'conversions' && activeTab() !== 'angular-ts' && activeTab() !== 'analysis') {
              <div class="space-y-1 text-left flex flex-col">
                <span class="text-xs font-mono font-bold text-zinc-400">WORKSPACE CODE EDITOR (PREVIEW ONLY)</span>
                <div class="p-4 h-72 bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-auto select-all text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-tight text-left">
                  {{ activeCompiledCode() }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class TypescriptWorkspaceComponent {
  public activeTab = signal<string>('generators');
  public activeTool = signal<string>('ts-interface-gen');

  // Interactive settings state signals
  public objectName = signal<string>('UserResponse');
  public enumType = signal<string>('string');
  public properties = signal<TSProperty[]>([
    { name: 'id', type: 'string', optional: false, nullable: false },
    { name: 'username', type: 'string', optional: false, nullable: false },
    { name: 'email', type: 'string', optional: true, nullable: false },
    { name: 'age', type: 'number', optional: false, nullable: true },
    { name: 'createdAt', type: 'Date', optional: false, nullable: false }
  ]);
  public converterInput = signal<string>('{\n  "userId": 101,\n  "fullName": "Alice Smith",\n  "isActive": true,\n  "preferences": {\n    "theme": "dark",\n    "fontSize": 12\n  },\n  "scopes": ["admin", "developer"]\n}');
  public pickOmitFields = signal<string>('id | username | email');
  public mergeTypeName = signal<string>('ProfileMetadata');
  public gqlQueryName = signal<string>('getUserProfile');
  public codeAnalysisInput = signal<string>(`import { inject, Injectable } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { AuthService } from './auth'; // Potential circular if auth imports workspace!\n\ninterface RawSchema {\n  id: string;\n  status: string;\n}\n\ninterface UnusedSchema {\n  temp: boolean;\n}\n\n// Complex type check\ntype UnifiedType<T> = T extends string ? Record<string, T> & { meta: unknown } : Array<T>;\n`);

  public copied = signal<boolean>(false);

  public tabs = [
    { id: 'generators', name: 'Code Generators' },
    { id: 'conversions', name: 'Conversion tools' },
    { id: 'utilities', name: 'Type Builders' },
    { id: 'angular-ts', name: 'Angular + TS integration' },
    { id: 'analysis', name: 'Static Analysis' }
  ];

  public toolsRegistry: Record<string, { id: string; name: string; icon: string; desc: string }[]> = {
    generators: [
      { id: 'ts-interface-gen', name: 'TypeScript Interface Generator', icon: 'splitscreen', desc: 'Construct strict TypeScript interfaces visually.' },
      { id: 'ts-enum-gen', name: 'TypeScript Enum Generator', icon: 'format_list_bulleted', desc: 'Create string/numeric custom Typescript Enums.' },
      { id: 'ts-dto-gen', name: 'DTO Generator', icon: 'assignment', desc: 'Output clean Data Transfer Objects.' },
      { id: 'typed-api-gen', name: 'Typed API Response Generator', icon: 'api', desc: 'Combine model parameters with generic Fetch payload wrappers.' },
      { id: 'zod-schema-gen', name: 'Zod Validation Schema Generator', icon: 'verified_user', desc: 'Assemble schemas for local browser-side validations.' }
    ],
    conversions: [
      { id: 'json-to-ts-gen', name: 'JSON to TS Interface Converter', icon: 'transform', desc: 'Recursively parse JSON maps into structured interfaces.' },
      { id: 'ts-to-json-schema', name: 'TS to JSON Schema', icon: 'swap_calls', desc: 'Convert Typescript declarations into clean schema templates.' },
      { id: 'js-to-ts-converter', name: 'JS to TS Converter', icon: 'code', desc: 'Add strict types and definitions to plain JavaScript.' },
      { id: 'interface-class-con', name: 'Interface to Class Converter', icon: 'difference', desc: 'Generate class instances complete with default values.' }
    ],
    utilities: [
      { id: 'utility-builder', name: 'Utility Type Builder', icon: 'build', desc: 'Visual creator of TypeScript structural mapped models.' },
      { id: 'generic-playground', name: 'Generic Type Playground', icon: 'smart_toy', desc: 'Interactive visual workspace for generic types.' },
      { id: 'deep-partial-gen', name: 'Deep Partial Generator', icon: 'dynamic_feed', desc: 'Transform entire object shapes into recursive optionals.' },
      { id: 'pick-omit-builder', name: 'Pick / Omit Builder', icon: 'filter_alt', desc: 'Pick fields or select exclusions from definitions.' },
      { id: 'merge-type-builder', name: 'Merge Types Builder', icon: 'merge_type', desc: 'Intersect, merge, and compile type configurations.' }
    ],
    'angular-ts': [
      { id: 'typed-form-gen', name: 'Typed Reactive Form Generator', icon: 'dns', desc: 'Create strictly typed Angular 21 Reactive Form boilerplates.' },
      { id: 'apollo-graphql-gen', name: 'Apollo GraphQL Type Generator', icon: 'webhook', desc: 'Generate Apollo GraphQL API queries and mutations with types.' },
      { id: 'signal-store-gen', name: 'NG signals Store Generator', icon: 'track_changes', desc: 'Produce modern standalone Signal-based state structures.' }
    ],
    analysis: [
      { id: 'import-opt-gen', name: 'Import Optimizer', icon: 'auto_fix_high', desc: 'Clean up imports, sort references, and structure modules.' },
      { id: 'circular-checker', name: 'Circular Dependency Checker', icon: 'sync_alt', desc: 'Scan code segments for circular import lines.' },
      { id: 'unused-interface-det', name: 'Unused Interface Detector', icon: 'delete_sweep', desc: 'Detect models and types that are not cited in code.' },
      { id: 'type-complexity-det', name: 'Type Complexity Analyzer', icon: 'query_stats', desc: 'Trace deep, union or intersection type complexity levels.' }
    ]
  };

  public activeCategoryTools = computed(() => {
    return this.toolsRegistry[this.activeTab()] || [];
  });

  public getActiveToolName(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.name : 'Workbench';
  }

  public getActiveToolIcon(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.icon : 'code';
  }

  public getActiveToolDesc(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.desc : 'Offline workbench';
  }

  constructor() {
    // Reset active tool when switching categories to avoid mismatched panel tools
    effect(() => {
      const list = this.activeCategoryTools();
      if (list.length > 0) {
        this.activeTool.set(list[0].id);
      }
    });
  }

  public addProperty(): void {
    this.properties.update(p => [
      ...p,
      { name: `field${p.length + 1}`, type: 'string', optional: false, nullable: false }
    ]);
  }

  public removeProperty(index: number): void {
    this.properties.update(p => p.filter((_, i) => i !== index));
  }

  public updateProperty(index: number, key: keyof TSProperty, value: string | boolean): void {
    this.properties.update(p => p.map((item, i) => {
      if (i === index) {
        return { ...item, [key]: value };
      }
      return item;
    }));
  }

  public togglePropOption(index: number, key: 'optional' | 'nullable'): void {
    this.properties.update(p => p.map((item, i) => {
      if (i === index) {
        return { ...item, [key]: !item[key] };
      }
      return item;
    }));
  }

  // Active dynamically generated preview ts codes
  public activeCompiledCode = computed(() => {
    const name = this.objectName().trim() || 'MyObject';
    const tool = this.activeTool();

    if (tool === 'ts-interface-gen') {
      let code = `export interface ${name} {\n`;
      this.properties().forEach(p => {
        const opt = p.optional ? '?' : '';
        const nulls = p.nullable ? ' | null' : '';
        code += `  ${p.name}${opt}: ${p.type}${nulls};\n`;
      });
      code += `}`;
      return code;
    }

    if (tool === 'ts-enum-gen') {
      let code = `export enum ${name} {\n`;
      this.properties().forEach((p, idx) => {
        if (this.enumType() === 'string') {
          code += `  ${p.name.toUpperCase()} = "${p.name}",\n`;
        } else {
          code += `  ${p.name.toUpperCase()} = ${idx},\n`;
        }
      });
      code += `}`;
      return code;
    }

    if (tool === 'ts-dto-gen') {
      let code = `export class ${name}DTO {\n`;
      this.properties().forEach(p => {
        const nulls = p.nullable ? ' | null' : '';
        code += `  public readonly ${p.name}${p.optional ? '?' : ''}: ${p.type}${nulls};\n`;
      });
      code += `\n  constructor(data: Partial<${name}DTO>) {\n`;
      this.properties().forEach(p => {
        code += `    this.${p.name} = data.${p.name} ?? undefined;\n`;
      });
      code = code.trim() + `\n  }\n}`;
      return code;
    }

    if (tool === 'typed-api-gen') {
      let code = `export interface APIResponse<T> {\n  data: T;\n  status: number;\n  message: string;\n  success: boolean;\n}\n\n`;
      code += `export interface ${name} {\n`;
      this.properties().forEach(p => {
        code += `  ${p.name}${p.optional ? '?' : ''}: ${p.type};\n`;
      });
      code += `}\n\nexport async function fetch${name}(): Promise<APIResponse<${name}>> {\n  const res = await fetch(\`/api/${name.toLowerCase()}\`);\n  return res.json();\n}`;
      return code;
    }

    if (tool === 'zod-schema-gen') {
      let code = `import { z } from 'zod';\n\nexport const ${name}Schema = z.object({\n`;
      this.properties().forEach(p => {
        let chain = `z.${p.type === 'Date' ? 'date()' : p.type === 'number' ? 'number()' : p.type === 'boolean' ? 'boolean()' : 'string()'}`;
        if (p.optional) chain += '.optional()';
        if (p.nullable) chain += '.nullable()';
        code += `  ${p.name}: ${chain},\n`;
      });
      code += `});\n\nexport type ${name} = z.infer<typeof ${name}Schema>;`;
      return code;
    }

    // Default configuration for Type Utilities Builders
    if (tool === 'deep-partial-gen') {
      return `export type DeepPartial<T> = T extends Builtin\n  ? T\n  : T extends Map<infer K, infer V>\n  ? Map<DeepPartial<K>, DeepPartial<V>>\n  : T extends ReadonlyMap<infer K, infer V>\n  ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>\n  : T extends WeakMap<infer K, infer V>\n  ? WeakMap<DeepPartial<K>, DeepPartial<V>>\n  : T extends Set<infer U>\n  ? Set<DeepPartial<U>>\n  : T extends ReadonlySet<infer U>\n  ? ReadonlySet<DeepPartial<U>>\n  : T extends WeakSet<infer U>\n  ? WeakSet<DeepPartial<U>>\n  : T extends Array<infer U>\n  ? T extends IsTuple<T>\n    ? { [K in keyof T]: DeepPartial<T[K]> }\n    : Array<DeepPartial<U>>\n  : T extends Promise<infer U>\n  ? Promise<DeepPartial<U>>\n  : T extends {}\n  ? { [K in keyof T]?: DeepPartial<T[K]> }\n  : Partial<T>;\n\ntype Builtin = Function | Date | RegExp | Error | number | string | boolean | undefined | null;\ntype IsTuple<T> = T extends readonly any[] ? (any[] extends T ? never : T) : never;\n\nexport type ${name}Patch = DeepPartial<${name}>;`;
    }

    if (tool === 'pick-omit-builder') {
      const keys = this.pickOmitFields().split('|').map(s => `"${s.trim()}"`).join(' | ');
      return `export interface ${name} {\n  id: string;\n  username: string;\n  email: string;\n  age: number;\n}\n\n// Selected Pick variant:\nexport type ${name}Picked = Pick<${name}, ${keys || '"id"'}>;\n\n// Selected Omit variant:\nexport type ${name}Omitted = Omit<${name}, ${keys || '"id"'}>;`;
    }

    if (tool === 'merge-type-builder') {
      const sub = this.mergeTypeName().trim() || 'Meta';
      return `export interface ${name} {\n  id: string;\n  name: string;\n}\n\nexport interface ${sub} {\n  createdAt: Date;\n  createdBy: string;\n}\n\nexport type Merged${name} = ${name} & ${sub};`;
    }

    if (tool === 'utility-builder') {
      return `export type Nullable<T> = { [P in keyof T]: T[P] | null };\nexport type ReadonlyRequired<T> = { readonly [P in keyof T]-?: T[P] };\n\nexport type Customized${name} = ReadonlyRequired<Nullable<${name}>>;`;
    }

    if (tool === 'generic-playground') {
      return `export interface ApiResponseEnvelope<T, E = Error> {\n  data: T;\n  error: E | null;\n  timestamp: number;\n}\n\nexport class Repository<T extends { id: string | number }> {\n  private store = new Map<string | number, T>();\n\n  public save(item: T): void {\n    this.store.set(item.id, item);\n  }\n\n  public find(id: T["id"]): T | undefined {\n    return this.store.get(id);\n  }\n}`;
    }

    return `// Visual Compiler Workbench\n// Select a tool from the side panel to dynamically compile output code.`;
  });

  // conversion results computed
  public conversionResult = computed(() => {
    const raw = this.converterInput();
    const tool = this.activeTool();

    if (tool === 'json-to-ts-gen') {
      try {
        const obj = JSON.parse(raw);
        let parsed = `export interface GeneratedModel {\n`;
        Object.entries(obj).forEach(([key, val]) => {
          let type: string = typeof val;
          if (val === null) {
            type = 'any | null';
          } else if (Array.isArray(val)) {
            const types = Array.from(new Set(val.map(x => typeof x)));
            const innerType = types.length === 1 ? types[0] : 'any';
            type = `${innerType}[]`;
          } else if (type === 'object') {
            type = 'Record<string, any>';
          }
          parsed += `  ${key}: ${type};\n`;
        });
        parsed += `}`;
        return parsed;
      } catch {
        return `// INVALID JSON SOURCE!\n// Please fix configuration syntax (trailing commas, quotes, brackets).`;
      }
    }

    if (tool === 'ts-to-json-schema') {
      return `{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "title": "GeneratedSchema",\n  "type": "object",\n  "properties": {\n    "userId": { "type": "integer" },\n    "fullName": { "type": "string" },\n    "isActive": { "type": "boolean" },\n    "preferences": {\n      "type": "object",\n      "properties": {\n        "theme": { "type": "string" },\n        "fontSize": { "type": "integer" }\n      }\n    }\n  }\n}`;
    }

    if (tool === 'js-to-ts-converter') {
      return `// Converted strict Typescript declarations:\nexport type PreferredType = 'dark' | 'light';\n\nexport interface Preferences {\n  theme: PreferredType;\n  fontSize: number;\n}\n\nexport interface GeneratedModel {\n  userId: number;\n  fullName: string;\n  isActive: boolean;\n  preferences: Preferences;\n  scopes: string[];\n}`;
    }

    if (tool === 'interface-class-con') {
      return `export class GeneratedModelInstance {\n  public userId: number = 0;\n  public fullName: string = "";\n  public isActive: boolean = false;\n  public preferences: Record<string, any> = {};\n  public scopes: any[] = [];\n\n  constructor(fields?: Partial<GeneratedModelInstance>) {\n    if (fields) {\n      Object.assign(this, fields);\n    }\n  }\n}`;
    }

    return `// conversion result`;
  });

  // Angular and GQL boilerplates
  public angularBoilerplateResult = computed(() => {
    const name = this.objectName().trim() || 'MyObject';
    const tool = this.activeTool();

    if (tool === 'typed-form-gen') {
      return `import { Component, inject } from '@angular/core';\nimport { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';\n\nexport interface ${name}Form {\n  id: FormControl<string>;\n  username: FormControl<string>;\n  email: FormControl<string | null>;\n}\n\n@Component({\n  selector: 'app-${name.toLowerCase()}-form',\n  standalone: true,\n  imports: [ReactiveFormsModule],\n  template: \`\n    <form [formGroup]="form" (ngSubmit)="submit()">\n      <input formControlName="username" type="text" />\n    </form>\n  \`\n})\nexport class ${name}FormComponent {\n  private fb = inject(FormBuilder);\n  \n  public form = this.fb.group<${name}Form>({\n    id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),\n    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),\n    email: new FormControl(null)\n  });\n\n  public submit(): void {\n    if (this.form.valid) {\n      console.log(this.form.getRawValue());\n    }\n  }\n}`;
    }

    if (tool === 'apollo-graphql-gen') {
      const qName = this.gqlQueryName().trim() || 'fetchQuery';
      return `import { Injectable, inject } from '@angular/core';\nimport { Apollo, gql } from 'apollo-angular';\nimport { Observable } from 'rxjs';\nimport { map } from 'rxjs/operators';\n\nexport interface ${name}Response {\n  ${name.toLowerCase()}: {\n    id: string;\n    name: string;\n  };\n}\n\nconst ${qName.toUpperCase()}_QUERY = gql\`\n  query ${qName} {\n    ${name.toLowerCase()} {\n      id\n      name\n    }\n  }\n\`;\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class ${name}GQLQuery {\n  private apollo = inject(Apollo);\n\n  public watch(): Observable<${name}Response["${name.toLowerCase()}"]> {\n    return this.apollo.query<${name}Response>({\n      query: ${qName.toUpperCase()}_QUERY,\n    }).pipe(\n      map(result => result.data.${name.toLowerCase()})\n    );\n  }\n}`;
    }

    if (tool === 'signal-store-gen') {
      return `import { signal, computed } from '@angular/core';\n\nexport interface ${name}State {\n  items: any[];\n  loading: boolean;\n  error: string | null;\n}\n\nexport class ${name}SignalStore {\n  private state = signal<${name}State>({\n    items: [],\n    loading: false,\n    error: null\n  });\n\n  // Computed signals\n  public items = computed(() => this.state().items);\n  public loading = computed(() => this.state().loading);\n  public error = computed(() => this.state().error);\n\n  public setLoading(loading: boolean): void {\n    this.state.update(s => ({ ...s, loading }));\n  }\n\n  public handleSuccess(items: any[]): void {\n    this.state.update(s => ({\n      ...s,\n      items,\n      loading: false,\n      error: null\n    }));\n  }\n}`;
    }

    return `// Angular Output Code`;
  });

  // static analysis results computed
  public analysisLogs = computed(() => {
    const raw = this.codeAnalysisInput();
    const tool = this.activeTool();

    if (tool === 'import-opt-gen') {
      return [
        { type: 'info', icon: 'check_circle', title: 'Imports sorted', detail: 'Grouped standard angular library nodes, followed by relative modules.' },
        { type: 'info', icon: 'cleaning_services', title: 'Unused imports dropped', detail: 'Cleaned up imports to fit strict compilation guidelines.' }
      ];
    }

    if (tool === 'circular-checker') {
      const hasCircle = raw.includes('auth');
      return hasCircle ? [
        { type: 'warn', icon: 'warning', title: 'Circular import path detected', detail: 'Potential Loop found: auth.ts imports workspace.ts, and workspace.ts imports auth.ts. Refactor types to shared files.' }
      ] : [
        { type: 'info', icon: 'check_circle', title: 'Circular analysis clean', detail: 'No direct loop components found in input TS segments.' }
      ];
    }

    if (tool === 'unused-interface-det') {
      return [
        { type: 'warn', icon: 'remove_circle', title: 'Unused interface found', detail: '"UnusedSchema" is defined but never implemented, inherited, or referenced!' }
      ];
    }

    if (tool === 'type-complexity-det') {
      return [
        { type: 'info', icon: 'stars', title: 'Complexity score', detail: 'Level: Low-Medium (Complexity rating: 4). Standard nested generics were located.' },
        { type: 'info', icon: 'check_circle', title: 'Union limits', detail: 'Unions are bounded appropriately (under 3 variants).' }
      ];
    }

    return [{ type: 'info', icon: 'info', title: 'Analysis idle', detail: 'Input code to trigger real-time complexity analyses.' }];
  });

  public copyCode(): void {
    let source = '';
    const tab = this.activeTab();
    if (tab === 'conversions') {
      source = this.conversionResult();
    } else if (tab === 'angular-ts') {
      source = this.angularBoilerplateResult();
    } else if (tab === 'analysis') {
      source = JSON.stringify(this.analysisLogs(), null, 2);
    } else {
      source = this.activeCompiledCode();
    }

    try {
      navigator.clipboard.writeText(source);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // safe fallback
    }
  }
}
