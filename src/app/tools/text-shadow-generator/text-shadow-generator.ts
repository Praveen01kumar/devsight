import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}
