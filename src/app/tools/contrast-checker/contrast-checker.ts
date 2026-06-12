import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { hexToRgb, rgbToHex, getContrastRatio, getApcaContrast, RGB } from '../color-utils';

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
              <input type="range" min="12" max="64" [value]="fontSize()" (input)="onFontSizeInput($event)" class="w-full select-none accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-805" />
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>FONT WEIGHT</span>
                <span>{{ fontWeight() }}</span>
              </div>
              <input type="range" min="100" max="900" step="100" [value]="fontWeight()" (input)="onFontWeightInput($event)" class="w-full select-none accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-805" />
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>LINE HEIGHT</span>
                <span>{{ lineHeight() }}x</span>
              </div>
              <input type="range" min="1" max="2" step="0.1" [value]="lineHeight()" (input)="onLineHeightInput($event)" class="w-full select-none accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-805" />
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
    this.fontSize.set(parseInt(input.value, 10));
  }

  public onFontWeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fontWeight.set(parseInt(input.value, 10));
  }

  public onLineHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.lineHeight.set(parseFloat(input.value));
  }

  public autofixContrast(): void {
    // Attempt simple lightness shift. If background is dark make text lighter; if background is bright make text darker.
    const bgLuminance = this.bgHex();
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
