import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-design-token-studio',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Column -->
        <div class="lg:col-span-1 p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm h-fit">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">DESIGN STATE TOKEN CONTROLLER</span>

          <!-- Interactive sliders altering active dictionary state -->
          <div class="space-y-3.5 font-mono text-xs">
            <!-- Brand Color -->
            <div class="space-y-1">
              <span class="text-zinc-[450] font-bold">CORE BRAND COLOR</span>
              <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
                <div class="w-5 h-5 rounded border relative overflow-hidden shrink-0">
                  <input type="color" [value]="bColor()" (input)="bColor.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                  <div class="w-full h-full" [style.background-color]="bColor()"></div>
                </div>
                <span class="font-bold select-all uppercase">{{ bColor() }}</span>
              </div>
            </div>

            <!-- Global Spacing padding -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>CONTAINER PADDING</span><span>{{ spacing() }}px</span></div>
              <input type="range" min="8" max="44" [value]="spacing()" (input)="spacing.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>

            <!-- Global Radiuses -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>BORDER RADIUS LEVEL</span><span>{{ radius() }}px</span></div>
              <input type="range" min="0" max="28" [value]="radius()" (input)="radius.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>

            <!-- Global Base FontSize -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>TEXT BASE SIZE</span><span>{{ fontSize() }}px</span></div>
              <input type="range" min="12" max="24" [value]="fontSize()" (input)="fontSize.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Render Style dictionary JSON format output -->
        <div class="lg:col-span-2 space-y-4 font-mono">
          <span class="text-xs font-mono font-bold text-zinc-500 block">STYLE DICTIONARY STRUCTURED JSON OUTPUT</span>

          <!-- Dictionary panel container -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl max-h-[380px] overflow-y-auto space-y-4">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[9px] text-zinc-400 font-bold uppercase">JSON DESIGN SPECIFICATION (NESTED)</span>
              <button (click)="copyValue(compiledJsonTokens())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY STRUCT
              </button>
            </div>

            <pre class="leading-relaxed text-[10px] text-zinc-300 select-all overflow-x-auto whitespace-pre">{{ compiledJsonTokens() }}</pre>
          </div>
        </div>

      </div>

      <!-- SUCCESS copy alert indicators -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED STYLE DICTIONARY TOKEN DATA!
        </div>
      }
    </div>
  `
})
export class DesignTokenStudioComponent {
  public bColor = signal<string>('#6366f1');
  public spacing = signal<number>(16);
  public radius = signal<number>(12);
  public fontSize = signal<number>(14);
  public copySuccess = signal<boolean>(false);

  // Computes beautiful, nested clean Style dictionary format structure
  public compiledJsonTokens = computed(() => {
    const rawTokens = {
      color: {
        brand: {
          primary: { value: this.bColor().toUpperCase(), type: 'color' },
          accent: { value: '#EC4899', type: 'color' }
        },
        neutral: {
          background: { value: '#0A0A0A', type: 'color' },
          surface: { value: '#18181B', type: 'color' }
        }
      },
      size: {
        spacing: {
          container: { value: `${this.spacing()}px`, type: 'dimension' }
        },
        font: {
          base: { value: `${this.fontSize()}px`, type: 'dimension' },
          heading: { value: `${Math.round(this.fontSize() * 1.6)}px`, type: 'dimension' }
        }
      },
      shape: {
        borderRadius: {
          container: { value: `${this.radius()}px`, type: 'dimension' }
        }
      }
    };

    return JSON.stringify(rawTokens, null, 2);
  });

  public getParsedSlider(event: Event): number {
    const input = event.target as HTMLInputElement;
    return parseInt(input.value, 10);
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
