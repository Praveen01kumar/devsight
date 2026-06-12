import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-flexbox-playground',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Layout visual preview and configuration tools split interface -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Console -->
        <div class="lg:col-span-1 p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 text-left">
          <span class="text-xs font-mono font-bold text-zinc-400 block pb-1 border-b border-zinc-850">FLEX LAYOUT DIRECTIVES</span>
          <!-- Direction -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-mono font-bold text-zinc-500">FLEX DIRECTION (flex-direction)</span>
            <div class="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              @for (dir of ['row', 'row-reverse', 'col', 'col-reverse']; track dir) {
                <button (click)="direction.set(dir)"
                  [class.text-emerald-400]="direction() === dir"
                  [class.bg-zinc-950]="direction() === dir"
                  [class.border-emerald-900]="direction() === dir"
                  class="p-2 border border-zinc-800 rounded-lg hover:border-zinc-700 bg-zinc-900/60 font-bold transition lowercase cursor-pointer">
                  {{ dir === 'col' ? 'column' : dir === 'col-reverse' ? 'column-reverse' : dir }}
                </button>
              }
            </div>
          </div>

          <!-- Justify Content -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-mono font-bold text-zinc-500">JUSTIFY CONTENT (justify-content)</span>
            <select (change)="onJustifyChange($event)"
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 font-mono text-xs text-zinc-300 focus:ring-0">
              <option value="justify-start">flex-start</option>
              <option value="justify-end">flex-end</option>
              <option value="justify-center">center</option>
              <option value="justify-between">space-between</option>
              <option value="justify-around">space-around</option>
              <option value="justify-evenly">space-evenly</option>
            </select>
          </div>

          <!-- Align Items -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-mono font-bold text-zinc-500">ALIGN ITEMS (align-items)</span>
            <div class="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              @for (align of ['items-start', 'items-center', 'items-end', 'items-stretch']; track align) {
                <button (click)="alignItems.set(align)"
                  [class.text-emerald-400]="alignItems() === align"
                  [class.bg-zinc-950]="alignItems() === align"
                  [class.border-emerald-900]="alignItems() === align"
                  class="p-2 border border-zinc-800 rounded-lg hover:border-zinc-700 bg-zinc-900/60 font-bold transition lowercase cursor-pointer">
                  {{ align.replace('items-', '') }}
                </button>
              }
            </div>
          </div>

          <!-- Gap Space -->
          <div class="space-y-2 pt-1 border-t border-zinc-850/60">
            <div class="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500">
              <span>GAP OFFSET SPACING (gap)</span>
              <span class="text-emerald-400">{{ gapSize() }}px</span>
            </div>
            <input type="range" min="0" max="48" step="8" [value]="gapSize()" (input)="onGapChange($event)"
              class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <!-- Item control trackers -->
          <div class="pt-3 border-t border-zinc-850/60 flex items-center justify-between text-xs font-mono">
            <span class="text-zinc-500 font-bold">TOTAL CARDS:</span>
            <div class="flex items-center gap-1.5">
              <button (click)="removeCard()" [disabled]="itemsCount() <= 1"
                class="w-6 h-6 flex items-center justify-center border border-zinc-800 rounded hover:border-zinc-700 bg-zinc-950 text-zinc-400 disabled:opacity-40 cursor-pointer">
                -
              </button>
              <span class="text-zinc-200 font-semibold w-6 text-center">{{ itemsCount() }}</span>
              <button (click)="addCard()" [disabled]="itemsCount() >= 10"
                class="w-6 h-6 flex items-center justify-center border border-zinc-800 rounded hover:border-zinc-700 bg-zinc-950 text-zinc-400 disabled:opacity-40 cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Visual Live canvas layout -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <!-- Live View Box -->
          <div class="h-[300px] w-full border border-zinc-800 bg-zinc-950 rounded-xl relative p-6 overflow-auto">
            <span class="absolute top-2.5 left-3 text-[9px] font-mono text-zinc-650 tracking-widest uppercase font-bold select-none">VIEWPORT PREVIEW</span>
            <div [ngClass]="viewClasses()" [style.gap]="gapSize() + 'px'"
              class="h-full w-full flex bg-zinc-900 border border-zinc-850/50 rounded-lg p-4 font-mono transition-all duration-300 overflow-auto">
              @for (dummy of [].constructor(itemsCount()); track $index) {
                <div class="px-5 py-4 bg-emerald-500 text-zinc-950 font-bold font-mono rounded-lg shadow border border-emerald-400 shrink-0 text-center flex items-center justify-center select-none animate-fade-in text-sm min-w-[50px] min-h-[50px]">
                  {{ $index + 1 }}
                </div>
              }
            </div>
          </div>

          <!-- Class Generator output block -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Tailwind exports -->
            <div class="p-4 bg-zinc-900 border border-zinc-850 rounded-xl text-left space-y-2">
              <div class="flex items-center justify-between font-mono">
                <span class="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">TAILWIND CLASSES</span>
                <button (click)="copyTailwind()"
                  class="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 rounded transition flex items-center gap-1 font-mono text-[10px] cursor-pointer">
                  <mat-icon class="scale-50">content_copy</mat-icon>
                  {{ tailwindCopied() ? 'COPIED!' : 'COPY' }}
                </button>
              </div>
              <div class="bg-zinc-950 p-3 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto select-all select-text">
                {{ tailwindClassesCode() }}
              </div>
            </div>

            <!-- CSS style exports -->
            <div class="p-4 bg-zinc-900 border border-zinc-850 rounded-xl text-left space-y-2">
              <div class="flex items-center justify-between font-mono">
                <span class="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">RAW STYLING (CSS)</span>
                <button (click)="copyCss()"
                  class="p-1 text-sky-400 hover:text-sky-300 hover:bg-sky-950/20 rounded transition flex items-center gap-1 font-mono text-[10px] cursor-pointer">
                  <mat-icon class="scale-50">content_copy</mat-icon>
                  {{ cssCopied() ? 'COPIED!' : 'COPY' }}
                </button>
              </div>
              <div class="bg-zinc-950 p-3 rounded-lg text-[10px] font-mono text-sky-400 whitespace-pre overflow-x-auto leading-normal select-all select-text">
                {{ cssBlockCode() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FlexboxPlaygroundComponent {
  public direction = signal<string>('row');
  public justifyContent = signal<string>('justify-start');
  public alignItems = signal<string>('items-stretch');
  public gapSize = signal<number>(16);
  public itemsCount = signal<number>(4);

  // Clipboard managers
  public tailwindCopied = signal<boolean>(false);
  public cssCopied = signal<boolean>(false);

  // Computes the viewport styling set
  public viewClasses = computed(() => {
    const dirClass = this.direction() === 'row' ? 'flex-row' : 
                     this.direction() === 'row-reverse' ? 'flex-row-reverse' : 
                     this.direction() === 'col' ? 'flex-col' : 'flex-col-reverse';
    
    return [
      dirClass,
      this.justifyContent(),
      this.alignItems()
    ];
  });

  public tailwindClassesCode = computed(() => {
    const dirTerm = this.direction() === 'row' ? 'flex-row' : 
                    this.direction() === 'row-reverse' ? 'flex-row-reverse' : 
                    this.direction() === 'col' ? 'flex-col' : 'flex-col-reverse';
    const justify = this.justifyContent();
    const align = this.alignItems();
    
    // Find approximate tailwind gap mappings
    const gapNum = this.gapSize();
    const gapClass = gapNum === 0 ? 'gap-0' : 
                     gapNum === 8 ? 'gap-2' : 
                     gapNum === 16 ? 'gap-4' : 
                     gapNum === 24 ? 'gap-6' : 
                     gapNum === 32 ? 'gap-8' : 
                     gapNum === 40 ? 'gap-10' : 'gap-12';

    return `flex ${dirTerm} ${justify} ${align} ${gapClass}`;
  });

  public cssBlockCode = computed(() => {
    const dir = this.direction() === 'row' ? 'row' : 
                this.direction() === 'row-reverse' ? 'row-reverse' : 
                this.direction() === 'col' ? 'column' : 'column-reverse';
    
    // Justify Content terms
    const justSel = this.justifyContent();
    const justVal = justSel === 'justify-start' ? 'flex-start' : 
                    justSel === 'justify-end' ? 'flex-end' : 
                    justSel === 'justify-center' ? 'center' : 
                    justSel === 'justify-between' ? 'space-between' : 
                    justSel === 'justify-around' ? 'space-around' : 'space-evenly';
                    
    const alignSel = this.alignItems();
    const alignVal = alignSel === 'items-start' ? 'flex-start' : 
                     alignSel === 'items-center' ? 'center' : 
                     alignSel === 'items-end' ? 'flex-end' : 'stretch';

    return `.container {\n  display: flex;\n  flex-direction: ${dir};\n  justify-content: ${justVal};\n  align-items: ${alignVal};\n  gap: ${this.gapSize()}px;\n}`;
  });

  public onJustifyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.justifyContent.set(val);
  }

  public onGapChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.gapSize.set(parseInt(val, 10));
  }

  public addCard(): void {
    this.itemsCount.update(c => Math.min(c + 1, 10));
  }

  public removeCard(): void {
    this.itemsCount.update(c => Math.max(c - 1, 1));
  }

  public copyTailwind(): void {
    navigator.clipboard.writeText(this.tailwindClassesCode()).then(() => {
      this.tailwindCopied.set(true);
      setTimeout(() => this.tailwindCopied.set(false), 1500);
    });
  }

  public copyCss(): void {
    navigator.clipboard.writeText(this.cssBlockCode()).then(() => {
      this.cssCopied.set(true);
      setTimeout(() => this.cssCopied.set(false), 1500);
    });
  }
}
