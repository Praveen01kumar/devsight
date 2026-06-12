import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-border-radius-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls panel card -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">8-AXIS VECTOR ANCHORS</span>

          <!-- Sliders for top, bottom, left, right horizontal and vertical coordinates -->
          <div class="space-y-3 font-mono text-xs">
            <!-- Top Horizontal -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>TOP HORIZONTAL</span><span>{{ th() }}%</span></div>
              <input type="range" min="0" max="100" [value]="th()" (input)="th.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Bottom Horizontal -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>BOTTOM HORIZONTAL</span><span>{{ bh() }}%</span></div>
              <input type="range" min="0" max="100" [value]="bh()" (input)="bh.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Left Vertical -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>LEFT VERTICAL</span><span>{{ lv() }}%</span></div>
              <input type="range" min="0" max="100" [value]="lv()" (input)="lv.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Right Vertical -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>RIGHT VERTICAL</span><span>{{ rv() }}%</span></div>
              <input type="range" min="0" max="100" [value]="rv()" (input)="rv.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>
          </div>

          <!-- Presets -->
          <div class="pt-2 border-t dark:border-zinc-805 space-y-1.5">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block">STANDARD BLOB DESIGN MODELS</span>
            <div class="grid grid-cols-3 gap-2">
              <button (click)="loadPreset('organic')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">ORGANIC BLOB</button>
              <button (click)="loadPreset('capsule')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">CAPSULE PILL</button>
              <button (click)="loadPreset('beveled')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-901 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">WAVY SHIELD</button>
            </div>
          </div>
        </div>

        <!-- Render Target Preview Frame & Exporter -->
        <div class="space-y-6">
          <!-- Outer Render frame -->
          <div class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-850 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden text-center shrink-0"
          >
            <!-- Blob element -->
            <div class="w-36 h-36 bg-gradient-to-br from-indigo-500 to-pink-500 shadow-xl p-4 flex flex-col justify-center items-center text-white scale-102 transition"
              [style.border-radius]="compiledBorderRadius()"
            >
              <span class="text-xs font-mono font-bold tracking-widest uppercase">BLOB TARGET</span>
            </div>
          </div>

          <!-- Code Export Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left font-mono">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledBorderRadius())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY BORDER-RADIUS
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS PROPERTY SPECIFICATION</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">border-radius: {{ compiledBorderRadius() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND INLINE SHAPE CLASS</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">rounded-[{{ compiledBorderRadius() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS Banner Popup alert -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED SHAPE BORDER PROPERTIES!
        </div>
      }
    </div>
  `
})
export class BorderRadiusGeneratorComponent {
  public th = signal<number>(30); // Top Horizontal
  public bh = signal<number>(60); // Bottom Horizontal
  public lv = signal<number>(40); // Left Vertical
  public rv = signal<number>(70); // Right Vertical
  public copySuccess = signal<boolean>(false);

  // Calculates 8-axis border radius
  public compiledBorderRadius = computed(() => {
    const tH = this.th();
    const bH = this.bh();
    const lV = this.lv();
    const rV = this.rv();

    const topOpposite = 100 - tH;
    const bottomOpposite = 100 - bH;
    const leftOpposite = 100 - lV;
    const rightOpposite = 100 - rV;

    return `${tH}% ${topOpposite}% ${bH}% ${bottomOpposite}% / ${lV}% ${rightOpposite}% ${rV}% ${leftOpposite}%`;
  });

  public getParsedSlider(event: Event): number {
    const input = event.target as HTMLInputElement;
    return parseInt(input.value, 10);
  }

  public loadPreset(type: 'organic' | 'capsule' | 'beveled'): void {
    switch (type) {
      case 'organic':
        this.th.set(30);
        this.bh.set(65);
        this.lv.set(45);
        this.rv.set(80);
        break;
      case 'capsule':
        this.th.set(50);
        this.bh.set(50);
        this.lv.set(40);
        this.rv.set(40);
        break;
      case 'beveled':
        this.th.set(90);
        this.bh.set(10);
        this.lv.set(15);
        this.rv.set(85);
        break;
    }
  }

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }
}
