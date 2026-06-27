import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-css-filter-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Column Panel -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">CSS FILTER CONTROLLERS</span>

          <!-- Brightness -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>BRIGHTNESS</span><span>{{ brightness() }}%</span></div>
            <input type="range" min="0" max="200" [value]="brightness()" (input)="brightness.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Contrast -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>CONTRAST</span><span>{{ contrast() }}%</span></div>
            <input type="range" min="0" max="200" [value]="contrast()" (input)="contrast.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Saturation -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>SATURATE</span><span>{{ saturate() }}%</span></div>
            <input type="range" min="0" max="250" [value]="saturate()" (input)="saturate.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Blur -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>BLUR</span><span>{{ blur() }}px</span></div>
            <input type="range" min="0" max="20" [value]="blur()" (input)="blur.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Hue Rotate -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>HUE ROTATE</span><span>{{ hueRotate() }}&deg;</span></div>
            <input type="range" min="0" max="360" [value]="hueRotate()" (input)="hueRotate.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Sepia / Grayscale / Inversion togglers in grid -->
          <div class="grid grid-cols-3 gap-2.5 pt-2 border-t dark:border-zinc-800">
            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="grayscale() > 0" (change)="toggleGrayscale()" class="accent-emerald-500 mb-1 cursor-pointer" />
              GRAYSCALE
            </label>

            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="sepia() > 0" (change)="toggleSepia()" class="accent-emerald-500 mb-1 cursor-pointer" />
              SEPIA
            </label>

            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="invert() > 0" (change)="toggleInvert()" class="accent-emerald-500 mb-1 cursor-pointer" />
              INVERT
            </label>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="space-y-6">
          
          <!-- Live Preview Canvas -->
          <div 
            class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-950 relative overflow-hidden shrink-0 select-none bg-cover bg-center"
            style="background-image: url('https://picsum.photos/seed/nature3/600/400');"
            [style.filter]="compiledFilterString()"
          >
            <span class="absolute top-3 right-3 px-2 py-0.5 bg-black/60 rounded text-[9px] text-white font-mono tracking-widest font-bold">
              IMAGE SURFACE OVERLAY
            </span>
          </div>

          <!-- Code Export Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledFilterString())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY FILTER
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS CODE CLASSIFICATION</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto whitespace-normal">filter: {{ compiledFilterString() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND DYNAMIC FILTER</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto whitespace-normal">backdrop-filter:[{{ compiledFilterString() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS Alert indicator popup -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED EXP DESIGN FILTER CODE!
        </div>
      }
    </div>
  `
})
export class CssFilterGeneratorComponent {
  public brightness = signal<number>(100);
  public contrast = signal<number>(100);
  public saturate = signal<number>(100);
  public blur = signal<number>(0);
  public hueRotate = signal<number>(0);
  public grayscale = signal<number>(0);
  public sepia = signal<number>(0);
  public invert = signal<number>(0);
  public copySuccess = signal<boolean>(false);

  public compiledFilterString = computed(() => {
    const parts = [
      this.brightness() !== 100 ? `brightness(${this.brightness()}%)` : '',
      this.contrast() !== 100 ? `contrast(${this.contrast()}%)` : '',
      this.saturate() !== 100 ? `saturate(${this.saturate()}%)` : '',
      this.blur() > 0 ? `blur(${this.blur()}px)` : '',
      this.hueRotate() > 0 ? `hue-rotate(${this.hueRotate()}deg)` : '',
      this.grayscale() > 0 ? `grayscale(${this.grayscale()}%)` : '',
      this.sepia() > 0 ? `sepia(${this.sepia()}%)` : '',
      this.invert() > 0 ? `invert(${this.invert()}%)` : ''
    ].filter(x => x !== '');

    return parts.length > 0 ? parts.join(' ') : 'none';
  });

  public getSliderVal(event: Event): number {
    const input = event.target as HTMLInputElement;
    return parseInt(input.value, 10);
  }

  public toggleGrayscale(): void {
    this.grayscale.set(this.grayscale() === 0 ? 100 : 0);
  }

  public toggleSepia(): void {
    this.sepia.set(this.sepia() === 0 ? 100 : 0);
  }

  public toggleInvert(): void {
    this.invert.set(this.invert() === 0 ? 100 : 0);
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
