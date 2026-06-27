import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-glassmorphism-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls panel card -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">GLASS PARAMETERS</span>

          <!-- Blur controls -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-[450] font-bold">
              <span>BACKDROP BLUR</span>
              <span>{{ blur() }}px</span>
            </div>
            <input type="range" min="0" max="40" [value]="blur()" (input)="blur.set(getParsedSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Glass opacity controls -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-[450] font-bold">
              <span>GLASS OPACITY</span>
              <span>{{ opacity() }}%</span>
            </div>
            <input type="range" min="0" max="100" [value]="opacity()" (input)="opacity.set(getParsedSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Border Opacity -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-[450] font-bold">
              <span>BORDER TRANSPARENCY</span>
              <span>{{ borderOpacity() }}%</span>
            </div>
            <input type="range" min="0" max="100" [value]="borderOpacity()" (input)="borderOpacity.set(getParsedSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Color palette picker -->
          <div class="space-y-2 pt-1 font-mono text-xs">
            <span class="text-zinc-[450] font-bold">GLASS BASE COLOUR</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <div class="w-6 h-6 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="glassColor()" (input)="glassColor.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="glassColor()"></div>
              </div>
              <span class="font-bold text-zinc-650 dark:text-zinc-350 select-all uppercase">{{ glassColor() }}</span>
            </div>
          </div>

          <!-- Layout demo background selector -->
          <div class="space-y-2 pt-2 border-t dark:border-zinc-800">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">DEMO BACKDROP LAYER</span>
            <div class="grid grid-cols-4 gap-2">
              <button (click)="bgPreset.set('gradient1')" class="h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-white/20 cursor-pointer" title="Cosmic Sunset"></button>
              <button (click)="bgPreset.set('gradient2')" class="h-10 rounded-lg bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-650 border border-white/20 cursor-pointer" title="Seaside Dreams"></button>
              <button (click)="bgPreset.set('gradient3')" class="h-10 rounded-lg bg-gradient-to-r from-amber-200 to-rose-450 border border-white/20 cursor-pointer" title="Warm Breeze"></button>
              <button (click)="bgPreset.set('image')" class="h-10 rounded-lg bg-zinc-700 bg-cover overflow-hidden relative border border-white/20 cursor-pointer" style="background-image: url('https://picsum.photos/seed/vibrant/100/100');" title="Realistic Photo"></button>
            </div>
          </div>
        </div>

        <!-- Render Target Preview Frame & Exporter -->
        <div class="space-y-6">
          <!-- Outer Preview Block loaded with demo backgrounds -->
          <div 
            class="h-64 rounded-2xl flex items-center justify-center p-8 border border-zinc-200 dark:border-zinc-850 relative overflow-hidden bg-cover bg-center shrink-0"
            [class.bg-gradient-to-br]="bgPreset() === 'gradient1'"
            [class.from-indigo-500]="bgPreset() === 'gradient1'"
            [class.via-purple-500]="bgPreset() === 'gradient1'"
            [class.to-pink-500]="bgPreset() === 'gradient1'"
            [class.bg-gradient-to-tr]="bgPreset() === 'gradient2'"
            [class.from-emerald-400]="bgPreset() === 'gradient2'"
            [class.via-teal-500]="bgPreset() === 'gradient2'"
            [class.to-indigo-650]="bgPreset() === 'gradient2'"
            [class.bg-gradient-to-r]="bgPreset() === 'gradient3'"
            [style.background-image]="bgPreset() === 'image' ? 'url(https://picsum.photos/seed/vibrant/600/400)' : ''"
          >
            <!-- Frosted Glass Card floating element -->
            <div 
              class="w-full max-w-[280px] p-6 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-center text-left text-white border border-white/10"
              [style.background-color]="compiledGlassRgba()"
              [style.backdrop-filter]="'blur(' + blur() + 'px)'"
              [style.-webkit-backdrop-filter]="'blur(' + blur() + 'px)'"
              [style.border-color]="compiledBorderRgba()"
            >
              <mat-icon class="scale-120 text-white/80 mb-2">blur_on</mat-icon>
              <h1 class="text-lg font-extrabold tracking-tight">FROSTED PANEL</h1>
              <p class="text-[11px] opacity-75 mt-1 leading-snug font-mono">Modern aesthetic, customizable glass properties and shadows configurations.</p>
            </div>
          </div>

          <!-- Code Exporters Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledCssProperties())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY CSS
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS CLASS SPECIFICATION</span>
                <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all overflow-x-auto whitespace-pre">{{ compiledCssProperties() }}</pre>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS alert indicators -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED GLASS PROPERTIES!
        </div>
      }
    </div>
  `
})
export class GlassmorphismGeneratorComponent {
  public blur = signal<number>(16);
  public opacity = signal<number>(25);
  public borderOpacity = signal<number>(30);
  public glassColor = signal<string>('#ffffff');
  public bgPreset = signal<'gradient1' | 'gradient2' | 'gradient3' | 'image'>('gradient1');
  public copySuccess = signal<boolean>(false);

  // Derived variables
  public compiledGlassRgba = computed(() => {
    return this.hexToRgba(this.glassColor(), this.opacity() / 100);
  });

  public compiledBorderRgba = computed(() => {
    // Standard white border mix is extremely popular, match if glassColor is white, else mix
    return this.hexToRgba(this.glassColor(), this.borderOpacity() / 100);
  });

  public compiledCssProperties = computed(() => {
    return `background: ${this.compiledGlassRgba()};
backdrop-filter: blur(${this.blur()}px);
-webkit-backdrop-filter: blur(${this.blur()}px);
border: 1px solid ${this.compiledBorderRgba()};
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.18);
border-radius: 16px;`;
  });

  public getParsedSliderVal(event: Event): number {
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

  private hexToRgba(hex: string, opacity: number): string {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    if (clean.length !== 6) {
      return `rgba(255,255,255,${opacity})`;
    }
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
  }
}
