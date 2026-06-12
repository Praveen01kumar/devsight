import { ChangeDetectionStrategy, Component, signal, computed, Input, Output, EventEmitter, forwardRef, OnChanges, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// Interface definitions
export interface DiffLine {
  type: 'added' | 'removed' | 'unmodified' | 'modified';
  leftLineNum?: number;
  rightLineNum?: number;
  content: string;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface TreeChangePayload {
  action: 'rename-key' | 'set-value';
  oldKey?: string;
  newKey?: string;
  value?: unknown;
}

const SCHEMA_PRESETS: Record<string, Record<string, unknown>> = {
  'basic-profile': {
    type: 'object',
    required: ['id', 'name', 'email'],
    properties: {
      id: { type: 'number', minimum: 1 },
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      isAdmin: { type: 'boolean' },
      roles: { type: 'array', items: { type: 'string' } }
    }
  },
  'package-json': {
    type: 'object',
    required: ['name', 'version'],
    properties: {
      name: { type: 'string', pattern: '^[a-z0-9-_]+$' },
      version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      private: { type: 'boolean' },
      dependencies: { type: 'object' },
      devDependencies: { type: 'object' }
    }
  },
  'config-options': {
    type: 'object',
    required: ['environment', 'port', 'features'],
    properties: {
      environment: { type: 'string' },
      port: { type: 'number', minimum: 80, maximum: 65535 },
      features: {
        type: 'object',
        required: ['darkMode', 'logging'],
        properties: {
          darkMode: { type: 'boolean' },
          logging: { type: 'boolean' }
        }
      }
    }
  }
};

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [CommonModule, MatIconModule, forwardRef(() => JsonEditorTreeNodeComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 select-text text-left">
      <!-- File Operations & Utility Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
        <div class="flex flex-wrap items-center gap-2">
          <!-- File Import -->
          <button (click)="fileInput.click()" class="relative px-3.5 py-1.5 border border-zinc-800 hover:border-zinc-705 bg-zinc-900 text-xs font-mono font-bold rounded-xl text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
            <mat-icon class="text-xs scale-75">upload_file</mat-icon> OPEN FILE
            <input #fileInput type="file" (change)="onFileSelected($event)" accept=".json" class="hidden" />
          </button>

          <!-- File Save -->
          <button (click)="saveToFile()" class="px-3.5 py-1.5 border border-zinc-800 hover:border-zinc-705 bg-zinc-900 text-xs font-mono font-bold rounded-xl text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
            <mat-icon class="text-xs scale-75">download</mat-icon> SAVE FILE
          </button>

          <div class="h-4 w-px bg-zinc-800 mx-1"></div>

          <!-- Undo / Redo Actions -->
          <button (click)="undo()" [disabled]="!canUndo()" class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-705 disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-900 text-xs font-mono font-bold rounded-xl text-zinc-300 hover:text-white transition cursor-pointer" title="Undo">
            <mat-icon class="text-xs scale-75">undo</mat-icon>
          </button>
          <button (click)="redo()" [disabled]="!canRedo()" class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-705 disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-900 text-xs font-mono font-bold rounded-xl text-zinc-300 hover:text-white transition cursor-pointer" title="Redo">
            <mat-icon class="text-xs scale-75">redo</mat-icon>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Quick Format Utilities -->
          <button (click)="beautify()" class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-705 bg-zinc-900 text-xs font-mono font-bold rounded-xl text-emerald-400 hover:text-emerald-350 transition flex items-center gap-1 cursor-pointer">
            <mat-icon class="text-xs scale-75">format_align_left</mat-icon> BEAUTIFY
          </button>
          <button (click)="minify()" class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-705 bg-zinc-900 text-xs font-mono font-bold rounded-xl text-amber-400 hover:text-amber-350 transition flex items-center gap-1 cursor-pointer">
            <mat-icon class="text-xs scale-75">compress</mat-icon> MINIFY
          </button>
          <div class="flex bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
            <button (click)="sortTreeKeys(true)" title="Sort Keys Ascending" style="line-height: 20px;" class="px-1 py-0.5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
              <mat-icon class="text-xs scale-75">sort_by_alpha</mat-icon>
            </button>
            <button (click)="sortTreeKeys(false)" title="Sort Keys Descending" style="line-height: 20px;" class="px-1 py-0.5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
              <mat-icon class="text-xs scale-75" style="transform: scaleY(-1)">sort_by_alpha</mat-icon>
            </button>
          </div>

          <button (click)="copyToClipboard()" class="px-3 py-1.5 border border-emerald-950 hover:bg-emerald-950/20 bg-zinc-900 text-xs font-mono font-bold rounded-xl text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
            <mat-icon class="text-xs scale-75">{{ justCopied() ? 'check' : 'content_copy' }}</mat-icon>
            {{ justCopied() ? 'COPIED!' : 'COPY' }}
          </button>
        </div>
      </div>

      <!-- Segment Tabs (Editor vs Compare vs Projection vs Schema validation) -->
      <div class="border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-1">
          @for (tab of ['editor', 'diff', 'transformations', 'schema']; track tab) {
            <button (click)="activeTab.set(tab)"
              [class.border-emerald-500]="activeTab() === tab"
              [class.text-emerald-400]="activeTab() === tab"
              [class.border-transparent]="activeTab() !== tab"
              [class.text-zinc-450]="activeTab() !== tab"
              class="px-4 py-2 border-b-2 font-mono text-xs font-bold uppercase transition hover:text-white cursor-pointer"
            >
              {{ tab === 'diff' ? 'Diff Comparison' : tab }}
            </button>
          }
        </div>

        <div class="flex items-center gap-2 text-[10px] font-mono text-zinc-500 leading-none mr-2">
          <span>SIZE: {{ jsonSize() }} bytes</span>
          <span>&bull;</span>
          <span>KEYS: {{ jsonKeyCount() }}</span>
        </div>
      </div>

      <!-- TAB 1: INTERACTIVE EDITOR -->
      @if (activeTab() === 'editor') {
        <div class="space-y-4">
          <!-- Sub-view choices layout selector -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              @for (vMode of ['text', 'tree', 'table', 'split']; track vMode) {
                <button (click)="editorSubView.set(vMode)"
                  [class.bg-zinc-800]="editorSubView() === vMode"
                  [class.text-white]="editorSubView() === vMode"
                  [class.text-zinc-500]="editorSubView() !== vMode"
                  class="px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg transition cursor-pointer"
                >
                  {{ vMode }} View
                </button>
              }
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Formatting & Expansion Controls -->
              <div class="flex flex-wrap items-center bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-800 gap-1 select-none">
                <button (click)="expandAll()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none text-zinc-400 font-mono font-bold cursor-pointer"
                  title="Expand All Nodes"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">unfold_more</mat-icon> EXPAND
                </button>
                <button (click)="collapseAll()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none text-zinc-400 font-mono font-bold cursor-pointer"
                  title="Collapse All Nodes"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">unfold_less</mat-icon> COLLAPSE
                </button>
                <div class="w-px h-3 bg-zinc-805 mx-0.5"></div>
                <button (click)="beautify()" [disabled]="!parsedData()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-emerald-400 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none font-mono font-bold cursor-pointer"
                  title="Format JSON with indent and new lines"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">format_align_left</mat-icon> FORMAT
                </button>
                <button (click)="beautifySmart()"
                  [disabled]="!parsedData()" class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-blue-400 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none font-mono font-bold cursor-pointer"
                  title="Smart Format (compact, inline simple arrays/items)"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">auto_awesome</mat-icon> SMART
                </button>
                <button (click)="minify()" [disabled]="!parsedData()"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-amber-450 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none font-mono font-bold cursor-pointer"
                  title="Compact JSON (minify, remove whitespaces)"
                >
                  <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">compress</mat-icon> COMPACT
                </button>
              </div>

              <button (click)="isEditorFullScreen.set(!isEditorFullScreen())"
                class="px-2.5 py-1 border border-zinc-800 bg-zinc-950 text-[10px] font-mono font-bold rounded-lg text-zinc-400 hover:text-white hover:border-zinc-70 transition flex items-center gap-1 cursor-pointer bg-transparent cursor-pointer"
                [title]="isEditorFullScreen() ? 'Exit Full Screen' : 'Full Screen View'"
              >
                <mat-icon class="scale-75">{{ isEditorFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                {{ isEditorFullScreen() ? 'EXIT' : 'FULL' }}
              </button>
              <span class="text-[10px] text-zinc-500 font-mono italic hidden sm:inline">Drag & drop files to open</span>
            </div>
          </div>

          <!-- Drag drop area container -->
          <div (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDropped($event)" [class.border-emerald-500]="isDraggingOver()"
            [class]="isEditorFullScreen() ? 'fixed inset-0 z-[9999] bg-zinc-900 p-4 md:p-6 w-full h-full shadow-2xl flex flex-col animate-fade-in' : 'relative min-h-[400px] border border-zinc-800 bg-zinc-900/10 rounded-2xl overflow-hidden flex flex-col' "
          >
            @if (isDraggingOver()) {
              <div class="absolute inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-400 space-y-2 select-none pointer-events-none">
                <mat-icon class="text-5xl">upload_file</mat-icon>
                <h3 class="text-lg font-bold font-mono">DROP FILE HERE TO IMPORT</h3>
                <p class="text-xs text-emerald-500">Only .json matches are accepted</p>
              </div>
            }

            @if (isEditorFullScreen()) {
              <div class="flex items-center justify-between px-4 py-3 bg-zinc-955 border-b border-zinc-800 rounded-2xl mb-4 shrink-0 select-none animate-fade-in">
                <div class="flex items-center gap-3">
                  <span class="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex items-center justify-center">
                    <mat-icon class="text-xs scale-90">fullscreen</mat-icon>
                  </span>
                  <div>
                    <h3 class="text-xs font-bold text-white font-mono tracking-wider text-left">FULL SCREEN ACTIVE WORKSPACE</h3>
                    <p class="text-[9px] text-zinc-500 text-left">Edit, inspect and format raw property trees</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap text-zinc-400 font-mono font-bold">
                  <!-- Formatting & Expansion Controls (Full Screen) -->
                  <div class="flex items-center bg-zinc-950 px-1.5 py-0.5 rounded-lg border border-zinc-805 gap-1 select-none scale-90 origin-right">
                    <button (click)="expandAll()"
                      class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                      title="Expand All Nodes"
                    >
                      <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_more</mat-icon> EXPAND
                    </button>
                    <button (click)="collapseAll()"
                      class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                      title="Collapse All Nodes"
                    >
                      <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_less</mat-icon> COLLAPSE
                    </button>
                    <div class="w-px h-3 bg-zinc-805 mx-0.5"></div>
                    <button (click)="beautify()" [disabled]="!parsedData()"
                      class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-404 hover:text-emerald-400 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                      title="Format JSON with indent and new lines"
                    >
                      <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">format_align_left</mat-icon> FORMAT
                    </button>
                    <button (click)="beautifySmart()" [disabled]="!parsedData()"
                      class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-404 hover:text-blue-400 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                      title="Smart Format (compact, inline simple arrays/items)"
                    >
                      <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">auto_awesome</mat-icon> SMART
                    </button>
                    <button (click)="minify()" [disabled]="!parsedData()"
                      class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-404 hover:text-amber-450 hover:disabled:text-zinc-450 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                      title="Compact JSON (minify)"
                    >
                      <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">compress</mat-icon> COMPACT
                    </button>
                  </div>

                  <!-- View switcher inside full screen -->
                  <div class="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 mr-2">
                    @for (vMode of ['text', 'tree', 'table', 'split']; track vMode) {
                      <button (click)="editorSubView.set(vMode)"
                        [class.bg-zinc-800]="editorSubView() === vMode"
                        [class.text-white]="editorSubView() === vMode"
                        [class.text-zinc-550]="editorSubView() !== vMode"
                        class="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition cursor-pointer bg-transparent border-none cursor-pointer"
                      >
                        {{ vMode }}
                      </button>
                    }
                  </div>

                  <button (click)="isEditorFullScreen.set(false)"
                    class="px-3 py-1 bg-red-950 hover:bg-red-900 border border-red-900/40 text-red-300 text-[10px] font-mono font-bold uppercase rounded-lg transition flex items-center gap-1 cursor-pointer bg-transparent cursor-pointer"
                    title="Exit Full Screen"
                  >
                    <mat-icon class="text-xs scale-75">fullscreen_exit</mat-icon>
                    EXIT
                  </button>
                </div>
              </div>
            }

            <!-- Auto-repair assistance panel inside drag-drop area container to be visible in full screen -->
            @if (parsingError()) {
              <div class="p-4 bg-rose-950/20 border-b border-rose-900/40 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left w-full">
                <div class="space-y-1">
                  <div class="flex items-center gap-2 text-rose-450 font-bold text-xs font-mono">
                    <mat-icon class="align-middle text-sm">error_outline</mat-icon>
                    INVALID JSON DETECTED
                  </div>
                  <p class="text-[11px] text-rose-350 font-mono leading-relaxed select-all">
                    {{ parsingError() }}
                  </p>
                </div>
                <button (click)="attemptAutoRepair()" class="px-3 py-1.5 bg-rose-900 text-rose-100 hover:bg-rose-800 transition text-[11px] font-mono font-bold rounded-lg flex items-center gap-1 self-start sm:self-center shrink-0 cursor-pointer">
                  <mat-icon class="text-xs scale-75">auto_fix_high</mat-icon> AUTO-REPAIR JSON
                </button>
              </div>
            }

            <!-- Sub-view: Text View -->
            @if (editorSubView() === 'text') {
              <div class="flex-1 flex min-h-[400px]">
                <!-- Gutter line numbers -->
                <div id="textGutterEl" class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-655 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-hidden">
                  @for (num of getLineNumbers(); track num) {
                    <div>{{ num }}</div>
                  }
                </div>
                <div class="flex-grow h-full relative overflow-hidden bg-zinc-900 flex-1 min-h-[400px]">
                  @if (rawText()) {
                    <pre 
                      id="textHighlightEl"
                      class="absolute inset-0 p-4 text-xs font-mono text-zinc-100 whitespace-pre overflow-hidden leading-relaxed select-none pointer-events-none text-left" 
                      [innerHTML]="highlightedInputText()"
                    ></pre>
                  }
                  <textarea
                    #textEditorEl
                    [value]="rawText()"
                    (input)="onRawTextChange(textEditorEl.value)"
                    (scroll)="syncScroll(textEditorEl, 'textHighlightEl', 'textGutterEl')"
                    placeholder="Paste raw JSON here..."
                    class="absolute inset-0 w-full h-full p-4 text-xs font-mono text-transparent bg-transparent caret-zinc-100 selection:bg-zinc-700/50 selection:text-zinc-100 border-none outline-none resize-none focus:ring-0 overflow-auto leading-relaxed whitespace-pre text-left"
                  ></textarea>
                </div>
              </div>
            }

            <!-- Sub-view: Tree View -->
            @if (editorSubView() === 'tree') {
              <div [class]="isEditorFullScreen() ? 'p-6 overflow-auto flex-1' : 'p-6 overflow-auto max-h-[500px]'">
                @if (!parsingError() && parsedData()) {
                  <app-json-editor-tree-node
                    [value]="parsedData()" [key]="'Root'" [isRoot]="true" [path]="'$'"
                    [defaultExpandState]="defaultExpandState()"
                    (valueChanged)="updateTreeValue($event)"
                  />
                } @else {
                  <div class="h-[250px] flex flex-col items-center justify-center text-center text-zinc-650 space-y-2">
                    <mat-icon class="text-3xl">warning</mat-icon>
                    <p class="text-xs font-bold uppercase font-mono">Tree View Blocked</p>
                    <p class="text-[11px] text-zinc-500 font-sans max-w-xs leading-relaxed">Fix the syntax error or run Auto-Repair to parse the tree hierarchy.</p>
                  </div>
                }
              </div>
            }

            <!-- Sub-view: Table View -->
            @if (editorSubView() === 'table') {
              <div [class]="isEditorFullScreen() ? 'p-4 overflow-auto flex-1 flex flex-col' : 'p-4 overflow-auto max-h-[500px] flex-grow flex flex-col'">
                @if (isTableCompatible()) {
                  <div class="mb-4 bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between gap-3">
                    <span class="text-xs font-bold font-mono text-zinc-400">TABLE OBJECT ARRAY ({{ tableRows().length }} rows)</span>
                    <button (click)="addRowToTable()" class="px-2.5 py-1.5 bg-emerald-950 text-emerald-400 bg-emerald-900 text-emerald-100 hover:bg-emerald-800 transition text-[10px] font-mono font-bold rounded-lg flex items-center gap-1 cursor-pointer">
                      <mat-icon class="text-xs scale-75">add</mat-icon> ADD ROW
                    </button>
                  </div>

                  <div class="overflow-x-auto border border-zinc-800 rounded-xl">
                    <table class="w-full text-xs font-mono text-zinc-350 select-text border-collapse">
                      <thead>
                        <tr class="bg-zinc-950 border-b border-zinc-850 select-none text-zinc-400 text-[10px] font-bold uppercase">
                          <th class="p-3 text-left w-12 border-r border-zinc-850">Idx</th>
                          @for (col of tableColumns(); track col) {
                            <th class="p-3 text-left border-r border-zinc-850 relative group">
                              <span>{{ col }}</span>
                              <button (click)="deleteTableColumn(col)" class="absolute right-1 top-2.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-455 transition p-0.5 cursor-pointer">
                                <mat-icon class="text-xs">delete</mat-icon>
                              </button>
                            </th>
                          }
                          <th class="p-3 text-left w-14">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of tableRows(); track $index) {
                          <tr class="border-b border-zinc-850/60 hover:bg-zinc-950/20">
                            <td class="p-3 text-center border-r border-zinc-855 text-zinc-655 bg-zinc-950/10 font-bold select-none">{{ $index }}</td>
                            @for (col of tableColumns(); track col) {
                              <td class="p-2 border-r border-zinc-855">
                                <input 
                                  type="text"
                                  [value]="stringifyTableCell(row[col])"
                                  (change)="onTableCellChanged($index, col, $any($event.target).value)"
                                  class="w-full bg-transparent p-1 border-none focus:ring-1 focus:ring-emerald-500 rounded outline-none text-zinc-100" 
                                />
                              </td>
                            }
                            <td class="p-2 text-center">
                              <button (click)="deleteTableRow($index)" class="text-zinc-500 hover:text-rose-400 transition cursor-pointer" title="Delete Row">
                                <mat-icon class="text-sm">delete</mat-icon>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="h-64 flex flex-col items-center justify-center text-center text-zinc-605 space-y-2 select-none">
                    <mat-icon class="text-4xl text-zinc-700">grid_on</mat-icon>
                    <p class="text-xs font-bold font-mono">Not Table-Compatible</p>
                    <p class="text-[11px] text-zinc-505 font-sans max-w-sm leading-relaxed">
                      Table view is dedicated to datasets consisting of an **Array of Objects** (e.g. <code>[&#123;"id": 1, ...&#125;, ...]</code>).
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Sub-view: Split View (Side-by-side syncing) -->
            @if (editorSubView() === 'split') {
              <div class="flex-grow flex flex-col md:flex-row min-h-[400px]">
                <!-- Left Source text element -->
                <div class="flex-1 border-r border-zinc-800 flex flex-col">
                  <div class="px-3.5 py-1.5 bg-zinc-950 border-b border-zinc-800 font-mono text-[10px] font-bold text-zinc-550 select-none flex items-center justify-between">
                    <span>SOURCE TEXT PANELS</span>
                    <span class="text-[9px] text-emerald-400 font-bold uppercase">LIVE SYNTAX ACTIVE</span>
                  </div>
                  <div class="flex-grow relative overflow-hidden bg-zinc-900 flex-1 min-h-[350px]">
                    @if (rawText()) {
                      <pre 
                        id="splitHighlightTextEl"
                        class="absolute inset-0 p-4 text-xs font-mono text-zinc-105 whitespace-pre overflow-hidden leading-relaxed select-none pointer-events-none text-left" 
                        [innerHTML]="highlightedInputText()"
                      ></pre>
                    }
                    <textarea
                      #splitTextareaEl
                      [value]="rawText()"
                      (input)="onRawTextChange(splitTextareaEl.value)"
                      (scroll)="syncScroll(splitTextareaEl, 'splitHighlightTextEl')"
                      placeholder="Raw JSON source..."
                      class="absolute inset-0 w-full h-full p-4 text-xs font-mono text-transparent bg-transparent caret-zinc-100 selection:bg-zinc-700/50 selection:text-zinc-100 border-none outline-none resize-none focus:ring-0 overflow-auto leading-relaxed whitespace-pre text-left"
                    ></textarea>
                  </div>
                </div>

                <!-- Right Live Tree view element -->
                <div class="flex-grow flex-1 flex flex-col">
                  <div class="px-3.5 py-1.5 bg-zinc-950 border-b border-zinc-800 font-mono text-[10px] font-bold text-zinc-510 select-none">
                    LIVE COLLAPSIBLE TRUNK
                  </div>
                  <div [class]="isEditorFullScreen() ? 'p-4 overflow-auto flex-grow flex-1' : 'p-4 overflow-auto max-h-[500px]'">
                    @if (!parsingError() && parsedData()) {
                      <app-json-editor-tree-node [value]="parsedData()" [key]="'Root'" [isRoot]="true" [defaultExpandState]="defaultExpandState()"
                        (valueChanged)="updateTreeValue($event)"
                      />
                    } @else {
                      <div class="p-4 italic text-zinc-600 text-xs font-mono">Live tree not syncing due to errors</div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 2: SIDE BY SIDE DIFF COMPONENT -->
      @if (activeTab() === 'diff') {
        <div class="space-y-4">
          <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-3">
            <h3 class="text-sm font-bold text-white font-sans">Compare Active with Secondary JSON</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <span class="text-[10px] text-zinc-400 font-bold font-mono block">SECONDARY COMPARISON RAW INPUT</span>
                <textarea
                  #secondaryInputEl
                  [value]="compareText()"
                  (input)="compareText.set(secondaryInputEl.value)"
                  placeholder="Paste target JSON structure to compare..."
                  class="w-full h-32 p-3 bg-zinc-950 rounded-xl text-xs font-mono text-zinc-105 border border-zinc-850 outline-none resize-none focus:border-zinc-700"
                ></textarea>
              </div>

              <!-- Stats panel and helpers -->
              <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex flex-col justify-between">
                <div class="space-y-2">
                  <span class="text-[10px] font-bold text-zinc-505 font-mono tracking-wider block">COMPARATIVE STATS</span>
                  <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div class="p-1.5 border border-emerald-900 bg-emerald-950/10 text-emerald-400 rounded-lg font-bold">
                      <div class="text-sm leading-none">{{ diffStats().added }}</div>
                      <div class="text-[8px] uppercase tracking-wide text-zinc-505">Adds</div>
                    </div>
                    <div class="p-1.5 border border-rose-950 bg-rose-955/10 text-rose-450 rounded-lg font-bold">
                      <div class="text-sm leading-none">{{ diffStats().removed }}</div>
                      <div class="text-[8px] uppercase tracking-wide text-zinc-505">Dels</div>
                    </div>
                    <div class="p-1.5 border border-amber-950 bg-amber-955/10 text-amber-400 rounded-lg font-bold">
                      <div class="text-sm leading-none">{{ diffStats().modified }}</div>
                      <div class="text-[8px] uppercase tracking-wide text-zinc-505">Mods</div>
                    </div>
                  </div>
                </div>

                <button (click)="compareText.set(rawText())" class="px-3 py-1.5 hover:bg-zinc-800 bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 hover:text-white rounded-lg transition self-start select-none cursor-pointer">
                  COPY CURRENT ACTIVE SOURCE
                </button>
              </div>
            </div>
          </div>

          <!-- Diff Grid renders side-by-side layout -->
          <div class="grid grid-cols-1 md:grid-cols-2 border border-zinc-800 bg-zinc-900 rounded-2xl overflow-hidden font-mono text-xs">
            <!-- Left active view panel -->
            <div class="flex flex-col border-b md:border-b-0 md:border-r border-zinc-800">
              <div class="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-bold text-zinc-505">
                ACTIVE CODES (A)
              </div>
              <div 
                [class.max-h-80]="!isEditorFullScreen()"
                [class.h-[60vh]]="isEditorFullScreen()"
                class="p-3 overflow-auto bg-zinc-950/15 space-y-0.5"
              >
                @for (dLine of finalDiff().left; track $index) {
                  <div 
                    [class.bg-rose-950/30]="dLine.type === 'removed'"
                    [class.text-rose-400]="dLine.type === 'removed'"
                    [class.bg-amber-950/20]="dLine.type === 'modified'"
                    [class.text-amber-400]="dLine.type === 'modified'"
                    class="flex items-baseline"
                  >
                    <span class="w-8 select-none text-zinc-705 text-[9px] text-right pr-2 shrink-0">{{ dLine.leftLineNum || '' }}</span>
                    <span class="whitespace-pre-wrap select-all">{{ dLine.content || ' ' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Right compare target view panel -->
            <div class="flex flex-col">
              <div class="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-bold text-zinc-505">
                COMPARE CODES (B)
              </div>
              <div 
                [class.max-h-80]="!isEditorFullScreen()"
                [class.h-[60vh]]="isEditorFullScreen()"
                class="p-3 overflow-auto bg-zinc-950/15 space-y-0.5"
              >
                @for (dLine of finalDiff().right; track $index) {
                  <div 
                    [class.bg-emerald-950/20]="dLine.type === 'added'"
                    [class.text-emerald-400]="dLine.type === 'added'"
                    [class.bg-amber-950/20]="dLine.type === 'modified'"
                    [class.text-amber-400]="dLine.type === 'modified'"
                    class="flex items-baseline"
                  >
                    <span class="w-8 select-none text-zinc-705 text-[9px] text-right pr-2 shrink-0">{{ dLine.rightLineNum || '' }}</span>
                    <span class="whitespace-pre-wrap select-all">{{ dLine.content || ' ' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: KEY TRANSFORMATIONS -->
      @if (activeTab() === 'transformations') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-5 border border-zinc-800 bg-zinc-900 rounded-2xl block space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-white">Filtering & Path Projections</h3>
              <p class="text-[11px] text-zinc-455 mt-0.5">Retrieve values inside nested nodes using keys or array indices.</p>
            </div>

            <div class="space-y-4">
              <!-- Field query input -->
              <div class="space-y-1.5">
                <span class="text-[10px] font-mono text-zinc-455 font-bold block">DOT NOTATION FILTER PATH</span>
                <div class="flex gap-2">
                  <input 
                    #projectionInput
                    type="text" 
                    placeholder="e.g. metadata.name or items[0]" 
                    class="flex-1 bg-zinc-950 border border-zinc-850 p-2.5 text-xs font-mono rounded-xl outline-none text-zinc-200 focus:border-zinc-700" 
                  />
                  <button (click)="runProjectionQuery(projectionInput.value)" class="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 transition text-[11px] font-mono font-bold rounded-xl text-emerald-100 cursor-pointer">
                    FIND
                  </button>
                </div>
              </div>

              <div class="h-px bg-zinc-850"></div>

              <!-- General Operations -->
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-zinc-505 font-mono block">CONVERSION TRANSFORMERS</span>
                <div class="grid grid-cols-2 gap-2">
                  <button (click)="flattenPayload()" class="p-2.5 border border-zinc-850 hover:bg-zinc-950/40 bg-zinc-950/20 text-[11px] font-mono rounded-xl text-zinc-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer">
                    <mat-icon class="text-sm">splitscreen</mat-icon> FLATTEN
                  </button>
                  <button (click)="unflattenPayload()" class="p-2.5 border border-zinc-850 hover:bg-zinc-950/40 bg-zinc-950/20 text-[11px] font-mono rounded-xl text-zinc-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer">
                    <mat-icon class="text-sm">layers</mat-icon> UNFLATTEN
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Projected subfields outcome -->
          <div class="p-5 border border-zinc-800 bg-zinc-900 rounded-2xl flex flex-col justify-between">
            <div class="space-y-1.5">
              <span class="text-[10px] font-bold text-zinc-500 font-mono block">OUTCOME PREVIEW</span>
              <div 
                [class.h-44]="!isEditorFullScreen()"
                [class.h-80]="isEditorFullScreen()"
                class="bg-zinc-950 p-3 rounded-xl border border-zinc-850 font-mono text-xs overflow-auto text-zinc-200"
              >
                @if (transformationPreview()) {
                  <pre class="leading-relaxed whitespace-pre select-all text-zinc-100" [innerHTML]="highlightedTransformationPreview()"></pre>
                } @else {
                  <div class="h-full flex items-center justify-center text-zinc-655 italic select-none">No active queries executed...</div>
                }
              </div>
            </div>

            @if (transformationPreview()) {
              <button (click)="overwriteActiveWithTransformation()" class="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 transition font-mono font-bold rounded-xl text-emerald-100 text-xs mt-3 select-none cursor-pointer">
                OVERWRITE CURRENT WITH THIS RESULT
              </button>
            }
          </div>
        </div>
      }

      <!-- TAB 4: SCHEMA COMPLIANCE CHECKS -->
      @if (activeTab() === 'schema') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-5 border border-zinc-800 bg-zinc-900 rounded-2xl block space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-semibold text-white">JSON Schema Validation</h3>
                <p class="text-[11px] text-zinc-455 mt-0.5">Input custom standards or apply standard profiles.</p>
              </div>

              <select 
                #schSelected
                (change)="applySchemaPreset(schSelected.value)"
                class="bg-zinc-950 border border-zinc-850 text-xs font-mono text-zinc-400 rounded-lg p-1 px-2 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="custom">Custom Schema</option>
                <option value="basic-profile">User Profile Preset</option>
                <option value="package-json">package.json Preset</option>
                <option value="config-options">App Configurations Preset</option>
              </select>
            </div>

            <textarea
              #schemaInputEl
              [value]="schemaRulesText()"
              (input)="schemaRulesText.set(schemaInputEl.value)"
              placeholder="Input custom Schema rules..."
              [class.h-56]="!isEditorFullScreen()"
              [class.h-80]="isEditorFullScreen()"
              class="w-full p-3 bg-zinc-950 rounded-xl text-xs font-mono text-zinc-250 border border-zinc-850 outline-none resize-none focus:border-zinc-700 font-medium"
            ></textarea>
          </div>

          <!-- Feedbacks of Validation -->
          <div class="p-5 border border-zinc-800 bg-zinc-900 rounded-2xl flex flex-col justify-between">
            <div class="space-y-2 flex-1 flex flex-col justify-start">
              <span class="text-[10px] font-bold text-zinc-500 font-mono block">SCHEMA REPORTS</span>
              <div [class.max-h-56]="!isEditorFullScreen()" [class.h-80]="isEditorFullScreen()"
                class="flex-1 overflow-auto p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2"
              >
                @if (schemaSyntaxParseError()) {
                  <div class="p-2.5 bg-rose-955/20 text-rose-400 border border-rose-900/40 text-xs rounded-lg font-mono leading-relaxed font-semibold">
                    <strong>Schema Parsing Syntax Error:</strong>
                    <p class="text-[11px] text-rose-300 font-normal mt-0.5">{{ schemaSyntaxParseError() }}</p>
                  </div>
                } @else {
                  @if (schemaComplianceReports().length === 0) {
                    <div class="py-12 flex flex-col items-center justify-center text-center text-emerald-400 space-y-1.5 select-none font-mono">
                      <mat-icon class="text-4xl text-emerald-500">verified</mat-icon>
                      <h4 class="font-bold text-xs select-none">VALIDATION SUCCESS!</h4>
                      <p class="text-[11px] text-zinc-500 font-sans max-w-xs">All fields completely match the defined JSON Schema bounds.</p>
                    </div>
                  } @else {
                    <div class="space-y-2 select-text text-left">
                      <span class="text-[10.5px] font-mono uppercase font-bold text-rose-450 block mb-2">Non-Compliant Errors Found:</span>
                      @for (err of schemaComplianceReports(); track $index) {
                        <div class="p-2.5 border border-zinc-850 bg-zinc-955/30 rounded-lg text-xs font-mono text-zinc-350">
                          <div class="font-bold text-emerald-450">Field: {{ err.path }}</div>
                          <p class="text-[11px] text-zinc-400 mt-0.5 leading-normal">{{ err.message }}</p>
                          @if (err.expected) {
                            <div class="text-[10px] text-zinc-505 font-bold flex gap-3 flex-wrap mt-1">
                              <span>Config Target: <code class="text-amber-450">{{ err.expected }}</code></span>
                              <span>Found Type: <code class="text-rose-450">{{ err.actual }}</code></span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    textarea {
      box-shadow: none !important;
    }
  `
})
export class JsonEditorComponent {
  public rawText = signal<string>('{\n  "id": 1,\n  "name": "devsight - JSON Editor Test",\n  "version": "1.0.0",\n  "active": true,\n  "tags": ["formatting", "validation", "comparison"],\n  "metadata": {\n    "author": "Google DeepMind",\n    "port": 3000\n  }\n}');
  public compareText = signal<string>('{\n  "id": 1,\n  "name": "devsight - JSON Editor Compare",\n  "version": "1.0.1",\n  "active": false,\n  "tags": ["formatting", "validation", "diff"],\n  "metadata": {\n    "author": "DeepMind",\n    "port": 3000\n  }\n}');
  public activeTab = signal<string>('editor');
  public editorSubView = signal<string>('text');
  public defaultExpandState = signal<{ state: boolean; version: number }>({ state: true, version: 0 });

  // FullScreen and Input Preview support signals
  public isEditorFullScreen = signal<boolean>(false);
  public isInputPreview = signal<boolean>(false);

  public highlightedInputText = computed(() => {
    return this.highlightJson(this.rawText());
  });

  public highlightedTransformationPreview = computed(() => {
    return this.highlightJson(this.transformationPreview());
  });

  public highlightJson(json: string): string {
    if (!json) return '';
    const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  // Custom Signals for History Storage Undo / Redo
  private changeHistory: string[] = [];
  private historyPointer = -1;
  public justCopied = signal<boolean>(false);
  public isDraggingOver = signal<boolean>(false);

  // Schema state declarations
  public schemaRulesText = signal<string>('{\n  "type": "object",\n  "required": ["id", "name", "version"],\n  "properties": {\n    "id": { "type": "number", "minimum": 1 },\n    "name": { "type": "string", "minLength": 3 },\n    "version": { "type": "string" },\n    "active": { "type": "boolean" },\n    "tags": {\n      "type": "array",\n      "items": { "type": "string" }\n    }\n  }\n}');

  // Custom Transformations projection results preview
  public transformationPreview = signal<string>('');

  constructor() {
    this.recordStateInHistory(this.rawText());
  }

  // Reactive state conversions
  public parsedData = computed<unknown>(() => {
    const txt = this.rawText().trim();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  });

  public parsingError = computed<string | null>(() => {
    const txt = this.rawText().trim();
    if (!txt) return null;
    try {
      JSON.parse(txt);
      return null;
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e.message;
      }
      return 'JSON Parser verification rejected standard parameters.';
    }
  });

  public schemaSyntaxParseError = computed<string | null>(() => {
    const rulesStr = this.schemaRulesText().trim();
    if (!rulesStr) return null;
    try {
      JSON.parse(rulesStr);
      return null;
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e.message;
      }
      return 'Invalid Schema syntax. Paste standard JSON Schema draft content.';
    }
  });

  public schemaComplianceReports = computed<SchemaValidationError[]>(() => {
    const data = this.parsedData();
    const syntaxErr = this.schemaSyntaxParseError();
    if (!data || syntaxErr) return [];
    try {
      const sch = JSON.parse(this.schemaRulesText()) as Record<string, unknown>;
      return this.validateRulesSchema(data, sch);
    } catch {
      return [];
    }
  });

  public jsonSize = computed<number>(() => {
    return this.rawText().length;
  });

  public jsonKeyCount = computed<number>(() => {
    const data = this.parsedData();
    if (!data) return 0;
    return this.countKeysRecursive(data);
  });

  // Table computations
  public isTableCompatible = computed<boolean>(() => {
    const data = this.parsedData();
    if (!data) return false;
    return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null;
  });

  public tableColumns = computed<string[]>(() => {
    const data = this.parsedData();
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    const keysSet = new Set<string>();
    data.forEach((row: unknown) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  });

  public tableRows = computed<Record<string, unknown>[]>(() => {
    const data = this.parsedData();
    if (!data || !Array.isArray(data)) return [];
    return data as Record<string, unknown>[];
  });

  // Diff Calculations
  public finalDiff = computed<{ left: DiffLine[], right: DiffLine[] }>(() => {
    return this.computeSideBySideDiff(this.rawText(), this.compareText());
  });

  public diffStats = computed<{ added: number, removed: number, modified: number }>(() => {
    const differences = this.finalDiff();
    let added = 0;
    let removed = 0;
    let modified = 0;
    differences.left.forEach((l) => {
      if (l.type === 'removed') removed++;
      if (l.type === 'modified') modified++;
    });
    differences.right.forEach((r) => {
      if (r.type === 'added') added++;
    });
    return { added, removed, modified };
  });

  // Gutter array helper
  public getLineNumbers(): number[] {
    const count = this.rawText().split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }

  // Raw text handler with Undo storage
  public onRawTextChange(val: string): void {
    this.rawText.set(val);
    this.recordStateInHistory(val);
  }

  // Schema presets selection
  public applySchemaPreset(presetName: string): void {
    if (presetName === 'custom') return;
    const rules = SCHEMA_PRESETS[presetName];
    if (rules) {
      this.schemaRulesText.set(JSON.stringify(rules, null, 2));
    }
  }

  // Undo / Redo engine
  private recordStateInHistory(v: string): void {
    // Trim future history if we were in the middle of a stack branch
    if (this.historyPointer < this.changeHistory.length - 1) {
      this.changeHistory = this.changeHistory.slice(0, this.historyPointer + 1);
    }
    // Prevent duplicated adjacent elements
    if (this.changeHistory.length > 0 && this.changeHistory[this.changeHistory.length - 1] === v) {
      return;
    }
    this.changeHistory.push(v);
    this.historyPointer = this.changeHistory.length - 1;
  }

  public canUndo(): boolean {
    return this.historyPointer > 0;
  }

  public canRedo(): boolean {
    return this.historyPointer < this.changeHistory.length - 1;
  }

  public undo(): void {
    if (this.canUndo()) {
      this.historyPointer--;
      this.rawText.set(this.changeHistory[this.historyPointer]);
    }
  }

  public redo(): void {
    if (this.canRedo()) {
      this.historyPointer++;
      this.rawText.set(this.changeHistory[this.historyPointer]);
    }
  }

  // Format operations
  public beautify(): void {
    const data = this.parsedData();
    if (data) {
      const formatted = JSON.stringify(data, null, 2);
      this.rawText.set(formatted);
      this.recordStateInHistory(formatted);
    }
  }

  public minify(): void {
    const data = this.parsedData();
    if (data) {
      const minified = JSON.stringify(data);
      this.rawText.set(minified);
      this.recordStateInHistory(minified);
    }
  }

  public sortTreeKeys(asc = true): void {
    const data = this.parsedData();
    if (data) {
      const sorted = this.deepSortObject(data, asc);
      const output = JSON.stringify(sorted, null, 2);
      this.rawText.set(output);
      this.recordStateInHistory(output);
    }
  }

  private deepSortObject(obj: unknown, asc: boolean): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((i: unknown) => this.deepSortObject(i, asc));
    }
    const sortedRecord: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort((a, b) => {
      return asc ? a.localeCompare(b) : b.localeCompare(a);
    });
    const casted = obj as Record<string, unknown>;
    keys.forEach((k) => {
      sortedRecord[k] = this.deepSortObject(casted[k], asc);
    });
    return sortedRecord;
  }

  // Mutable tree nodes receiver updates
  public updateTreeValue(payload: TreeChangePayload): void {
    const val = payload.value;
    const txt = JSON.stringify(val, null, 2);
    this.rawText.set(txt);
    this.recordStateInHistory(txt);
  }

  // Tree expansion triggers
  public expandAll(): void {
    this.defaultExpandState.update(v => ({ state: true, version: v.version + 1 }));
  }

  public collapseAll(): void {
    this.defaultExpandState.update(v => ({ state: false, version: v.version + 1 }));
  }

  public beautifySmart(): void {
    const data = this.parsedData();
    if (data) {
      const formatted = this.smartStringify(data, 2);
      this.rawText.set(formatted);
      this.recordStateInHistory(formatted);
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

  // File loading drag details
  public onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(true);
  }

  public onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(false);
  }

  public onFileDropped(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.readLocalImportFile(files[0]);
    }
  }

  public onFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.readLocalImportFile(target.files[0]);
    }
  }

  private readLocalImportFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      const txt = event.target?.result as string;
      if (txt) {
        this.rawText.set(txt);
        this.recordStateInHistory(txt);
      }
    };
    reader.readAsText(file);
  }

  public saveToFile(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.rawText());
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "devsight_export.json");
    dlAnchorElem.click();
  }

  public copyToClipboard(): void {
    navigator.clipboard.writeText(this.rawText()).then(() => {
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 2000);
    });
  }

  // Auto Repair logic
  public attemptAutoRepair(): void {
    let text = this.rawText().trim();
    if (!text) return;
    // Recovery routine: Convert single quotes inside keys/values boundary
    // Strip trailing commas inside lists/records
    text = text.replace(/,\s*([\]}])/g, '$1');
    // Wrap naked keys
    text = text.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    // Replace single quotes with standard double quotes
    text = text.replace(/'([^']*)'/g, '"$1"');
    // Balance closures
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && text[i - 1] !== '\\') {
        inString = !inString;
      }
      if (!inString) {
        if (c === '{') braceCount++;
        else if (c === '}') braceCount--;
        else if (c === '[') bracketCount++;
        else if (c === ']') bracketCount--;
      }
    }

    while (braceCount > 0) { text += '}'; braceCount--; }
    while (bracketCount > 0) { text += ']'; bracketCount--; }

    try {
      const obj = JSON.parse(text) as unknown;
      const clean = JSON.stringify(obj, null, 2);
      this.rawText.set(clean);
      this.recordStateInHistory(clean);
    } catch {
      // Best effort recovery failed, update with semi-checked raw text
      this.rawText.set(text);
    }
  }

  // Table cell handlers
  public stringifyTableCell(cell: unknown): string {
    if (cell === null) return 'null';
    if (typeof cell === 'object') return JSON.stringify(cell);
    return String(cell);
  }

  public onTableCellChanged(rowIndex: number, col: string, value: string): void {
    const list = [...this.tableRows()];
    if (rowIndex < list.length) {
      let parsedVal: unknown = value;
      // Intelligently parse types if possible
      if (value.toLowerCase() === 'true') parsedVal = true;
      else if (value.toLowerCase() === 'false') parsedVal = false;
      else if (value.toLowerCase() === 'null') parsedVal = null;
      else if (!isNaN(Number(value)) && value.trim() !== '') parsedVal = Number(value);
      else {
        try {
          if (value.startsWith('{') || value.startsWith('[')) {
            parsedVal = JSON.parse(value) as unknown;
          }
        } catch {
          // Keep raw string on catch parsing
        }
      }

      list[rowIndex] = { ...list[rowIndex], [col]: parsedVal };
      const output = JSON.stringify(list, null, 2);
      this.rawText.set(output);
      this.recordStateInHistory(output);
    }
  }

  public addRowToTable(): void {
    const list = [...this.tableRows()];
    const cols = this.tableColumns();
    const newRow: Record<string, unknown> = {};
    cols.forEach((col) => { newRow[col] = ''; });
    list.push(newRow);
    const output = JSON.stringify(list, null, 2);
    this.rawText.set(output);
    this.recordStateInHistory(output);
  }

  public deleteTableRow(index: number): void {
    const list = this.tableRows().filter((_, i) => i !== index);
    const output = JSON.stringify(list, null, 2);
    this.rawText.set(output);
    this.recordStateInHistory(output);
  }

  public deleteTableColumn(col: string): void {
    const list = this.tableRows().map((row) => {
      const copy = { ...row };
      delete copy[col];
      return copy;
    });
    const output = JSON.stringify(list, null, 2);
    this.rawText.set(output);
    this.recordStateInHistory(output);
  }

  // Transformation Queries projection helpers
  public runProjectionQuery(path: string): void {
    const data = this.parsedData();
    if (!data) {
      this.transformationPreview.set('Cannot run projection when source has JSON syntax errors.');
      return;
    }
    try {
      const queryResult = this.resolvePathProjection(data, path);
      this.transformationPreview.set(JSON.stringify(queryResult, null, 2));
    } catch {
      this.transformationPreview.set('Invalid path query parameters or non-existent path elements.');
    }
  }

  private resolvePathProjection(obj: unknown, path: string): unknown {
    if (!path.trim()) return obj;
    // Normalize path by splitting properties and brackets
    const parts = path.split(/\.|\b(?=\[)/g);
    let current: unknown = obj;
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.startsWith('[')) {
        const indexStr = part.replace('[', '').replace(']', '').trim();
        const indexNum = Number(indexStr);
        if (Array.isArray(current)) {
          current = current[indexNum];
        } else {
          return undefined;
        }
      } else {
        if (current && typeof current === 'object') {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
    }
    return current;
  }

  public overwriteActiveWithTransformation(): void {
    const preview = this.transformationPreview().trim();
    if (preview && !preview.includes('Cannot run') && !preview.includes('Invalid path')) {
      this.rawText.set(preview);
      this.recordStateInHistory(preview);
      this.activeTab.set('editor');
    }
  }

  public flattenPayload(): void {
    const data = this.parsedData();
    if (data) {
      const flat = this.flattenObjectRecursive(data);
      const text = JSON.stringify(flat, null, 2);
      this.transformationPreview.set(text);
    }
  }

  private flattenObjectRecursive(ob: unknown, prefix = ''): Record<string, unknown> {
    const toReturn: Record<string, unknown> = {};
    if (ob && typeof ob === 'object') {
      const casted = ob as Record<string, unknown>;
      for (const i in casted) {
        if (Object.prototype.hasOwnProperty.call(casted, i)) {
          if (typeof casted[i] === 'object' && casted[i] !== null) {
            const flatObject = this.flattenObjectRecursive(casted[i], prefix ? prefix + '.' + i : i);
            for (const x in flatObject) {
              if (Object.prototype.hasOwnProperty.call(flatObject, x)) {
                toReturn[x] = flatObject[x];
              }
            }
          } else {
            toReturn[prefix ? prefix + '.' + i : i] = casted[i];
          }
        }
      }
    }
    return toReturn;
  }

  public unflattenPayload(): void {
    const data = this.parsedData();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const casted = data as Record<string, unknown>;
      const unflattened = this.unflattenObjectRecursive(casted);
      const text = JSON.stringify(unflattened, null, 2);
      this.transformationPreview.set(text);
    } else {
      this.transformationPreview.set('Unflatten is only compatible with flat key-value object dictionaries.');
    }
  }

  private unflattenObjectRecursive(ob: Record<string, unknown>): unknown {
    const result: Record<string, unknown> = {};
    for (const i in ob) {
      if (Object.prototype.hasOwnProperty.call(ob, i)) {
        const keys = i.split('.');
        let current = result;
        for (let j = 0; j < keys.length; j++) {
          const key = keys[j];
          if (j === keys.length - 1) {
            current[key] = ob[i];
          } else {
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
          }
        }
      }
    }
    return result;
  }

  // Recursively check elements schema validation helper
  private validateRulesSchema(data: unknown, schema: Record<string, unknown>, path = ''): SchemaValidationError[] {
    const errors: SchemaValidationError[] = [];
    if (!schema || typeof schema !== 'object') return errors;
    const currPath = path || 'root';

    if (schema['type']) {
      const actualType = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema['type']) {
        errors.push({
          path: currPath,
          message: `Expected type ${String(schema['type'])} but detected ${actualType}`,
          expected: String(schema['type']),
          actual: actualType
        });
        return errors;
      }
    }

    if (schema['properties'] && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const datObj = data as Record<string, unknown>;
      if (schema['required'] && Array.isArray(schema['required'])) {
        schema['required'].forEach((req: unknown) => {
          const reqStr = String(req);
          if (!(reqStr in datObj)) {
            errors.push({ path: `${currPath}.${reqStr}`, message: `Required key '${reqStr}' is missing.` });
          }
        });
      }

      const props = schema['properties'] as Record<string, unknown>;
      Object.entries(props).forEach(([key, ruleSub]) => {
        if (key in datObj) {
          errors.push(...this.validateRulesSchema(datObj[key], ruleSub as Record<string, unknown>, `${currPath}.${key}`));
        }
      });
    }

    if (schema['items'] && Array.isArray(data)) {
      data.forEach((item: unknown, index: number) => {
        errors.push(...this.validateRulesSchema(item, schema['items'] as Record<string, unknown>, `${currPath}[${index}]`));
      });
    }

    if (typeof data === 'number') {
      if (schema['minimum'] !== undefined && data < (schema['minimum'] as number)) {
        errors.push({ path: currPath, message: `Value ${data} is less than required minimum ${String(schema['minimum'])}` });
      }
      if (schema['maximum'] !== undefined && data > (schema['maximum'] as number)) {
        errors.push({ path: currPath, message: `Value ${data} exceeds required maximum ${String(schema['maximum'])}` });
      }
    }

    if (typeof data === 'string') {
      if (schema['minLength'] !== undefined && data.length < (schema['minLength'] as number)) {
        errors.push({ path: currPath, message: `String length is shorter than minLength ${String(schema['minLength'])}` });
      }
      if (schema['pattern']) {
        try {
          const regex = new RegExp(schema['pattern'] as string);
          if (!regex.test(data)) {
            errors.push({ path: currPath, message: `String value "${data}" does not conform to regex pattern rules: ${String(schema['pattern'])}` });
          }
        } catch {
          // Ignore invalid regex configuration silently
        }
      }
    }

    return errors;
  }

  // Side by Side differences comparison
  private computeSideBySideDiff(textA: string, textB: string): { left: DiffLine[], right: DiffLine[] } {
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    let i = 0;
    let j = 0;
    while (i < linesA.length || j < linesB.length) {
      const lineA = linesA[i];
      const lineB = linesB[j];

      if (i < linesA.length && j < linesB.length && lineA === lineB) {
        left.push({ type: 'unmodified', leftLineNum: i + 1, content: lineA });
        right.push({ type: 'unmodified', rightLineNum: j + 1, content: lineB });
        i++;
        j++;
      } else {
        const idxInB = linesB.indexOf(lineA, j);
        const idxInA = linesA.indexOf(lineB, i);

        if (idxInB !== -1 && (idxInA === -1 || idxInB - j < idxInA - i)) {
          while (j < idxInB) {
            left.push({ type: 'unmodified', content: '' });
            right.push({ type: 'added', rightLineNum: j + 1, content: linesB[j] });
            j++;
          }
        } else if (idxInA !== -1) {
          while (i < idxInA) {
            left.push({ type: 'removed', leftLineNum: i + 1, content: linesA[i] });
            right.push({ type: 'unmodified', content: '' });
            i++;
          }
        } else {
          if (i < linesA.length && j < linesB.length) {
            left.push({ type: 'removed', leftLineNum: i + 1, content: linesA[i] });
            right.push({ type: 'added', rightLineNum: j + 1, content: linesB[j] });
            i++;
            j++;
          } else if (i < linesA.length) {
            left.push({ type: 'removed', leftLineNum: i + 1, content: linesA[i] });
            right.push({ type: 'unmodified', content: '' });
            i++;
          } else if (j < linesB.length) {
            left.push({ type: 'unmodified', content: '' });
            right.push({ type: 'added', rightLineNum: j + 1, content: linesB[j] });
            j++;
          }
        }
      }
    }

    return { left, right };
  }

  // Helpers recursive key count
  private countKeysRecursive(data: unknown): number {
    if (data === null || typeof data !== 'object') return 0;
    let count = 0;
    if (Array.isArray(data)) {
      data.forEach((item: unknown) => { count += this.countKeysRecursive(item); });
    } else {
      const casted = data as Record<string, unknown>;
      const keys = Object.keys(casted);
      count += keys.length;
      keys.forEach((k) => { count += this.countKeysRecursive(casted[k]); });
    }
    return count;
  }
}

/**
 * HIGH-INTERACTIVE SUB-CELL RECURSIVE NODE COMPONENT
 */
@Component({
  selector: 'app-json-editor-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="pl-4 border-l border-zinc-800/80 py-1.5 font-mono text-xs text-zinc-300">
      <!-- Node Header -->
      <div class="flex items-center gap-1.5 flex-wrap py-0.5 group relative">
        @if (isObject || isArray) {
          <button (click)="toggleCollapse()" class="text-zinc-500 hover:text-emerald-400 p-0.5 transition outline-none cursor-pointer bg-transparent border-none cursor-pointer">
            <mat-icon class="text-sm scale-90 align-middle">
              {{ collapsed() ? 'chevron_right' : 'expand_more' }}
            </mat-icon>
          </button>
        } @else {
          <span class="w-5 inline-block"></span>
        }

        <!-- Index marker for object keys -->
        @if (keyIndex !== null && !parentIsArray) {
          <span (click)="toggleCollapseByClick()"
            (keydown.enter)="toggleCollapseByClick()"
            [attr.tabindex]="isObject || isArray ? '0' : null"
            [class.cursor-pointer]="isObject || isArray"
            title="Click to toggle collapse"
            class="text-[9px] text-zinc-550 font-mono select-none font-bold mr-0.5 hover:text-emerald-450 transition outline-none"
          >#{{ keyIndex }}</span>
        }

        <!-- Key Labels (Click/Double-click to toggle collapse) -->
        @if (isRoot) {
          <span (click)="toggleCollapseByClick()" (keydown.enter)="toggleCollapseByClick()" [attr.tabindex]="isObject || isArray ? '0' : null" (dblclick)="toggleCollapse()" [class.cursor-pointer]="isObject || isArray" title="Click to toggle collapse" class="text-emerald-400 font-bold select-none text-[11px] hover:text-emerald-300 transition outline-none">[Root Object]</span>
        } @else if (parentIsArray) {
          <span (click)="toggleCollapseByClick()" (keydown.enter)="toggleCollapseByClick()" [attr.tabindex]="isObject || isArray ? '0' : null" (dblclick)="toggleCollapse()" [class.cursor-pointer]="isObject || isArray" title="Click to toggle collapse" class="text-[10px] text-zinc-505 font-bold select-none pr-1 hover:text-emerald-450 transition outline-none">[{{ key }}]</span>
        } @else {
          <input type="text" [value]="key" (dblclick)="toggleCollapse()"
            title="Double click to toggle collapse, single click to rename key"
            (change)="onKeyChange($any($event.target).value)"
            class="bg-transparent hover:bg-zinc-800 focus:bg-zinc-950 p-0.5 rounded outline-none text-purple-400 hover:text-purple-300 focus:text-white transition font-bold max-w-[124px] select-all border-none focus:ring-1 focus:ring-emerald-500" 
          />
          <span class="text-zinc-650">:</span>
        }

        <!-- Type Select Dropdown -->
        <select 
          [value]="valueType"
          (change)="onTypeChange($any($event.target).value)"
          class="bg-zinc-950 text-[10px] text-zinc-550 font-mono border border-zinc-855 rounded px-1.5 py-0.5 hover:text-zinc-350 select-none cursor-pointer transition scale-90"
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
          <option value="null">null</option>
        </select>

        <!-- Dynamic value fields based on type -->
        @if (!isObject && !isArray && valueType !== 'null') {
          @if (valueType === 'boolean') {
            <input type="checkbox" [checked]="valueAsBoolean()" (change)="onValueChange($any($event.target).checked)"
              class="rounded border-zinc-800 text-emerald-555 bg-zinc-950 cursor-pointer ml-1"
            />
          } @else if (valueType === 'number') {
            <input type="number" [value]="value" (change)="onValueChange(+$any($event.target).value)"
              class="bg-zinc-950 hover:bg-zinc-850 p-0.5 px-1.5 rounded outline-none text-amber-400 text-xs w-20 border border-zinc-850 focus:ring-1 focus:ring-emerald-500 text-left font-semibold"
            />
          } @else {
            <input type="text" [value]="value" (change)="onValueChange($any($event.target).value)"
              class="bg-transparent hover:bg-zinc-850 p-0.5 px-1 rounded outline-none text-emerald-400 focus:bg-zinc-950 transition flex-grow min-w-[100px] select-all border-none focus:ring-1 focus:ring-emerald-500"
            />
          }
        }

        <!-- Items/properties indicator metadata -->
        @if (isObject) {
          <span class="text-zinc-650 select-none">&#123;&bull;&#125;</span>
          <span class="text-[9.5px] text-zinc-550 font-bold tracking-wider uppercase select-none font-mono">({{ objectKeys.length }} items)</span>
        } @else if (isArray) {
          <span class="text-zinc-650 select-none">[&bull;]</span>
          <span class="text-[9.5px] text-zinc-550 font-bold tracking-wider uppercase select-none font-mono">({{ arrayItems.length }} list)</span>
        }

        <!-- Manipulations toolbar -->
        <div class="flex items-center gap-1.5 ml-auto opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity select-none bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800/40">
          <!-- Copy Path Hover -->
          <button (click)="copyPathToClipboard(path)" title="Copy JSON Path Index" class="p-0.5 text-zinc-500 hover:text-emerald-450 rounded hover:bg-zinc-800 transition flex items-center justify-center cursor-pointer scale-90 border-none bg-transparent cursor-pointer"
          >
            <mat-icon class="text-xs scale-90">{{ copySuccess ? 'check' : 'assignment' }}</mat-icon>
          </button>
          @if (isObject || isArray) {
            <button (click)="addChildProperty()" title="Add Child Parameter" class="p-0.5 hover:text-emerald-450 text-zinc-500 transition cursor-pointer bg-transparent border-none cursor-pointer">
              <mat-icon class="text-sm">add</mat-icon>
            </button>
          }
          @if (!isRoot) {
            <button (click)="duplicateNode()" title="Duplicate Node" class="p-0.5 hover:text-blue-400 text-zinc-500 transition cursor-pointer bg-transparent border-none cursor-pointer">
              <mat-icon class="text-sm scale-90">content_copy</mat-icon>
            </button>
            <button (click)="moveNodeUp()" title="Move Up" class="p-0.5 hover:text-zinc-200 text-zinc-500 transition cursor-pointer bg-transparent border-none cursor-pointer">
              <mat-icon class="text-sm">arrow_upward</mat-icon>
            </button>
            <button (click)="moveNodeDown()" title="Move Down" class="p-0.5 hover:text-zinc-200 text-zinc-500 transition cursor-pointer bg-transparent border-none cursor-pointer">
              <mat-icon class="text-sm">arrow_downward</mat-icon>
            </button>
            <button (click)="deleteNode()" title="Delete Node" class="p-0.5 hover:text-rose-455 text-zinc-500 transition cursor-pointer bg-transparent border-none cursor-pointer">
              <mat-icon class="text-sm">delete</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Recursive render paths nested folders -->
      @if ((isObject || isArray) && !collapsed()) {
        <div class="space-y-1.5 mt-1 select-text">
          @if (isObject) {
            @for (cKey of objectKeys; track cKey) {
              <div class="group">
                <app-json-editor-tree-node
                  [value]="getAsRecord(value)[cKey]"
                  [key]="cKey"
                  [keyIndex]="$index"
                  [path]="getChildPath(cKey, false)"
                  [parentIsArray]="false"
                  [defaultExpandState]="defaultExpandState()"
                  (valueChanged)="updateChildEntry(cKey, $event)"
                  (deleteRequest)="deleteChildKey(cKey)"
                  (duplicateRequest)="duplicateChildKey(cKey)"
                  (moveUpRequest)="moveChildKeyUp(cKey)"
                  (moveDownRequest)="moveChildKeyDown(cKey)"
                />
              </div>
            }
          } @else if (isArray) {
            @for (arrElem of arrayItems; track $index) {
              <div class="group">
                <app-json-editor-tree-node
                  [value]="arrElem"
                  [key]="String($index)"
                  [keyIndex]="$index"
                  [path]="getChildPath($index, true)"
                  [parentIsArray]="true"
                  [defaultExpandState]="defaultExpandState()"
                  (valueChanged)="updateChildIndex($index, $event)"
                  (deleteRequest)="deleteChildIndex($index)"
                  (duplicateRequest)="duplicateChildIndex($index)"
                  (moveUpRequest)="moveChildIndexUp($index)"
                  (moveDownRequest)="moveChildIndexDown($index)"
                />
              </div>
            }
          }
        </div>
      }
    </div>
  `
})
export class JsonEditorTreeNodeComponent implements OnChanges {
  @Input() key = '';
  @Input() value: unknown = null;
  @Input() parentIsArray = false;
  @Input() isRoot = false;
  @Input() keyIndex: number | null = null;
  @Input() path = '';

  public defaultExpandState = input<{ state: boolean; version: number }>({ state: true, version: 0 });

  constructor() {
    effect(() => {
      const state = this.defaultExpandState();
      this.collapsed.set(!state.state);
    }, { allowSignalWrites: true });
  }

  public collapsed = signal<boolean>(false);
  public copySuccess = false;

  @Output() valueChanged = new EventEmitter<TreeChangePayload>();
  @Output() deleteRequest = new EventEmitter<void>();
  @Output() duplicateRequest = new EventEmitter<void>();
  @Output() moveUpRequest = new EventEmitter<void>();
  @Output() moveDownRequest = new EventEmitter<void>();

  public valueType = 'null';
  public isObject = false;
  public isArray = false;
  public objectKeys: string[] = [];
  public arrayItems: unknown[] = [];
  public String = String;

  ngOnChanges(): void {
    this.analyzeNodeValue();
  }

  private analyzeNodeValue(): void {
    if (this.value === null) {
      this.valueType = 'null';
      this.isObject = false;
      this.isArray = false;
    } else if (Array.isArray(this.value)) {
      this.valueType = 'array';
      this.isArray = true;
      this.isObject = false;
      this.arrayItems = [...this.value];
    } else if (typeof this.value === 'object') {
      this.valueType = 'object';
      this.isObject = true;
      this.isArray = false;
      this.objectKeys = Object.keys(this.value);
    } else {
      this.valueType = typeof this.value;
      this.isObject = false;
      this.isArray = false;
    }
  }

  public valueAsBoolean(): boolean {
    return Boolean(this.value);
  }

  public onKeyChange(kText: string): void {
    if (!kText.trim()) return;
    this.valueChanged.emit({ action: 'rename-key', oldKey: this.key, newKey: kText.trim(), value: this.value });
  }

  public onValueChange(vVal: unknown): void {
    this.valueChanged.emit({ action: 'set-value', value: vVal });
  }

  public onTypeChange(tString: string): void {
    let def: unknown = null;
    if (tString === 'string') def = '';
    else if (tString === 'number') def = 0;
    else if (tString === 'boolean') def = false;
    else if (tString === 'object') def = {};
    else if (tString === 'array') def = [];

    this.valueChanged.emit({ action: 'set-value', value: def });
  }

  // Node modifications emitting
  public updateChildEntry(childKey: string, payload: TreeChangePayload): void {
    const record = { ...this.getAsRecord(this.value) };
    if (payload.action === 'rename-key') {
      const { oldKey, newKey, value } = payload;
      if (oldKey && newKey) {
        const updated: Record<string, unknown> = {};
        Object.keys(record).forEach((rk) => {
          if (rk === oldKey) {
            updated[newKey] = value;
          } else {
            updated[rk] = record[rk];
          }
        });
        this.valueChanged.emit({ action: 'set-value', value: updated });
      }
    } else if (payload.action === 'set-value') {
      record[childKey] = payload.value;
      this.valueChanged.emit({ action: 'set-value', value: record });
    }
  }

  public updateChildIndex(idx: number, payload: TreeChangePayload): void {
    const list = [...this.arrayItems];
    if (payload.action === 'set-value') {
      list[idx] = payload.value;
      this.valueChanged.emit({ action: 'set-value', value: list });
    }
  }

  public addChildProperty(): void {
    this.collapsed.set(false);
    if (this.isObject) {
      const record = { ...this.getAsRecord(this.value) };
      let newKey = 'property';
      let cnt = 1;
      while (newKey in record) {
        newKey = `property_${cnt}`;
        cnt++;
      }
      record[newKey] = '';
      this.valueChanged.emit({ action: 'set-value', value: record });
    } else if (this.isArray) {
      const list = [...this.arrayItems, ''];
      this.valueChanged.emit({ action: 'set-value', value: list });
    }
  }

  // Node bubbles events upwards
  public deleteNode(): void { this.deleteRequest.emit(); }
  public duplicateNode(): void { this.duplicateRequest.emit(); }
  public moveNodeUp(): void { this.moveUpRequest.emit(); }
  public moveNodeDown(): void { this.moveDownRequest.emit(); }

  // Nested child mutations object-level handlers
  public deleteChildKey(childKey: string): void {
    const record = { ...this.getAsRecord(this.value) };
    delete record[childKey];
    this.valueChanged.emit({ action: 'set-value', value: record });
  }

  public duplicateChildKey(childKey: string): void {
    const record = { ...this.getAsRecord(this.value) };
    const val = record[childKey];
    let newKey = `${childKey}_copy`;
    let cnt = 1;
    while (newKey in record) {
      newKey = `${childKey}_copy_${cnt}`;
      cnt++;
    }
    const duplicated: Record<string, unknown> = {};
    Object.keys(record).forEach((k) => {
      duplicated[k] = record[k];
      if (k === childKey) {
        duplicated[newKey] = val && typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
      }
    });
    this.valueChanged.emit({ action: 'set-value', value: duplicated });
  }

  public moveChildKeyUp(childKey: string): void {
    const record = { ...this.getAsRecord(this.value) };
    const keys = Object.keys(record);
    const idx = keys.indexOf(childKey);
    if (idx > 0) {
      keys[idx] = keys[idx - 1];
      keys[idx - 1] = childKey;
      const reordered: Record<string, unknown> = {};
      keys.forEach((k) => { reordered[k] = record[k]; });
      this.valueChanged.emit({ action: 'set-value', value: reordered });
    }
  }

  public moveChildKeyDown(childKey: string): void {
    const record = { ...this.getAsRecord(this.value) };
    const keys = Object.keys(record);
    const idx = keys.indexOf(childKey);
    if (idx !== -1 && idx < keys.length - 1) {
      keys[idx] = keys[idx + 1];
      keys[idx + 1] = childKey;
      const reordered: Record<string, unknown> = {};
      keys.forEach((k) => { reordered[k] = record[k]; });
      this.valueChanged.emit({ action: 'set-value', value: reordered });
    }
  }

  // Nested child mutations array-level handlers
  public deleteChildIndex(index: number): void {
    const list = this.arrayItems.filter((_, i) => i !== index);
    this.valueChanged.emit({ action: 'set-value', value: list });
  }

  public duplicateChildIndex(index: number): void {
    const list = [...this.arrayItems];
    const elem = list[index];
    const clone = elem && typeof elem === 'object' ? JSON.parse(JSON.stringify(elem)) : elem;
    list.splice(index + 1, 0, clone);
    this.valueChanged.emit({ action: 'set-value', value: list });
  }

  public moveChildIndexUp(index: number): void {
    if (index > 0) {
      const list = [...this.arrayItems];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      this.valueChanged.emit({ action: 'set-value', value: list });
    }
  }

  public moveChildIndexDown(index: number): void {
    if (index < this.arrayItems.length - 1) {
      const list = [...this.arrayItems];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      this.valueChanged.emit({ action: 'set-value', value: list });
    }
  }

  public getAsRecord(val: unknown): Record<string, unknown> {
    return val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
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

  public toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  public toggleCollapseByClick(): void {
    if (this.isObject || this.isArray) {
      this.toggleCollapse();
    }
  }
}
