import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
  public shadowColors = computed(() => {
    return this.calculateNeumorphicShadows(this.colorHex());
  });

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
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
}
