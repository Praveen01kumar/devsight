import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
    let raw = this.cssInput().trim();
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
