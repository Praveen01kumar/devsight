import { ChangeDetectionStrategy, Component, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SvgStatistics as StatsModel, SvgColorInfo, SvgElementNode } from '../../data/svg.model';
import { ExportController, SelectionController, ViewerController } from './controller';

@Component({
  selector: 'app-svg-palette',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 font-sans text-slate-100 select-none">
      <!-- Palette Category Header -->
      <div class="px-1 flex items-center justify-between">
        <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Color Palette</h5>
        <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
          {{ colors().length }} unique colors
        </span>
      </div>

      @if (colors().length > 0) {
        <!-- Palette Circle items grid -->
        <div class="grid grid-cols-4 gap-2.5 bg-slate-950/15 border border-slate-800 rounded-xl p-3.5">
          @for (info of colors().slice(0, 24); track info.color) {
            <div [id]="'palette-swatch-' + info.color.replace('#', '')"
              (click)="onSwatchClick(info)"
              [title]="info.color + ': ' + info.count + ' occurrences (' + info.type + ')'"
              class="group relative flex flex-col items-center justify-center cursor-pointer rounded-lg hover:bg-slate-850/60 p-1.5 transition-all duration-200">
              <!-- Color Chip bubble -->
              <div class="w-8 h-8 rounded-full shadow-inner border border-slate-800 relative transition-transform duration-150 group-hover:scale-110 flex items-center justify-center"
                [style.background-color]="info.color">
                <!-- Micro-indicator of Fill / Stroke -->
                <span class="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] font-mono select-none"
                      [style.color]="info.color">
                  @if (info.type === 'fill') { f }
                  @else if (info.type === 'stroke') { s }
                  @else { b }
                </span>
              </div>

              <!-- Color text label -->
              <span class="text-[9px] font-mono text-slate-400 mt-1.5 select-all text-center max-w-[42px] truncate">
                {{ info.color }}
              </span>

              <!-- Matching indicators on hover (tooltip lookalike) -->
              <span class="absolute hidden group-hover:flex bottom-full mb-1 bg-slate-900 border border-slate-700 text-slate-300 text-[9.5px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                Matches: {{ info.count }}
              </span>
            </div>
          }
        </div>
        <p class="text-[10px] text-slate-500 italic px-2 text-center">
          Click any color swatch to copy its Hex code to the clipboard and filter standard matches.
        </p>
      } @else {
        <!-- Empty palette state -->
        <p class="text-xs text-slate-500 italic p-4 text-center border border-white/5 rounded-xl bg-slate-950/10">
          No colors extracted. Upload an SVG containing colors.
        </p>
      }

      <!-- Quick Toast notifier for copies -->
      @if (showToast()) {
        <div class="absolute bottom-4 right-4 bg-emerald-500 text-white text-xs py-2 px-3 rounded-xl shadow-xl flex items-center space-x-2 select-none animate-bounce z-50">
          <mat-icon class="text-sm w-4 h-4">check_circle_outline</mat-icon>
          <span>Color CSS copied: {{ activeHex() }}</span>
        </div>
      }
    </div>
  `
})
export class SvgPalette {
  private readonly selection = inject(SelectionController);

  colors = input<SvgColorInfo[]>([]);
  showToast = signal<boolean>(false);
  activeHex = signal<string>('');

  onSwatchClick(info: SvgColorInfo) {
    this.activeHex.set(info.color);
    navigator.clipboard.writeText(info.color).then(() => {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 2000);
    });

    // Automatically trigger selection search filtering for elements matching this color!
    this.selection.search(info.color);
  }
}


@Component({
  selector: 'app-svg-search',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-3 border-b border-slate-800 bg-slate-900/40">
      <div class="relative flex items-center bg-slate-950/80 rounded-lg border border-slate-800 focus-within:border-sky-500/50 transition-all duration-200">
        <!-- Search icon -->
        <mat-icon class="text-slate-400 text-lg ml-2.5 mr-1.5 select-none">search</mat-icon>

        <!-- Search input field -->
        <input 
          #searchInput
          id="search-input-field"
          type="text"
          placeholder="Search tags, classes, IDs, attributes..."
          [value]="query()"
          (input)="onInputChange(searchInput.value)"
          (keydown.enter)="nextMatch()"
          class="w-full py-2 bg-transparent text-slate-100 text-xs placeholder-slate-500 border-none outline-none focus:ring-0" />

        <!-- Matches count indicators -->
        @if (matchesCount().length > 0) {
          <span class="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0 mr-1.5 select-none">
            {{ activeIndex() + 1 }}/{{ matchesCount().length }}
          </span>
        }

        <!-- Next/Prev buttons -->
        @if (matchesCount().length > 0) {
          <div class="flex items-center space-x-0.5 shrink-0 pr-1 border-l border-slate-800 ml-1">
            <button 
              id="search-prev-node-btn"
              title="Previous Match"
              (click)="prevMatch()"
              class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors">
              <mat-icon class="text-base">keyboard_arrow_up</mat-icon>
            </button>
            <button 
              id="search-next-node-btn"
              title="Next Match"
              (click)="nextMatch()"
              class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors">
              <mat-icon class="text-base">keyboard_arrow_down</mat-icon>
            </button>
          </div>
        }

        <!-- Clear Search button -->
        @if (query().length > 0) {
          <button 
            id="search-clear-query-btn"
            title="Clear Search"
            (click)="clearSearch(searchInput)"
            class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors mr-1">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        }
      </div>

      <!-- Quick helper text under search -->
      @if (query().length > 0 && matchesCount().length === 0) {
        <div class="text-[11px] text-rose-400 font-sans mt-2 px-1 select-none flex items-center space-x-1">
          <mat-icon class="text-sm w-4 h-4">error_outline</mat-icon>
          <span>No matches found. Try another query.</span>
        </div>
      } @else if (query().length > 0) {
        <div class="text-[10px] text-slate-400 font-sans mt-1.5 px-1 select-none flex justify-between">
          <span>Press <kbd class="font-mono bg-slate-800 px-1 rounded text-slate-300">Enter</kbd> for next match</span>
          <span>{{ matchesCount().length }} tags found</span>
        </div>
      }
    </div>
  `
})
export class SvgSearch {
  private readonly selection = inject(SelectionController);

  query = signal<string>('');
  matchesCount = this.selection.searchResults.asReadonly();
  activeIndex = this.selection.searchIndex.asReadonly();

  onInputChange(val: string) {
    this.query.set(val);
    this.selection.search(val);
  }

  nextMatch() {
    this.selection.nextSearchResult();
  }

  prevMatch() {
    this.selection.prevSearchResult();
  }

  clearSearch(inputEl: HTMLInputElement) {
    this.query.set('');
    inputEl.value = '';
    this.selection.search('');
  }

  // Allow external triggering (e.g. from container keyboard shortcut)
  focusInput() {
    const el = document.getElementById('search-input-field');
    if (el) el.focus();
  }
}


@Component({
  selector: 'app-svg-source',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-slate-950 border-t border-slate-800 font-mono text-xs text-slate-300">
      <!-- Toolbar Header -->
      <div class="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between select-none shrink-0 font-sans">
        <div class="flex items-center space-x-2">
          <mat-icon class="text-amber-500 text-lg">code</mat-icon>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-300">SVG Source Inspector</span>
          @if (isDirty()) {
            <span class="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
              Modified
            </span>
          }
        </div>
        <!-- Controls -->
        <div class="flex items-center mr-[45px]">
          <!-- Apply Changes button -->
          <button id="src-apply-changes-btn"
            title="Apply XML modifications to canvas"
            (click)="applyChanges()"
            [disabled]="!isDirty()"
            [class.opacity-50]="!isDirty()"
            [class.cursor-not-allowed]="!isDirty()"
            class="cursor-pointer px-2.5 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:hover:bg-emerald-600 text-white rounded border border-slate-800 transition-colors flex items-center space-x-1">
            <mat-icon class="text-xs">play_arrow</mat-icon>
          </button>

          <div class="w-px h-4 bg-slate-800 mx-1"></div>

          <button id="src-auto-format-btn"
            title="Pretty Format XML"
            (click)="toggleFormat()"
            class="cursor-pointer px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors flex items-center space-x-1">
            <mat-icon class="text-xs">align_horizontal_left</mat-icon>
          </button>
          <div class="w-px h-4 bg-slate-800 mx-1"></div>

          <button id="src-copy-code-btn"
            title="Copy SVG to Clipboard"
            (click)="copyCode()"
            class="cursor-pointer px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors flex items-center space-x-1">
            <mat-icon class="text-xs">content_copy</mat-icon>
          </button>
          <div class="w-px h-4 bg-slate-800 mx-1"></div>
        </div>
      </div>

      <!-- Main Code Block Textarea View (Editable + Pasteable) -->
      <div class="flex-1 overflow-hidden relative bg-slate-950">
        <textarea id="svg-source-textarea"
          [value]="editableCode()"
          (input)="onCodeInput($event)"
          spellcheck="false"
          placeholder="Paste or edit SVG XML element source code here & click Apply Changes..."
          class="w-full h-full resize-none bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300 focus:outline-none custom-scrollbar border-0 selection:bg-sky-500/30 selection:text-white">
        </textarea>
      </div>

      <!-- Quick Toast notifier for copies -->
      @if (showToast()) {
        <div class="absolute bottom-16 right-4 bg-sky-500/5 dark:bg-sky-500/10 text-white text-xs py-2 px-3 rounded-xl shadow-xl flex items-center space-x-2 select-none animate-bounce z-50 font-sans">
          <mat-icon class="text-sm w-4 h-4">task_alt</mat-icon>
          <span>Copied source to clipboard!</span>
        </div>
      }
    </div>
  `
})
export class SvgSource {
  private readonly exportC = inject(ExportController);

  rawSource = input<string>('');
  fileName = input<string>('image.svg');
  reloadSource = output<string>();

  isFormatted = signal<boolean>(true);
  showToast = signal<boolean>(false);
  editableCode = signal<string>('');

  constructor() {
    // Whenever rawSource of parent changes, sync with our editable text area
    effect(() => {
      const raw = this.rawSource();
      const cleaned = raw.replace(/\sdata-svg-viewer-id="v-\d+"/g, '');
      const initialValue = this.isFormatted() ? this.formatXML(cleaned) : cleaned;
      this.editableCode.set(initialValue);
    });
  }

  // Detect unsaved edits
  isDirty = computed(() => {
    const raw = this.rawSource();
    if (!raw) {
      return this.editableCode().trim().length > 0;
    }
    const cleaned = raw.replace(/\sdata-svg-viewer-id="v-\d+"/g, '');
    const current = this.editableCode().trim();
    // Normalize spaces to do lightweight comparison
    const normClean = cleaned.replace(/\s+/g, ' ').trim();
    const normCurrent = current.replace(/\s+/g, ' ').trim();
    return normClean !== normCurrent;
  });

  onCodeInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.editableCode.set(textarea.value);
  }

  applyChanges() {
    const code = this.editableCode();
    if (code) {
      this.reloadSource.emit(code);
    }
  }

  toggleFormat() {
    const currentCode = this.editableCode();
    const formatted = this.formatXML(currentCode);
    this.editableCode.set(formatted);
  }

  copyCode() {
    const code = this.editableCode();
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        this.showToast.set(true);
        setTimeout(() => this.showToast.set(false), 2000);
      });
    }
  }

  /**
   * High performance, lightweight XML Formatter
   */
  private formatXML(xmlString: string): string {
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    const xml = xmlString.replace(reg, '$1\r\n$2$3');
    let pad = 0;

    const lines = xml.split('\r\n');
    for (const line of lines) {
      const node = line.trim();
      if (!node) continue;

      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w([^>]*[^/])?>$/) || (node.startsWith('<') && !node.startsWith('</') && !node.endsWith('/>') && !node.startsWith('<?') && !node.startsWith('<!'))) {
        indent = 1;
      } else {
        indent = 0;
      }

      let padding = '';
      for (let j = 0; j < pad; j++) {
        padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
    }

    return formatted.trim();
  }
}


@Component({
  selector: 'app-svg-statistics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="space-y-4 font-sans text-slate-100 select-none">
      <!-- Statistics Category Tag -->
      <div class="px-1 flex items-center justify-between">
        <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500">File & DOM Statistics</h5>
        <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
          {{ stats()?.totalElements || 0 }} elements
        </span>
      </div>

      @if (stats()) {
        <!-- Primary File Info list -->
        <div class="bg-slate-950/25 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <!-- File Name -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Filename</span>
            <span class="text-xs font-semibold text-slate-200 truncate max-w-[155px]" [title]="stats()!.fileName">
              {{ stats()!.fileName }}
            </span>
          </div>
          <!-- File Size -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">File Size</span>
            <span class="text-xs font-mono font-semibold text-amber-400">{{ stats()!.fileSize }}</span>
          </div>
          <div class="h-px bg-slate-800"></div>
          <!-- View Box -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">viewBox</span>
            <span class="text-xs font-mono text-slate-300">{{ stats()!.viewBox }}</span>
          </div>
          <!-- Original sizing dimensions -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Dimensions</span>
            <span class="text-xs font-mono text-slate-300">{{ stats()!.width }} x {{ stats()!.height }}</span>
          </div>
        </div>

        <!-- Density item grid cards -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Paths -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">timeline</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Paths</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.pathsCount }}</span>
            </div>
          </div>

          <!-- Groups -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">folder_open</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Groups</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.groupsCount }}</span>
            </div>
          </div>

          <!-- Text -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">font_download</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Texts</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.textCount }}</span>
            </div>
          </div>

          <!-- Images -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">image</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Images</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.imagesCount }}</span>
            </div>
          </div>

          <!-- Gradients -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">gradient</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Gradients</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.gradientsCount }}</span>
            </div>
          </div>

          <!-- Filters -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">blur_on</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Filters</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.filtersCount }}</span>
            </div>
          </div>
        </div>
      } @else {
        <!-- Empty prompt state -->
        <p class="text-xs text-slate-500 italic p-4 text-center border border-slate-800 rounded-xl bg-slate-950/10">
          No statistics available. Load an SVG.
        </p>
      }
    </div>
  `
})
export class SvgStatistics {
  stats = input<StatsModel | null>(null);
}



@Component({
  selector: 'app-svg-toolbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 text-slate-100 font-sans select-none shrink-0 z-50">
      <!-- Left Side Actions: File Upload / Reset -->
      <div class="flex items-center space-x-2">
        <label id="toolbar-upload-btn"
          title="Upload new SVG file"
          class="px-3.5 py-1.5 bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-600/5 active:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center">
          <mat-icon class="text-base w-4 h-4">cloud_upload</mat-icon>
          <input type="file" accept=".svg" class="hidden" (change)="onFileManualUpload($event)">
        </label>

        <div class="w-px h-5 bg-zinc-800 mx-1"></div>

        <button id="toolbar-reset-btn"
          title="Reset transformations to 100%"
          (click)="resetView()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">refresh</mat-icon>
        </button>

        <button id="toolbar-fit-btn"
          title="Fit SVG to active Viewport screen size"
          (click)="triggerFitToScreen()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">crop_free</mat-icon>
        </button>
      </div>

      <!-- Centered Information or Zoom Level Slider -->
      <div class="flex items-center space-x-3 bg-slate-950/40 px-3 py-1.5 rounded-full border border-zinc-800">
        <!-- Zoom Out button -->
        <button id="toolbar-zoom-out"
          title="Zoom Out (Ctrl + -)"
          (click)="zoomOut()"
          class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
          <mat-icon class="text-sm">remove</mat-icon>
        </button>

        <!-- Current zoom formatted scale -->
        <span class="text-xs font-mono font-bold text-slate-100 min-w-[50px] text-center">
          {{ zoomPercent() }}%
        </span>

        <!-- Zoom In button -->
        <button id="toolbar-zoom-in"
          title="Zoom In (Ctrl + +)"
          (click)="zoomIn()"
          class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
          <mat-icon class="text-sm">add</mat-icon>
        </button>

        <div class="w-px h-4 bg-zinc-800 mx-0.5"></div>

        <!-- Predefined zoom percentages shortcuts dropdown -->
        <button id="toolbar-zoom-actual"
          title="Actual Size (100%)"
          (click)="zoomTo100()"
          class="cursor-pointer px-2 py-0.5 text-[10px] font-bold font-mono bg-zinc-950 border border-zinc-800 rounded text-sky-400 hover:bg-slate-850 transition-colors">
          100%
        </button>
      </div>

      <!-- Right Side Actions: Theme toggle / Fullscreen / Exports -->
      <div class="flex items-center space-x-2">
        <!-- Brightness / Theme Switcher -->
        <button id="toolbar-theme-toggle"
          [title]="theme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          (click)="toggleTheme()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">
            {{ theme() === 'dark' ? 'wb_sunny' : 'nightlight_round' }}
          </mat-icon>
        </button>

        <!-- Fullscreen Switcher -->
        <button id="toolbar-fullscreen-toggle"
          [title]="isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'"
          (click)="toggleFullscreen()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">
            {{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}
          </mat-icon>
        </button>

        <div class="w-px h-5 bg-zinc-800 mx-1"></div>

        <!-- Downloads Export options -->
        <button id="toolbar-export-svg"
          title="Export total SVG"
          (click)="exportCurrentAsSvg()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-sm">file_download</mat-icon>
        </button>
      </div>

    </div>
  `
})
export class SvgToolbar {
  private readonly viewer = inject(ViewerController);
  private readonly selection = inject(SelectionController);
  private readonly exportC = inject(ExportController);

  zoom = this.viewer.zoom;
  theme = this.viewer.theme;
  isFullscreen = this.viewer.isFullscreen;

  zoomPercent = computed(() => Math.round(this.zoom() * 100));

  zoomIn() {
    this.viewer.zoomIn();
  }

  zoomOut() {
    this.viewer.zoomOut();
  }

  zoomTo100() {
    this.viewer.setZoom(1);
  }

  resetView() {
    this.viewer.resetView();
  }

  toggleTheme() {
    this.viewer.toggleTheme();
  }

  toggleFullscreen() {
    // Attempt to toggle fullscreen on viewport root
    const viewport = document.getElementById('svg-viewport');
    if (viewport) {
      this.viewer.toggleFullscreen(viewport);
    }
  }

  triggerFitToScreen() {
    // Find canvas viewport layout and fit
    const canvasViewport = document.getElementById('svg-viewport');
    const svgEl = document.querySelector('#rendered-svg-wrapper svg') as SVGSVGElement;
    if (canvasViewport && svgEl) {
      const pRect = canvasViewport.getBoundingClientRect();
      let sWidth = 800;
      let sHeight = 600;

      const vBox = svgEl.viewBox.baseVal;
      if (vBox && vBox.width > 0 && vBox.height > 0) {
        sWidth = vBox.width;
        sHeight = vBox.height;
      } else {
        const widthAttr = Number.parseFloat(svgEl.getAttribute('width') || '0');
        const heightAttr = Number.parseFloat(svgEl.getAttribute('height') || '0');
        if (widthAttr > 0 && heightAttr > 0) {
          sWidth = widthAttr;
          sHeight = heightAttr;
        } else {
          sWidth = svgEl.clientWidth || 800;
          sHeight = svgEl.clientHeight || 600;
        }
      }

      this.viewer.fitToScreen(pRect.width, pRect.height, sWidth, sHeight);
    }
  }

  onFileManualUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Triggers upload event using custom selectors
        const wrapper = document.querySelector('app-svg-canvas');
        if (wrapper) {
          // Trigger file read through custom DOM events or direct invoke in container
          const fileLoadButton = document.getElementById('rendered-svg-wrapper');
          if (fileLoadButton) {
            // we will dispatch event back to the container
          }
        }
        // Dispatches reload event with mock file size to parent SvgViewer component
        const detailObj = { content, name: file.name, size: file.size };
        const loadEvt = new CustomEvent('svg-file-load-payload', { bubbles: true, detail: detailObj });
        input.dispatchEvent(loadEvt);
      };
      reader.readAsText(file);
    }
  }

  exportCurrentAsSvg() {
    // Retrieve rendered SVG wrapper string content
    const wrapper = document.getElementById('rendered-svg-wrapper');
    if (wrapper) {
      const svg = wrapper.querySelector('svg');
      if (svg) {
        const serializer = new XMLSerializer();
        const str = serializer.serializeToString(svg);
        this.exportC.exportAsSvg(str, 'exported_canvas.svg');
      }
    }
  }
}


@Component({
  selector: 'app-svg-tree',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="select-none text-sm font-sans">
      <!-- Node item -->
      <div [id]="'tree-item-' + node().viewerId"
        class="flex items-center py-1.5 px-2 rounded-md transition-all duration-150 cursor-pointer group hover:bg-slate-800/50"
        [class.bg-sky-500/20]="isSelected()"
        [class.text-sky-400]="isSelected()"
        [class.font-medium]="isSelected()"
        [style.padding-left.px]="depth() * 12 + 8"
        (click)="selectNode($event)">
        <!-- Expand/Collapse arrow (only if node has children) -->
        <span class="w-5 h-5 flex items-center justify-center mr-1 text-slate-500 hover:text-slate-300"
              (click)="toggleExpand($event)">
          @if (node().hasChildren) {
            <mat-icon class="text-lg transition-transform duration-200"
                     [class.rotate-90]="isExpanded()">
              chevron_right
            </mat-icon>
          }
        </span>

        <!-- Node Icon based on type -->
        <mat-icon class="text-base mr-1.5" [style.color]="getIconColor()">
          {{ getIconName() }}
        </mat-icon>

        <!-- Tag Name & details -->
        <span class="flex items-baseline space-x-1 min-w-0 flex-1 truncate">
          <span class="text-slate-200 font-mono text-xs font-semibold">&lt;{{ node().tagName }}&gt;</span>
          @if (node().originalId) {
            <span class="text-amber-400/90 font-mono text-xs truncate">#{{ node().originalId }}</span>
          } @else if (node().classes.length > 0) {
            <span class="text-slate-400 font-mono text-[10px] truncate">.{{ node().classes[0] }}</span>
          }
        </span>

        <!-- Quick indicator of kids count -->
        @if (node().hasChildren && !isExpanded()) {
          <span class="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded-full font-mono ml-auto">
            {{ node().children.length }}
          </span>
        }
      </div>

      <!-- Recursive children rendering -->
      @if (node().hasChildren && isExpanded()) {
        <div class="overflow-hidden">
          @for (child of node().children; track child.viewerId) {
            <app-svg-tree 
              [node]="child" 
              [depth]="depth() + 1" 
              [selectedId]="selectedId()"
              [expandedIds]="expandedIds()"
              (toggleExpandEvent)="toggleExpandEvent.emit($event)"
              (nodeSelected)="nodeSelected.emit($event)">
            </app-svg-tree>
          }
        </div>
      }
    </div>
  `,
  host: {
    'class': 'block'
  }
})
export class SvgTree {
  node = input.required<SvgElementNode>();
  depth = input<number>(0);
  selectedId = input<string | null>(null);
  expandedIds = input<Set<string>>(new Set<string>());

  nodeSelected = output<string>();
  toggleExpandEvent = output<string>();

  isSelected() {
    return this.selectedId() === this.node().viewerId;
  }

  isExpanded() {
    return this.expandedIds().has(this.node().viewerId);
  }

  toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    this.toggleExpandEvent.emit(this.node().viewerId);
  }

  selectNode(event: MouseEvent) {
    event.stopPropagation();
    this.nodeSelected.emit(this.node().viewerId);
  }

  getIconName(): string {
    const tagName = this.node().tagName.toLowerCase();
    switch (tagName) {
      case 'svg': return 'language';
      case 'g': return 'folder_open';
      case 'path': return 'timeline';
      case 'rect': return 'crop_square';
      case 'circle': return 'radio_button_unchecked';
      case 'ellipse': return 'lens';
      case 'line': return 'horizontal_rule';
      case 'polyline': return 'show_chart';
      case 'polygon': return 'category';
      case 'text':
      case 'tspan': return 'text_fields';
      case 'image': return 'image';
      case 'defs': return 'settings_applications';
      case 'use': return 'content_copy';
      case 'lineargradient':
      case 'radialgradient': return 'gradient';
      case 'clippath': return 'content_cut';
      case 'mask': return 'filter_b_and_w';
      case 'filter': return 'blur_on';
      default: return 'code';
    }
  }

  getIconColor(): string {
    const tagName = this.node().tagName.toLowerCase();
    switch (tagName) {
      case 'svg': return '#a78bfa'; // violet
      case 'g': return '#fbbf24'; // amber
      case 'path': return '#38bdf8'; // sky
      case 'rect':
      case 'circle':
      case 'ellipse':
      case 'polygon': return '#34d399'; // emerald
      case 'text': return '#f472b6'; // pink
      case 'image': return '#4ade80'; // helper green
      case 'defs': return '#94a3b8'; // slate
      case 'lineargradient':
      case 'radialgradient': return '#fb7185'; // rose
      default: return '#cbd5e1'; // light slate
    }
  }
}
