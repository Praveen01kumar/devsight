import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, getContrastRatio, RGB } from '../color-utils';

export interface ShadeItem {
  shade: string;
  hex: string;
  contrastWhite: number;
  contrastBlack: number;
  bestTextColor: 'white' | 'black';
}

@Component({
  selector: 'app-shade-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Column -->
        <div class="lg:col-span-1 p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">SCALE COMPILER SEED</span>

          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400 text-left block">BASE SHADE COLOUR</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850 font-mono text-xs">
              <div class="w-7 h-7 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="baseColorHex()" (input)="onColorInput($event)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="baseColorHex()"></div>
              </div>
              <input type="text" [value]="baseColorHex()" (change)="onStringChange($event)" class="flex-1 bg-transparent border-none text-zinc-800 dark:text-zinc-200 font-bold uppercase focus:ring-0 p-0" />
            </div>
          </div>
          <span class="text-[10px] leading-relaxed font-mono text-zinc-500 text-left block">Inputting any color will generate professional light-to-dark blended intervals mathematically modeling the sRGB light spectrum.</span>
        </div>

        <!-- Shade Scale Grid Sheets Column -->
        <div class="lg:col-span-2 space-y-6 text-left">
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-500 block">GENERATED TAILWIND 50–950 COMPILING SHEET</span>
            <div class="space-y-1.5 font-mono">
              @for (item of compiledShades(); track item.shade) {
                <div 
                  class="flex items-center justify-between p-3.5 rounded-xl border border-black/5 dark:border-white/5 relative shadow-sm transition"
                  [style.background-color]="item.hex"
                  [style.color]="item.bestTextColor === 'white' ? '#ffffff' : '#09090b'">
                  <div class="flex items-center gap-4">
                    <span class="text-xs font-bold leading-none w-8 text-left">{{ item.shade }}</span>
                    <span class="text-xs font-extrabold tracking-wide uppercase select-all leading-none">{{ item.hex }}</span>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="text-[9px] px-2 py-0.5 rounded-md font-bold tracking-wider"
                      [style.background-color]="item.bestTextColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'"
                    >
                      Contrast: {{ item.bestTextColor === 'white' ? item.contrastWhite : item.contrastBlack }}:1
                    </span>
                    <button (click)="copyValue(item.hex)"
                      class="p-1 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center pr-1.5 cursor-pointer">
                      <mat-icon style="font-size: 15px; width: 15px; height: 15px;" class="flex items-center justify-center">content_copy</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Code Outputs exporter boxes -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-400 font-bold uppercase">TAILWIND JS MAPPINGS</span>
              <button (click)="copyValue(compiledTailwindJs())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY OBJECT
              </button>
            </div>

            <div>
              <span class="text-[9px] text-zinc-400 font-bold uppercase block pb-1">EXPORTABLE JS SCALE SCHEMA</span>
              <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all overflow-y-auto max-h-[140px] whitespace-pre">{{ compiledTailwindJs() }}</pre>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS popup element -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED EXPORT METRIC SHADE!
        </div>
      }
    </div>
  `
})
export class ShadeGeneratorComponent {
  public baseColorHex = signal<string>('#3b82f6');
  public copySuccess = signal<boolean>(false);

  // Derived shades matching Tailwind gradients curve curves
  public compiledShades = computed(() => {
    const seed = this.baseColorHex();
    const sRgb = hexToRgb(seed);
    const hsl = rgbToHsl(sRgb);

    const shadesList = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    return shadesList.map((sh, idx) => {
      // Calculate light multiplier curves dynamically
      // shades 50 to 450 blend lighter; shades 550 to 950 blend darker
      let finalHex = seed;
      if (idx < 5) {
        // blend with pristine lightness (100) or high cream ranges
        const t = (5 - idx) / 5;
        const finalH = hsl.h;
        const finalS = Math.round(hsl.s * (1 - t * 0.4));
        const finalL = Math.round(hsl.l + (97 - hsl.l) * t);
        finalHex = rgbToHex(hslToRgb({ h: finalH, s: finalS, l: finalL }));
      } else if (idx > 5) {
        // blend dark
        const t = (idx - 5) / 5;
        const finalH = hsl.h;
        const finalS = Math.round(hsl.s + (100 - hsl.s) * t * 0.1);
        const finalL = Math.round(hsl.l * (1 - t * 0.85));
        finalHex = rgbToHex(hslToRgb({ h: finalH, s: finalS, l: finalL }));
      }

      const rgbVal = hexToRgb(finalHex);
      const contrastW = getContrastRatio(rgbVal, { r: 255, g: 255, b: 255 });
      const contrastB = getContrastRatio(rgbVal, { r: 9, g: 9, b: 9 });
      const bestText = contrastW >= contrastB ? ('white' as const) : ('black' as const);

      return {
        shade: sh,
        hex: finalHex.toUpperCase(),
        contrastWhite: contrastW,
        contrastBlack: contrastB,
        bestTextColor: bestText
      };
    });
  });

  public compiledTailwindJs = computed(() => {
    const rawVal = this.compiledShades();
    const lines = rawVal.map(x => `  '${x.shade}': '${x.hex}',`);
    return `{\n  customColor: {\n${lines.join('\n')}\n  }\n}`;
  });

  public onColorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.baseColorHex.set(input.value.toUpperCase());
  }

  public onStringChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      this.baseColorHex.set(val.toUpperCase());
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
