import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, HSL } from '../color-utils';

export interface PaletteColor {
  hex: string;
  name: string;
}

@Component({
  selector: 'app-palette-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Column -->
        <div class="lg:col-span-1 p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">PALETTE PREFERENCES</span>

          <!-- Hue Seed Color -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">SEED BASE COLOR</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850 font-mono text-xs">
              <div class="w-7 h-7 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="seedColorHex()" (input)="onSeedColorInput($event)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="seedColorHex()"></div>
              </div>
              <input type="text" [value]="seedColorHex()" (change)="onSeedStringChange($event)" class="flex-1 bg-transparent border-none text-zinc-800 dark:text-zinc-200 focus:ring-0 p-0 font-bold uppercase" />
            </div>
          </div>

          <!-- Color harmonies modes selection -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">HARMONY MODEL</span>
            <div class="flex flex-col gap-1.5 font-mono text-xs">
              @for (mode of harmonyModes; track mode.id) {
                <button (click)="harmonyModel.set(mode.id)"
                  [class.bg-emerald-500/10]="harmonyModel() === mode.id"
                  [class.text-emerald-500]="harmonyModel() === mode.id"
                  [class.border-emerald-500/30]="harmonyModel() === mode.id"
                  class="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl transition text-left cursor-pointer"
                >
                  <span class="font-bold">{{ mode.name }}</span>
                  <mat-icon style="font-size:16px;" class="text-zinc-[450]" [class.text-emerald-500]="harmonyModel() === mode.id">
                    {{ harmonyModel() === mode.id ? 'radio_button_checked' : 'radio_button_unchecked' }}
                  </mat-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Palette Preview Grid Grid Column -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Dynamic grid blocks panel -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
            @for (col of compiledPalette(); track col.hex) {
              <div 
                class="rounded-2xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col p-2.5 space-y-3 shadow-sm select-none"
              >
                <!-- Color Fill Block -->
                <div 
                  class="h-28 rounded-xl shadow-inner border border-white/10 shrink-0 cursor-pointer transform hover:scale-102 transition"
                  [style.background-color]="col.hex"
                  (click)="copyValue(col.hex)"
                ></div>

                <!-- Labels -->
                <div class="text-left font-mono">
                  <p class="text-[10px] font-bold text-zinc-450 uppercase truncate">{{ col.name }}</p>
                  <h3 class="text-xs font-extrabold text-zinc-855 dark:text-zinc-100 mt-1 uppercase">{{ col.hex }}</h3>
                </div>

                <button (click)="copyValue(col.hex)"
                  class="w-full py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 rounded-lg text-[9px] font-mono font-bold text-zinc-500 hover:text-emerald-500 transition flex items-center justify-center gap-1 cursor-pointer">
                  <mat-icon style="font-size:11px;" class="flex items-center justify-center">content_copy</mat-icon> HEX
                </button>
              </div>
            }
          </div>

          <!-- JSON & Tokens exporter cards -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">PALETTE DESIGN TOKENS</span>
              <button (click)="copyValue(compiledJsonString())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY JSON
              </button>
            </div>

            <div>
              <span class="text-[9px] text-zinc-400 font-bold uppercase">JSON STYLE SPECIFICATIONS</span>
              <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all overflow-y-auto max-h-[140px] whitespace-pre">{{ compiledJsonString() }}</pre>
            </div>
          </div>

        </div>

      </div>

      <!-- Copy absolute indicator alert -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> SUCCESFULLY COPIED VALUE!
        </div>
      }
    </div>
  `
})
export class PaletteGeneratorComponent {
  public seedColorHex = signal<string>('#10b981');
  public harmonyModel = signal<'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'brand'>('complementary');
  public copySuccess = signal<boolean>(false);

  // Harmony modes specs
  public readonly harmonyModes = [
    { id: 'monochromatic' as const, name: 'MONOCHROMATIC' },
    { id: 'analogous' as const, name: 'ANALOGOUS HARM' },
    { id: 'complementary' as const, name: 'COMPLEMENTARY' },
    { id: 'triadic' as const, name: 'TRIADIC SCHEME' },
    { id: 'brand' as const, name: 'BRAND SEMANTICS' }
  ];

  public compiledPalette = computed(() => {
    const seed = this.seedColorHex();
    const hRgb = hexToRgb(seed);
    const hsl = rgbToHsl(hRgb);

    switch (this.harmonyModel()) {
      case 'monochromatic':
        return [
          { name: 'Seed Base', hex: seed },
          { name: 'Lighter', hex: this.hslToHexStr(hsl.h, hsl.s, Math.max(10, hsl.l - 25)) },
          { name: 'Light', hex: this.hslToHexStr(hsl.h, hsl.s, Math.max(15, hsl.l - 12)) },
          { name: 'Dark', hex: this.hslToHexStr(hsl.h, hsl.s, Math.min(95, hsl.l + 12)) },
          { name: 'Darker', hex: this.hslToHexStr(hsl.h, hsl.s, Math.min(95, hsl.l + 25)) }
        ];

      case 'analogous':
        return [
          { name: 'Analogous L30', hex: this.hslToHexStr((hsl.h + 330) % 360, hsl.s, hsl.l) },
          { name: 'Analogous L15', hex: this.hslToHexStr((hsl.h + 345) % 360, hsl.s, hsl.l) },
          { name: 'Seed Base', hex: seed },
          { name: 'Analogous R15', hex: this.hslToHexStr((hsl.h + 15) % 360, hsl.s, hsl.l) },
          { name: 'Analogous R30', hex: this.hslToHexStr((hsl.h + 30) % 360, hsl.s, hsl.l) }
        ];

      case 'complementary':
        return [
          { name: 'Seed Base', hex: seed },
          { name: 'Complementary', hex: this.hslToHexStr((hsl.h + 180) % 360, hsl.s, hsl.l) },
          { name: 'Split Left', hex: this.hslToHexStr((hsl.h + 150) % 360, hsl.s, hsl.l) },
          { name: 'Split Right', hex: this.hslToHexStr((hsl.h + 210) % 360, hsl.s, hsl.l) },
          { name: 'Accent Glow', hex: this.hslToHexStr((hsl.h + 180) % 360, Math.min(100, hsl.s + 15), Math.round(hsl.l * 0.9)) }
        ];

      case 'triadic':
        return [
          { name: 'Triadic Left', hex: this.hslToHexStr((hsl.h + 120) % 360, hsl.s, hsl.l) },
          { name: 'Triadic Dark', hex: this.hslToHexStr((hsl.h + 120) % 360, hsl.s, Math.max(15, hsl.l - 15)) },
          { name: 'Seed Base', hex: seed },
          { name: 'Triadic Right', hex: this.hslToHexStr((hsl.h + 240) % 360, hsl.s, hsl.l) },
          { name: 'Triadic Light', hex: this.hslToHexStr((hsl.h + 240) % 360, hsl.s, Math.min(95, hsl.l + 15)) }
        ];

      case 'brand':
        return [
          { name: 'Seed Primary', hex: seed },
          { name: 'Brand Success', hex: '#10B981' }, // Standard success
          { name: 'Brand Danger', hex: '#EF4444' }, // Standard error
          { name: 'Brand Warning', hex: '#F59E0B' }, // Standard warning
          { name: 'Cool Neutral', hex: '#64748B' } // Neutral slate
        ];
    }
  });

  public compiledJsonString = computed(() => {
    const list = this.compiledPalette();
    const tokenObj: any = {};
    list.forEach(col => {
      const key = col.name.toLowerCase().replace(/\\s+/g, '-');
      tokenObj[key] = { value: col.hex, type: 'color' };
    });
    return JSON.stringify({ color: tokenObj }, null, 2);
  });

  public onSeedColorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.seedColorHex.set(input.value.toUpperCase());
  }

  public onSeedStringChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      this.seedColorHex.set(val.toUpperCase());
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

  private hslToHexStr(h: number, s: number, l: number): string {
    const rgb = hslToRgb({ h, s, l });
    return rgbToHex(rgb).toUpperCase();
  }
}
