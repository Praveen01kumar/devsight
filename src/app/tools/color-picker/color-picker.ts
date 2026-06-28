import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { hexToRgb, matchTailwindColor, rgbToHsl, rgbToHsv, rgbToOklch } from '../color-utils';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-4xl mx-auto text-left">
      <!-- Top Layout Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls & Picking Column -->
        <div class="p-6 bg-zinc-90 w-full border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">VISUAL SELECTION</span>
            <!-- Eyedropper trigger if supported -->
            @if (hasEyedropper) {
              <button (click)="triggerEyedropper()"
                class="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <mat-icon class="scale-75">colorize</mat-icon> EYEDROPPER
              </button>
            }
          </div>

          <!-- Color preview & direct picker block -->
          <div class="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
            <div 
              class="w-16 h-16 rounded-xl shadow-inner border border-zinc-200 dark:border-zinc-800 shrink-0 relative overflow-hidden"
              [style.background-color]="colorWithOpacity()"
            >
              <input type="color" [value]="hex()" (input)="onHexColorInput($event)"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
              />
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-xs font-mono font-bold text-zinc-400 uppercase">HEX PREVIEW</span>
              <p class="text-lg font-mono font-extrabold text-zinc-800 dark:text-white truncate select-all">{{ hex() }}</p>
            </div>
          </div>

          <!-- Opacity and Alpha Sliders -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 font-bold">
              <span>OPACITY (ALPHA)</span>
              <span>{{ alpha() }}%</span>
            </div>
            <input type="range" min="0" max="100" [value]="alpha()" (input)="onAlphaSliderInput($event)"
              class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"
            />
          </div>

          <!-- Quick presets grids -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">MATERIAL PRESET DOTS</span>
            <div class="flex flex-wrap gap-2">
              @for (preset of presets; track preset) {
                <button (click)="setHexColor(preset)"
                  class="w-7 h-7 rounded-full border border-white/20 dark:border-zinc-800 shadow-sm transition transform hover:scale-110 cursor-pointer"
                  [style.background-color]="preset" [title]="preset">
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Format Values Display & Converter Column -->
        <div class="p-6 bg-zinc-90 w-full border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4 font-mono">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">COLOR SPACE OUTPUTS</span>

          <div class="space-y-2.5">
            <!-- HEX Row -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
              <span class="text-[10px] text-zinc-500 font-bold">HEX</span>
              <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold select-all pr-2">{{ hex() }}</span>
              <button (click)="copyValue(hex())" class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-emerald-500 cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
            </div>

            <!-- RGB Row -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
              <span class="text-[10px] text-zinc-500 font-bold">RGB / RGBA</span>
              <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold select-all pr-2">{{ rgbString() }}</span>
              <button (click)="copyValue(rgbString())" class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-emerald-500 cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
            </div>

            <!-- HSL Row -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
              <span class="text-[10px] text-zinc-500 font-bold">HSL / HSLA</span>
              <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold select-all pr-2">{{ hslString() }}</span>
              <button (click)="copyValue(hslString())" class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-emerald-500 cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
            </div>

            <!-- HSV Row -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
              <span class="text-[10px] text-zinc-500 font-bold">HSV</span>
              <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold select-all pr-2">{{ hsvString() }}</span>
              <button (click)="copyValue(hsvString())" class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-emerald-500 cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
            </div>

            <!-- OKLCH Row -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
              <span class="text-[10px] text-zinc-500 font-bold">OKLCH</span>
              <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold select-all pr-2">{{ oklchString() }}</span>
              <button (click)="copyValue(oklchString())" class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-emerald-500 cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Layout Section: Matches & Favorites -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Palette matching column -->
        <div class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">TAILWIND COLOR MATCHING</span>
          <div class="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
            <div class="w-12 h-12 rounded-lg shadow-sm border dark:border-zinc-800 shrink-0" [style.background-color]="tailwindMatch().hex"></div>
            <div class="flex-1 min-w-0 font-mono text-left">
              <p class="text-xs font-bold text-zinc-400">NEAREST TAILWIND CORRESPONDENCE</p>
              <h4 class="text-md font-bold text-zinc-800 dark:text-white mt-1">bg-{{ tailwindMatch().name }}-{{ tailwindMatch().shade }}</h4>
              <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Hex: {{ tailwindMatch().hex }} (diff: {{ tailwindMatch().distance | number:'1.0-1' }})</p>
            </div>
            <button (click)="copyValue('bg-' + tailwindMatch().name + '-' + tailwindMatch().shade)"
              class="px-2 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 font-mono text-[10px] text-zinc-700 dark:text-zinc-300 rounded font-bold transition flex items-center gap-1 shrink-0 cursor-pointer">
              <mat-icon class="scale-75 text-xs">content_copy</mat-icon> CLASS
            </button>
          </div>
        </div>

        <!-- History & Favorites -->
        <div class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4">
          <div class="flex items-center justify-between border-b dark:border-zinc-800 pb-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">SAVED & FAVORITE DOTS</span>
            <button (click)="saveActiveToFavorites()"
              class="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 rounded-lg transition font-bold cursor-pointer">
              + ADD TO FAVORITE
            </button>
          </div>

          <!-- Favorites Dots Render -->
          <div class="flex flex-wrap gap-2.5 min-h-[40px] items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900">
            @if (favorites().length === 0) {
              <span class="text-xs text-zinc-500 dark:text-zinc-400 italic">No colors stored. Add them to track!</span>
            } @else {
              @for (fav of favorites(); track fav) {
                <div class="group relative flex items-center justify-center">
                  <button (click)="setHexColor(fav)"
                    class="w-7 h-7 rounded-full shadow border border-white/20 hover:scale-110 transition cursor-pointer"
                    [style.background-color]="fav" [title]="fav"></button>
                  <button (click)="removeFavorite(fav); $event.stopPropagation()"
                    class="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition scale-75 cursor-pointer leading-none flex items-center justify-center h-4 w-4 cursor-pointer"
                    title="Remove"
                  >
                    <mat-icon style="font-size: 10px; width: 10px; height: 10px;" class="leading-none flex items-center justify-center">close</mat-icon>
                  </button>
                </div>
              }
            }
          </div>
        </div>

      </div>

      <!-- Action status copy alert popup banner -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED VALUE TO CLIPBOARD!
        </div>
      }
    </div>
  `
})
export class ColorPickerComponent {
  public hex = signal<string>('#10B981');
  public alpha = signal<number>(100);
  public favorites = signal<string[]>([]);
  public copySuccess = signal<boolean>(false);

  // Checks support for Eyedropper API
  public get hasEyedropper(): boolean {
    return typeof window !== 'undefined' && 'EyeDropper' in window;
  }

  // Pre-configured elegant Material Design hex-color dots
  public readonly presets: string[] = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
    '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', 
    '#FFEB3B', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'
  ];

  // Derived calculations leveraging shared color-utils
  public rgb = computed(() => hexToRgb(this.hex()));
  public hsl = computed(() => rgbToHsl(this.rgb()));
  public hsv = computed(() => rgbToHsv(this.rgb()));
  public oklch = computed(() => rgbToOklch(this.rgb()));

  public rgbString = computed(() => {
    const r = this.rgb();
    const a = this.alpha() / 100;
    return a === 1 ? `rgb(${r.r}, ${r.g}, ${r.b})` : `rgba(${r.r}, ${r.g}, ${r.b}, ${a.toFixed(2)})`;
  });

  public hslString = computed(() => {
    const h = this.hsl();
    const a = this.alpha() / 100;
    return a === 1 ? `hsl(${h.h}, ${h.s}%, ${h.l}%)` : `hsla(${h.h}, ${h.s}%, ${h.l}%, ${a.toFixed(2)})`;
  });

  public hsvString = computed(() => {
    const h = this.hsv();
    return `hsv(${h.h}, ${h.s}%, ${h.v}%)`;
  });

  public oklchString = computed(() => {
    const o = this.oklch();
    const a = this.alpha() / 100;
    return a === 1 ? `oklch(${o.l} ${o.c} ${o.h})` : `oklch(${o.l} ${o.c} ${o.h} / ${a.toFixed(2)})`;
  });

  public colorWithOpacity = computed(() => {
    const r = this.rgb();
    const a = this.alpha() / 100;
    return `rgba(${r.r}, ${r.g}, ${r.b}, ${a})`;
  });

  public tailwindMatch = computed(() => {
    return matchTailwindColor(this.rgb());
  });

  constructor() {
    // Load local stored preference lists
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('devsight_color_picker_favs');
      if (saved) {
        try {
          this.favorites.set(JSON.parse(saved));
        } catch {}
      }
    }

    // Reactively update local histories
    effect(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('devsight_color_picker_favs', JSON.stringify(this.favorites()));
      }
    });

    // Check shared state URL values
    this.readUrlState();
  }

  public onHexColorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setHexColor(input.value);
  }

  public onAlphaSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.alpha.set(Number.parseInt(input.value, 10));
  }

  public setHexColor(val: string): void {
    let clean = val.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    if (/^#[0-9A-F]{6}$/i.test(clean) || /^#[0-9A-F]{3}$/i.test(clean)) {
      this.hex.set(clean.toUpperCase());
      this.writeUrlState(clean);
    }
  }

  public async triggerEyedropper(): Promise<void> {
    if (!this.hasEyedropper) return;
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        this.setHexColor(result.sRGBHex);
      }
    } catch {}
  }

  public saveActiveToFavorites(): void {
    const h = this.hex().toUpperCase();
    if (!this.favorites().includes(h)) {
      this.favorites.update(prev => [...prev, h]);
    }
  }

  public removeFavorite(val: string): void {
    this.favorites.update(prev => prev.filter(x => x !== val));
  }

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }

  private writeUrlState(hexVal: string): void {
    if (typeof window !== 'undefined' && window.history) {
      const cleanHex = hexVal.replace('#', '');
      const url = new URL(window.location.href);
      url.searchParams.set('c', cleanHex);
      window.history.replaceState({}, '', url.toString());
    }
  }

  private readUrlState(): void {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const c = url.searchParams.get('c');
      if (c && /^[0-9A-F]{6}$/i.test(c)) {
        this.hex.set('#' + c.toUpperCase());
      }
    }
  }
}
