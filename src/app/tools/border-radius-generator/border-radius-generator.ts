import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-border-radius-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls panel card -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">8-AXIS VECTOR ANCHORS</span>

          <!-- Sliders for top, bottom, left, right horizontal and vertical coordinates -->
          <div class="space-y-3 font-mono text-xs">
            <!-- Top Horizontal -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>TOP HORIZONTAL</span><span>{{ th() }}%</span></div>
              <input type="range" min="0" max="100" [value]="th()" (input)="th.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Bottom Horizontal -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>BOTTOM HORIZONTAL</span><span>{{ bh() }}%</span></div>
              <input type="range" min="0" max="100" [value]="bh()" (input)="bh.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Left Vertical -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>LEFT VERTICAL</span><span>{{ lv() }}%</span></div>
              <input type="range" min="0" max="100" [value]="lv()" (input)="lv.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Right Vertical -->
            <div class="space-y-1">
              <div class="flex justify-between text-zinc-400 font-bold"><span>RIGHT VERTICAL</span><span>{{ rv() }}%</span></div>
              <input type="range" min="0" max="100" [value]="rv()" (input)="rv.set(getParsedSlider($event))" class="w-full h-1.5 rounded-lg accent-emerald-500 cursor-pointer" />
            </div>
          </div>

          <!-- Presets -->
          <div class="pt-2 border-t dark:border-zinc-805 space-y-1.5">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block">STANDARD BLOB DESIGN MODELS</span>
            <div class="grid grid-cols-3 gap-2">
              <button (click)="loadPreset('organic')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">ORGANIC BLOB</button>
              <button (click)="loadPreset('capsule')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">CAPSULE PILL</button>
              <button (click)="loadPreset('beveled')" class="px-2 py-2 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-901 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[9px] font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer">WAVY SHIELD</button>
            </div>
          </div>
        </div>

        <!-- Render Target Preview Frame & Exporter -->
        <div class="space-y-6">
          <!-- Outer Render frame -->
          <div class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-850 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden text-center shrink-0"
          >
            <!-- Blob element -->
            <div class="w-36 h-36 bg-gradient-to-br from-indigo-500 to-pink-500 shadow-xl p-4 flex flex-col justify-center items-center text-white scale-102 transition"
              [style.border-radius]="compiledBorderRadius()"
            >
              <span class="text-xs font-mono font-bold tracking-widest uppercase">BLOB TARGET</span>
            </div>
          </div>

          <!-- Code Export Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left font-mono">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledBorderRadius())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY BORDER-RADIUS
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS PROPERTY SPECIFICATION</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">border-radius: {{ compiledBorderRadius() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND INLINE SHAPE CLASS</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto">rounded-[{{ compiledBorderRadius() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS Banner Popup alert -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED SHAPE BORDER PROPERTIES!
        </div>
      }
    </div>
  `
})
export class BorderRadiusGeneratorComponent {
  public th = signal<number>(30); // Top Horizontal
  public bh = signal<number>(60); // Bottom Horizontal
  public lv = signal<number>(40); // Left Vertical
  public rv = signal<number>(70); // Right Vertical
  public copySuccess = signal<boolean>(false);

  // Calculates 8-axis border radius
  public compiledBorderRadius = computed(() => {
    const tH = this.th();
    const bH = this.bh();
    const lV = this.lv();
    const rV = this.rv();

    const topOpposite = 100 - tH;
    const bottomOpposite = 100 - bH;
    const leftOpposite = 100 - lV;
    const rightOpposite = 100 - rV;

    return `${tH}% ${topOpposite}% ${bH}% ${bottomOpposite}% / ${lV}% ${rightOpposite}% ${rV}% ${leftOpposite}%`;
  });

  public getParsedSlider(event: Event): number {
    const input = event.target as HTMLInputElement;
    return Number.parseInt(input.value, 10);
  }

  public loadPreset(type: 'organic' | 'capsule' | 'beveled'): void {
    switch (type) {
      case 'organic':
        this.th.set(30);
        this.bh.set(65);
        this.lv.set(45);
        this.rv.set(80);
        break;
      case 'capsule':
        this.th.set(50);
        this.bh.set(50);
        this.lv.set(40);
        this.rv.set(40);
        break;
      case 'beveled':
        this.th.set(90);
        this.bh.set(10);
        this.lv.set(15);
        this.rv.set(85);
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
}


@Component({
  selector: 'app-dev-utilities',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Top Tabs Selection -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b dark:border-zinc-800 pb-4">
        @for (tab of toolsTabs; track tab.id) {
          <button (click)="activeTabId.set(tab.id)"
            [class.bg-emerald-500/10]="activeTabId() === tab.id"
            [class.text-emerald-500]="activeTabId() === tab.id"
            [class.border-emerald-500/25]="activeTabId() === tab.id"
            class="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase"
          >
            <mat-icon style="font-size:14px; width:14px; height:14px;" class="flex items-center justify-center">{{ tab.icon }}</mat-icon>
            {{ tab.name }}
          </button>
        }
      </div>

      <!-- Main Panel based on selected sub-tool -->
      <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
        <!-- Tab 1: CSS Formatter / Beautifier -->
        @if (activeTabId() === 'css') {
          <div class="space-y-4">
            <span class="text-xs font-mono font-bold text-zinc-500 block border-b dark:border-zinc-805 pb-1">CSS FORMATTER / BEAUTIFIER</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1 font-mono text-xs">
                <span class="text-zinc-[450] font-bold">RAW CSS INPUT String</span>
                <textarea 
                  [value]="cssInput()"
                  (input)="onCssInput($event)"
                  placeholder="body{background:white;margin:0;}h1{color:#10b981;}"
                  class="w-full h-44 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none"
                ></textarea>
              </div>

              <div class="space-y-1 font-mono text-xs">
                <div class="flex justify-between items-center text-zinc-[450] font-bold">
                  <span>FORMATTED OUTPUT</span>
                  <button (click)="copyValue(formattedCss())" class="text-emerald-500 hover:underline cursor-pointer">COPY</button>
                </div>
                <pre class="w-full h-44 bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-xl text-zinc-300 overflow-auto whitespace-pre truncate">{{ formattedCss() }}</pre>
              </div>
            </div>
          </div>
        }

        <!-- Tab 2: JSON Prettifier -->
        @if (activeTabId() === 'json') {
          <div class="space-y-4">
            <span class="text-xs font-mono font-bold text-zinc-500 block border-b dark:border-zinc-855 pb-1">JSON PRETTIFIER & FORMATTER</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1 font-mono text-xs">
                <span class="text-zinc-[450] font-bold">COMPACT JSON INPUT BODY</span>
                <textarea [value]="jsonInput()" (input)="onJsonInput($event)" placeholder='{"name":"devsight","pwa":true}'
                  class="w-full h-44 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none"
                ></textarea>
              </div>

              <div class="space-y-1 font-mono text-xs">
                <div class="flex justify-between items-center text-zinc-[450] font-bold">
                  <span>BEAUTIFIED OUTPUT</span>
                  <button (click)="copyValue(formattedJson())" class="text-emerald-500 hover:underline cursor-pointer">COPY</button>
                </div>
                <pre class="w-full h-44 bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-xl text-zinc-200 overflow-auto whitespace-pre truncate">{{ formattedJson() }}</pre>
              </div>
            </div>
          </div>
        }

        <!-- Tab 3: SVG Optimizer / Converter -->
        @if (activeTabId() === 'svg') {
          <div class="space-y-4">
            <span class="text-xs font-mono font-bold text-zinc-500 block border-b dark:border-zinc-855 pb-1">SVG OPTIMIZER & TO JSX CONVERTER</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1 font-mono text-xs">
                <span class="text-zinc-[450] font-bold">RAW SVG CODE INPUT</span>
                <textarea [value]="svgInput()" (input)="onSvgInput($event)" placeholder='<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2"><path d="M0 0h10v10H0z"/></svg>'
                  class="w-full h-44 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none"
                ></textarea>
              </div>

              <div class="space-y-2.5 font-mono text-xs">
                <!-- Cleaned SVG output -->
                <div>
                  <div class="flex justify-between items-center text-zinc-[450] font-bold"><span>OPTIMIZED COMPLEMENT</span>
                  <button (click)="copyValue(optimizedSvg())" class="text-emerald-500 hover:underline cursor-pointer">COPY</button></div>
                  <pre class="bg-zinc-900 text-[9px] p-2 rounded-lg text-zinc-300 overflow-auto max-h-[80px] break-all">{{ optimizedSvg() }}</pre>
                </div>

                <!-- React JSX output -->
                <div>
                  <div class="flex justify-between items-center text-zinc-[450] font-bold"><span>REACT JSX FORMAT</span>
                  <button (click)="copyValue(svgToJsx())" class="text-emerald-400 hover:underline cursor-pointer">COPY</button></div>
                  <pre class="bg-zinc-900 text-[9px] p-2 rounded-lg text-zinc-300 overflow-auto max-h-[80px] break-all">{{ svgToJsx() }}</pre>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Tab 4: All additional converters (Base64, Regex, uuid, JWT) -->
        @if (activeTabId() === 'misc') {
          <div class="space-y-6">
            <span class="text-xs font-mono font-bold text-zinc-500 block border-b dark:border-zinc-855 pb-1">BASE64, REGEX, UUID, AND JWT UTILITY WORKBENCH</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs text-left">
              <!-- Base64 panel -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <span class="text-[10px] font-bold text-zinc-400 block border-b dark:border-zinc-800 pb-1">BASE64 CONVERTER</span>
                <input type="text" [value]="b64Text()" (input)="onB64TextInput($event)" placeholder="Text to Encode" class="w-full bg-zinc-100 dark:bg-zinc-900 border-none p-2 rounded" />
                <div class="pt-1.5 flex justify-between items-center bg-zinc-100 dark:bg-zinc-900 rounded p-2 text-[10px] text-zinc-600 dark:text-zinc-350 select-all font-bold">
                  <span>OUT: {{ compiledBase64() }}</span>
                  <button (click)="copyValue(compiledBase64())" class="text-xs text-emerald-500 hover:scale-105 active:scale-95 cursor-pointer"><mat-icon style="font-size:12px;">content_copy</mat-icon></button>
                </div>
              </div>

              <!-- UUID Segment -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-855 rounded-xl space-y-2 flex flex-col justify-between">
                <span class="text-[10px] font-bold text-zinc-400 block border-b dark:border-zinc-800 pb-1">UUID BUILDER V4</span>
                <p class="bg-zinc-100 dark:bg-zinc-900 p-2.5 rounded font-bold font-mono text-[10px] text-zinc-750 dark:text-zinc-250 select-all uppercase">{{ activeUuid() }}</p>
                <div class="flex gap-2">
                  <button (click)="triggerUuidChange()" class="flex-1 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded text-[9px] font-bold cursor-pointer uppercase">REFRESH</button>
                  <button (click)="copyValue(activeUuid())" class="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-[9px] cursor-pointer">COPY</button>
                </div>
              </div>

              <!-- Regular expressions visual match indicators -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2 col-span-1 md:col-span-2">
                <span class="text-[10px] font-bold text-zinc-400 block border-b dark:border-zinc-800 pb-1">REGULAR EXPRESSION TESTING MATRIX</span>
                <div class="grid grid-cols-2 gap-3 pb-1">
                  <input type="text" [value]="regexPattern()" (input)="regexPattern.set($any($event.target).value)" placeholder="[a-z]+ (Regex pattern)" class="bg-zinc-100 dark:bg-zinc-900 border-none p-2 rounded w-full [font-size:11px]" />
                  <input type="text" [value]="regexBody()" (input)="regexBody.set($any($event.target).value)" placeholder="Testing string" class="bg-zinc-100 dark:bg-zinc-900 border-none p-2 rounded w-full [font-size:11px]" />
                </div>
                <div class="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-[10px] font-bold text-[10px] flex items-center justify-between col-span-2">
                  <span>TEST RENEWAL COMPLIANCE:</span>
                  <span class="px-2 py-0.5 rounded text-[9px]" [class]="regexMatchOutput() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">{{ regexMatchOutput() ? 'PATTERN MATCH MATCHED' : 'UNMATCHED INDICES' }}</span>
                </div>
              </div>

              <!-- JWT Offline segments checking payload -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-855 rounded-xl space-y-2 col-span-1 md:col-span-2 text-left">
                <span class="text-[10px] font-bold text-zinc-400 block border-b dark:border-zinc-800 pb-1">SECURE OFFLINE JWT DECODER</span>
                <textarea 
                  [value]="jwtInput()"
                  (input)="jwtInput.set($any($event.target).value)"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                  class="w-full bg-zinc-100 dark:bg-zinc-900 border-none p-2 rounded w-full [font-size:10px] max-h-[60px]"
                ></textarea>
                <div class="grid grid-cols-2 gap-3.5 pt-1.5 text-[9px] leading-relaxed select-all">
                  <div>
                    <span class="text-zinc-[450] font-bold block uppercase border-b dark:border-zinc-800 pb-0.5">Segment 1: Header Payload</span>
                    <pre class="bg-zinc-900 p-2 rounded text-zinc-400 overflow-x-auto max-h-[70px] truncate">{{ decodedJwtHeader() }}</pre>
                  </div>
                  <div>
                    <span class="text-zinc-[450] font-bold block uppercase border-b dark:border-zinc-800 pb-0.5">Segment 2: User Body Payload</span>
                    <pre class="bg-zinc-900 p-2 rounded text-zinc-400 overflow-x-auto max-h-[70px] truncate">{{ decodedJwtPayload() }}</pre>
                  </div>
                </div>
              </div>

            </div>
          </div>
        }

      </div>

      <!-- SUCCESS alerts indication popups -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED VALUE TO CLIPBOARD!
        </div>
      }
    </div>
  `
})
export class DevUtilitiesComponent {
  public activeTabId = signal<'css' | 'json' | 'svg' | 'misc'>('css');
  public copySuccess = signal<boolean>(false);

  // Tabs
  public readonly toolsTabs = [
    { id: 'css' as const, name: 'CSS FORMATTER', icon: 'style' },
    { id: 'json' as const, name: 'JSON PRETTY', icon: 'settings_ethernet' },
    { id: 'svg' as const, name: 'SVG OPTIMIZER', icon: 'vector_library' },
    { id: 'misc' as const, name: 'MISC TOOLS', icon: 'extension' }
  ];

  // Tab 1: CSS state signals
  public cssInput = signal<string>('body{background:#0e1217;Color:rgba(255,255,255,1);}H1 {margin:24px;}');
  public formattedCss = computed(() => {
    const raw = this.cssInput().trim();
    if (!raw) return '';
    try {
      // Basic formatting regex conversions for visual beauties
      return raw
        .replace(/\\s*([\\{\\};,])\\s*/g, '$1') // strip spacing
        .replace(/\\{/g, ' {\n  ')
        .replace(/;/g, ';\n  ')
        .replace(/\\s*\\n\\s*\\}/g, '\n}\n\n')
        .replace(/,\\s*/g, ', ')
        .replace(/\\s*:\\s*/g, ': ')
        .replace(/\n\\s*\n/g, '\n')
        .trim();
    } catch {
      return raw;
    }
  });

  // Tab 2: JSON signals
  public jsonInput = signal<string>('{"project":"devsight","framework":"angular21","standalone":true,"categories":["productivity","seo","css-ui"]}');
  public formattedJson = computed(() => {
    const raw = this.jsonInput().trim();
    if (!raw) return '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch (err: any) {
      return `// ERROR PARSING JSON: \n// ${err?.message || 'Invalid format'}`;
    }
  });

  // Tab 3: SVG signals
  public svgInput = signal<string>('<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2" class="v-line" width="300" height="300" viewBox="0 0 100 100"><!-- comment --><path d="M0 0h10v10H0z"/></svg>');
  public optimizedSvg = computed(() => {
    const raw = this.svgInput().trim();
    if (!raw) return '';
    try {
      // Clean comments, namespaces and dimensions
      return raw
        .replace(/<!--[\\s\\S]*?-->/g, '') // strip comments
        .replace(/\\s*xmlns(:[a-z]+)?="[^"]*"/g, '') // namespaces
        .replace(/\\s*width="[^"]*"/gi, '') // width
        .replace(/\\s*height="[^"]*"/gi, '') // height
        .replace(/\\s+/g, ' ') // normalize spacing
        .trim();
    } catch {
      return raw;
    }
  });

  public svgToJsx = computed(() => {
    const src = this.optimizedSvg();
    if (!src) return '';
    // Basic camelCase attribute converting
    return src
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/stroke-linecap/g, 'strokeLinecap')
      .replace(/stroke-linejoin/g, 'strokeLinejoin')
      .replace(/fill-rule/g, 'fillRule')
      .replace(/clip-rule/g, 'clipRule');
  });

  // Tab 4: Misc signals
  public b64Text = signal<string>('devsight');
  public compiledBase64 = computed(() => {
    if (typeof window !== 'undefined' && this.b64Text()) {
      try {
        return window.btoa(this.b64Text());
      } catch {
        return '';
      }
    }
    return '';
  });

  public activeUuid = signal<string>('4fbc51dd-b541-4b77-83de-a89e17b80ddc');
  public triggerUuidChange(): void {
    // Generate simple compliant v4 standard identifiers client-side
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    this.activeUuid.set(uuid);
  }

  // Regex testing parameters
  public regexPattern = signal<string>('[a-z]+');
  public regexBody = signal<string>('testingString');
  public regexMatchOutput = computed(() => {
    const pattern = this.regexPattern();
    const body = this.regexBody();
    if (!pattern || !body) return false;
    try {
      const rx = new RegExp(pattern);
      return rx.test(body);
    } catch {
      return false;
    }
  });

  // JWT Decoding parameters
  public jwtInput = signal<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  public decodedJwtHeader = computed(() => {
    const tokens = this.jwtInput().split('.');
    if (tokens.length > 0 && typeof window !== 'undefined') {
      try {
        const decoded = window.atob(tokens[0].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.stringify(JSON.parse(decoded), null, 2);
      } catch {
        return 'Invalid base64 segments';
      }
    }
    return 'No segment';
  });

  public decodedJwtPayload = computed(() => {
    const tokens = this.jwtInput().split('.');
    if (tokens.length > 1 && typeof window !== 'undefined') {
      try {
        const decoded = window.atob(tokens[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.stringify(JSON.parse(decoded), null, 2);
      } catch {
        return 'Invalid base64 payload segment';
      }
    }
    return 'No payload segments';
  });

  // Inputs
  public onCssInput(e: Event): void {
    this.cssInput.set((e.target as any).value);
  }

  public onJsonInput(e: Event): void {
    this.jsonInput.set((e.target as any).value);
  }

  public onSvgInput(e: Event): void {
    this.svgInput.set((e.target as any).value);
  }

  public onB64TextInput(e: Event): void {
    this.b64Text.set((e.target as any).value);
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
