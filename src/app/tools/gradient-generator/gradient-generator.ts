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
    this.angle.set(parseInt(input.value, 10));
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
    const pos = parseInt(input.value, 10);
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
