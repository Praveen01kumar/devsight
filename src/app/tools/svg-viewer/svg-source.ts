import { ChangeDetectionStrategy, Component, inject, computed, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ExportController } from './services/export-controller';

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
