import { ChangeDetectionStrategy, Component, signal, computed, Input, forwardRef, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, MatIconModule, forwardRef(() => TreeNodeComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Input and Controls -->
      <div class="grid grid-cols-1 gap-6">
        <!-- Raw Input Section -->
        <div 
          [class]="isInputFullScreen() ? 'fixed inset-0 z-[9999] bg-zinc-900 p-4 md:p-6 w-full h-full shadow-2xl flex flex-col animate-fade-in' : 'flex flex-col h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden'"
        >
          <div class="flex items-center justify-between flex-wrap gap-2 px-4 py-3 bg-zinc-955 border-b border-zinc-800">
            <span class="text-xs font-semibold text-zinc-400 font-mono">INPUT RAW JSON</span>
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Formatting & Expansion Controls -->
              <div class="flex flex-wrap items-center bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-800 gap-1 select-none">
                <button (click)="expandAll()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none cursor-pointer"
                  title="Expand All Nodes"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">unfold_more</mat-icon> EXPAND
                </button>
                <button (click)="collapseAll()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none cursor-pointer"
                  title="Collapse All Nodes"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">unfold_less</mat-icon> COLLAPSE
                </button>
                <div class="w-px h-3 bg-zinc-805 mx-0.5"></div>
                <button (click)="inputBeautify()" [disabled]="!parsedObject()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-emerald-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                  title="Format JSON with indent and new lines"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">format_align_left</mat-icon> FORMAT
                </button>
                <button (click)="inputSmartFormat()" [disabled]="!parsedObject()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-blue-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                  title="Smart Format (compact, inline simple arrays/items)"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">auto_awesome</mat-icon> SMART
                </button>
                <button (click)="inputMinify()"[disabled]="!parsedObject()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-amber-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                  title="Compact JSON (minify, remove whitespaces)"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">compress</mat-icon> COMPACT
                </button>
              </div>

              <button (click)="clearInput()"
                class="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-805 rounded transition font-mono flex items-center gap-1 cursor-pointer bg-transparent border-none cursor-pointer">
                <mat-icon class="text-xs scale-75">clear</mat-icon> CLEAR
              </button>
              <button (click)="isInputFullScreen.set(!isInputFullScreen())"
                class="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-805 rounded transition font-mono flex items-center gap-1 cursor-pointer bg-transparent border-none cursor-pointer"
                [title]="isInputFullScreen() ? 'Exit Full Screen' : 'Full Screen View'"
              >
                <mat-icon class="text-xs scale-75">{{ isInputFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                {{ isInputFullScreen() ? 'EXIT' : 'FULL' }}
              </button>
            </div>
          </div>

          <!-- Validation error visible on raw input section in standard or full screen views -->
          @if (validationError()) {
            <div class="px-4 py-2 bg-rose-950/25 border-b border-rose-900/40 flex items-center justify-between gap-2 shrink-0 text-left">
              <div class="flex items-center gap-2 text-rose-450 font-semibold text-[10.5px] font-mono leading-relaxed select-all">
                <mat-icon class="text-xs scale-90 shrink-0">error_outline</mat-icon>
                <span>INVALID JSON: {{ validationError() }}</span>
              </div>
            </div>
          }

          <div class="flex-grow flex-1 flex overflow-hidden">
            <!-- Sync Gutter Indexing -->
            <div id="inputGutter" class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden">
              @for (num of getRawInputLineNumbers(); track num) {
                <div>{{ num }}</div>
              }
            </div>
            <div class="flex-grow h-full relative overflow-hidden bg-zinc-900 w-full text-left">
              @if (rawInput()) {
                <pre id="inputHighlightEl"
                  class="absolute inset-0 p-4 text-xs font-mono text-zinc-105 whitespace-pre overflow-hidden leading-relaxed select-none pointer-events-none text-left" 
                  [innerHTML]="highlightedInputText()"
                ></pre>
              }
              <textarea
                #rawTextarea
                [value]="rawInput()"
                (input)="onInputChange(rawTextarea.value)"
                (scroll)="syncScroll(rawTextarea, 'inputHighlightEl', 'inputGutter')"
                placeholder='Paste your JSON data here...\n\nExample:\n{"id": 1, "name": "devsight", "active": true, "tags": ["seo", "speed"]}'
                class="absolute inset-0 w-full h-full p-4 text-xs font-mono text-transparent bg-transparent caret-zinc-100 selection:bg-zinc-700/50 selection:text-zinc-100 border-none outline-none resize-none focus:ring-0 overflow-auto leading-relaxed whitespace-pre text-left"
              ></textarea>
            </div>
          </div>
        </div>
        <!-- Output Viewer Section -->
        <div [class]="isOutputFullScreen() ? 'fixed inset-0 z-[9999] bg-zinc-900 p-4 md:p-6 w-full h-full shadow-2xl flex flex-col animate-fade-in' : 'flex flex-col h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden'">
          <div class="flex flex-wrap items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <div class="flex items-center gap-4">
              <span class="text-xs font-semibold text-zinc-400 font-mono">OUTPUT PROCESSED</span>
              <!-- View Modes -->
              <div class="flex bg-zinc-900 p-0.5 rounded border border-zinc-800 animate-fade-in">
                @for (mode of ['formatted', 'tree', 'yaml', 'csv']; track mode) {
                  <button (click)="viewMode.set(mode)"
                    [class.bg-zinc-800]="viewMode() === mode"
                    [class.text-white]="viewMode() === mode"
                    [class.text-zinc-500]="viewMode() !== mode"
                    class="px-2 py-0.5 text-[10px] font-mono rounded uppercase transition cursor-pointer cursor-pointer"
                  >
                    {{ mode }}
                  </button>
                }
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs text-zinc-500 font-mono">CONTROLS:</span>
              <div class="flex items-center bg-zinc-900 rounded p-0.5 border border-zinc-800">
                <button (click)="indentSize.set(2)" [class.bg-zinc-800]="indentSize() === 2"
                  class="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded transition font-mono cursor-pointer">
                  2 Spaces
                </button>
                <button (click)="indentSize.set(4)" [class.bg-zinc-800]="indentSize() === 4"
                  class="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded transition font-mono cursor-pointer">
                  4 Spaces
                </button>
                <button (click)="indentSize.set(0)" [class.bg-zinc-800]="indentSize() === 0"
                  class="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded transition font-mono cursor-pointer">
                  Minify
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (output()) {
                <button (click)="copyOutput()"
                  class="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-900 rounded transition font-mono flex items-center gap-1 cursor-pointer">
                  <mat-icon class="text-xs scale-75">{{ copySuccess() ? 'check' : 'content_copy' }}</mat-icon> 
                  {{ copySuccess() ? 'COPIED!' : 'COPY' }}
                </button>
              }
              <button (click)="isOutputFullScreen.set(!isOutputFullScreen())"
                class="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-805 rounded transition font-mono flex items-center gap-1 cursor-pointer"
                [title]="isOutputFullScreen() ? 'Exit Full Screen' : 'Full Screen View'"
              >
                <mat-icon class="text-xs scale-75">{{ isOutputFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                {{ isOutputFullScreen() ? 'EXIT' : 'FULL' }}
              </button>
            </div>
          </div>

          <!-- Dynamic Output Frames -->
          <div class="flex-grow flex-1 flex flex-col overflow-hidden text-xs font-mono select-text bg-zinc-900">
            <!-- Loading/Placeholder -->
            @if (!rawInput()) {
              <div class="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center space-y-2">
                <mat-icon class="text-3xl">terminal</mat-icon>
                <p>Waiting for raw JSON payload on the left...</p>
              </div>
            } @else {
              <!-- Error Message if invalid -->
              @if (validationError()) {
                <div class="p-4 flex-grow overflow-auto">
                  <div class="p-3 bg-rose-950/20 border border-rose-900/45 rounded-lg text-rose-400 space-y-1">
                    <div class="flex items-center gap-2 font-semibold">
                      <mat-icon class="text-rose-400">error_outline</mat-icon>
                      <span>JSON Parsing Failed</span>
                    </div>
                    <p class="text-[11px] leading-relaxed">{{ validationError() }}</p>
                  </div>
                </div>
              } @else {
                <!-- Formatted / Minified Output -->
                @if (viewMode() !== 'tree') {
                  <div class="flex-grow flex-1 flex overflow-hidden">
                    <!-- Dynamic Output indexing gutter -->
                    <div class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden" #outputGutter>
                      @for (num of getOutputLineNumbers(); track num) {
                        <div>{{ num }}</div>
                      }
                    </div>
                    <div 
                      class="flex-grow p-4 overflow-y-auto overflow-x-auto leading-relaxed select-text"
                      (scroll)="outputGutter.scrollTop = $any($event.target).scrollTop"
                    >
                      @if (viewMode() === 'formatted') {
                        <pre class="whitespace-pre select-text text-zinc-100 font-mono leading-relaxed" [innerHTML]="highlightedJsonOutput()"></pre>
                      } @else if (viewMode() === 'yaml') {
                        <pre class="text-amber-100 whitespace-pre select-text">{{ yamlOutput() }}</pre>
                      } @else if (viewMode() === 'csv') {
                        <pre class="text-blue-100 whitespace-pre select-text">{{ csvOutput() }}</pre>
                      }
                    </div>
                  </div>
                }

                <!-- Hierarchical Tree Viewer -->
                @if (viewMode() === 'tree') {
                  <div class="flex-grow flex-1 p-6 overflow-auto flex flex-col">
                    <div class="mb-4 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex items-center justify-between gap-3 shrink-0">
                      <span class="text-[10px] font-extrabold font-mono text-zinc-455">COLLAPSIBLE HIERARCHY TREE</span>
                      <div class="flex items-center gap-2 font-mono">
                        <button (click)="expandAll()" class="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition text-[9px] font-bold rounded-lg text-zinc-400 hover:text-white cursor-pointer select-none cursor-pointer">
                          EXPAND ALL
                        </button>
                        <button (click)="collapseAll()" class="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition text-[9px] font-bold rounded-lg text-zinc-400 hover:text-white cursor-pointer select-none cursor-pointer">
                          COLLAPSE ALL
                        </button>
                      </div>
                    </div>
                    <div [class]="isOutputFullScreen() ? 'space-y-1 text-zinc-300 select-none flex-grow overflow-auto pl-1' : 'space-y-1 text-zinc-300 select-none flex-grow overflow-auto max-h-[360px] pl-1'">
                      <app-tree-node [value]="parsedObject()" [isRoot]="true" [path]="'$'" [defaultExpandState]="defaultExpandState()"></app-tree-node>
                    </div>
                  </div>
                }
              }
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class JsonFormatterComponent {
  public rawInput = signal<string>('');
  public indentSize = signal<number>(2);
  public viewMode = signal<string>('formatted');
  public copySuccess = signal<boolean>(false);
  public defaultExpandState = signal<{ state: boolean; version: number }>({ state: true, version: 0 });
  // Custom Signals for FullScreen and Preview Views
  public isInputFullScreen = signal<boolean>(false);
  public isOutputFullScreen = signal<boolean>(false);
  public isInputPreview = signal<boolean>(false);

  public highlightedInputText = computed(() => {
    return this.highlightJson(this.rawInput());
  });

  public highlightedJsonOutput = computed(() => {
    return this.highlightJson(this.formattedOutput());
  });

  public highlightJson(json: string): string {
    if (!json) return '';
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-400 font-semibold';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-purple-400 font-semibold';
          } else {
            cls = 'text-emerald-400 font-medium';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-blue-400 font-bold';
        } else if (/null/.test(match)) {
          cls = 'text-rose-450 font-bold';
        }
        
        if (/:$/.test(match)) {
          const key = match.substring(0, match.length - 1);
          return `<span class="${cls}">${key}</span>:`;
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  public expandAll(): void {
    this.defaultExpandState.update(v => ({ state: true, version: v.version + 1 }));
  }

  public collapseAll(): void {
    this.defaultExpandState.update(v => ({ state: false, version: v.version + 1 }));
  }

  public inputBeautify(): void {
    const obj = this.parsedObject();
    if (obj) {
      this.rawInput.set(JSON.stringify(obj, null, this.indentSize()));
    }
  }

  public inputSmartFormat(): void {
    const obj = this.parsedObject();
    if (obj) {
      this.rawInput.set(this.smartStringify(obj, this.indentSize()));
    }
  }

  public inputMinify(): void {
    const obj = this.parsedObject();
    if (obj) {
      this.rawInput.set(JSON.stringify(obj));
    }
  }

  public smartStringify(obj: unknown, indent = 2, currentIndent = ''): string {
    if (obj === null) return 'null';
    if (obj === undefined) return 'null';
    if (typeof obj === 'string') return JSON.stringify(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    
    const nextIndent = currentIndent + ' '.repeat(indent);
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const isSimple = obj.every(x => typeof x !== 'object' || x === null);
      const inline = '[' + obj.map(x => this.smartStringify(x, indent, '')).join(', ') + ']';
      if (isSimple && inline.length < 80) {
        return inline;
      }
      const entries = obj.map(x => nextIndent + this.smartStringify(x, indent, nextIndent));
      return '[\n' + entries.join(',\n') + '\n' + currentIndent + ']';
    }
    
    if (typeof obj === 'object') {
      const casted = obj as Record<string, unknown>;
      const keys = Object.keys(casted);
      if (keys.length === 0) return '{}';
      
      const isSimple = keys.every(k => typeof casted[k] !== 'object' || casted[k] === null);
      const inlineParts = keys.map(k => `"${k}": ${this.smartStringify(casted[k], indent, '')}`);
      const inline = '{ ' + inlineParts.join(', ') + ' }';
      if (isSimple && inline.length < 80) {
        return inline;
      }
      
      const entries = keys.map(k => {
        const formattedVal = this.smartStringify(casted[k], indent, nextIndent);
        return `${nextIndent}"${k}": ${formattedVal}`;
      });
      return '{\n' + entries.join(',\n') + '\n' + currentIndent + '}';
    }
    
    return JSON.stringify(obj);
  }

  public getRawInputLineNumbers = computed(() => {
    const lines = this.rawInput().split('\n').length;
    return Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1);
  });

  public getOutputLineNumbers = computed(() => {
    const text = this.output();
    if (!text) return [1];
    const count = text.split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  });

  // Parsed representation reactive computation
  public parsedObject = computed(() => {
    const raw = this.rawInput().trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  // Real-time RFC error detection
  public validationError = computed(() => {
    const raw = this.rawInput().trim();
    if (!raw) return null;
    try {
      JSON.parse(raw);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'JSON Hashing Check Failed.';
      return msg;
    }
  });

  // Formatted output text generator
  public formattedOutput = computed(() => {
    const obj = this.parsedObject();
    if (!obj) return '';
    const spacing = this.indentSize();
    if (spacing === 0) {
      return JSON.stringify(obj);
    }
    return JSON.stringify(obj, null, spacing);
  });

  // Dynamic YAML representation
  public yamlOutput = computed(() => {
    const obj = this.parsedObject();
    if (!obj) return '';
    return this.jsonToYaml(obj);
  });

  // Dynamic CSV representation
  public csvOutput = computed(() => {
    const obj = this.parsedObject();
    if (!obj) return '';
    return this.jsonToCsv(obj);
  });

  // Copy-compatible current viewing content
  public output = computed(() => {
    if (this.validationError()) return '';
    const mode = this.viewMode();
    if (mode === 'yaml') return this.yamlOutput();
    if (mode === 'csv') return this.csvOutput();
    if (mode === 'tree') return this.formattedOutput();
    return this.formattedOutput();
  });

  public onInputChange(val: string): void {
    this.rawInput.set(val);
  }

  public clearInput(): void {
    this.rawInput.set('');
  }

  public copyOutput(): void {
    const content = this.output();
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  public syncScroll(textarea: HTMLTextAreaElement, highlightId: string, gutterId?: string): void {
    const parent = textarea.parentElement;
    if (!parent) return;
    const highlightEl = parent.querySelector(`#${highlightId}`) as HTMLElement;
    if (highlightEl) {
      highlightEl.scrollTop = textarea.scrollTop;
      highlightEl.scrollLeft = textarea.scrollLeft;
    }
    if (gutterId) {
      let container: HTMLElement | null = parent;
      while (container && !container.querySelector(`#${gutterId}`)) {
        container = container.parentElement;
      }
      if (container) {
        const gutterEl = container.querySelector(`#${gutterId}`) as HTMLElement;
        if (gutterEl) {
          gutterEl.scrollTop = textarea.scrollTop;
        }
      }
    }
  }

  /**
   * Extremely neat JSON to YAML converter
   */
  private jsonToYaml(obj: unknown, depth = 0): string {
    const indent = '  '.repeat(depth);
    if (obj === null) return 'null';
    if (typeof obj !== 'object') {
      if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      let yaml = '';
      for (const item of obj) {
        const valStr = this.jsonToYaml(item, depth + 1).trim();
        const divider = valStr.startsWith('- ') || valStr.includes('\n') ? '\n' + '  '.repeat(depth + 1) : ' ';
        yaml += `${indent}-${divider}${valStr}\n`;
      }
      return yaml.trimEnd();
    }

    const typedObj = obj as Record<string, unknown>;
    const keys = Object.keys(typedObj);
    if (keys.length === 0) return '{}';
    let yaml = '';
    for (const key of keys) {
      const val = typedObj[key];
      const normalizedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
      
      if (val !== null && typeof val === 'object') {
        yaml += `${indent}${normalizedKey}:\n${this.jsonToYaml(val, depth + 1)}\n`;
      } else {
        yaml += `${indent}${normalizedKey}: ${this.jsonToYaml(val, depth + 1)}\n`;
      }
    }
    return yaml.trimEnd();
  }

  /**
   * Safe flat JSON to CSV parser
   */
  private jsonToCsv(obj: unknown): string {
    let flatArray: unknown[] = [];
    if (Array.isArray(obj)) {
      flatArray = obj;
    } else if (typeof obj === 'object' && obj !== null) {
      flatArray = [obj];
    } else {
      return 'Invalid CSV target';
    }

    // Isolate flat dictionary sets
    const rows = flatArray.map(item => this.flattenObject(item as Record<string, unknown>));
    if (rows.length === 0) return '';

    // Collect complete column sets
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    
    let csv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
    
    rows.forEach(row => {
      const line = headers.map(header => {
        const val = row[header];
        if (val === undefined || val === null) return '';
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(',');
      csv += line + '\n';
    });

    return csv.trim();
  }

  private flattenObject(ob: Record<string, unknown>): Record<string, unknown> {
    const toReturn: Record<string, unknown> = {};
    const keys = Object.keys(ob);
    for (const i of keys) {
      const val = ob[i];
      if (typeof val === 'object' && val !== null) {
        const flatObject = this.flattenObject(val as Record<string, unknown>);
        const flatKeys = Object.keys(flatObject);
        for (const x of flatKeys) {
          toReturn[i + '.' + x] = flatObject[x];
        }
      } else {
        toReturn[i] = val;
      }
    }
    return toReturn;
  }
}

/**
 * Collapsible Tree Rendering Component with Indexing and Path Tracking
 */
@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="pl-4 border-l border-zinc-805/70 py-1 font-mono text-[12px] select-text text-left">
      <!-- Row Header -->
      <div 
        class="flex items-center gap-1.5 flex-wrap py-0.5 rounded px-2 hover:bg-zinc-800/35 transition-all duration-150 select-none group/row relative"
      >
        <!-- Collapse Toggle Chevron -->
        @if (isObject || isArray) {
          <button (click)="toggleCollapse()" 
            class="text-zinc-500 hover:text-emerald-400 p-0.5 transition outline-none cursor-pointer flex items-center justify-center bg-transparent border-none cursor-pointer"
          >
            <mat-icon class="text-sm scale-90 align-middle">
              {{ collapsed() ? 'chevron_right' : 'expand_more' }}
            </mat-icon>
          </button>
        } @else {
          <span class="w-4 inline-block"></span>
        }

        <!-- Index marking & Key meta labels -->
        @if (keyIndex !== null) {
          @if (parentIsArray) {
            <span 
              (click)="toggleCollapseByClick()"
              (keydown.enter)="toggleCollapseByClick()"
              [attr.tabindex]="isObject || isArray ? '0' : null"
              [class.cursor-pointer]="isObject || isArray"
              title="Click to toggle collapse"
              class="text-[9px] text-zinc-500 bg-zinc-950 font-bold px-1 rounded select-none font-mono hover:text-emerald-450 transition outline-none"
            >[{{ keyIndex }}]</span>
          } @else {
            <span 
              (click)="toggleCollapseByClick()"
              (keydown.enter)="toggleCollapseByClick()"
              [attr.tabindex]="isObject || isArray ? '0' : null"
              [class.cursor-pointer]="isObject || isArray"
              title="Click to toggle collapse"
              class="text-[9px] text-zinc-550 font-mono select-none font-bold hover:text-emerald-450 transition outline-none"
            >#{{ keyIndex }}</span>
          }
        }

        <!-- Clickable label to collapse by key -->
        @if (key) {
          @if (isObject || isArray) {
            <span 
              (click)="toggleCollapseByClick()" 
              (keydown.enter)="toggleCollapseByClick()"
              tabindex="0"
              role="button"
              class="text-purple-400 font-bold italic cursor-pointer hover:text-purple-300 outline-none select-none"
            >
              "{{ key }}"
            </span>
          } @else {
            <span class="text-purple-400 font-semibold italic select-all">"{{ key }}"</span>
          }
          <span class="text-zinc-650 font-bold select-none">:</span>
        } @else if (isRoot) {
          <span 
            (click)="toggleCollapseByClick()" 
            (keydown.enter)="toggleCollapseByClick()"
            tabindex="0"
            role="button"
            class="text-emerald-400 font-bold select-none text-[10px] uppercase cursor-pointer hover:text-emerald-300 ml-1 outline-none"
          >
            ROOT PAYLOAD
          </span>
        }

        <!-- Value rendering for primitives -->
        @if (!isObject && !isArray) {
          @if (valueType === 'string') {
            <span class="text-emerald-400 select-all font-sans font-medium break-all">"{{ value }}"</span>
          } @else if (valueType === 'number') {
            <span class="text-amber-400 select-all font-sans font-semibold">{{ value }}</span>
          } @else if (valueType === 'boolean') {
            <span class="text-blue-400 select-all font-sans font-bold">{{ value }}</span>
          } @else if (value === null) {
            <span class="text-rose-450 select-all font-sans font-bold">null</span>
          } @else {
            <span class="text-zinc-400 select-all font-sans">{{ value }}</span>
          }
        } @else {
          <!-- Object/Array brackets annotation -->
          <span class="text-zinc-500 font-bold select-none">{{ isObject ? '{' : '[' }}</span>
          <span class="text-[10px] text-zinc-600 font-bold tracking-wider uppercase select-none">
            {{ isObject ? (objectKeys.length + ' keys') : (getAsArray(value).length + ' items') }}
          </span>
          @if (collapsed()) {
            <span class="text-zinc-500 font-bold select-none">{{ isObject ? '}' : ']' }}</span>
          }
        }

        <!-- Hover utilities for direct JSON path copying -->
        <div class="hidden group-hover/row:flex items-center gap-1.5 ml-auto opacity-0 group-hover/row:opacity-100 transition-opacity select-none pl-3">
          <button (click)="copyPathToClipboard(path)" title="Copy JSON path index"
            class="p-0.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-850 rounded transition-all flex items-center justify-center cursor-pointer scale-90 border-none bg-transparent cursor-pointer"
          >
            <mat-icon class="text-xs scale-90">{{ copySuccess ? 'check' : 'assignment' }}</mat-icon>
            <span class="text-[9px] font-mono lowercase text-zinc-500 ml-0.5">{{ copySuccess ? 'copied' : 'path' }}</span>
          </button>
        </div>
      </div>

      <!-- Recursive child containers -->
      @if ((isObject || isArray) && !collapsed()) {
        <div class="space-y-1 mt-1 transition-all">
          @if (isObject) {
            @for (cKey of objectKeys; track cKey) {
              <app-tree-node 
                [value]="getAsRecord(value)[cKey]" 
                [key]="cKey"
                [keyIndex]="$index"
                [parentIsArray]="false"
                [path]="getChildPath(cKey, false)"
                [defaultExpandState]="defaultExpandState()"
              >
              </app-tree-node>
            }
          } @else if (isArray) {
            @for (item of getAsArray(value); track $index) {
              <app-tree-node 
                [value]="item" 
                [key]="null"
                [keyIndex]="$index"
                [parentIsArray]="true"
                [path]="getChildPath($index, true)"
                [defaultExpandState]="defaultExpandState()"
              >
              </app-tree-node>
            }
          }
          <!-- Close brackets -->
          <div class="pl-2 select-none text-zinc-500 font-bold py-0.5 mt-1">{{ isObject ? '}' : ']' }}</div>
        </div>
      }
    </div>
  `
})
export class TreeNodeComponent {
  private _value: unknown = null;
  public collapsed = signal<boolean>(false);

  public valueType = 'undefined';
  public isObject = false;
  public isArray = false;
  public objectKeys: string[] = [];
  public copySuccess = false;

  @Input() key: string | null = null;
  @Input() keyIndex: number | null = null;
  @Input() parentIsArray = false;
  @Input() path = '$';
  @Input() isRoot = false;

  public defaultExpandState = input<{ state: boolean; version: number }>({ state: true, version: 0 });

  constructor() {
    effect(() => {
      const state = this.defaultExpandState();
      this.collapsed.set(!state.state);
    }, { allowSignalWrites: true });
  }

  @Input() set value(val: unknown) {
    this._value = val;
    this.analyzeValue();
  }

  get value(): unknown {
    return this._value;
  }

  public getAsRecord(val: unknown): Record<string, unknown> {
    if (val && typeof val === 'object') {
      return val as Record<string, unknown>;
    }
    return {};
  }

  public getAsArray(val: unknown): unknown[] {
    if (Array.isArray(val)) {
      return val;
    }
    return [];
  }

  private analyzeValue(): void {
    if (this._value === null) {
      this.valueType = 'null';
      this.isObject = false;
      this.isArray = false;
    } else if (Array.isArray(this._value)) {
      this.valueType = 'array';
      this.isArray = true;
      this.isObject = false;
    } else if (typeof this._value === 'object') {
      this.valueType = 'object';
      this.isObject = true;
      this.isArray = false;
      this.objectKeys = Object.keys(this._value as Record<string, unknown>);
    } else {
      this.valueType = typeof this._value;
      this.isObject = false;
      this.isArray = false;
    }
  }

  public toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }

  public toggleCollapseByClick(): void {
    if (this.isObject || this.isArray) {
      this.toggleCollapse();
    }
  }

  public getChildPath(childKey: string | number, isArray: boolean): string {
    const parentPath = this.path || '$';
    const keyStr = String(childKey);
    if (isArray) {
      return `${parentPath}[${keyStr}]`;
    }
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(keyStr)) {
      return `${parentPath}.${keyStr}`;
    }
    return `${parentPath}["${keyStr.replace(/"/g, '\\"')}"]`;
  }

  public copyPathToClipboard(path: string): void {
    if (!path) return;
    navigator.clipboard.writeText(path).then(() => {
      this.copySuccess = true;
      setTimeout(() => this.copySuccess = false, 1500);
    });
  }
}
