import { ChangeDetectionStrategy, Component, inject, HostListener, ViewChild, ElementRef, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { JsonDifference } from './json-difference-services';
import { EditorPanelComponent, DifferenceListComponent, StatisticsPanelComponent, ValidationCardComponent, NavigationToolbarComponent, DifferenceTreeComponent } from './editor-panel';
import { ComparisonOptions } from './json-difference.interfaces';

@Component({
  selector: 'app-json-difference',
  imports: [
    CommonModule,
    MatIconModule,
    EditorPanelComponent,
    forwardRef(() => ComparisonSettingsComponent),
    forwardRef(() => NavigationToolbarComponent),
    forwardRef(() => DifferenceListComponent),
    forwardRef(() => DifferenceTreeComponent),
    forwardRef(() => StatisticsPanelComponent),
    forwardRef(() => ValidationCardComponent)
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="diff-studio-root" class="min-h-screen text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <div class="max-w-[1600px] mx-auto flex flex-col gap-4">
        <!-- File Input Helpers -->
        <input #leftFileInput type="file" accept=".json" class="hidden" (change)="onFileSelected($event, 'left')" />
        <input #rightFileInput type="file" accept=".json" class="hidden" (change)="onFileSelected($event, 'right')" />

        <!-- 2. Main Action Toolbar -->
        <div id="main-toolbar" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-lg shadow-black/20 shrink-0 select-none">
          <!-- Upload Left -->
          <button id="btn-upload-left"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="leftFileInput.click()"
            title="Upload Left JSON file"
          >
            <mat-icon class="text-rose-400 text-[15px] w-4 h-4 leading-none font-bold">file_upload</mat-icon>
            Upload Left
          </button>

          <!-- Upload Right -->
          <button id="btn-upload-right"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="rightFileInput.click()"
            title="Upload Right JSON file"
          >
            <mat-icon class="text-emerald-400 text-[15px] w-4 h-4 leading-none font-bold">file_upload</mat-icon>
            Upload Right
          </button>

          <div class="w-px h-5 bg-zinc-800 mx-1"></div>

          <!-- Paste Left -->
          <button id="btn-paste-left"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="pasteDocument('left')"
            title="Paste JSON content into original left document"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">content_paste</mat-icon>
            Paste Left
          </button>

          <!-- Paste Right -->
          <button id="btn-paste-right"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="pasteDocument('right')"
            title="Paste JSON content into modified right document"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">content_paste</mat-icon>
            Paste Right
          </button>

          <div class="w-px h-5 bg-zinc-800 mx-1"></div>

          <!-- Swap -->
          <button id="btn-swap-docs"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="diffService.swapDocuments()"
            title="Swap Left and Right documents"
          >
            <mat-icon class="text-amber-500 text-[15px] w-4 h-4 leading-none font-bold">swap_horiz</mat-icon>
            Swap
          </button>

          <!-- Format -->
          <button id="btn-format-all"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-all duration-150 cursor-pointer"
            (click)="formatAll()"
            title="Prettify formatting on both documents"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">align_horizontal_left</mat-icon>
            Format
          </button>

          <!-- Minify -->
          <button id="btn-minify-all"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-all duration-150 cursor-pointer"
            (click)="minifyAll()"
            title="Minify and compress whitespace on both documents"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">vertical_align_center</mat-icon>
            Minify
          </button>

          <!-- Clear -->
          <button id="btn-clear-all"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-lg border border-zinc-700 hover:border-rose-900 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            (click)="diffService.clearAll()"
            title="Clear current workspace"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">delete_sweep</mat-icon>
            Clear
          </button>

          <!-- Run comparison -->
          <button id="btn-compare-retrigger"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 shadow-lg shadow-emerald-900/20 ml-auto cursor-pointer"
            (click)="diffService.compare()"
            [disabled]="diffService.loading()"
          >
            <mat-icon class="text-[15px] w-4 h-4 leading-none font-bold">
              {{ diffService.loading() ? 'sync' : 'bolt' }}
            </mat-icon>
            {{ diffService.loading() ? 'Comparing...' : 'Compare' }}
          </button>

          <div class="w-px h-5 bg-zinc-800 mx-1"></div>

          <!-- View Mode Toggle -->
          <div class="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button id="btn-mode-split"
              [class]="'px-3 py-1 rounded-md text-[11px] transition-all font-semibold cursor-pointer ' + 
                (diffService.viewMode() === 'split' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300')"
              (click)="diffService.setViewMode('split')"
              title="Split side-by-side editors (Ctrl + 1)"
            >
              Split View
            </button>
            <button id="btn-mode-unified"
              [class]="'px-3 py-1 rounded-md text-[11px] transition-all font-semibold cursor-pointer ' + 
                (diffService.viewMode() === 'unified' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300')"
              (click)="diffService.setViewMode('unified')"
              title="Unified inline diff editor (Ctrl + 2)"
            >
              Unified
            </button>
          </div>

          <div class="w-px h-5 bg-zinc-800 mx-1"></div>

          <!-- Export Report -->
          <button id="btn-export-report"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-all duration-150 cursor-pointer"
            (click)="exportReport()"
            title="Download comparative difference report"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">download</mat-icon>
            Report
          </button>

          <!-- Copy Patch -->
          <button id="btn-copy-patch"
            class="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-all duration-150 cursor-pointer"
            (click)="copyJSONPatch()"
            title="Copy comparative JSON patch to clipboard"
          >
            <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">difference</mat-icon>
            Copy Patch
          </button>
        </div>

        <!-- 3. Dynamic Comparison Options/Settings -->
        <app-comparison-settings />

        <!-- 4. Difference Navigation Controller -->
        <app-navigation-toolbar />

        <!-- 5. Interactive Editors Panel -->
        <app-editor-panel />

        <!-- 6. Bottom Grid Layout for List Explorer, AST Tree, Bento Stats, Syntax diagnostics -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Explorer (List view) -->
          <app-difference-list />

          <!-- AST Structural Tree -->
          <app-difference-tree />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Dynamic Bento stats summary -->
           <div class="lg:col-span-3">
            <app-statistics-panel />
           </div>
          <!-- Diagnostics check panel -->
          <div class="lg:col-span-3">
            <app-validation-card />
          </div>
        </div>

        <!-- 7. Console Activity logs -->
        <div id="logs-card" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-lg">
          <div class="flex items-center gap-2 border-b border-zinc-800 pb-2.5 mb-2.5">
            <mat-icon class="text-zinc-500 scale-90">terminal</mat-icon>
            <h3 class="font-sans font-semibold text-zinc-400 text-[11px] tracking-wider uppercase">STUDIO SYSTEM CONSOLE</h3>
          </div>
          <div class="bg-zinc-950 rounded-xl p-3 h-32 overflow-auto flex flex-col gap-1 font-mono text-[10px] leading-relaxed">
            @for (log of diffService.logs(); track log.timestamp) {
              <div class="flex items-center gap-2 select-text">
                <span class="text-zinc-600 font-mediumshrink-0">[{{ log.timestamp }}]</span>
                <span [class]="getLogColorClass(log.level) + ' font-bold uppercase shrink-0'">{{ log.level }}</span>
                <span class="text-zinc-300 font-medium">{{ log.message }}</span>
              </div>
            } @empty {
              <p class="text-zinc-700 select-none italic text-center my-auto">Console is clean. Operating systems silent...</p>
            }
          </div>
        </div>

        <!-- 8. Final Status Rail -->
        <div class="h-8 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center px-4 justify-between text-[11px] font-mono font-semibold shrink-0 rounded-xl shadow-lg select-none">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Worker Threads Active (8)
            </span>
            <span class="text-zinc-600">|</span>
            <span>Strict Mode Active</span>
          </div>
          <div class="flex gap-4">
            <span>UTF-8</span>
            <span>JS Diff Engine v0.1.2</span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class JsonDifferenceComponent {
  diffService = inject(JsonDifference);

  @ViewChild('leftFileInput') leftFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('rightFileInput') rightFileInput!: ElementRef<HTMLInputElement>;

  // Keyboard shortcut listener
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    // F7: Next difference
    if (event.key === 'F7' && !event.shiftKey) {
      event.preventDefault();
      this.diffService.nextDifference();
    }
    // Shift + F7: Previous difference
    if (event.key === 'F7' && event.shiftKey) {
      event.preventDefault();
      this.diffService.previousDifference();
    }
    // Ctrl + D / Cmd + D: Toggle differences only
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      this.diffService.setOptions({
        differencesOnly: !this.diffService.options().differencesOnly
      });
    }
    // Ctrl + 1: Split View
    if ((event.ctrlKey || event.metaKey) && event.key === '1') {
      event.preventDefault();
      this.diffService.setViewMode('split');
    }
    // Ctrl + 2: Unified View
    if ((event.ctrlKey || event.metaKey) && event.key === '2') {
      event.preventDefault();
      this.diffService.setViewMode('unified');
    }
  }

  onFileSelected(event: Event, side: 'left' | 'right') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (side === 'left') {
          this.diffService.updateLeftJSON(text, file.name);
        } else {
          this.diffService.updateRightJSON(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  }

  pasteDocument(side: 'left' | 'right') {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.readText().then(text => {
        if (side === 'left') {
          this.diffService.updateLeftJSON(text, 'pasted-document-a.json');
        } else {
          this.diffService.updateRightJSON(text, 'pasted-document-b.json');
        }
        this.diffService.addLog('success', `Pasted raw content into ${side.toUpperCase()} successfully.`);
      }).catch(err => {
        this.diffService.addLog('error', `Failed to read clipboard buffer: ${err.message}`);
      });
    }
  }

  formatAll() {
    this.diffService.formatDocument('left');
    this.diffService.formatDocument('right');
  }

  minifyAll() {
    this.diffService.minifyDocument('left');
    this.diffService.minifyDocument('right');
  }

  exportReport() {
    const stats = this.diffService.stats();
    if (!stats) return;

    // Build elegant Markdown Report
    let md = `# COMPARATIVE DIFFERENCE REPORT\n\n`;
    md += `*Generated by JSON Difference Studio on ${new Date().toLocaleString()}*\n\n`;
    md += `## 1. RUNTIME METRICS SUMMARY\n`;
    md += `- **Similarity Score**: ${stats.similarityPercentage}%\n`;
    md += `- **Detected Differences**: ${stats.totalDiffs}\n`;
    md += `- **Web Worker latency**: ${stats.workerTime.toFixed(2)} ms\n`;
    md += `- **Left (Original) Document**: ${stats.leftStats.filename} (${stats.leftStats.linesCount} lines)\n`;
    md += `- **Right (Modified) Document**: ${stats.rightStats.filename} (${stats.rightStats.linesCount} lines)\n\n`;

    md += `## 2. SYSTEM OPERATION METRICS\n`;
    md += `- Added keys: ${stats.added}\n`;
    md += `- Removed keys: ${stats.removed}\n`;
    md += `- Modified keys: ${stats.modified}\n`;
    md += `- Reordered/Moved: ${stats.moved}\n\n`;

    md += `## 3. COMPARATIVE DIFFERENCES LIST\n\n`;
    md += `| # | JSON Path | Action | Before (Left) | After (Right) | Left Line | Right Line |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    this.diffService.diffs().forEach(diff => {
      md += `| ${diff.id} | \`${diff.path || 'root'}\` | **${diff.type.toUpperCase()}** | \`${JSON.stringify(diff.oldValue)}\` | \`${JSON.stringify(diff.newValue)}\` | ${diff.leftLineStart} | ${diff.rightLineStart} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `json-diff-report-${Date.now()}.md`);
    downloadAnchor.click();

    this.diffService.addLog('success', 'Comparative Markdown difference report compiled and downloaded.');
  }

  copyJSONPatch() {
    const patch = this.diffService.diffs().map(diff => ({
      op: diff.type === 'added' ? 'add' : diff.type === 'removed' ? 'remove' : 'replace',
      path: '/' + (diff.path || '').replace(/\./g, '/').replace(/\[/g, '/').replace(/\]/g, ''),
      value: diff.newValue,
      oldValue: diff.oldValue
    }));

    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(patch, null, 2));
      this.diffService.addLog('success', 'Copied standard JSON Patch array to clipboard.');
    }
  }

  getLogColorClass(level: string): string {
    switch (level) {
      case 'info': return 'text-zinc-500';
      case 'warn': return 'text-amber-500';
      case 'error': return 'text-rose-500';
      case 'success': return 'text-emerald-500';
      default: return 'text-zinc-400';
    }
  }
}

@Component({
  selector: 'app-comparison-settings',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <aside class="relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
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
          <div class="flex items-center gap-2">
          <mat-icon class="text-emerald-500 scale-90">settings</mat-icon>
          <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">COMPARISON SETTINGS</h3>
        </div>
        </span>
      </div>

      <!-- Active files container with drag handles -->
      <div class="p-2 space-y-3">
        <div id="settings-card" class="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 transition-all duration-300 shadow-lg">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Ignore Whitespace -->
          <label id="opt-whitespace" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreWhitespace"
              (change)="toggleOption('ignoreWhitespace')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">space_bar</mat-icon>
                Ignore Whitespace
              </span>
              <span class="text-[10px] text-zinc-500">Normalize inner spaces</span>
            </div>
          </label>

          <!-- Ignore Property Order -->
          <label id="opt-prop-order" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignorePropertyOrder"
              (change)="toggleOption('ignorePropertyOrder')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">sort</mat-icon>
                Ignore Property Order
              </span>
              <span class="text-[10px] text-zinc-500">Sort object keys</span>
            </div>
          </label>

          <!-- Ignore Key Case -->
          <label id="opt-key-case" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreKeyCase"
              (change)="toggleOption('ignoreKeyCase')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">match_case</mat-icon>
                Ignore Key Case
              </span>
              <span class="text-[10px] text-zinc-500">Case-insensitive keys</span>
            </div>
          </label>

          <!-- Ignore String Case -->
          <label id="opt-str-case" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreStringValueCase"
              (change)="toggleOption('ignoreStringValueCase')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">format_size</mat-icon>
                Ignore String Case
              </span>
              <span class="text-[10px] text-zinc-500">Compare case-insensitively</span>
            </div>
          </label>

          <!-- Ignore Array Order -->
          <label id="opt-array-order" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreArrayOrder"
              (change)="toggleOption('ignoreArrayOrder')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">shuffle</mat-icon>
                Ignore Array Order
              </span>
              <span class="text-[10px] text-zinc-500">Match reordered arrays</span>
            </div>
          </label>

          <!-- Differences Only -->
          <label id="opt-diff-only" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().differencesOnly"
              (change)="toggleOption('differencesOnly')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">difference</mat-icon>
                Differences Only
              </span>
              <span class="text-[10px] text-zinc-500">Hide unchanged paths</span>
            </div>
          </label>

          <!-- Ignore Empty Lines -->
          <label id="opt-empty-lines" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreEmptyLines"
              (change)="toggleOption('ignoreEmptyLines')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">wrap_text</mat-icon>
                Ignore Empty Lines
              </span>
              <span class="text-[10px] text-zinc-500">Normalize spacing</span>
            </div>
          </label>

          <!-- Ignore Null vs Missing -->
          <label id="opt-null-missing" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreNullVsMissing"
              (change)="toggleOption('ignoreNullVsMissing')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">do_not_disturb_on</mat-icon>
                Null vs Missing
              </span>
              <span class="text-[10px] text-zinc-500">Treat null as missing</span>
            </div>
          </label>

          <!-- Ignore Numeric Precision -->
          <label id="opt-num-precision" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().ignoreNumericPrecision"
              (change)="toggleOption('ignoreNumericPrecision')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">functions</mat-icon>
                Numeric Precision
              </span>
              <span class="text-[10px] text-zinc-500">Ignore trail zeros (2.0 vs 2)</span>
            </div>
          </label>

          <!-- Strict Type Comparison -->
          <label id="opt-strict-types" class="flex items-start gap-3 p-2 rounded-xl border border-zinc-800/40 hover:border-emerald-500/40 hover:bg-zinc-800/20 cursor-pointer transition-all duration-200">
            <input type="checkbox" class="mt-1 accent-emerald-500 w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800"
              [checked]="diffService.options().strictTypeComparison"
              (change)="toggleOption('strictTypeComparison')"
            />
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-200 flex items-center gap-1">
                <mat-icon class="text-zinc-500 text-[14px] w-3.5 h-3.5 leading-none">rule</mat-icon>
                Strict Types
              </span>
              <span class="text-[10px] text-zinc-500">Compare JS value types</span>
            </div>
          </label>
        </div>
        </div>
      </div>
      } @else {
        <!-- Collapsed State -->
        <div class="flex items-center gap-2 p-2">
          <mat-icon class="text-emerald-500 scale-90">settings</mat-icon>
          <h3 class="font-sans font-semibold text-zinc-100 text-sm tracking-wide">COMPARISON SETTINGS</h3>
        </div>
      }
  </aside>`
})
export class ComparisonSettingsComponent {
  diffService = inject(JsonDifference);

  toggleOption(key: keyof ComparisonOptions) {
    const current = this.diffService.options();
    this.diffService.setOptions({
      [key]: !current[key]
    });
  }

  public sidebarExpanded = signal<boolean>(false);

  public toggleSidebar(): void {
    this.sidebarExpanded.update(v => !v);
  }
}
