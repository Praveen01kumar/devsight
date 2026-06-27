import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
    const val = isOpacity ? parseFloat(input.value) / 100 : parseInt(input.value, 10);
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
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
  }
}
