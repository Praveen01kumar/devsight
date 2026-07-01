import { Component, ElementRef, viewChild, input, output, effect, inject, PLATFORM_ID, OnDestroy, AfterViewInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import loader from '@monaco-editor/loader';
import { editor } from 'monaco-editor';
import { JsonMergeStudioService } from './json-merge.service';
import { MergeInputFile, MergeMode, ConflictResolution, ArrayMergeStrategy, JSONValue } from './json-merge.models';

/**
 * Reusable Monaco Editor Component for JSON Input/Output
 */
@Component({
  selector: 'app-json-editor',
  imports: [CommonModule, MatIconModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full h-full overflow-hidden bg-zinc-950/60 flex flex-col">
      <!-- Editor Header/Controls -->
      <div class="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full" [class.bg-emerald-500]="isValid()" [class.bg-rose-500]="!isValid()"></span>
          <span>{{ title() }}</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <button (click)="toggleWordWrap()" title="Toggle Word Wrap" class="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer" [class.text-emerald-400]="wordWrap() === 'on'">
            <mat-icon class="text-sm scale-75">wrap_text</mat-icon>
          </button>
          <button (click)="formatText()" title="Format Document" class="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer">
            <mat-icon class="text-sm scale-75">format_align_left</mat-icon>
          </button>
          <button (click)="minifyText()" title="Minify" class="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer">
            <mat-icon class="text-sm scale-75">compress</mat-icon>
          </button>
        </div>
      </div>
      <!-- Editor Body -->
      <div #editorContainer class="w-full flex-grow h-[260px] md:h-[320px]"></div>
    </div>
  `
})
export class JsonEditor implements AfterViewInit, OnDestroy {
  readonly title = input<string>('JSON Document');
  readonly content = input<string>('');
  readonly isReadonly = input<boolean>(false);
  readonly wordWrap = input<'on' | 'off'>('off');
  readonly theme = input<'dark' | 'light'>('dark');
  readonly isValid = input<boolean>(true);

  readonly contentChange = output<string>();
  readonly wordWrapChange = output<'on' | 'off'>();

  private readonly container = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private editorInstance: editor.IStandaloneCodeEditor | null = null;
  private isUpdatingValue = false;

  constructor() {
    // Dynamic configurations
    effect(() => {
      if (this.editorInstance) {
        this.editorInstance.updateOptions({
          readOnly: this.isReadonly(),
          wordWrap: this.wordWrap()
        });
      }
    });

    // Theme updating
    effect(() => {
      const monacoTheme = this.theme() === 'dark' ? 'vs-dark' : 'vs-light';
      const win = window as Window & { monaco?: { editor: { setTheme: (theme: string) => void } } };
      if (this.isBrowser && win.monaco) {
        win.monaco.editor.setTheme(monacoTheme);
      }
    });

    // Outer value syncing
    effect(() => {
      const val = this.content();
      if (this.editorInstance && !this.isUpdatingValue && this.editorInstance.getValue() !== val) {
        this.isUpdatingValue = true;
        this.editorInstance.setValue(val);
        this.isUpdatingValue = false;
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    loader.init().then(monaco => {
      const containerEl = this.container()?.nativeElement;
      if (!containerEl) return;

      const monacoTheme = this.theme() === 'dark' ? 'vs-dark' : 'vs-light';

      this.editorInstance = monaco.editor.create(containerEl, {
        value: this.content(),
        language: 'json',
        theme: monacoTheme,
        automaticLayout: true,
        readOnly: this.isReadonly(),
        wordWrap: this.wordWrap(),
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        folding: true,
        tabSize: 2,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 12
      });

      this.editorInstance?.onDidChangeModelContent(() => {
        if (!this.isUpdatingValue && this.editorInstance) {
          this.isUpdatingValue = true;
          const val = this.editorInstance.getValue();
          this.contentChange.emit(val);
          this.isUpdatingValue = false;
        }
      });
    });
  }

  toggleWordWrap(): void {
    const next = this.wordWrap() === 'on' ? 'off' : 'on';
    this.wordWrapChange.emit(next);
  }

  formatText(): void {
    if (!this.editorInstance) return;
    try {
      const raw = this.editorInstance.getValue();
      const parsed = JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      this.editorInstance.setValue(formatted);
    } catch {
      this.editorInstance.trigger('editor', 'editor.action.formatDocument', null);
    }
  }

  minifyText(): void {
    if (!this.editorInstance) return;
    try {
      const raw = this.editorInstance.getValue();
      const minified = JSON.stringify(JSON.parse(raw));
      this.editorInstance.setValue(minified);
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.dispose();
    }
  }
}

/**
 * Main JSON Merge Studio Dashboard Component
 */
@Component({
  selector: 'app-json-merge',
  standalone: true,
  imports: [CommonModule, MatIconModule, JsonEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen transition-colors duration-200 font-sans bg-zinc-950 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
    <!-- Max Width Page Wrapper -->
      <div class="max-w-[1600px] mx-auto space-y-6">
        <!-- Action Toolbar -->
        <section class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
          <input type="file" #fileInput multiple accept=".json" class="hidden" (change)="onFileSelected($event)">
          <div class="flex flex-wrap gap-2">
            <button (click)="uploadFiles()" title="Upload JSON Files" class="h-8 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm">
              <mat-icon class="text-sm scale-90">upload_file</mat-icon>
              <span>Upload Files</span>
            </button>
            <button (click)="service.addEmptyEditor()" class="h-8 px-3 py-2 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-sm scale-90">add_box</mat-icon>
              <span>Add Empty</span>
            </button>
            <button (click)="pasteJSON()" class="h-8 px-3 py-2 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-sm scale-90">content_paste</mat-icon>
              <span>Paste JSON</span>
            </button>
            <button (click)="service.clearFiles()" class="h-8 px-3 py-2 bg-zinc-850 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer">
              <mat-icon class="text-sm scale-90">clear_all</mat-icon>
              <span>Clear</span>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button (click)="validateAll()" class="h-8 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
              <mat-icon class="text-sm scale-90">assignment_turned_in</mat-icon>
              <span>Validate</span>
            </button>
            <button (click)="formatAll()" class="h-8 px-3 py-2 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
              <mat-icon class="text-sm scale-90">format_align_left</mat-icon>
              <span>Format</span>
            </button>
            <button (click)="minifyAll()" class="h-8 px-3 py-2 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
              <mat-icon class="text-sm scale-90">compress</mat-icon>
              <span>Minify</span>
            </button>
            <div class="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
            <button (click)="service.triggerMerge()" [disabled]="service.isMerging() || service.files().length === 0" class="h-8 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none">
              <mat-icon class="text-sm scale-110">play_circle_filled</mat-icon>
              <span>{{ service.isMerging() ? 'MERGING...' : 'MERGE' }}</span>
            </button>
          </div>
        </section>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Merge Options & Conflict Resolver (3 cols) -->
          <section class="lg:col-span-8 space-y-4">
            <!-- Core Configurations Card -->
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <h3 class="text-[11px] font-mono font-bold text-zinc-500 uppercase mb-4 tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                <mat-icon class="text-xs scale-90 text-zinc-500">tune</mat-icon>
                <span>Merge Settings</span>
              </h3>

              <div class="space-y-4 flex items-center gap-3">
                <!-- Merge Mode -->
                <div>
                  <label for="merge-mode-select" class="text-[10px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">Mode</label>
                  <select id="merge-mode-select" (change)="updateMergeMode($event)" [value]="service.options().mode" class="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs p-2 rounded-lg outline-none focus:border-emerald-500/50">
                    <option value="deep">Deep Recursive Merge</option>
                    <option value="shallow">Shallow Merge</option>
                    <option value="recursive">Recursive Object Merge</option>
                    <option value="smart">Smart Merge (Adaptive)</option>
                  </select>
                </div>

                <!-- Conflict Resolution strategy -->
                <div>
                  <label for="conflict-res-select" class="text-[10px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">Conflict Resolution</label>
                  <select id="conflict-res-select" (change)="updateConflictResolution($event)" [value]="service.options().conflictResolution" class="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs p-2 rounded-lg outline-none focus:border-emerald-500/50">
                    <option value="takeLast">Take Last (Overwrite)</option>
                    <option value="takeFirst">Take First (Keep Original)</option>
                    <option value="askUser">Ask User (Manual Pick)</option>
                    <option value="keepBoth">Keep Both (Array Wrapping)</option>
                    <option value="renameDuplicate">Rename Duplicate</option>
                  </select>
                </div>

                <!-- Array Merge Strategy -->
                <div>
                  <label for="array-strategy-select" class="text-[10px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">Array Handling</label>
                  <select id="array-strategy-select" (change)="updateArrayStrategy($event)" [value]="service.options().arrayMerge" class="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs p-2 rounded-lg outline-none focus:border-emerald-500/50">
                    <option value="concat">Concatenate / Append</option>
                    <option value="unique">Append Unique</option>
                    <option value="index">Merge by Index</option>
                  </select>
                </div>

                <!-- Overwrite Keys Toggle -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400 font-medium">Overwrite keys</span>
                    <button (click)="toggleOverwriteKeys()" class="w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer"
                            [class.bg-emerald-600]="service.options().overwriteKeys" [class.bg-zinc-800]="!service.options().overwriteKeys">
                      <div class="w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow" [class.translate-x-5]="service.options().overwriteKeys"></div>
                    </button>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400 font-medium">Strict validation</span>
                    <button (click)="toggleStrictValidation()" 
                            class="w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer"
                            [class.bg-emerald-600]="service.options().strictValidation"
                            [class.bg-zinc-800]="!service.options().strictValidation">
                      <div class="w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow"
                           [class.translate-x-5]="service.options().strictValidation"></div>
                    </button>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400 font-medium">Sort Keys</span>
                    <button (click)="toggleSortKeys()" 
                            class="w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer"
                            [class.bg-emerald-600]="service.options().sortKeys"
                            [class.bg-zinc-800]="!service.options().sortKeys">
                      <div class="w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow"
                           [class.translate-x-5]="service.options().sortKeys"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- INTERACTIVE CONFLICT RESOLUTION CARD -->
            @if (service.conflicts().length > 0 && service.options().conflictResolution === 'askUser') {
              <div class="p-4 rounded-xl border border-amber-800/40 bg-amber-950/10 shadow-lg space-y-3.5">
                <div class="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                  <div class="flex items-center space-x-1.5 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <mat-icon class="text-sm scale-110">warning_amber</mat-icon>
                    <span>Conflicts: {{ service.conflicts().length }}</span>
                  </div>
                  <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                    ACTION REQUIRED
                  </span>
                </div>

                <p class="text-[10px] text-zinc-400 leading-normal">
                  Duplicate keys found. Select which value to retain in the merged outcome.
                </p>

                <!-- Bulk Conflict resolution tools -->
                <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <button (click)="service.resolveAllConflicts('first')"
                          class="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-300 text-center transition cursor-pointer">
                    Original (A)
                  </button>
                  <button (click)="service.resolveAllConflicts('second')"
                          class="px-2 py-1.5 bg-emerald-950/40 text-emerald-300 border border-emerald-900/30 rounded hover:bg-emerald-900/30 text-center transition cursor-pointer">
                    Incoming (B)
                  </button>
                </div>

                <!-- List of active conflicts -->
                <div class="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  @for (conflict of service.conflicts(); track conflict.path) {
                    <div class="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/85 space-y-2 text-xs">
                      <div class="flex items-center justify-between text-[10px] font-mono text-zinc-500 pb-1 border-b border-zinc-900">
                        <span class="truncate max-w-[110px] font-bold text-amber-500" title="{{ conflict.path }}">
                          {{ conflict.path }}
                        </span>
                        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px]">
                          "{{ conflict.key }}"
                        </span>
                      </div>

                      <!-- Path Difference Grid -->
                      <div class="grid grid-cols-2 gap-2">
                        <!-- File A Value card -->
                        <div class="p-2 bg-zinc-900/40 rounded border border-zinc-800/60 flex flex-col justify-between">
                          <div class="text-[8px] font-mono text-zinc-500 truncate mb-1" title="{{ conflict.fileAName }}">
                            A: {{ conflict.fileAName }}
                          </div>
                          <pre class="text-[8px] font-mono text-emerald-400 bg-zinc-950 p-1 rounded max-h-[50px] overflow-auto mb-2">{{ formatValue(conflict.valA) }}</pre>
                          <button (click)="service.resolveSingleConflict(conflict.path, 'first')"
                                  class="w-full py-1 bg-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded text-[9px] font-mono transition cursor-pointer">
                            Keep A
                          </button>
                        </div>

                        <!-- File B Value card -->
                        <div class="p-2 bg-zinc-900/40 rounded border border-zinc-800/60 flex flex-col justify-between">
                          <div class="text-[8px] font-mono text-zinc-500 truncate mb-1" title="{{ conflict.fileBName }}">
                            B: {{ conflict.fileBName }}
                          </div>
                          <pre class="text-[8px] font-mono text-amber-400 bg-zinc-950 p-1 rounded max-h-[50px] overflow-auto mb-2">{{ formatValue(conflict.valB) }}</pre>
                          <button (click)="service.resolveSingleConflict(conflict.path, 'second')"
                                  class="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 rounded text-[9px] font-bold transition cursor-pointer">
                            Keep B
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </section>
          <section class="lg:col-span-4 space-y-4">
            <!-- Quick Metrics Card (right col, 4 cols) -->
            <div class="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between h-[110px]">
              <div class="flex flex-col flex-1 min-w-[70px]">
                <span class="text-[9px] text-zinc-500 uppercase font-bold">Files</span>
                <span class="text-lg font-mono text-emerald-400 leading-none mt-1 font-bold">
                  {{ service.files().length < 10 ? '0' + service.files().length : service.files().length }}
                </span>
              </div>
              <div class="w-px h-10 bg-zinc-800"></div>
              <div class="flex flex-col flex-1 min-w-[70px]">
                <span class="text-[9px] text-zinc-500 uppercase font-bold">Duration</span>
                <span class="text-lg font-mono text-emerald-400 leading-none mt-1 font-bold">
                  {{ service.statistics().mergeDuration }}ms
                </span>
              </div>
              <div class="w-px h-10 bg-zinc-800"></div>
              <div class="flex flex-col flex-1 min-w-[70px]">
                <span class="text-[9px] text-zinc-500 uppercase font-bold">Memory Est</span>
                <span class="text-lg font-mono text-emerald-400 leading-none mt-1 font-bold whitespace-nowrap">
                  {{ service.formatBytes(service.statistics().memoryEstimate) }}
                </span>
              </div>
              <div class="w-px h-10 bg-zinc-800"></div>
              <div class="flex flex-col flex-1 min-w-[70px]">
                <span class="text-[9px] text-zinc-500 uppercase font-bold">Total Size</span>
                <span class="text-lg font-mono text-emerald-400 leading-none mt-1 font-bold whitespace-nowrap">
                  {{ service.formatBytes(totalSize()) }}
                </span>
              </div>
            </div>
        </section>
        <!-- Input Files List (5 cols) -->
          <section class="lg:col-span-12 space-y-4">

            <!-- Empty State Drag-and-drop -->
            @if (service.files().length === 0) {
              <div (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onFileDrop($event)"
                   [class.border-emerald-500]="isDragOver()"
                   [class.bg-emerald-950/10]="isDragOver()"
                   class="border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/30 hover:bg-zinc-900/40 transition-all duration-200 cursor-pointer">
                <div class="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 mx-auto mb-3 text-lg font-bold">
                  +
                </div>
                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Drop Files Here</h3>
                <p class="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Or click button to browse</p>
                <button (click)="uploadFiles()" 
                        class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-zinc-700 cursor-pointer">
                  Browse Files
                </button>
              </div>
            }

            <aside class="relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 mb-3">
              <!-- Toggle Button -->
              <button (click)="toggleSidebar()" type="button" tabindex="0" class="absolute top-2 cursor-pointer right-3 z-20 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg flex items-center justify-center transition"
                [title]="sidebarExpanded() ? 'Collapse tools' : 'Expand tools'">
                <mat-icon style="font-size:18px;width:18px;height:18px;">
                  {{ sidebarExpanded() ? 'expand_circle_up' : 'expand_circle_down' }}
                </mat-icon>
              </button>

              @if (sidebarExpanded()) {
                <!-- Expanded State -->
                <div class="p-4 pr-12 border-b border-zinc-150 dark:border-zinc-850">
                  <span class="text-[10px] font-mono font-extrabold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
                    <h2 class="px-2 py-1 text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
                      Input Documents ({{ service.files().length }})
                    </h2>
                  </span>
                </div>

                <!-- Active files container with drag handles -->
                <div class="p-2 space-y-3">
                @for (file of service.files(); track file.id; let i = $index) {
                  <div draggable="true"
                      (dragstart)="onCardDragStart($event, i)"
                      (dragover)="onCardDragOver($event)"
                      (drop)="onCardDrop($event, i)"
                      [class.opacity-60]="draggedIndex === i"
                      class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-lg relative transition-all duration-200">
                    <!-- Card Header -->
                    <div class="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-zinc-800">
                      <div class="flex items-center space-x-1.5 truncate">
                        <!-- Grab Handle -->
                        <div class="cursor-grab text-zinc-600 hover:text-zinc-450 active:cursor-grabbing p-0.5">
                          <mat-icon class="text-sm scale-90">drag_indicator</mat-icon>
                        </div>
                        <span class="text-[10px] font-mono text-zinc-500 uppercase font-bold truncate" title="{{ file.name }}">
                          {{ file.name }}
                        </span>
                      </div>

                      <div class="flex items-center space-x-1">
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                              [class.bg-emerald-500/10]="file.isValid"
                              [class.text-emerald-500]="file.isValid"
                              [class.bg-rose-500/10]="!file.isValid"
                              [class.text-rose-500]="!file.isValid">
                          {{ file.isValid ? 'VALID' : 'INVALID' }}
                        </span>
                        <button (click)="service.removeFile(file.id)" 
                                title="Remove Document"
                                class="p-1 rounded text-zinc-500 hover:text-rose-450 transition-colors cursor-pointer">
                          <mat-icon class="text-xs scale-75">close</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Validation Status / Warning box -->
                    @if (file.error || file.warning) {
                      <div class="mb-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono space-y-1 bg-zinc-950">
                        @if (file.error) {
                          <div class="text-rose-400 flex items-start">
                            <mat-icon class="text-rose-500 scale-75 mr-1 mt-0.5">error_outline</mat-icon>
                            <span class="break-all">{{ file.error }}</span>
                          </div>
                        }
                        @if (file.warning) {
                          <div class="text-amber-400 flex items-start">
                            <mat-icon class="text-amber-500 scale-75 mr-1 mt-0.5">warning</mat-icon>
                            <span class="break-all">{{ file.warning }}</span>
                          </div>
                        }
                      </div>
                    }

                    <!-- Large File Warning Alert -->
                    @if (file.isLargeFile) {
                      <div class="mb-2.5 p-2 bg-amber-950/20 border border-amber-900/30 text-amber-300 rounded-lg text-[11px] space-y-1">
                        <div class="font-bold flex items-center">
                          <mat-icon class="mr-1 text-xs">warning</mat-icon>
                          Large File (>100MB)
                        </div>
                        <p class="text-zinc-500 leading-snug">
                          Preview limits to first 200 lines. The full document is preserved in memory for workers.
                        </p>
                      </div>
                    }

                    <!-- Monaco Inline Editor wrapper -->
                    <div class="h-[200px]">
                      <app-json-editor 
                        [title]="file.name"
                        [content]="getPreviewText(file)"
                        [isReadonly]="file.isReadonly || file.isLargeFile"
                        [wordWrap]="file.wordWrap"
                        [isValid]="file.isValid"
                        (contentChange)="onFileContentChanged(file.id, $event)"
                        (wordWrapChange)="onWordWrapChanged(file.id, $event)">
                      </app-json-editor>
                    </div>

                    <!-- Metadata bottom strip -->
                    <div class="mt-2 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>{{ service.formatBytes(file.fileSize) }}</span>
                      <span>{{ file.keysCount }} Keys</span>
                    </div>
                  </div>
                }
                  </div>
                } @else {
                  <!-- Collapsed State -->
                  <div class="flex items-center gap-2 p-2 pr-12 overflow-x-auto scrollbar-thin">
                    <h2 class="px-2 py-1 text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
                      Input Documents ({{ service.files().length }})
                    </h2>
                  </div>
                }
              </aside>
          </section>
        </div>
        <!-- Progress bar when merging is ongoing -->
        @if (service.isMerging()) {
          <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-xl">
            <div class="flex justify-between items-center text-xs font-mono">
              <span class="text-emerald-400 flex items-center">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2"></span>
                {{ service.mergeStatusText() }}
              </span>
              <span class="text-zinc-400 font-bold">{{ service.mergeProgress() }}%</span>
            </div>
            <div class="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
              <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                   [style.width.%]="service.mergeProgress()"></div>
            </div>
            <div class="flex justify-end">
              <button (click)="service.cancelMerge()" 
                      class="px-3 py-1.5 text-xs bg-rose-950/50 text-rose-300 border border-rose-900/30 rounded hover:bg-rose-900/50 transition-colors cursor-pointer">
                Cancel Merge
              </button>
            </div>
          </div>
        }

        <!-- Merge Workspace Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          <!-- RIGHT: Output Preview (12 cols) -->
          <section class="lg:col-span-12 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div class="bg-zinc-950 dark:bg-zinc-800 p-3 border-b border-zinc-800 flex justify-between items-center">
              <span class="text-[10px] font-mono font-bold text-zinc-400 uppercase">merged_result.json</span>
              @if (service.mergedResult()) {
                <div class="flex gap-2">
                  <button (click)="copyOutputToClipboard()" 
                          class="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[9px] text-zinc-450 cursor-pointer">
                    Copy
                  </button>
                  <button (click)="downloadOutput(true)" 
                          class="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[9px] text-zinc-450 cursor-pointer">
                    Format (Pretty)
                  </button>
                  <button (click)="downloadOutput(false)" 
                          class="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[9px] text-zinc-450 cursor-pointer">
                    Minify
                  </button>
                </div>
              }
            </div>

            <!-- Output Empty State -->
            @if (!service.mergedResult()) {
              <div class="h-[360px] md:h-[420px] flex flex-col items-center justify-center text-center p-6 bg-zinc-950 dark:bg-zinc-800">
                <mat-icon class="text-zinc-700 scale-125 mb-2.5">find_in_page</mat-icon>
                <h4 class="text-xs font-semibold text-zinc-500 font-mono uppercase tracking-widest">No Merged Document</h4>
                <p class="text-[11px] text-zinc-600 mt-1 max-w-[240px] leading-relaxed">
                  Configure options above and click "MERGE" in the toolbar to run the background assembler thread.
                </p>
              </div>
            }

            <!-- Output Editor -->
            @if (service.mergedResult()) {
              <div class="h-[360px] md:h-[420px] relative">
                <app-json-editor [title]="'merged_result.json'" [content]="service.mergedResult()" [isReadonly]="true" [wordWrap]="'on'" [isValid]="true" (contentChange)="onOutputChanged()">
                </app-json-editor>

                <!-- Overlay Badge -->
                <div class="absolute bottom-4 right-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-3 py-1 text-[10px] font-mono rounded-lg backdrop-blur-md pointer-events-none z-10">
                  READ-ONLY PREVIEW
                </div>
              </div>
            }

            <!-- Detailed Output Stats inside card footer -->
            @if (service.mergedResult()) {
              <div class="p-3 bg-zinc-950 dark:bg-zinc-800 border-t border-zinc-800 grid grid-cols-2 gap-3 text-[10px] font-mono text-zinc-500">
                <div class="space-y-0.5">
                  <div class="flex justify-between">
                    <span>Objects:</span>
                    <span class="text-zinc-300 font-bold">{{ service.statistics().objectsCount }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Arrays:</span>
                    <span class="text-zinc-300 font-bold">{{ service.statistics().arraysCount }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Keys:</span>
                    <span class="text-zinc-300 font-bold">{{ service.statistics().propertiesCount }}</span>
                  </div>
                </div>
                <div class="space-y-0.5 border-l border-zinc-800/80 pl-3">
                  <div class="flex justify-between">
                    <span>Max Depth:</span>
                    <span class="text-zinc-300 font-bold">{{ service.statistics().maxDepth }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Size:</span>
                    <span class="text-zinc-300 font-bold">{{ service.formatBytes(service.mergedResult().length) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Lines:</span>
                    <span class="text-zinc-300 font-bold">{{ outputLinesCount() }}</span>
                  </div>
                </div>
              </div>
            }
          </section>
          </div>
        <!-- FOOTER: LOGS & STATS (Arranged side by side) -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- System logs (left col, 8 cols) -->
          <div class="lg:col-span-12 bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] overflow-hidden flex flex-col justify-between h-[110px]">
            <div class="flex items-center justify-between border-b border-zinc-800/50 pb-1 mb-1.5">
              <span class="text-zinc-500 font-bold uppercase tracking-wider text-[9px] flex items-center">
                <mat-icon class="text-[10px] scale-75 mr-1 text-zinc-500">receipt_long</mat-icon>
                Developer Diagnostics Console
              </span>
              <button (click)="service.clearLogs()" class="text-[8px] uppercase bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded cursor-pointer">
                Clear
              </button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-1 pr-1.5">
              @if (service.logs().length === 0) {
                <div class="text-zinc-650 text-center py-2">
                  No activity recorded. Perform merge or validate actions to stream diagnostics.
                </div>
              }
              @for (log of service.logs(); track $index) {
                <div class="flex items-start gap-1.5 leading-relaxed text-[9px]">
                  <span class="text-zinc-650 shrink-0">[{{ log.timestamp }}]</span>
                  <span class="shrink-0 uppercase font-bold text-[8px] px-1 rounded-sm"
                        [class.text-emerald-500]="log.level === 'success'"
                        [class.text-rose-500]="log.level === 'error'"
                        [class.text-amber-500]="log.level === 'warn'"
                        [class.text-zinc-500]="log.level === 'info'">
                    {{ log.level }}:
                  </span>
                  <span class="break-all"
                        [class.text-emerald-400]="log.level === 'success'"
                        [class.text-rose-400]="log.level === 'error'"
                        [class.text-amber-450]="log.level === 'warn'"
                        [class.text-zinc-400]="log.level === 'info'">
                    {{ log.message }}
                  </span>
                </div>
              }
            </div>
          </div>
        </section>

      </div>
    </div>
  `
})
export class JsonMergeComponent implements OnDestroy {
  readonly service = inject(JsonMergeStudioService);
  readonly isDragOver = signal<boolean>(false);
  draggedIndex: number | null = null;
  // Compute stats on active files
  readonly totalSize = computed(() => this.service.files().reduce((acc, f) => acc + f.fileSize, 0));
  readonly outputLinesCount = computed(() => this.service.mergedResult().split('\n').length);
  private readonly filePickerElementRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  public sidebarExpanded = signal<boolean>(false);

  public toggleSidebar(): void {
    this.sidebarExpanded.update(v => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            this.service.addFileWithContent(file.name, text);
          };
          reader.readAsText(file);
        }
      }
    }
    // reset element
    input.value = '';
  }

  triggerLegacyFileInput(): void {
    this.filePickerElementRef()?.nativeElement.click();
  }

  async uploadFiles(): Promise<void> {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const handles = await (window as Window & { showOpenFilePicker: (opts: { types: { description: string; accept: { 'application/json': string[] } }[]; multiple: boolean }) => Promise<{ getFile: () => Promise<File> }[]> }).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }],
          multiple: true
        });
        for (const handle of handles) {
          const file = await handle.getFile();
          const text = await file.text();
          this.service.addFileWithContent(file.name, text);
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          this.triggerLegacyFileInput();
        }
      }
    } else {
      this.triggerLegacyFileInput();
    }
  }

  async pasteJSON(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        this.service.addFileWithContent(`pasted_${Date.now().toString().slice(-4)}.json`, text);
      } else {
        this.service.addLog('error', 'Clipboard API is not supported or permitted in this environment.');
      }
    } catch (err) {
      const error = err as Error;
      this.service.addLog('error', `Could not paste from clipboard: ${error.message}`);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      for (const file of fileList) {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            this.service.addFileWithContent(file.name, text);
          };
          reader.readAsText(file);
        }
      }
    }
  }

  // Card sorting Native Drag-and-Drop
  onCardDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onCardDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onCardDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.service.reorderFiles(this.draggedIndex, index);
    }
    this.draggedIndex = null;
  }

  // Key Event bindings (No NgModel)
  updateMergeMode(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const val = el.value as MergeMode;
    this.service.options.update(opts => ({ ...opts, mode: val }));
    this.service.addLog('info', `Merge mode changed to: ${val}`);
    this.service.triggerMerge();
  }

  updateConflictResolution(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const val = el.value as ConflictResolution;
    this.service.options.update(opts => ({ ...opts, conflictResolution: val }));
    this.service.addLog('info', `Conflict resolution rule changed to: ${val}`);
    this.service.triggerMerge();
  }

  updateArrayStrategy(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const val = el.value as ArrayMergeStrategy;
    this.service.options.update(opts => ({ ...opts, arrayMerge: val }));
    this.service.addLog('info', `Array strategy changed to: ${val}`);
    this.service.triggerMerge();
  }

  toggleOverwriteKeys(): void {
    const current = this.service.options().overwriteKeys;
    this.service.options.update(opts => ({ ...opts, overwriteKeys: !current }));
    this.service.addLog('info', `Overwrite existing keys set to: ${!current}`);
    this.service.triggerMerge();
  }

  toggleStrictValidation(): void {
    this.service.toggleStrictValidation();
  }

  toggleSortKeys(): void {
    this.service.toggleSortKeys();
  }

  onFileContentChanged(id: string, text: string): void {
    this.service.updateFileContent(id, text);
  }

  onWordWrapChanged(id: string, state: 'on' | 'off'): void {
    this.service.files.update(current =>
      current.map(f => (f.id === id ? { ...f, wordWrap: state } : f))
    );
  }

  onOutputChanged(): void {
    // preview is readonly
  }

  validateAll(): void {
    const files = this.service.files();
    if (files.length === 0) {
      this.service.addLog('warn', 'No files loaded to validate.');
      return;
    }
    const invalid = files.filter(f => !f.isValid);
    if (invalid.length > 0) {
      this.service.addLog('error', `Validation check complete: ${invalid.length} file(s) are INVALID. Details reported on card headers.`);
    } else {
      this.service.addLog('success', 'Validation check complete: All files contain valid JSON syntax.');
    }
  }

  formatAll(): void {
    const list = this.service.files();
    for (const f of list) {
      try {
        const formatted = JSON.stringify(JSON.parse(f.content), null, 2);
        this.service.updateFileContent(f.id, formatted);
      } catch {
        // ignore invalid files
      }
    }
    this.service.addLog('success', 'Formatted all format-compliant input files.');
  }

  minifyAll(): void {
    const list = this.service.files();
    for (const f of list) {
      try {
        const minified = JSON.stringify(JSON.parse(f.content));
        this.service.updateFileContent(f.id, minified);
      } catch {
        // ignore invalid files
      }
    }
    this.service.addLog('success', 'Minified all minification-compliant input files.');
  }

  async copyOutputToClipboard(): Promise<void> {
    const content = this.service.mergedResult();
    if (!content) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
        this.service.addLog('success', 'Copied merged output to system clipboard.');
      }
    } catch (err) {
      const error = err as Error;
      this.service.addLog('error', `Copy failed: ${error.message}`);
    }
  }

  downloadOutput(pretty = true): void {
    const content = this.service.mergedResult();
    if (!content) return;

    let textToDownload = content;
    if (!pretty) {
      try {
        textToDownload = JSON.stringify(JSON.parse(content));
      } catch {
        // fallback to original preview text
      }
    }

    const blob = new Blob([textToDownload], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', pretty ? 'merged_pretty.json' : 'merged_minified.json');
    document?.body?.appendChild(link);
    link.click();
    document?.body?.removeChild(link);
    this.service.addLog('success', `Downloaded merged output (${pretty ? 'pretty' : 'minified'} JSON) via native blob stream.`);
  }

  getPreviewText(file: MergeInputFile): string {
    if (file.isLargeFile) {
      return file.content.split('\n').slice(0, 200).join('\n') + '\n\n... [Remaining content loaded directly in memory worker] ...';
    }
    return file.content;
  }

  formatValue(val: JSONValue): string {
    if (val === null) return 'null';
    if (typeof val === 'object') {
      return JSON.stringify(val).slice(0, 50) + (JSON.stringify(val).length > 50 ? '...' : '');
    }
    return String(val);
  }

  ngOnDestroy(): void {
    this.service.cancelMerge();
  }
}
