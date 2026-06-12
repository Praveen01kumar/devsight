import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-theme-builder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Theme Controls Sidebar Panel -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm h-fit">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">THEME COLOUR TOKENS</span>

          <!-- Primary Color Selector -->
          <div class="space-y-1.5 font-mono text-xs">
            <span class="text-zinc-[450] font-bold">PRIMARY BRAND SHADE</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <div class="w-6 h-6 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="primaryColor()" (input)="primaryColor.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="primaryColor()"></div>
              </div>
              <span class="font-bold text-zinc-650 dark:text-zinc-350 select-all uppercase">{{ primaryColor() }}</span>
            </div>
          </div>

          <!-- Secondary Accent Selector -->
          <div class="space-y-1.5 font-mono text-xs">
            <span class="text-zinc-[450] font-bold">SECONDARY ACCENT SHADE</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <div class="w-6 h-6 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="accentColor()" (input)="accentColor.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="accentColor()"></div>
              </div>
              <span class="font-bold text-zinc-650 dark:text-zinc-350 select-all uppercase">{{ accentColor() }}</span>
            </div>
          </div>

          <!-- Surface Background Selector -->
          <div class="space-y-1.5 font-mono text-xs">
            <span class="text-zinc-[450] font-bold">SURFACE / MAIN BODY BG</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <div class="w-6 h-6 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="surfaceBgColor()" (input)="surfaceBgColor.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="surfaceBgColor()"></div>
              </div>
              <span class="font-bold text-zinc-650 dark:text-zinc-350 select-all uppercase">{{ surfaceBgColor() }}</span>
            </div>
          </div>

          <!-- Corner Radius Slider -->
          <div class="space-y-1 font-mono text-xs pt-1">
            <div class="flex justify-between text-zinc-400 font-bold"><span>THEME RADIUS CORNERS</span><span>{{ radius() }}px</span></div>
            <input type="range" min="0" max="24" [value]="radius()" (input)="radius.set(getParsedSliderVal($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
          </div>
        </div>

        <!-- Layout Live Mockup and Exporter Column -->
        <div class="lg:col-span-2 space-y-6">
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-500 block">THEME INTERACTIVE MOCK-DASHBOARD</span>
            <!-- Dynamic mini dashboard using active tokens inside style sheets -->
            <div class="p-6 border border-zinc-200 dark:border-zinc-850 rounded-2xl min-h-[280px] shadow-sm select-none"
              [style.background-color]="surfaceBgColor()"
              [style.border-radius.px]="radius()">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <!-- Sidebar Simulated Segment -->
                <div class="sm:col-span-1 p-4 bg-black/5 dark:bg-white/5 rounded-xl space-y-3" [style.border-radius.px]="radius()">
                  <div class="flex items-center gap-2">
                    <mat-icon [style.color]="primaryColor()" class="scale-90">dashboard</mat-icon>
                    <span class="text-xs font-mono font-extrabold tracking-wider" [style.color]="primaryColor()">WORKSPACE CORP</span>
                  </div>
                  <div class="space-y-1 font-mono text-[10px] text-zinc-500">
                    <div class="p-2 bg-black/10 dark:bg-white/10 rounded font-bold" [style.color]="primaryColor()">System Overview</div>
                    <div class="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">Sales Charts</div>
                    <div class="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">Settings Profiles</div>
                  </div>
                </div>

                <!-- Main dashboard summary widget -->
                <div class="sm:col-span-2 space-y-4">
                  <!-- Header area -->
                  <div class="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
                    <h3 class="text-sm font-extrabold" [style.color]="isColorDark() ? '#ffffff' : '#030712'">Performance Auditor</h3>
                    <button class="px-2.5 py-1 text-[9px] font-mono font-bold text-white shadow" [style.background-color]="accentColor()" [style.border-radius.px]="radius()">
                      NEW METRICS
                    </button>
                  </div>

                  <!-- Charts content block simulated -->
                  <div class="grid grid-cols-2 gap-3 font-mono text-[9px]">
                    <div class="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5" [style.border-radius.px]="radius()">
                      <span class="text-zinc-[450] font-bold">TOTAL REVENUE CONV</span>
                      <h4 class="text-base font-extrabold mt-1" [style.color]="primaryColor()">$42,854.00</h4>
                    </div>

                    <div class="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5" [style.border-radius.px]="radius()">
                      <span class="text-zinc-[450] font-bold">ACTIVE APP SESSIONS</span>
                      <h4 class="text-base font-extrabold mt-1" [style.color]="accentColor()">954 ACTIVE</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Token Exporters Code Block -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">TAILWIND STYLE VARIABLES</span>
              <button (click)="copyValue(compiledTailwindConfig())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY TAILWIND CONFIG
              </button>
            </div>

            <div>
              <span class="text-[9px] text-zinc-400 font-bold uppercase block pb-1">EXPORTABLE DESIGN CONFIGS</span>
              <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all overflow-y-auto max-h-[140px] whitespace-pre">{{ compiledTailwindConfig() }}</pre>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS alert element popup -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED EXPORT DESIGN TOKEN!
        </div>
      }
    </div>
  `
})
export class ThemeBuilderComponent {
  public primaryColor = signal<string>('#6366f1');
  public accentColor = signal<string>('#ec4899');
  public surfaceBgColor = signal('#09090b');
  public radius = signal<number>(16);
  public copySuccess = signal<boolean>(false);

  public isColorDark = computed(() => {
    const rgb = this.hexToRgb(this.surfaceBgColor());
    return (rgb.r + rgb.g + rgb.b) / 3 < 128;
  });

  public getParsedSliderVal(event: Event): number {
    const input = event.target as HTMLInputElement;
    return parseInt(input.value, 10);
  }

  public compiledTailwindConfig = computed(() => {
    return `module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${this.primaryColor()}',
        accent: '${this.accentColor()}',
        surfaceBody: '${this.surfaceBgColor()}',
      },
      borderRadius: {
        custom: '${this.radius()}px',
      }
    }
  }
};`;
  });

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }

  private hexToRgb(hex: string) {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    if (clean.length !== 6) {
      return { r: 9, g: 9, b: 11 };
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
}
