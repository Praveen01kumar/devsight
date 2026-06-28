import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface GradientStop {
  color: string;
  position: number; // 0 to 100
}

@Component({
  selector: 'app-gradient-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid Layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Column -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">GRADIENT CONTROLLER</span>

          <!-- Type Select -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">GRADIENT TYPE</span>
            <div class="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <button (click)="gradientType.set('linear')"
                [class.bg-white]="gradientType() === 'linear'"
                [class.dark:bg-zinc-850]="gradientType() === 'linear'"
                [class.text-emerald-500]="gradientType() === 'linear'"
                class="flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer"
              >
                LINEAR
              </button>
              <button (click)="gradientType.set('radial')"
                [class.bg-white]="gradientType() === 'radial'"
                [class.dark:bg-zinc-850]="gradientType() === 'radial'"
                [class.text-emerald-500]="gradientType() === 'radial'"
                class="flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer"
              >
                RADIAL
              </button>
              <button (click)="gradientType.set('conic')"
                [class.bg-white]="gradientType() === 'conic'"
                [class.dark:bg-zinc-850]="gradientType() === 'conic'"
                [class.text-emerald-500]="gradientType() === 'conic'"
                class="flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer"
              >
                CONIC
              </button>
            </div>
          </div>

          <!-- Angle Slider (Linear only) -->
          @if (gradientType() === 'linear') {
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-mono text-zinc-500 font-bold">
                <span>ANGLE</span>
                <span>{{ angle() }}&deg;</span>
              </div>
              <input type="range" min="0" max="360" [value]="angle()" (input)="onAngleInput($event)" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
            </div>
          }

          <!-- Gradient stops builder -->
          <div class="space-y-3 pt-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-mono font-bold text-zinc-400">COLOR STOPS</span>
              <button (click)="addNewStop()"
                class="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded hover:bg-emerald-500/20 font-mono transition cursor-pointer">
                + ADD STOP
              </button>
            </div>

            <!-- List of stops -->
            <div class="space-y-2.5">
              @for (stop of stops(); track $index) {
                <div class="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-850">
                  <div class="w-6 h-6 rounded-md border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shrink-0">
                    <input type="color" [value]="stop.color" (input)="onStopColorInput($event, $index)"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"/>
                    <div class="w-full h-full" [style.background-color]="stop.color"></div>
                  </div>
                  <input type="range" min="0" max="100" [value]="stop.position" (input)="onStopPositionInput($event, $index)"
                    class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"/>
                  <span class="text-[10px] font-mono font-bold text-zinc-400 w-8 text-right">{{ stop.position }}%</span>
                  @if (stops().length > 2) {
                    <button (click)="removeStop($index)"
                      class="text-rose-450 hover:text-rose-600 scale-90 transition pt-1 cursor-pointer"
                    >
                      <mat-icon style="font-size:16px;">delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Noise & Animations Toggles -->
          <div class="grid grid-cols-2 gap-4 pt-2 border-t dark:border-zinc-800">
            <label class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none">
              <input type="checkbox" [checked]="hasNoise()" (change)="hasNoise.set(!hasNoise())" class="accent-emerald-500 cursor-pointer" />
              <span class="text-[10px] font-mono font-bold text-zinc-400">NOISE GRAIN</span>
            </label>

            <label class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none">
              <input type="checkbox" [checked]="isAnimated()" (change)="isAnimated.set(!isAnimated())" class="accent-emerald-500 cursor-pointer" />
              <span class="text-[10px] font-mono font-bold text-zinc-400">ANIMATED</span>
            </label>
          </div>
        </div>

        <!-- Preview & Output Columns -->
        <div class="space-y-6">
          <!-- Outer Preview Block -->
          <div
            class="h-44 rounded-2xl flex flex-col justify-center items-center shadow-lg border border-zinc-200 dark:border-zinc-800 relative overflow-hidden"
            [style.background]="compiledCssGradient()"
          >
            <!-- Render overlay noise patterns if selected -->
            @if (hasNoise()) {
              <div class="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http:%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22%2F%3E%3C%2filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22%2F%3E%3C%2Fsvg%3E'); background-repeat: repeat;"></div>
            }

            <span class="px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-xl text-[10px] font-mono text-white tracking-widest font-bold">
              ACTIVE SAMPLE CANVAS
            </span>
          </div>

          <!-- Secondary Preview Elements (Buttons & Text) -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl flex flex-col justify-center items-center h-24">
              <button
                class="px-5 py-2.5 rounded-xl font-bold font-mono text-xs text-white shadow-md cursor-pointer grow-0"
                [style.background]="compiledCssGradient()"
              >
                BUTTON GRADIENT
              </button>
            </div>

            <div class="p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl flex flex-col justify-center items-center h-24 select-text">
              <h1 class="text-xl font-extrabold font-mono bg-clip-text text-transparent text-center select-all"
                [style.background-image]="compiledCssGradient()">
                TEXT GRADIENT
              </h1>
            </div>
          </div>

          <!-- Source Code Exporter Panel -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-3 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">CODE EXPORTER</span>
              <button (click)="copyValue(compiledCssGradient())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY CSS
              </button>
            </div>

            <div class="space-y-3.5 pr-1 max-h-[160px] overflow-y-auto">
              <div>
                <span class="text-[9px] text-zinc-500 font-bold">STANDARD CSS BACKGROUND</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">background: {{ compiledCssGradient() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-500 font-bold">TAILWIND STYLE CLASS (INLINE)</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">bg-[{{ compiledCssGradient() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Copy SUCCESS alert popup code banner -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED EXPORT GRAPHIC GRADIENT!
        </div>
      }
    </div>
  `
})
export class GradientGeneratorComponent {
  public gradientType = signal<'linear' | 'radial' | 'conic'>('linear');
  public angle = signal<number>(135);
  public hasNoise = signal<boolean>(false);
  public isAnimated = signal<boolean>(false);
  public copySuccess = signal<boolean>(false);

  // Default color stops
  public stops = signal<GradientStop[]>([
    { color: '#8b5cf6', position: 0 },
    { color: '#ec4899', position: 100 }
  ]);

  public compiledCssGradient = computed(() => {
    const sortedStops = [...this.stops()].sort((a, b) => a.position - b.position);
    const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');

    switch (this.gradientType()) {
      case 'linear':
        return `linear-gradient(${this.angle()}deg, ${stopsStr})`;
      case 'radial':
        return `radial-gradient(circle, ${stopsStr})`;
      case 'conic':
        // Conic gradient positions use degrees instead of percentages in standard displays
        const conicStops = sortedStops.map(s => `${s.color} ${Math.round((s.position * 3.6))}deg`).join(', ');
        return `conic-gradient(from 0deg at center, ${conicStops})`;
    }
  });

  public onAngleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.angle.set(Number.parseInt(input.value, 10));
  }

  public addNewStop(): void {
    const current = this.stops();
    if (current.length >= 8) return; // limit to 8 colors

    // Place stop in middle
    const lastPos = current[current.length - 1].position;
    const secondLastPos = current.length > 1 ? current[current.length - 2].position : 0;
    const newPos = Math.round((lastPos + secondLastPos) / 2);

    this.stops.update(prev => [...prev, { color: '#10B981', position: newPos }]);
  }

  public removeStop(idx: number): void {
    if (this.stops().length <= 2) return;
    this.stops.update(prev => prev.filter((_, i) => i !== idx));
  }

  public onStopColorInput(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const colorVal = input.value;
    this.stops.update(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], color: colorVal };
      return copy;
    });
  }

  public onStopPositionInput(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const pos = Number.parseInt(input.value, 10);
    this.stops.update(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], position: pos };
      return copy;
    });
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

export interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number; // 0 to 1
  inset: boolean;
}

@Component({
  selector: 'app-box-shadow-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Sidebar -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">SHADOW LAYERS CONTROL</span>
            <button (click)="addNewLayer()"
              class="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold font-mono text-[10px] rounded transition cursor-pointer"
            >
              + ADD LAYER
            </button>
          </div>

          <!-- List of layered shadow editors -->
          <div class="space-y-4 overflow-y-auto max-h-[380px] pr-1">
            @for (layer of layers(); track $index) {
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-3 relative font-mono text-xs">
                <!-- Header with Layer Title & Remove Toggle -->
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-zinc-400">LAYER {{ $index + 1 }}</span>
                  <div class="flex items-center gap-2">
                    <label class="flex items-center gap-1.5 cursor-pointer text-[10px] select-none font-bold text-zinc-500">
                      <input type="checkbox" [checked]="layer.inset" (change)="toggleInset($index)" class="accent-emerald-500" />
                      INSET
                    </label>
                    @if (layers().length > 1) {
                      <button (click)="removeLayer($index)" class="text-rose-400 hover:text-rose-600 transition pl-1 cursor-pointer">
                        <mat-icon style="font-size:16px;">delete</mat-icon>
                      </button>
                    }
                  </div>
                </div>

                <!-- Sliders for offset x, y, blur, spread, opacity -->
                <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-zinc-400"><span>OFFSET X</span><span>{{ layer.x }}px</span></div>
                    <input type="range" min="-50" max="50" [value]="layer.x" (input)="onLayerSlider($event, $index, 'x')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-zinc-400"><span>OFFSET Y</span><span>{{ layer.y }}px</span></div>
                    <input type="range" min="-50" max="50" [value]="layer.y" (input)="onLayerSlider($event, $index, 'y')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-zinc-400"><span>BLUR</span><span>{{ layer.blur }}px</span></div>
                    <input type="range" min="0" max="80" [value]="layer.blur" (input)="onLayerSlider($event, $index, 'blur')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-zinc-400"><span>SPREAD</span><span>{{ layer.spread }}px</span></div>
                    <input type="range" min="-20" max="40" [value]="layer.spread" (input)="onLayerSlider($event, $index, 'spread')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-zinc-400"><span>OPACITY</span><span>{{ Math.round(layer.opacity * 100) }}%</span></div>
                    <input type="range" min="0" max="100" [value]="Math.round(layer.opacity * 100)" (input)="onLayerSlider($event, $index, 'opacity')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-1">
                    <label class="block text-[10px] font-bold text-zinc-400 pb-1">COLOR</label>
                    <div class="flex items-center gap-1">
                      <div class="w-5 h-5 rounded border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shrink-0">
                        <input type="color" [value]="layer.color" (input)="onLayerColor($event, $index)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                        <div class="w-full h-full" [style.background-color]="layer.color"></div>
                      </div>
                      <input type="text" [value]="layer.color" (change)="onLayerColorInput($event, $index)" class="bg-transparent border-none w-14 p-0 text-[10px] uppercase font-bold focus:ring-0 text-zinc-700 dark:text-zinc-300" />
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Standard preset loaders -->
          <div class="pt-2 border-t dark:border-zinc-800 space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">POPULAR PRESETS</span>
            <div class="grid grid-cols-3 gap-2">
              <button (click)="applyPreset('sleek')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">SLEEK AIR</button>
              <button (click)="applyPreset('deep')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">DEEP FIELD</button>
              <button (click)="applyPreset('glow')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">AMBIENT GLOW</button>
            </div>
          </div>
        </div>

        <!-- Render Target Preview Frame & Exporter Code Columns -->
        <div class="space-y-6">
          <!-- Large Live Sandbox preview -->
          <div class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden shrink-0">
            <div 
              class="w-36 h-36 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center text-center p-4 shadow-xl border border-zinc-150 dark:border-zinc-850 transition-all duration-200"
              [style.box-shadow]="compiledCssShadow()"
            >
              <span class="text-xs font-mono font-bold tracking-widest text-zinc-400">PREVIEW TARGET</span>
            </div>
          </div>

          <!-- Code Exporters Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledCssShadow())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY CSS
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS BOX SHADOW SHAPE</span>
                <p class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">box-shadow: {{ compiledCssShadow() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND INLINE SHADOW TOKEN</span>
                <p class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">shadow-[{{ compiledCssShadow() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS alert indicator popup -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED SHADOW PROPERTIES!
        </div>
      }
    </div>
  `
})
export class BoxShadowGeneratorComponent {
  public readonly Math = Math;
  public copySuccess = signal<boolean>(false);

  // Layer state signals
  public layers = signal<ShadowLayer[]>([
    { x: 0, y: 4, blur: 10, spread: -3, color: '#000000', opacity: 0.1, inset: false },
    { x: 0, y: 2, blur: 4, spread: -2, color: '#000000', opacity: 0.05, inset: false }
  ]);

  public compiledCssShadow = computed(() => {
    return this.layers().map(layer => {
      const parts = [
        layer.inset ? 'inset' : '',
        `${layer.x}px`,
        `${layer.y}px`,
        `${layer.blur}px`,
        `${layer.spread}px`,
        this.hexToRgba(layer.color, layer.opacity)
      ].filter(x => x !== '');
      return parts.join(' ');
    }).join(', ');
  });

  public addNewLayer(): void {
    if (this.layers().length >= 5) return; // limit to 5 layered elements
    this.layers.update(prev => [
      ...prev,
      { x: 0, y: 8, blur: 16, spread: -4, color: '#000000', opacity: 0.08, inset: false }
    ]);
  }

  public removeLayer(idx: number): void {
    if (this.layers().length <= 1) return;
    this.layers.update(prev => prev.filter((_, i) => i !== idx));
  }

  public toggleInset(idx: number): void {
    this.layers.update(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], inset: !copy[idx].inset };
      return copy;
    });
  }

  public onLayerSlider(event: Event, idx: number, key: keyof ShadowLayer): void {
    const input = event.target as HTMLInputElement;
    const isOpacity = key === 'opacity';
    const val = isOpacity ? parseFloat(input.value) / 100 : Number.parseInt(input.value, 10);
    this.layers.update(prev => {
      const copy = [...prev];
      // @ts-ignore
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  }

  public onLayerColor(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    this.updateColorAtIndex(input.value, idx);
  }

  public onLayerColorInput(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      this.updateColorAtIndex(val, idx);
    }
  }

  public applyPreset(type: 'sleek' | 'deep' | 'glow'): void {
    switch (type) {
      case 'sleek':
        this.layers.set([
          { x: 0, y: 2, blur: 4, spread: -1, color: '#000000', opacity: 0.08, inset: false },
          { x: 0, y: 1, blur: 2, spread: -1, color: '#000000', opacity: 0.04, inset: false }
        ]);
        break;
      case 'deep':
        this.layers.set([
          { x: 0, y: 20, blur: 25, spread: -5, color: '#000000', opacity: 0.15, inset: false },
          { x: 0, y: 10, blur: 10, spread: -5, color: '#000000', opacity: 0.04, inset: false }
        ]);
        break;
      case 'glow':
        this.layers.set([
          { x: 0, y: 0, blur: 15, spread: 3, color: '#10B981', opacity: 0.25, inset: false },
          { x: 0, y: 0, blur: 5, spread: 1, color: '#10B981', opacity: 0.1, inset: false }
        ]);
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

  private updateColorAtIndex(val: string, idx: number): void {
    this.layers.update(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], color: val };
      return copy;
    });
  }

  private hexToRgba(hex: string, opacity: number): string {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    if (clean.length !== 6) {
      return `rgba(0,0,0,${opacity})`;
    }
    const num = Number.parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
  }
}

export interface TextShadowLayer {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

@Component({
  selector: 'app-text-shadow-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Outer Grid Structure -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Sidebar Sheet -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">TEXT LAYERS SYSTEM</span>
            <button (click)="addNewLayer()"
              class="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold font-mono text-[10px] rounded transition cursor-pointer">
              + ADD LAYER
            </button>
          </div>

          <!-- Sandbox Content String Input -->
          <div class="space-y-1.5 font-mono text-xs">
            <label class="text-zinc-[450] font-bold">CUSTOM DISPLAY TEXT</label>
            <input type="text" [value]="displayText()" (input)="onTextContentInput($event)"
              class="w-full bg-zinc-50 dark:bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"/>
          </div>

          <!-- Dynamic list of layers -->
          <div class="space-y-4 overflow-y-auto max-h-[290px] pr-1">
            @for (layer of layers(); track $index) {
              <div class="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2.5 font-mono text-xs">
                <div class="flex justify-between items-center">
                  <span class="text-[9px] font-bold text-zinc-450 uppercase">TEXT SHADOW LEVEL {{ $index + 1 }}</span>
                  @if (layers().length > 1) {
                    <button (click)="removeLayer($index)" class="text-rose-450 hover:text-rose-600 transition pl-1 cursor-pointer">
                      <mat-icon style="font-size:16px;">delete</mat-icon>
                    </button>
                  }
                </div>

                <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div class="space-y-0.5">
                    <div class="flex justify-between text-[9px] font-bold text-zinc-400"><span>OFFSET X</span><span>{{ layer.x }}px</span></div>
                    <input type="range" min="-30" max="30" [value]="layer.x" (input)="onLayerSlider($event, $index, 'x')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-0.5">
                    <div class="flex justify-between text-[9px] font-bold text-zinc-400"><span>OFFSET Y</span><span>{{ layer.y }}px</span></div>
                    <input type="range" min="-30" max="30" [value]="layer.y" (input)="onLayerSlider($event, $index, 'y')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-0.5">
                    <div class="flex justify-between text-[9px] font-bold text-zinc-400"><span>BLUR</span><span>{{ layer.blur }}px</span></div>
                    <input type="range" min="0" max="40" [value]="layer.blur" (input)="onLayerSlider($event, $index, 'blur')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="space-y-0.5">
                    <div class="flex justify-between text-[9px] font-bold text-zinc-400"><span>OPACITY</span><span>{{ Math.round(layer.opacity * 100) }}%</span></div>
                    <input type="range" min="0" max="100" [value]="Math.round(layer.opacity * 100)" (input)="onLayerSlider($event, $index, 'opacity')" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                  </div>

                  <div class="col-span-2 pt-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[9px] font-bold text-zinc-400">SHADOW COLOR:</span>
                      <div class="w-5 h-5 rounded border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shrink-0">
                        <input type="color" [value]="layer.color" (input)="onLayerColor($event, $index)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                        <div class="w-full h-full" [style.background-color]="layer.color"></div>
                      </div>
                      <span class="text-[10px] font-bold uppercase text-zinc-650 dark:text-zinc-350 select-all">{{ layer.color }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Popular stylistic presets -->
          <div class="pt-2 border-t dark:border-zinc-800 space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">STYLE TYPOGRAPHY PRESETS</span>
            <div class="grid grid-cols-3 gap-2">
              <button (click)="applyPreset('glow')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">NEON GLOW</button>
              <button (click)="applyPreset('3d')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">RETRO 3D</button>
              <button (click)="applyPreset('soft')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">AMBIENT SOFT</button>
            </div>
          </div>
        </div>

        <!-- Render Target & Exporter -->
        <div class="space-y-6">
          <!-- Large Live Sandbox preview -->
          <div class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-950 relative overflow-hidden">
            <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white select-text text-center px-4"
              [style.text-shadow]="compiledCssShadow()">
              {{ displayText() }}
            </h1>
          </div>

          <!-- Code Exporters Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledCssShadow())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY TEXT-SHADOW
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS TEXT-SHADOW PROPERTY</span>
                <p class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">text-shadow: {{ compiledCssShadow() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND UTILITY STYLE TAG</span>
                <p class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">[text-shadow:{{ compiledCssShadow() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS alert popup -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED TYPOGRAPHIC CSS VALS!
        </div>
      }
    </div>
  `
})
export class TextShadowGeneratorComponent {
  public readonly Math = Math;
  public copySuccess = signal<boolean>(false);
  
  // Display text content
  public displayText = signal<string>('CREATOR');

  // Multi layers
  public layers = signal<TextShadowLayer[]>([
    { x: 0, y: 0, blur: 15, color: '#10B981', opacity: 0.9 },
    { x: 0, y: 2, blur: 5, color: '#3B82F6', opacity: 0.5 }
  ]);

  public compiledCssShadow = computed(() => {
    return this.layers().map(layer => {
      return `${layer.x}px ${layer.y}px ${layer.blur}px ${this.hexToRgba(layer.color, layer.opacity)}`;
    }).join(', ');
  });

  public onTextContentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.trim()) {
      this.displayText.set(input.value);
    }
  }

  public addNewLayer(): void {
    if (this.layers().length >= 4) return;
    this.layers.update(prev => [
      ...prev,
      { x: 0, y: 0, blur: 25, color: '#EC4899', opacity: 0.7 }
    ]);
  }

  public removeLayer(idx: number): void {
    if (this.layers().length <= 1) return;
    this.layers.update(prev => prev.filter((_, i) => i !== idx));
  }

  public onLayerSlider(event: Event, idx: number, key: keyof TextShadowLayer): void {
    const input = event.target as HTMLInputElement;
    const isOpacity = key === 'opacity';
    const val = isOpacity ? parseFloat(input.value) / 100 : Number.parseInt(input.value, 10);
    this.layers.update(prev => {
      const copy = [...prev];
      // @ts-ignore
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  }

  public onLayerColor(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    this.layers.update(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], color: input.value };
      return copy;
    });
  }

  public applyPreset(type: 'glow' | '3d' | 'soft'): void {
    switch (type) {
      case 'glow':
        this.layers.set([
          { x: 0, y: 0, blur: 8, color: '#10B981', opacity: 0.9 },
          { x: 0, y: 0, blur: 20, color: '#10B981', opacity: 0.6 }
        ]);
        break;
      case '3d':
        this.layers.set([
          { x: 1, y: 1, blur: 0, color: '#E11D48', opacity: 1 },
          { x: 2, y: 2, blur: 0, color: '#E11D48', opacity: 1 },
          { x: 3, y: 3, blur: 0, color: '#9F1239', opacity: 1 }
        ]);
        break;
      case 'soft':
        this.layers.set([
          { x: 0, y: 4, blur: 12, color: '#000000', opacity: 0.4 }
        ]);
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

  private hexToRgba(hex: string, opacity: number): string {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    if (clean.length !== 6) {
      return `rgba(0,0,0,${opacity})`;
    }
    const num = Number.parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}


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
  public compiledGlassRgba = computed(() => this.hexToRgba(this.glassColor(), this.opacity() / 100));

  public compiledBorderRgba = computed(() => this.hexToRgba(this.glassColor(), this.borderOpacity() / 100));

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
    return Number.parseInt(input.value, 10);
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
    const num = Number.parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
  }
}
@Component({
  selector: 'app-neumorphism-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Sidebar -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">NEUMORPHIC SHAPE CONTROLLER</span>

          <!-- Size/Dimension -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>RADIUS (CORNERS)</span><span>{{ radius() }}px</span></div>
            <input type="range" min="0" max="60" [value]="radius()" (input)="radius.set(getParsedSliderVal($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
          </div>

          <!-- Shadow Distance -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>DISTANCE</span><span>{{ distance() }}px</span></div>
            <input type="range" min="5" max="40" [value]="distance()" (input)="distance.set(getParsedSliderVal($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
          </div>

          <!-- Blur strength -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>BLUR</span><span>{{ blur() }}px</span></div>
            <input type="range" min="0" max="80" [value]="blur()" (input)="blur.set(getParsedSliderVal($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
          </div>

          <!-- Color base selector -->
          <div class="space-y-2 pt-1 font-mono text-xs">
            <span class="text-zinc-[450] font-bold">BASE BG COLOR</span>
            <div class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <div class="w-6 h-6 rounded border relative overflow-hidden shrink-0">
                <input type="color" [value]="colorHex()" (input)="colorHex.set($any($event.target).value)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                <div class="w-full h-full" [style.background-color]="colorHex()"></div>
              </div>
              <span class="font-bold text-zinc-650 dark:text-zinc-350 select-all uppercase">{{ colorHex() }}</span>
            </div>
          </div>

          <!-- Shape curvature style -->
          <div class="space-y-2 font-mono text-xs pt-1">
            <span class="text-zinc-[450] font-bold">SURFACE BEVEL / CURVATURE</span>
            <div class="grid grid-cols-4 gap-1.5">
              <button (click)="shapeStyle.set('flat')"
                [class.bg-emerald-500/10]="shapeStyle() === 'flat'"
                [class.text-emerald-500]="shapeStyle() === 'flat'"
                class="px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold cursor-pointer transition uppercase cursor-pointer"
              >FLAT</button>
              <button (click)="shapeStyle.set('concave')"
                [class.bg-emerald-500/10]="shapeStyle() === 'concave'"
                [class.text-emerald-500]="shapeStyle() === 'concave'"
                class="px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold cursor-pointer transition uppercase cursor-pointer"
              >CONCAVE</button>
              <button (click)="shapeStyle.set('convex')"
                [class.bg-emerald-500/10]="shapeStyle() === 'convex'"
                [class.text-emerald-500]="shapeStyle() === 'convex'"
                class="px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold cursor-pointer transition uppercase cursor-pointer"
              >CONVEX</button>
              <button (click)="shapeStyle.set('pressed')"
                [class.bg-emerald-500/10]="shapeStyle() === 'pressed'"
                [class.text-emerald-500]="shapeStyle() === 'pressed'"
                class="px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold cursor-pointer transition uppercase cursor-pointer"
              >PRESSED</button>
            </div>
          </div>
        </div>

        <!-- Target Render and Exporter -->
        <div class="space-y-6">
          <!-- Interactive Preview Area -->
          <div 
            class="h-64 rounded-2xl flex items-center justify-center p-8 border border-zinc-205 dark:border-zinc-850 shrink-0 select-none relative overflow-hidden"
            [style.background-color]="colorHex()"
          >
            <!-- Animated interactive Soft button -->
            <button 
              class="w-36 h-36 border border-white/5 active:scale-95 duration-100 transition-all flex flex-col items-center justify-center text-center p-4 cursor-pointer outline-none"
              [style.background]="compiledBevelStyle()"
              [style.border-radius.px]="radius()"
              [style.box-shadow]="compiledCssShadows()"
              [style.color]="isColorDark() ? '#ffffff' : '#18181b'"
            >
              <mat-icon class="scale-120 mb-2">touch_app</mat-icon>
              <span class="text-xs font-mono font-extrabold tracking-wider">TAP SOFT UI</span>
            </button>
          </div>

          <!-- Code Exporter Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledCssSnippet())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY STYLES
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS CODE SPECIFICATION</span>
                <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2 rounded-lg text-zinc-300 mt-1 select-all overflow-x-auto whitespace-pre">{{ compiledCssSnippet() }}</pre>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS Banner Alert -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED NEUMORPHIC LAYOUT!
        </div>
      }
    </div>
  `
})
export class NeumorphismGeneratorComponent {
  public radius = signal<number>(24);
  public distance = signal<number>(16);
  public blur = signal<number>(32);
  public colorHex = signal<string>('#e0e0e0');
  public shapeStyle = signal<'flat' | 'concave' | 'convex' | 'pressed'>('flat');
  public copySuccess = signal<boolean>(false);

  // Derived shadows
  public shadowColors = computed(() => this.calculateNeumorphicShadows(this.colorHex()));

  public isColorDark = computed(() => {
    const raw = this.hexToRgb(this.colorHex());
    return (raw.r + raw.g + raw.b) / 3 < 128;
  });

  public compiledCssShadows = computed(() => {
    const dst = this.distance();
    const blr = this.blur();
    const cols = this.shadowColors();

    if (this.shapeStyle() === 'pressed') {
      return `inset ${dst}px ${dst}px ${blr}px ${cols.dark}, inset -${dst}px -${dst}px ${blr}px ${cols.light}`;
    }
    return `${dst}px ${dst}px ${blr}px ${cols.dark}, -${dst}px -${dst}px ${blr}px ${cols.light}`;
  });

  public compiledBevelStyle = computed(() => {
    if (this.shapeStyle() === 'pressed') {
      return 'transparent';
    }
    const cols = this.shadowColors();
    if (this.shapeStyle() === 'concave') {
      return `linear-gradient(145deg, ${cols.darkGrad}, ${cols.lightGrad})`;
    }
    if (this.shapeStyle() === 'convex') {
      return `linear-gradient(145deg, ${cols.lightGrad}, ${cols.darkGrad})`;
    }
    return this.colorHex();
  });

  public compiledCssSnippet = computed(() => {
    return `border-radius: ${this.radius()}px;
            background: ${this.compiledBevelStyle()};
            box-shadow: ${this.compiledCssShadows()};`;
  });

  public getParsedSliderVal(event: Event): number {
    const input = event.target as HTMLInputElement;
    return Number.parseInt(input.value, 10);
  }

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }

  // Pure mathematical shade offsets to create dual Neumorphic reflections
  private calculateNeumorphicShadows(hex: string) {
    const rgb = this.hexToRgb(hex);
    
    // Lighten and darken formulas
    const adjust = (val: number, multiplier: number) => {
      return Math.max(0, Math.min(255, Math.round(val * multiplier)));
    };

    const darkRgb = { r: adjust(rgb.r, 0.85), g: adjust(rgb.g, 0.85), b: adjust(rgb.b, 0.85) };
    const lightRgb = { r: adjust(rgb.r, 1.15), g: adjust(rgb.g, 1.15), b: adjust(rgb.b, 1.15) };

    const darkGradRgb = { r: adjust(rgb.r, 0.9), g: adjust(rgb.g, 0.9), b: adjust(rgb.b, 0.9) };
    const lightGradRgb = { r: adjust(rgb.r, 1.1), g: adjust(rgb.g, 1.1), b: adjust(rgb.b, 1.1) };

    const rgbToHexStr = (c: {r: number, g: number, b: number}) => {
      return '#' + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);
    };

    return {
      dark: rgbToHexStr(darkRgb),
      light: rgbToHexStr(lightRgb),
      darkGrad: rgbToHexStr(darkGradRgb),
      lightGrad: rgbToHexStr(lightGradRgb)
    };
  }

  private hexToRgb(hex: string) {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    if (clean.length !== 6) {
      return { r: 224, g: 224, b: 224 };
    }
    const num = Number.parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
}
