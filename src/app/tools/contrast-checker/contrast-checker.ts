import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { hexToRgb, rgbToHex, getContrastRatio, getApcaContrast, RGB, hslToRgb, rgbToHsl } from '../color-utils';

@Component({
  selector: 'app-contrast-checker',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Outer Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Sidebar Panel -->
        <div class="lg:col-span-1 p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">CONTROLLER COLORS</span>

          <!-- Foreground Color Text Row -->
          <div class="space-y-2">
            <label class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">TEXT (FOREGROUND)</label>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <div class="w-8 h-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shrink-0">
                <input type="color" [value]="textHex()" (input)="onTextHexInput($event)"
                  class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"/>
                <div class="w-full h-full" [style.background-color]="textHex()"></div>
              </div>
              <input type="text" [value]="textHex()" (change)="onTextStringChange($event)"
                class="flex-1 bg-transparent border-none font-mono text-sm text-zinc-800 dark:text-zinc-200 focus:ring-0 p-1 uppercase"/>
            </div>
          </div>

          <!-- Background Color Row -->
          <div class="space-y-2">
            <label class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">SURFACE (BACKGROUND)</label>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <div class="w-8 h-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shrink-0">
                <input type="color" [value]="bgHex()" (input)="onBgHexInput($event)"
                  class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"/>
                <div class="w-full h-full" [style.background-color]="bgHex()"></div>
              </div>
              <input type="text" [value]="bgHex()" (change)="onBgStringChange($event)"
                class="flex-1 bg-transparent border-none font-mono text-sm text-zinc-800 dark:text-zinc-200 focus:ring-0 p-1 uppercase"/>
            </div>
          </div>

          <!-- Typography Adjusters -->
          <div class="space-y-4 pt-2 border-t dark:border-zinc-800">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block pb-1">TYPOGRAPHY SPECS</span>
            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>FONT SIZE</span>
                <span>{{ fontSize() }}px</span>
              </div>
              <input type="range" min="12" max="64" [value]="fontSize()" (input)="onFontSizeInput($event)" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>FONT WEIGHT</span>
                <span>{{ fontWeight() }}</span>
              </div>
              <input type="range" min="100" max="900" step="100" [value]="fontWeight()" (input)="onFontWeightInput($event)" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>LINE HEIGHT</span>
                <span>{{ lineHeight() }}x</span>
              </div>
              <input type="range" min="1" max="2" step="0.1" [value]="lineHeight()" (input)="onLineHeightInput($event)" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Render Preview Frame & Contrast Analysis Score Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Large Live Sandbox preview -->
          <div class="p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-center min-h-[180px] shadow-sm relative overflow-hidden"
            [style.background-color]="bgHex()">
            <!-- Contrast badge label -->
            <span class="absolute top-3 right-3 text-[10px] font-mono font-extrabold tracking-wider border px-2 py-0.5 rounded-md"
              [style.color]="textHex()" [style.border-color]="textHex() + '40'">
              PREVIEW RECT
            </span>
            <!-- Real rendered test sentences -->
            <div [style.color]="textHex()">
              <h1 [style.font-size.px]="fontSize()" [style.font-weight]="fontWeight()" [style.line-height]="lineHeight()" class="tracking-tight select-text">
                The quick brown fox jumps over the lazy dog.
              </h1>
              <p class="text-xs opacity-80 mt-2 font-mono leading-relaxed select-all">
                Active text matches current metrics. Standard display renders here to verify relative readability scores.
              </p>
            </div>
          </div>

          <!-- Score Metrics and Accessibility Badges -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <!-- Contrast Ratio card -->
            <div class="p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl space-y-1">
              <span class="text-[9px] font-mono text-zinc-500 font-extrabold uppercase">CONTRAST METRICS</span>
              <h2 class="text-3xl font-mono font-extrabold text-emerald-500">{{ ratio() }}:1</h2>
              <div class="text-[10px] text-zinc-650 dark:text-zinc-400">Standard general WCAG score criteria</div>
            </div>

            <!-- APCA Score card -->
            <div class="p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl space-y-1">
              <span class="text-[9px] font-mono text-zinc-500 font-extrabold uppercase">APCA SCORE</span>
              <h2 class="text-3xl font-mono font-extrabold text-indigo-400">Lc {{ apca() }}</h2>
              <div class="text-[10px] text-zinc-650 dark:text-zinc-400">Perceptual contrast rating standard</div>
            </div>

            <!-- WCAG audit card -->
            <div class="p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl space-y-3 flex flex-col justify-between">
              <span class="text-[9px] font-mono text-zinc-500 font-extrabold uppercase">WCAG COMPLIANCE</span>
              <div class="space-y-1.5 font-mono text-xs">
                <div class="flex justify-between items-center">
                  <span>WCAG AA Small</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" [class]="passAASmall() ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">{{ passAASmall() ? 'PASS' : 'FAIL' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>WCAG AAA Small</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" [class]="passAAASmall() ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">{{ passAAASmall() ? 'PASS' : 'FAIL' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Auto Contrast Fix Suggestion Engine -->
          <div class="p-5 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-3">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">ACCESSIBILITY ASSISTANCE & AUTO-FIX</span>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 text-left">
                @if (ratio() >= 4.5) {
                  <span class="text-emerald-500 font-bold">&#10003; Compliant!</span> This combination easily meets standard WCAG AA guidelines for all screen typography.
                } @else {
                  <span class="text-rose-400 font-bold">&#9888; Low Contrast:</span> This combination is hard to read. Press the auto-fix button below to optimize.
                }
              </div>
              <button (click)="autofixContrast()"
                class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs rounded-xl transition flex items-center gap-1.5 justify-center cursor-pointer shrink-0">
                <mat-icon class="scale-75">auto_clean_templates</mat-icon> ONE-CLICK AUTO FIX
              </button>
            </div>
          </div>

          <!-- Multi-surface test matrix -->
          <div class="space-y-3 pt-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block">MULTI-SURFACE COMPATIBILITY ANALYSIS</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div class="p-4 bg-white border border-zinc-200 rounded-xl space-y-2">
                <div class="text-[10px] font-mono text-zinc-500 font-bold uppercase">WHITE BACKGROUND</div>
                <p class="text-md font-bold truncate" [style.color]="textHex()">Sample Text</p>
                <span class="text-[10px] block font-mono text-zinc-500">Ratio: {{ contrastColWhite() }}:1</span>
              </div>

              <div class="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                <div class="text-[10px] font-mono text-zinc-500 font-bold uppercase">BLACK SURFACE</div>
                <p class="text-md font-bold truncate" [style.color]="textHex()">Sample Text</p>
                <span class="text-[10px] block font-mono text-zinc-400">Ratio: {{ contrastColBlack() }}:1</span>
              </div>

              <div class="p-4 bg-slate-800 text-white rounded-xl space-y-2">
                <div class="text-[10px] font-mono text-white/50 font-bold uppercase">SLATE BG</div>
                <p class="text-md font-bold truncate" [style.color]="textHex()">Sample Text</p>
                <span class="text-[10px] block font-mono text-white/55">Ratio: {{ contrastColSlate() }}:1</span>
              </div>

              <div class="p-4 bg-zinc-650 text-white rounded-xl space-y-2">
                <div class="text-[10px] font-mono text-white/50 font-bold uppercase">ZINC BG</div>
                <p class="text-md font-bold truncate" [style.color]="textHex()">Sample Text</p>
                <span class="text-[10px] block font-mono text-white/55">Ratio: {{ contrastColZinc() }}:1</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `
})
export class ContrastCheckerComponent {
  public textHex = signal<string>('#10B981');
  public bgHex = signal<string>('#0A0A0A');

  public fontSize = signal<number>(24);
  public fontWeight = signal<number>(600);
  public lineHeight = signal<number>(1.2);

  // Parse relative colors safely from UI
  public textRgb = computed(() => this.getSafeRgb(this.textHex()));
  public bgRgb = computed(() => this.getSafeRgb(this.bgHex()));

  // WCAG & APCA scores
  public ratio = computed(() => {
    return getContrastRatio(this.textRgb(), this.bgRgb());
  });

  public apca = computed(() => {
    return getApcaContrast(this.textRgb(), this.bgRgb());
  });

  // WCAG small AA (4.5:1), large AA (3.0:1)
  // WCAG small AAA (7.0:1), large AAA (4.5:1)
  public passAASmall = computed(() => this.ratio() >= 4.5);
  public passAAASmall = computed(() => this.ratio() >= 7.0);

  // Multi-surface contrast
  public contrastColWhite = computed(() => getContrastRatio(this.textRgb(), { r: 255, g: 255, b: 255 }));
  public contrastColBlack = computed(() => getContrastRatio(this.textRgb(), { r: 10, g: 10, b: 10 }));
  public contrastColSlate = computed(() => getContrastRatio(this.textRgb(), { r: 30, g: 41, b: 59 }));
  public contrastColZinc = computed(() => getContrastRatio(this.textRgb(), { r: 63, g: 63, b: 70 }));

  public onTextHexInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.textHex.set(input.value.toUpperCase());
  }

  public onTextStringChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      this.textHex.set(val.toUpperCase());
    }
  }

  public onBgHexInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bgHex.set(input.value.toUpperCase());
  }

  public onBgStringChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      this.bgHex.set(val.toUpperCase());
    }
  }

  public onFontSizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fontSize.set(Number.parseInt(input.value, 10));
  }

  public onFontWeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fontWeight.set(Number.parseInt(input.value, 10));
  }

  public onLineHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.lineHeight.set(parseFloat(input.value));
  }

  public autofixContrast(): void {
    // Attempt simple lightness shift. If background is dark make text lighter; if background is bright make text darker.
    const lRgb = this.bgRgb();
    const avgL = (lRgb.r + lRgb.g + lRgb.b) / 3;
    if (avgL < 128) {
      // Dark surface -> Make text pure white / highly bright emerald
      this.textHex.set('#FFFFFF');
    } else {
      // Light surface -> Make text dark slate
      this.textHex.set('#0F172A');
    }
  }

  private getSafeRgb(hexVal: string): RGB {
    try {
      return hexToRgb(hexVal);
    } catch {
      return { r: 10, g: 10, b: 10 };
    }
  }
}


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
