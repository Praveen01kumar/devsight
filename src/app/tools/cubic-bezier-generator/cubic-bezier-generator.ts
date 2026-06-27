import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-cubic-bezier-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls & Presets Panel -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">TIMING VECTOR SPECS</span>

          <!-- Cartesian Coordinate Sliders -->
          <div class="space-y-3 font-mono text-xs">
            <div class="grid grid-cols-2 gap-4">
              <!-- P1_X -->
              <div class="space-y-1">
                <div class="flex justify-between text-zinc-400 font-bold"><span>P1_X</span><span>{{ p1x() }}</span></div>
                <input type="range" min="0" max="1" step="0.05" [value]="p1x()" (input)="p1x.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
              </div>
              <!-- P1_Y -->
              <div class="space-y-1">
                <div class="flex justify-between text-zinc-400 font-bold"><span>P1_Y</span><span>{{ p1y() }}</span></div>
                <input type="range" min="-1" max="2" step="0.05" [value]="p1y()" (input)="p1y.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- P2_X -->
              <div class="space-y-1">
                <div class="flex justify-between text-zinc-400 font-bold"><span>P2_X</span><span>{{ p2x() }}</span></div>
                <input type="range" min="0" max="1" step="0.05" [value]="p2x()" (input)="p2x.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
              </div>
              <!-- P2_Y -->
              <div class="space-y-1">
                <div class="flex justify-between text-zinc-400 font-bold"><span>P2_Y</span><span>{{ p2y() }}</span></div>
                <input type="range" min="-1" max="2" step="0.05" [value]="p2y()" (input)="p2y.set(getParsedSlider($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
              </div>
            </div>
          </div>

          <!-- Curve Preset Buttons -->
          <div class="pt-2 border-t dark:border-zinc-800 space-y-1.5">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block">STANDARD EASINGS CARTRIDGES</span>
            <div class="grid grid-cols-3 gap-2">
              <button (click)="loadPreset('easeIn')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">EASE IN</button>
              <button (click)="loadPreset('easeOut')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">EASE OUT</button>
              <button (click)="loadPreset('elastic')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">BACK ELASTIC</button>
            </div>
          </div>
        </div>

        <!-- Animation Canvas Simulator and Exporter -->
        <div class="space-y-6">
          <!-- Live Animation simulator side-by-side comparison tracks -->
          <div class="p-6 border border-zinc-200 dark:border-zinc-850 rounded-2xl bg-zinc-100 dark:bg-zinc-950 space-y-4">
            <span class="text-xs font-mono font-bold text-zinc-500 block">KINETIC ANIMATION SIMULATOR CORES</span>

            <!-- Comparison loops -->
            <div class="space-y-3 font-mono text-[9px]">
              <!-- Linear Track -->
              <div class="space-y-1">
                <span class="text-zinc-[450] font-bold">LINEAR TRACK (COMPARATIVE)</span>
                <div class="h-6 w-full bg-zinc-200 dark:bg-zinc-900 rounded-lg relative overflow-hidden flex items-center pr-1 border dark:border-zinc-800">
                  <div 
                    class="w-4 h-4 bg-zinc-500 rounded-sm absolute left-1 animate-[simLinear_2.5s_infinite_linear]"
                  ></div>
                </div>
              </div>

              <!-- Custom Bezier Track -->
              <div class="space-y-1">
                <span class="text-zinc-[450] font-bold uppercase">CUSTOM EASING PREVIEW (ACTIVE TIMING)</span>
                <!-- Injected styles wrapper -->
                <div class="h-6 w-full bg-zinc-200 dark:bg-zinc-900 rounded-lg relative overflow-hidden flex items-center pr-1 border dark:border-zinc-800">
                  <div 
                    class="w-4 h-4 bg-emerald-500 rounded-sm absolute left-1"
                    [style.animation]="'simActive 2.5s infinite'"
                    [style.animation-timing-function]="compiledBezierString()"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Code Export Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT TIMING CODES</span>
              <button (click)="copyValue(compiledBezierString())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY TRANSITION
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS EASING FORMULA</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">transition-timing-function: {{ compiledBezierString() }};</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS alert popup elements -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED CUSTOM MOTION VALUES!
        </div>
      }
    </div>

    <!-- Inject CSS Keyframes safely since we are in angular and zoneless without legacy animations -->
    <style>
      @keyframes simLinear {
        0% { left: 4px; }
        50% { left: calc(100% - 20px); }
        100% { left: 4px; }
      }
      @keyframes simActive {
        0% { left: 4px; }
        50% { left: calc(100% - 20px); }
        100% { left: 4px; }
      }
    </style>
  `
})
export class CubicBezierGeneratorComponent {
  public p1x = signal<number>(0.25);
  public p1y = signal<number>(1);
  public p2x = signal<number>(0.5);
  public p2y = signal<number>(1);
  public copySuccess = signal<boolean>(false);

  public compiledBezierString = computed(() => {
    return `cubic-bezier(${this.p1x()}, ${this.p1y()}, ${this.p2x()}, ${this.p2y()})`;
  });

  public getParsedSlider(event: Event): number {
    const input = event.target as HTMLInputElement;
    return parseFloat(parseFloat(input.value).toFixed(2));
  }

  public loadPreset(type: 'easeIn' | 'easeOut' | 'elastic'): void {
    switch (type) {
      case 'easeIn':
        this.p1x.set(0.42);
        this.p1y.set(0);
        this.p2x.set(1);
        this.p2y.set(1);
        break;
      case 'easeOut':
        this.p1x.set(0);
        this.p1y.set(0);
        this.p2x.set(0.58);
        this.p2y.set(1);
        break;
      case 'elastic':
        this.p1x.set(0.68);
        this.p1y.set(-0.6);
        this.p2x.set(0.32);
        this.p2y.set(1.6);
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
}
