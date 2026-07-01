import { ChangeDetectionStrategy, Component, ElementRef, OnInit, OnDestroy, ViewChild, inject, effect, untracked, PLATFORM_ID, input, signal, computed } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { JsonDifference } from './json-difference-services';
import { DiffItem, DiffNode } from './json-difference.interfaces';
import loader from '@monaco-editor/loader';
import type * as monaco from 'monaco-editor';

@Component({
  selector: 'app-editor-panel',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="editor-workspace" class="flex flex-col gap-3 w-full h-[620px]">
      <!-- Split View Layout -->
      <div [class.hidden]="diffService.viewMode() !== 'split'"
        class="grid grid-cols-1 md:grid-cols-2 gap-3 h-full flex-1">
        <!-- Left Document Editor -->
        <div class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
          <!-- Editor Title Header -->
          <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
            <div class="flex items-center gap-2 overflow-hidden">
              <mat-icon class="text-rose-500 scale-90">insert_drive_file</mat-icon>
              <span class="font-mono text-xs font-semibold text-zinc-300 truncate select-none">{{ diffService.leftFilename() }}</span>
              <span class="text-[10px] bg-rose-950/40 border border-rose-900/40 text-rose-400 px-1.5 py-0.5 rounded font-mono select-none">LEFT / ORIGINAL</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-zinc-500 font-mono">{{ formatSize(diffService.leftSize()) }}</span>
              <button class="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                (click)="diffService.formatDocument('left')"
                title="Format Document">
                <mat-icon class="text-[15px] w-3.5 h-3.5 leading-none">align_horizontal_left</mat-icon>
              </button>
            </div>
          </div>

          <!-- Left Monaco Holder -->
          <div class="flex-1 w-full relative min-h-0 bg-zinc-950">
            <div #leftMonacoContainer class="absolute inset-0 w-full h-full"></div>
          </div>

          <!-- Document stats strip -->
          @if (diffService.stats()?.leftStats; as s) {
            <div class="flex items-center flex-wrap gap-x-4 gap-y-1 px-4 py-1.5 border-t border-zinc-800/60 bg-zinc-900/40 font-mono text-[10px] text-zinc-400 select-none">
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">grid_view</mat-icon> Objects: {{ s.objectsCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">format_list_bulleted</mat-icon> Arrays: {{ s.arraysCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">key</mat-icon> Keys: {{ s.propertiesCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">format_line_spacing</mat-icon> Lines: {{ s.linesCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">abc</mat-icon> Chars: {{ s.charactersCount }}</span>
              <div class="ml-auto flex items-center gap-1">
                <span [class]="getValidationStripClass(s.validationStatus)">
                  {{ s.validationStatus | uppercase }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Right Document Editor -->
        <div class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
          <!-- Editor Title Header -->
          <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
            <div class="flex items-center gap-2 overflow-hidden">
              <mat-icon class="text-emerald-500 scale-90">insert_drive_file</mat-icon>
              <span class="font-mono text-xs font-semibold text-zinc-300 truncate select-none">{{ diffService.rightFilename() }}</span>
              <span class="text-[10px] bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded font-mono select-none">RIGHT / MODIFIED</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-zinc-500 font-mono">{{ formatSize(diffService.rightSize()) }}</span>
              <button class="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                (click)="diffService.formatDocument('right')"
                title="Format Document">
                <mat-icon class="text-[15px] w-3.5 h-3.5 leading-none">align_horizontal_left</mat-icon>
              </button>
            </div>
          </div>

          <!-- Right Monaco Holder -->
          <div class="flex-1 w-full relative min-h-0 bg-zinc-950">
            <div #rightMonacoContainer class="absolute inset-0 w-full h-full"></div>
          </div>

          <!-- Document stats strip -->
          @if (diffService.stats()?.rightStats; as s) {
            <div class="flex items-center flex-wrap gap-x-4 gap-y-1 px-4 py-1.5 border-t border-zinc-800/60 bg-zinc-900/40 font-mono text-[10px] text-zinc-400 select-none">
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">grid_view</mat-icon> Objects: {{ s.objectsCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">format_list_bulleted</mat-icon> Arrays: {{ s.arraysCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">key</mat-icon> Keys: {{ s.propertiesCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">format_line_spacing</mat-icon> Lines: {{ s.linesCount }}</span>
              <span class="flex items-center gap-1"><mat-icon class="text-[12px] w-3 h-3 text-zinc-500">abc</mat-icon> Chars: {{ s.charactersCount }}</span>
              <div class="ml-auto flex items-center gap-1">
                <span [class]="getValidationStripClass(s.validationStatus)">
                  {{ s.validationStatus | uppercase }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Unified Diff Layout -->
      <div [class.hidden]="diffService.viewMode() !== 'unified'"
        class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-md h-full flex-1">
        <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div class="flex items-center gap-2">
            <mat-icon class="text-emerald-500 scale-90">difference</mat-icon>
            <span class="font-mono text-xs font-semibold text-zinc-300 select-none">Unified Comparison View</span>
            <span class="text-[10px] bg-zinc-850 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono select-none">INLINE DIFF</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-zinc-500 font-mono">Comparing {{ diffService.leftFilename() }} & {{ diffService.rightFilename() }}</span>
          </div>
        </div>
        <div class="flex-1 w-full relative min-h-0 bg-zinc-950">
          <div #unifiedMonacoContainer class="absolute inset-0 w-full h-full"></div>
        </div>
      </div>
    </div>
  `
})
export class EditorPanelComponent implements OnInit, OnDestroy {
  diffService = inject(JsonDifference);
  private readonly platformId = inject<object>(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('leftMonacoContainer', { static: false }) leftMonacoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('rightMonacoContainer', { static: false }) rightMonacoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('unifiedMonacoContainer', { static: false }) unifiedMonacoContainer!: ElementRef<HTMLDivElement>;

  private monacoInstance: typeof monaco | null = null;
  private leftEditor: monaco.editor.IStandaloneCodeEditor | null = null;
  private rightEditor: monaco.editor.IStandaloneCodeEditor | null = null;
  private unifiedEditor: monaco.editor.IDiffEditor | null = null;

  // Sync scrolling/cursor flags to avoid loops
  private isSyncingScroll = false;
  private isUpdatingFromSignal = false;

  // Store decorations list to clear/update
  private leftDecorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private rightDecorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;

  // Flash lines decorations
  private leftFlashCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private rightFlashCollection: monaco.editor.IEditorDecorationsCollection | null = null;

  private updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // 1. Reactive response to documents/diff changes to update editors
    effect(() => {
      const leftVal = this.diffService.leftJSON();
      const rightVal = this.diffService.rightJSON();
      this.updateEditorContents(leftVal, rightVal);
    });

    // 2. Reactive response to view mode toggle
    effect(() => {
      const mode = this.diffService.viewMode();
      this.handleViewModeChange(mode);
    });

    // 3. Reactive response to difference decorations updates
    effect(() => {
      const diffList = this.diffService.diffs();
      this.applyDifferenceDecorations(diffList);
    });

    // 4. Reactive response to sequential path selections
    effect(() => {
      const path = this.diffService.selectedPath();
      if (path) {
        untracked(() => {
          this.scrollToAndFlashPath(path);
        });
      }
    });
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.loadMonaco();
    }
  }

  ngOnDestroy() {
    this.disposeEditors();
  }

  private loadMonaco() {
    loader.init().then((monaco) => {
      this.monacoInstance = monaco;
      // Define custom themes
      monaco.editor.defineTheme('diff-studio-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'string', foreground: '10b981' }, // Emerald color for strings
          { token: 'number', foreground: '3b82f6' }, // Blue color for numbers
          { token: 'keyword', foreground: 'f43f5e' }, // Rose keywords
        ],
        colors: {
          'editor.background': '#09090b', // Zinc-950
          'editor.lineHighlightBackground': '#18181b', // Zinc-900
          'editorGutter.background': '#09090b',
          'editor.selectionBackground': '#27272a',
        }
      });

      monaco.editor.defineTheme('diff-studio-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'string', foreground: '059669' },
          { token: 'number', foreground: '2563eb' },
          { token: 'keyword', foreground: 'e11d48' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.lineHighlightBackground': '#f4f4f5',
          'editorGutter.background': '#ffffff',
          'editor.selectionBackground': '#e4e4e7',
        }
      });

      // Let angular digest the views, then create
      setTimeout(() => {
        this.createEditors();
      }, 50);
    }).catch(err => {
      this.diffService.addLog('error', `Failed to load Monaco Editor core: ${err.message}`);
    });
  }

  private createEditors() {
    if (!this.monacoInstance) return;

    const commonOpts = {
      language: 'json',
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: 'on' as const,
      folding: true,
      bracketMatching: 'always' as const,
      stickyScroll: { enabled: true },
      codeActionsOnSave: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 12,
      lineNumbersMinChars: 3,
      readOnly: false // Fully editable!
    };

    // 1. Create Split Left Editor
    if (this.leftMonacoContainer) {
      this.leftEditor = this.monacoInstance.editor.create(
        this.leftMonacoContainer.nativeElement,
        { ...commonOpts, value: this.diffService.leftJSON() }
      );

      // Listen for text edits with debounced state updating
      this.leftEditor.onDidChangeModelContent(() => {
        if (this.isUpdatingFromSignal) return;
        this.debounceUpdateText('left', this.leftEditor!.getValue());
      });
    }

    // 2. Create Split Right Editor
    if (this.rightMonacoContainer) {
      this.rightEditor = this.monacoInstance.editor.create(
        this.rightMonacoContainer.nativeElement,
        { ...commonOpts, value: this.diffService.rightJSON() }
      );

      this.rightEditor.onDidChangeModelContent(() => {
        if (this.isUpdatingFromSignal) return;
        this.debounceUpdateText('right', this.rightEditor!.getValue());
      });
    }

    // 3. Create Unified Inline Diff Editor
    if (this.unifiedMonacoContainer) {
      this.unifiedEditor = this.monacoInstance.editor.createDiffEditor(
        this.unifiedMonacoContainer.nativeElement,
        {
          automaticLayout: true,
          renderSideBySide: false, // Inline Diff Mode
          readOnly: true,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: 12
        }
      );
    }

    // 4. Hook up Synchronized Scrolling
    this.setupScrollingSynchronization();

    // 5. Setup collections for decorations
    if (this.leftEditor) {
      this.leftDecorationsCollection = this.leftEditor.createDecorationsCollection([]);
      this.leftFlashCollection = this.leftEditor.createDecorationsCollection([]);
    }
    if (this.rightEditor) {
      this.rightDecorationsCollection = this.rightEditor.createDecorationsCollection([]);
      this.rightFlashCollection = this.rightEditor.createDecorationsCollection([]);
    }

    // Initial load sync
    this.updateEditorContents(this.diffService.leftJSON(), this.diffService.rightJSON());
  }

  private setupScrollingSynchronization() {
    if (!this.leftEditor || !this.rightEditor) return;

    this.leftEditor.onDidScrollChange((e) => {
      if (this.isSyncingScroll || this.diffService.viewMode() !== 'split') return;
      this.isSyncingScroll = true;
      this.rightEditor!.setScrollTop(e.scrollTop);
      this.rightEditor!.setScrollLeft(e.scrollLeft);
      this.isSyncingScroll = false;
    });

    this.rightEditor.onDidScrollChange((e) => {
      if (this.isSyncingScroll || this.diffService.viewMode() !== 'split') return;
      this.isSyncingScroll = true;
      this.leftEditor!.setScrollTop(e.scrollTop);
      this.leftEditor!.setScrollLeft(e.scrollLeft);
      this.isSyncingScroll = false;
    });
  }

  private updateEditorContents(leftVal: string, rightVal: string) {
    if (!this.monacoInstance) return;

    this.isUpdatingFromSignal = true;

    // Split Editors
    if (this.leftEditor && this.leftEditor.getValue() !== leftVal) {
      this.leftEditor.setValue(leftVal);
    }
    if (this.rightEditor && this.rightEditor.getValue() !== rightVal) {
      this.rightEditor.setValue(rightVal);
    }

    // Unified Diff Models - share the same models to avoid creation leak & sync perfectly
    if (this.unifiedEditor && this.leftEditor && this.rightEditor) {
      const leftModel = this.leftEditor.getModel();
      const rightModel = this.rightEditor.getModel();
      if (leftModel && rightModel) {
        const currentModel = this.unifiedEditor.getModel();
        if (!currentModel || currentModel.original !== leftModel || currentModel.modified !== rightModel) {
          this.unifiedEditor.setModel({
            original: leftModel,
            modified: rightModel
          });
        }
      }
    }

    this.isUpdatingFromSignal = false;
  }

  private handleViewModeChange(mode: 'split' | 'unified') {
    if (!this.monacoInstance) return;
    // Explicit trigger layout recalculation to avoid visual layout glitches
    setTimeout(() => {
      if (mode === 'split') {
        if (this.leftEditor) this.leftEditor.layout();
        if (this.rightEditor) this.rightEditor.layout();
      } else {
        if (this.unifiedEditor) this.unifiedEditor.layout();
      }
    }, 60);
  }

  private debounceUpdateText(side: 'left' | 'right', val: string) {
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }
    this.updateDebounceTimer = setTimeout(() => {
      if (side === 'left') {
        this.diffService.updateLeftJSON(val);
      } else {
        this.diffService.updateRightJSON(val);
      }
    }, 400); // 400ms typing debounce
  }

  private applyDifferenceDecorations(diffs: DiffItem[]) {
    const monaco = this.monacoInstance;
    const leftCol = this.leftDecorationsCollection;
    const rightCol = this.rightDecorationsCollection;

    if (!monaco || !this.leftEditor || !this.rightEditor || !leftCol || !rightCol) return;

    const leftDecs: monaco.editor.IModelDeltaDecoration[] = [];
    const rightDecs: monaco.editor.IModelDeltaDecoration[] = [];

    diffs.forEach(diff => {
      const hoverMessage = [
        { value: `**Property PATH:** \`${diff.path || 'root'}\`` },
        { value: `**Difference Type:** ${diff.type.toUpperCase()}` },
        { value: diff.oldValue !== undefined ? `**Old Value:** \`${JSON.stringify(diff.oldValue)}\`` : '' },
        { value: diff.newValue !== undefined ? `**New Value:** \`${JSON.stringify(diff.newValue)}\`` : '' }
      ].filter(l => l.value !== '');
      const type = diff.type;
      // Determine highlight classes
      let className = '';
      let overviewColor = '';
      let minimapColor = '';

      if (type === 'added') {
        className = 'bg-emerald-500/10 border-l-2 border-emerald-500';
        overviewColor = '#10b981';
        minimapColor = '#10b981';
      } else if (type === 'removed') {
        className = 'bg-rose-500/10 border-l-2 border-rose-500';
        overviewColor = '#f43f5e';
        minimapColor = '#f43f5e';
      } else if (type === 'modified') {
        className = 'bg-amber-500/10 border-l-2 border-amber-500';
        overviewColor = '#f59e0b';
        minimapColor = '#f59e0b';
      } else if (type === 'moved') {
        className = 'bg-blue-500/10 border-l-2 border-blue-500';
        overviewColor = '#3b82f6';
        minimapColor = '#3b82f6';
      }

      const decorationOpts = {
        isWholeLine: true,
        className,
        hoverMessage,
        overviewRuler: {
          color: overviewColor,
          position: monaco.editor.OverviewRulerLane.Full
        },
        minimap: {
          color: minimapColor,
          position: monaco.editor.MinimapPosition.Inline
        }
      };

      // Add to Left (original) if removed, modified, or moved
      if (type === 'removed' || type === 'modified' || type === 'moved') {
        leftDecs.push({
          range: new monaco.Range(diff.leftLineStart, 1, diff.leftLineEnd, 1),
          options: decorationOpts
        });
      }

      // Add to Right (modified) if added, modified, or moved
      if (type === 'added' || type === 'modified' || type === 'moved') {
        rightDecs.push({
          range: new monaco.Range(diff.rightLineStart, 1, diff.rightLineEnd, 1),
          options: decorationOpts
        });
      }
    });

    leftCol.set(leftDecs);
    rightCol.set(rightDecs);
  }

  private scrollToAndFlashPath(path: string) {
    if (!this.monacoInstance) return;

    const leftLines = this.diffService.leftLineMap()[path];
    const rightLines = this.diffService.rightLineMap()[path];

    if (this.diffService.viewMode() === 'split') {
      // Split mode jump and line flashing
      if (leftLines && this.leftEditor) {
        this.leftEditor.revealLineInCenter(leftLines.startLine);
        this.leftEditor.setPosition({ lineNumber: leftLines.startLine, column: 1 });
        this.flashLineInEditor('left', leftLines.startLine);
      }
      if (rightLines && this.rightEditor) {
        this.rightEditor.revealLineInCenter(rightLines.startLine);
        this.rightEditor.setPosition({ lineNumber: rightLines.startLine, column: 1 });
        this.flashLineInEditor('right', rightLines.startLine);
      }
    } else {
      // Unified mode navigation jump
      if (this.unifiedEditor) {
        const lineToReveal = rightLines ? rightLines.startLine : (leftLines ? leftLines.startLine : 1);
        this.unifiedEditor.getModifiedEditor().revealLineInCenter(lineToReveal);
        this.unifiedEditor.getModifiedEditor().setPosition({ lineNumber: lineToReveal, column: 1 });
      }
    }
  }

  private flashLineInEditor(side: 'left' | 'right', line: number) {
    const monaco = this.monacoInstance;
    const editor = side === 'left' ? this.leftEditor : this.rightEditor;
    const collection = side === 'left' ? this.leftFlashCollection : this.rightFlashCollection;
    if (!monaco || !editor || !collection) return;
    // Apply flash highlight decoration
    const flashDecoration = [{
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'bg-emerald-500/20 border-y border-emerald-500/60 font-bold'
      }
    }];

    collection.set(flashDecoration);

    // Timeout to clear flashing effect
    setTimeout(() => {
      collection.set([]);
    }, 1200);
  }

  private updateMonacoTheme(currentTheme: 'dark' | 'light') {
    if (!this.monacoInstance) return;
    const themeName = currentTheme === 'dark' ? 'diff-studio-dark' : 'diff-studio-light';
    this.monacoInstance.editor.setTheme(themeName);
  }

  private disposeEditors() {
    if (this.leftEditor) this.leftEditor.dispose();
    if (this.rightEditor) this.rightEditor.dispose();
    if (this.unifiedEditor) this.unifiedEditor.dispose();
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getValidationStripClass(status: string): string {
    switch (status) {
      case 'valid': return 'text-emerald-400 font-semibold border border-emerald-950 px-1.5 py-0.2 bg-emerald-950/20 rounded';
      case 'warning': return 'text-amber-400 font-semibold border border-amber-950 px-1.5 py-0.2 bg-amber-950/20 rounded';
      case 'invalid': return 'text-rose-400 font-semibold border border-rose-950 px-1.5 py-0.2 bg-rose-950/20 rounded';
      default: return 'text-zinc-500';
    }
  }
}

@Component({
  selector: 'app-difference-list',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="difference-list-card" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-lg h-[450px]">
      <!-- List Header with Search input -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-3">
        <div class="flex items-center gap-2">
          <mat-icon class="text-emerald-500 scale-90 font-bold">format_list_bulleted</mat-icon>
          <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">DIFFERENCE EXPLORER</h3>
          <span class="text-[10px]  bg-zinc-200 dark:bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
            {{ filteredDiffs().length }} of {{ allDiffsCount() }} MATCHES
          </span>
        </div>

        <!-- Integrated Search box -->
        <div class="relative w-full sm:w-64">
          <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] w-4 h-4 text-zinc-500">search</mat-icon>
          <input type="text" placeholder="Search key, value, path, type..."
            class="w-full bg-zinc-950 border border-zinc-850 focus:border-emerald-500/80 rounded-xl pl-8 pr-8 py-1.5 font-mono text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-all"
            [value]="diffService.searchQuery()"
            (input)="onSearchInput($event)"/>
          @if (diffService.searchQuery()) {
            <button class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              (click)="clearSearch()">
              <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Table Scroll Holder -->
      <div class="flex-1 overflow-auto min-h-0 relative rounded-xl border border-zinc-850 bg-zinc-950/40">
        @if (filteredDiffs().length > 0) {
          <table class="w-full border-collapse text-left font-mono text-xs">
            <thead class="sticky top-0 bg-zinc-950 text-zinc-400 border-b border-zinc-850 select-none z-10">
              <tr>
                <th class="p-2.5 text-center w-12">#</th>
                <th class="p-2.5 w-1/4">JSON PATH</th>
                <th class="p-2.5 w-28">OPERATION</th>
                <th class="p-2.5">BEFORE (LEFT)</th>
                <th class="p-2.5">AFTER (RIGHT)</th>
                <th class="p-2.5 text-center w-16">L-LINE</th>
                <th class="p-2.5 text-center w-16">R-LINE</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-900">
              @for (diff of filteredDiffs(); track diff.id) {
                <tr [id]="'diff-row-' + diff.id"
                  [class.bg-emerald-950/20]="diffService.currentDiffIndex() === diff.id"
                  [class.border-l-2]="diffService.currentDiffIndex() === diff.id"
                  [class.border-l-emerald-500]="diffService.currentDiffIndex() === diff.id"
                  class="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                  (click)="onRowClick(diff)">
                  <!-- Number -->
                  <td class="p-2.5 text-center text-zinc-500 font-semibold group-hover:text-zinc-300">
                    {{ diff.id }}
                  </td>
                  <!-- Path -->
                  <td class="p-2.5 text-zinc-300 font-medium break-all select-all">
                    {{ diff.path || 'root' }}
                  </td>
                  <!-- Type badge -->
                  <td class="p-2.5">
                    <span [class]="'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ' + getBadgeStyleClass(diff.type)">
                      <mat-icon class="text-[12px] w-3 h-3 leading-none">{{ getTypeIcon(diff.type) }}</mat-icon>
                      {{ diff.type | uppercase }}
                    </span>
                  </td>
                  <!-- Old Value -->
                  <td class="p-2.5 text-rose-400 break-all max-w-[200px] truncate select-all" [title]="JSON.stringify(diff.oldValue)">
                    {{ diff.oldValue === undefined ? '-' : JSON.stringify(diff.oldValue) }}
                  </td>
                  <!-- New Value -->
                  <td class="p-2.5 text-emerald-400 break-all max-w-[200px] truncate select-all" [title]="JSON.stringify(diff.newValue)">
                    {{ diff.newValue === undefined ? '-' : JSON.stringify(diff.newValue) }}
                  </td>
                  <!-- Left Line -->
                  <td class="p-2.5 text-center text-zinc-500 font-semibold group-hover:text-zinc-300 select-all">
                    {{ diff.leftLineStart === 1 && diff.type === 'added' ? '-' : diff.leftLineStart }}
                  </td>
                  <!-- Right Line -->
                  <td class="p-2.5 text-center text-zinc-500 font-semibold group-hover:text-zinc-300 select-all">
                    {{ diff.rightLineStart === 1 && diff.type === 'removed' ? '-' : diff.rightLineStart }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <!-- Empty match view -->
          <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <mat-icon class="text-zinc-700 text-4xl w-10 h-10 mb-2">find_in_page</mat-icon>
            <p class="text-zinc-400 text-sm font-medium">No matching differences found.</p>
            <p class="text-zinc-600 text-xs mt-1">Try resetting the search filter or adjustments above.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class DifferenceListComponent {
  diffService = inject(JsonDifference);
  JSON = JSON;

  allDiffsCount = computed(() => this.diffService.diffs().length);

  // Computes search matching and indexing
  filteredDiffs = computed(() => {
    const list = this.diffService.diffs();
    const query = this.diffService.searchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(diff => {
      const pathMatch = diff.path.toLowerCase().includes(query);
      const typeMatch = diff.type.toLowerCase().includes(query);
      const oldMatch = diff.oldValue !== undefined && JSON.stringify(diff.oldValue).toLowerCase().includes(query);
      const newMatch = diff.newValue !== undefined && JSON.stringify(diff.newValue).toLowerCase().includes(query);
      const lineMatch = diff.leftLineStart.toString() === query || diff.rightLineStart.toString() === query;
      return pathMatch || typeMatch || oldMatch || newMatch || lineMatch;
    });
  });

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.diffService.searchQuery.set(target.value);
  }

  clearSearch() {
    this.diffService.searchQuery.set('');
  }

  onRowClick(diff: DiffItem) {
    this.diffService.setCurrentDiffIndex(diff.id);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'added': return 'add';
      case 'removed': return 'remove';
      case 'modified': return 'edit';
      case 'moved': return 'swap_horiz';
      default: return 'help';
    }
  }

  getBadgeStyleClass(type: string): string {
    switch (type) {
      case 'added': return 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400';
      case 'removed': return 'bg-rose-950/20 border-rose-900/50 text-rose-400';
      case 'modified': return 'bg-amber-950/20 border-amber-900/50 text-amber-400';
      case 'moved': return 'bg-blue-950/20 border-blue-900/50 text-blue-400';
      default: return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  }
}
@Component({
  selector: 'app-statistics-panel',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="statistics-card" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-lg">
      <!-- Statistics Header -->
      <div class="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-3 shrink-0">
        <mat-icon class="text-emerald-500 scale-90">query_stats</mat-icon>
        <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">STATISTICS & RUNTIME SUMMARY</h3>
      </div>

      <!-- Bento Grid Content -->
      @if (diffService.stats(); as s) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Similarity Index (Circle ring) -->
          <div class="col-span-1 bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span class="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2 select-none">SIMILARITY INDEX</span>
            <div class="relative w-24 h-24 flex items-center justify-center">
              <!-- Background Ring -->
              <svg class="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="38" stroke-width="5" stroke="#18181b" fill="transparent"/>
                <!-- Active Ring -->
                <circle cx="48" cy="48" r="38" stroke-width="6" [attr.stroke-dasharray]="circleDashArray()" [attr.stroke-dashoffset]="circleDashOffset(s.similarityPercentage)"
                  stroke-linecap="round" stroke="#10b981" fill="transparent"/>
              </svg>
              <!-- Center Text -->
              <div class="flex flex-col items-center justify-center">
                <span class="text-2xl font-bold font-sans text-zinc-100">{{ s.similarityPercentage }}%</span>
                <span class="text-[9px] text-emerald-500 font-semibold select-none">MATCH</span>
              </div>
            </div>
          </div>

          <!-- Diff Operation Breakdown (Stacked horizontal bars) -->
          <div class="col-span-1 sm:col-span-2 bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2 select-none">DIFFERENCE BREAKDOWN</span>
            <div class="grid grid-cols-2 gap-4 my-auto">
              <!-- Added -->
              <div class="flex items-center justify-between border-b border-zinc-900 pb-1">
                <span class="text-xs text-zinc-400 flex items-center gap-1.5 font-sans">
                  <mat-icon class="text-emerald-500 text-[14px] w-3.5 h-3.5 leading-none">add_circle</mat-icon>
                  Added
                </span>
                <span class="text-xs font-semibold text-emerald-400 font-mono bg-emerald-950/20 px-1.5 py-0.2 rounded border border-emerald-950/60">{{ s.added }}</span>
              </div>

              <!-- Removed -->
              <div class="flex items-center justify-between border-b border-zinc-900 pb-1">
                <span class="text-xs text-zinc-400 flex items-center gap-1.5 font-sans">
                  <mat-icon class="text-rose-500 text-[14px] w-3.5 h-3.5 leading-none">remove_circle</mat-icon>
                  Removed
                </span>
                <span class="text-xs font-semibold text-rose-400 font-mono bg-rose-950/20 px-1.5 py-0.2 rounded border border-rose-950/60">{{ s.removed }}</span>
              </div>

              <!-- Modified -->
              <div class="flex items-center justify-between border-b border-zinc-900 pb-1">
                <span class="text-xs text-zinc-400 flex items-center gap-1.5 font-sans">
                  <mat-icon class="text-amber-500 text-[14px] w-3.5 h-3.5 leading-none">change_circle</mat-icon>
                  Modified
                </span>
                <span class="text-xs font-semibold text-amber-400 font-mono bg-amber-950/20 px-1.5 py-0.2 rounded border border-amber-950/60">{{ s.modified }}</span>
              </div>

              <!-- Moved -->
              <div class="flex items-center justify-between border-b border-zinc-900 pb-1">
                <span class="text-xs text-zinc-400 flex items-center gap-1.5 font-sans">
                  <mat-icon class="text-blue-500 text-[14px] w-3.5 h-3.5 leading-none">open_with</mat-icon>
                  Moved
                </span>
                <span class="text-xs font-semibold text-blue-400 font-mono bg-blue-950/20 px-1.5 py-0.2 rounded border border-blue-950/60">{{ s.moved }}</span>
              </div>
            </div>

            <!-- Total stats count strip -->
            <div class="mt-2 text-[10px] text-zinc-500 font-sans flex items-center gap-2">
              <span>Total Diffs: <strong class="text-zinc-300 font-semibold">{{ s.totalDiffs }}</strong></span>
              <span>•</span>
              <span>Identical keys: <strong class="text-zinc-300 font-semibold">{{ s.equal }}</strong></span>
            </div>
          </div>

          <!-- Runtime & Performance -->
          <div class="col-span-1 bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2 select-none">PERFORMANCE METRICS</span>
            <div class="flex flex-col gap-2.5 my-auto">
              <!-- Comparison time -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400 flex items-center gap-1 font-sans">
                  <mat-icon class="text-zinc-600 text-[14px] w-3.5 h-3.5">schedule</mat-icon>
                  Compare Time
                </span>
                <span class="font-mono text-zinc-200 font-semibold">{{ s.comparisonTime.toFixed(1) }} ms</span>
              </div>

              <!-- Worker Time -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400 flex items-center gap-1 font-sans">
                  <mat-icon class="text-zinc-600 text-[14px] w-3.5 h-3.5">memory</mat-icon>
                  Worker Thread
                </span>
                <span class="font-mono text-emerald-400 font-semibold">{{ s.workerTime.toFixed(1) }} ms</span>
              </div>

              <!-- Estimated memory footprint -->
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-zinc-400 flex items-center gap-1 font-sans">
                  <mat-icon class="text-zinc-600 text-[14px] w-3.5 h-3.5">donut_large</mat-icon>
                  Memory footprint
                </span>
                <span class="text-zinc-200 font-semibold">{{ formatMemory(s.memoryEstimate) }}</span>
              </div>
            </div>

            <div class="text-[9px] bg-emerald-950/10 border border-emerald-900/20 text-emerald-500 py-0.5 px-2 rounded-lg text-center font-bold tracking-tight mt-2 select-none uppercase">
              REUSABLE WORKER PROCESS
            </div>
          </div>

        </div>
      } @else {
        <div class="p-6 text-center text-zinc-500 text-xs font-mono select-none">
          Waiting for JSON comparison parameters to generate summary stats...
        </div>
      }

    </div>
  `
})
export class StatisticsPanelComponent {
  diffService = inject(JsonDifference);

  circleDashArray(): number {
    return 2 * Math.PI * 38; // Radius is 38
  }

  circleDashOffset(similarity: number): number {
    const circum = this.circleDashArray();
    const percent = similarity / 100;
    return circum * (1 - percent);
  }

  formatMemory(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
@Component({
  selector: 'app-validation-card',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="validation-panel-card" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-lg">
      <!-- Panel Header -->
      <div class="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-3">
        <mat-icon class="text-emerald-500 scale-90">fact_check</mat-icon>
        <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">SYNTAX & DIAGNOSTICS LOGS</h3>
      </div>

      <!-- Main Logs area -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left Document Logs -->
        <div class="flex flex-col bg-zinc-950/40 border border-zinc-850 rounded-xl p-3 h-52 overflow-auto">
          <div class="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2 shrink-0">
            <span class="text-xs font-semibold text-zinc-300 font-sans flex items-center gap-1">
              <mat-icon class="text-rose-500 text-[14px] w-3.5 h-3.5">text_snippet</mat-icon>
              {{ diffService.leftFilename() }}
            </span>
            <span [class]="getBadgeClass(diffService.leftValid(), leftIssuesCount())">
              {{ getStatusText(diffService.leftValid(), leftIssuesCount()) }}
            </span>
          </div>

          <!-- Left Issues list -->
          <div class="flex-1 overflow-auto min-h-0 flex flex-col gap-1.5 font-mono text-[11px]">
            @for (err of allLeftIssues(); track err.message) {
              <div class="flex items-start gap-2 p-1.5 rounded bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-all">
                <mat-icon [class]="getIssueColor(err.type) + ' text-[14px] w-3.5 h-3.5 shrink-0 mt-0.5'">
                  {{ getIssueIcon(err.type) }}
                </mat-icon>
                <div class="flex-1">
                  <p class="text-zinc-200 font-medium leading-relaxed">{{ err.message }}</p>
                  <p class="text-zinc-500 text-[9px] mt-0.5">Line {{ err.line }}, Column {{ err.column }} • type: {{ err.type }}</p>
                </div>
              </div>
            } @empty {
              <div class="flex flex-col items-center justify-center p-4 text-center h-full select-none">
                <mat-icon class="text-emerald-500/30 text-3xl w-8 h-8 mb-1.5">verified</mat-icon>
                <p class="text-emerald-500 text-xs font-semibold">Perfect Syntactic Match</p>
                <p class="text-zinc-600 text-[10px] mt-0.5">No trailing commas, duplicates, or format warnings.</p>
              </div>
            }
          </div>
        </div>

        <!-- Right Document Logs -->
        <div class="flex flex-col bg-zinc-950/40 border border-zinc-850 rounded-xl p-3 h-52 overflow-auto">
          <div class="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2 shrink-0">
            <span class="text-xs font-semibold text-zinc-300 font-sans flex items-center gap-1">
              <mat-icon class="text-emerald-500 text-[14px] w-3.5 h-3.5">text_snippet</mat-icon>
              {{ diffService.rightFilename() }}
            </span>
            <span [class]="getBadgeClass(diffService.rightValid(), rightIssuesCount())">
              {{ getStatusText(diffService.rightValid(), rightIssuesCount()) }}
            </span>
          </div>

          <!-- Right Issues list -->
          <div class="flex-1 overflow-auto min-h-0 flex flex-col gap-1.5 font-mono text-[11px]">
            @for (err of allRightIssues(); track err.message) {
              <div class="flex items-start gap-2 p-1.5 rounded bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-all">
                <mat-icon [class]="getIssueColor(err.type) + ' text-[14px] w-3.5 h-3.5 shrink-0 mt-0.5'">
                  {{ getIssueIcon(err.type) }}
                </mat-icon>
                <div class="flex-1">
                  <p class="text-zinc-200 font-medium leading-relaxed">{{ err.message }}</p>
                  <p class="text-zinc-500 text-[9px] mt-0.5">Line {{ err.line }}, Column {{ err.column }} • type: {{ err.type }}</p>
                </div>
              </div>
            } @empty {
              <div class="flex flex-col items-center justify-center p-4 text-center h-full select-none">
                <mat-icon class="text-emerald-500/30 text-3xl w-8 h-8 mb-1.5">verified</mat-icon>
                <p class="text-emerald-500 text-xs font-semibold">Perfect Syntactic Match</p>
                <p class="text-zinc-600 text-[10px] mt-0.5">No trailing commas, duplicates, or format warnings.</p>
              </div>
            }
          </div>
        </div>

      </div>

    </div>
  `
})
export class ValidationCardComponent {
  diffService = inject(JsonDifference);
  allLeftIssues = computed(() => [...this.diffService.leftErrors(), ...this.diffService.leftWarnings()]);
  allRightIssues = computed(() => [...this.diffService.rightErrors(), ...this.diffService.rightWarnings()]);
  leftIssuesCount = computed(() => this.allLeftIssues().length);
  rightIssuesCount = computed(() => this.allRightIssues().length);

  getStatusText(valid: boolean, count: number): string {
    if (!valid) return 'CRITICAL ERRORS';
    if (count > 0) return `${count} WARNINGS`;
    return 'SYNTAX VALID';
  }

  getBadgeClass(valid: boolean, count: number): string {
    if (!valid) return 'text-[9px] bg-rose-950/40 border border-rose-900 text-rose-400 py-0.5 px-2 rounded-full font-sans font-bold';
    if (count > 0) return 'text-[9px] bg-amber-950/40 border border-amber-900 text-amber-400 py-0.5 px-2 rounded-full font-sans font-bold';
    return 'text-[9px] bg-emerald-950/40 border border-emerald-900 text-emerald-400 py-0.5 px-2 rounded-full font-sans font-bold';
  }

  getIssueIcon(type: string): string {
    switch (type) {
      case 'syntax': return 'cancel';
      case 'duplicate_key': return 'copy_all';
      case 'trailing_comma': return 'warning';
      default: return 'info';
    }
  }

  getIssueColor(type: string): string {
    switch (type) {
      case 'syntax': return 'text-rose-500';
      case 'duplicate_key': return 'text-amber-500';
      case 'trailing_comma': return 'text-amber-500';
      default: return 'text-zinc-400';
    }
  }
}
@Component({
  selector: 'app-navigation-toolbar',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div id="navigation-toolbar" class="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md select-none">
      <!-- Nav block left -->
      <div class="flex items-center gap-2">
        <button id="btn-prev-diff"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-500 disabled:opacity-40 disabled:hover:bg-zinc-950 disabled:hover:text-zinc-300 transition-all duration-200 text-xs font-semibold"
          [disabled]="diffCount() === 0"
          (click)="diffService.previousDifference()"
          title="Previous Difference (Shift + F7)">
          <mat-icon class="text-[16px] w-4 h-4 leading-none">arrow_back</mat-icon>
          Prev
        </button>

        <div class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-1 text-xs font-mono text-zinc-400">
          <span class="text-emerald-500 font-semibold">{{ currentDiffIndex() }}</span>
          <span>/</span>
          <span class="font-semibold">{{ diffCount() }}</span>
          <span class="text-zinc-600 ml-1">DIFFS</span>
        </div>

        <button id="btn-next-diff"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-500 disabled:opacity-40 disabled:hover:bg-zinc-950 disabled:hover:text-zinc-300 transition-all duration-200 text-xs font-semibold"
          [disabled]="diffCount() === 0"
          (click)="diffService.nextDifference()"
          title="Next Difference (F7)">
          Next
          <mat-icon class="text-[16px] w-4 h-4 leading-none">arrow_forward</mat-icon>
        </button>

        <button id="btn-reveal-diff"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-all duration-150 text-xs font-medium"
          [disabled]="diffCount() === 0"
          (click)="revealCurrent()"
          title="Zoom and focus on current difference">
          <mat-icon class="text-[15px] w-3.5 h-3.5 leading-none">gps_fixed</mat-icon>
          Focus
        </button>
      </div>

      <!-- Path displays and value tools -->
      @if (currentDiff(); as diff) {
        <div id="diff-path-indicator" class="flex-1 min-w-[200px] max-w-md  bg-zinc-950 dark:bg-zinc-800 border border-zinc-800/40 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 overflow-hidden">
          <div class="flex items-center gap-2 overflow-hidden">
            <mat-icon [class]="getTypeColorClass(diff.type) + ' text-[15px] w-3.5 h-3.5 leading-none'">
              {{ getTypeIcon(diff.type) }}
            </mat-icon>
            <span class="font-mono text-xs text-zinc-300 truncate tracking-tight">{{ diff.path || 'root' }}</span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <!-- Copy Path -->
            <button class="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
              (click)="copyText(diff.path, 'Path')"
              title="Copy JSON Path">
              <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">content_copy</mat-icon>
            </button>
            <!-- Copy Old Value -->
            @if (diff.oldValue !== undefined) {
              <button class="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors text-[10px] font-mono font-bold flex items-center gap-0.5"
                (click)="copyText(JSON.stringify(diff.oldValue), 'Old Value')"
                title="Copy Left (Old) Value">
                <span class="text-rose-500">L</span>
                <mat-icon class="text-[12px] w-3 h-3 leading-none">content_copy</mat-icon>
              </button>
            }

            <!-- Copy New Value -->
            @if (diff.newValue !== undefined) {
              <button class="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors text-[10px] font-mono font-bold flex items-center gap-0.5"
                (click)="copyText(JSON.stringify(diff.newValue), 'New Value')"
                title="Copy Right (New) Value">
                <span class="text-emerald-500">R</span>
                <mat-icon class="text-[12px] w-3 h-3 leading-none">content_copy</mat-icon>
              </button>
            }
          </div>
        </div>
      }

      <!-- Custom Actions on Right side -->
      <div class="flex items-center gap-2">
        <button id="btn-toggle-differences-only"
          [class]="'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ' + (diffService.options().differencesOnly ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200')"
          (click)="toggleDifferencesOnly()"
          title="Toggle hide/show unchanged lines (Ctrl + D)">
          <mat-icon class="text-[15px] w-3.5 h-3.5 leading-none">filter_list</mat-icon>
          {{ diffService.options().differencesOnly ? 'Only Diffs' : 'All Lines' }}
        </button>

        <button id="btn-reset-filters"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all duration-150 text-xs font-medium"
          (click)="resetFilters()"
          title="Reset comparison filters and search">
          <mat-icon class="text-[15px] w-3.5 h-3.5 leading-none">refresh</mat-icon>
          Reset
        </button>
      </div>

    </div>
  `
})
export class NavigationToolbarComponent {
  diffService = inject(JsonDifference);

  diffCount = computed(() => this.diffService.diffs().length);
  currentDiffIndex = computed(() => this.diffService.currentDiffIndex());
  currentDiff = computed(() => {
    const idx = this.currentDiffIndex();
    const list = this.diffService.diffs();
    return idx > 0 && idx <= list.length ? list[idx - 1] : null;
  });

  JSON = JSON;

  getTypeIcon(type: string): string {
    switch (type) {
      case 'added': return 'add_circle';
      case 'removed': return 'remove_circle';
      case 'modified': return 'change_circle';
      case 'moved': return 'open_with';
      default: return 'help_outline';
    }
  }

  getTypeColorClass(type: string): string {
    switch (type) {
      case 'added': return 'text-emerald-500';
      case 'removed': return 'text-rose-500';
      case 'modified': return 'text-amber-500';
      case 'moved': return 'text-blue-500';
      default: return 'text-zinc-400';
    }
  }

  revealCurrent() {
    // This will trigger an update in selectedPath, causing editors to centering/highlighting
    const diff = this.currentDiff();
    if (diff) {
      this.diffService.selectedPath.set('');
      setTimeout(() => {
        this.diffService.selectedPath.set(diff.path);
      }, 20);
    }
  }

  toggleDifferencesOnly() {
    this.diffService.setOptions({
      differencesOnly: !this.diffService.options().differencesOnly
    });
  }

  resetFilters() {
    this.diffService.setOptions({
      differencesOnly: false
    });
    this.diffService.searchQuery.set('');
    this.diffService.addLog('info', 'Reset comparison view filters.');
  }

  copyText(text: string, label: string) {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.diffService.addLog('success', `Copied ${label} to clipboard.`);
    }
  }
}
@Component({
  selector: 'app-tree-node',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col ml-4 font-mono text-xs select-none">
      <!-- Interactive Node Row -->
      <div role="button" tabindex="0" class="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer group transition-all"
        [class.bg-emerald-950/20]="isCurrentlySelected()"
        (click)="onNodeClick($event)"
        (keydown.enter)="onNodeClick($event)"
        (keydown.space)="onNodeClick($event)">
        <!-- Collapse/Expand Arrow for nodes with children -->
        @if (node().children && node().children!.length > 0) {
          <button class="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            (click)="toggleExpand($event)">
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none transition-transform duration-200" [class.rotate-90]="expanded()">
              chevron_right
            </mat-icon>
          </button>
        } @else {
          <!-- Indented Spacer for leaf nodes -->
          <div class="w-4.5 shrink-0"></div>
        }

        <!-- Icon based on type/children -->
        <mat-icon [class]="getIconColorClass() + ' text-[15px] w-3.5 h-3.5 leading-none shrink-0'">
          {{ getIcon() }}
        </mat-icon>

        <!-- Key name -->
        <span class="text-zinc-300 font-medium group-hover:text-zinc-100 truncate">
          {{ node().key }}
        </span>

        <!-- Operation badge -->
        @if (node().type !== 'none') {
          <span [class]="'ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ' + getBadgeStyleClass(node().type)">
            {{ node().type | uppercase }}
          </span>
        }
      </div>

      <!-- Recursive Children list -->
      @if (node().children && node().children!.length > 0 && expanded()) {
        <div class="border-l border-zinc-800/60 ml-2.5 pl-1 my-0.5 flex flex-col gap-0.5">
          @for (child of node().children; track child.path) {
            <app-tree-node [node]="child" />
          }
        </div>
      }

    </div>
  `
})
export class TreeNodeComponent {
  node = input.required<DiffNode>();
  diffService = inject(JsonDifference);

  expanded = signal<boolean>(true);

  isCurrentlySelected = computed(() => {
    const diffIdx = this.diffService.currentDiffIndex();
    const currentDiff = diffIdx > 0 ? this.diffService.diffs()[diffIdx - 1] : null;
    return currentDiff && currentDiff.path === this.node().path;
  });

  toggleExpand(event: Event) {
    event.stopPropagation();
    this.expanded.update(v => !v);
  }

  onNodeClick(event: Event) {
    event.stopPropagation();
    const itemId = this.node().diffItemId;
    if (itemId !== undefined) {
      this.diffService.setCurrentDiffIndex(itemId);
    } else if (this.node().children && this.node().children!.length > 0) {
      this.expanded.update(v => !v);
    }
  }

  getIcon(): string {
    const hasChildren = this.node().children && this.node().children!.length > 0;
    if (hasChildren) {
      return this.expanded() ? 'folder_open' : 'folder';
    }
    return 'description';
  }

  getIconColorClass(): string {
    const hasChildren = this.node().children && this.node().children!.length > 0;
    if (hasChildren) {
      return 'text-amber-500';
    }
    return 'text-zinc-500';
  }

  getBadgeStyleClass(type: string): string {
    switch (type) {
      case 'added': return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60';
      case 'removed': return 'bg-rose-950/40 text-rose-400 border border-rose-900/60';
      case 'modified': return 'bg-amber-950/40 text-amber-400 border border-amber-900/60';
      case 'moved': return 'bg-blue-950/40 text-blue-400 border border-blue-900/60';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  }
}
@Component({
  selector: 'app-difference-tree',
  imports: [CommonModule, MatIconModule, TreeNodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="difference-tree-card" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-lg h-[450px]">
      <!-- Tree Header -->
      <div class="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div class="flex items-center gap-2">
          <mat-icon class="text-emerald-500 scale-90">account_tree</mat-icon>
          <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">AST HIERARCHY TREE</h3>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all duration-150 text-[11px] font-medium"
            (click)="collapseAll()">
            <mat-icon class="text-[13px] w-3 h-3 leading-none">unfold_less</mat-icon>
            Collapse All
          </button>
        </div>
      </div>

      <!-- Scrollable tree area -->
      <div class="flex-1 overflow-auto min-h-0 bg-zinc-950/40 border border-zinc-850 rounded-xl p-3">
        @if (diffService.tree(); as rootNode) {
          <div class="-ml-4 flex flex-col gap-0.5">
            <app-tree-node [node]="rootNode" />
          </div>
        } @else {
          <!-- Empty Tree status -->
          <div class="flex flex-col items-center justify-center p-6 text-center select-none h-full">
            <mat-icon class="text-zinc-800 text-3xl w-8 h-8 mb-2">schema</mat-icon>
            <p class="text-zinc-500 text-xs">Awaiting comparison processing...</p>
          </div>
        }
      </div>

    </div>
  `
})
export class DifferenceTreeComponent {
  diffService = inject(JsonDifference);

  collapseAll() {
    // Simply clear and reload to reset expand state or log
    this.diffService.addLog('info', 'Tree branches collapsed.');
    this.diffService.compare();
  }
}
