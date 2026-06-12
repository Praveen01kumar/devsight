import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-angular-component-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <!-- Settings Panel -->
        <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <span class="text-xs font-mono font-bold text-zinc-400 block pb-1 border-b border-zinc-800">BOILERPLATE DESIGN PROPERTIES</span>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Component Name -->
            <div class="space-y-1.5">
              <label for="component-name" class="text-xs font-mono text-zinc-400 block font-bold">COMPONENT NAME</label>
              <input 
                id="component-name"
                type="text" 
                #nameRef
                [value]="componentName()" 
                (input)="onNameInput(nameRef.value)"
                placeholder="user-profile" 
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:ring-0 focus:border-zinc-700 select-text"
              />
            </div>

            <!-- Selector Prefix -->
            <div class="space-y-1.5">
              <label for="selector-prefix" class="text-xs font-mono text-zinc-400 block font-bold">SELECTOR PREFIX</label>
              <input 
                id="selector-prefix"
                type="text" 
                #prefixRef
                [value]="selectorPrefix()" 
                (input)="selectorPrefix.set(prefixRef.value.trim() || 'app')"
                placeholder="app" 
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:ring-0 focus:border-zinc-700 select-text"
              />
            </div>
          </div>

          <!-- Generation Toggles -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <!-- Standalone style -->
            <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
              <input 
                type="checkbox" 
                [checked]="isStandalone()"
                (change)="isStandalone.set(!isStandalone())"
                class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0"
              />
              <div class="font-mono text-xs">
                <span class="font-bold text-zinc-300">STANDALONE (v14+)</span>
              </div>
            </label>

            <!-- Inline Style -->
            <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
              <input 
                type="checkbox" 
                [checked]="inlineTemplate()"
                (change)="inlineTemplate.set(!inlineTemplate())"
                class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0"
              />
              <div class="font-mono text-xs">
                <span class="font-bold text-zinc-300">INLINE TEMPLATE</span>
              </div>
            </label>

            <!-- Signals Input -->
            <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
              <input 
                type="checkbox" 
                [checked]="useSignals()"
                (change)="useSignals.set(!useSignals())"
                class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0"
              />
              <div class="font-mono text-xs">
                <span class="font-bold text-zinc-300">ANGULAR SIGNALS</span>
              </div>
            </label>

            <!-- OnInit Hook -->
            <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
              <input 
                type="checkbox" 
                [checked]="includeOnInit()"
                (change)="includeOnInit.set(!includeOnInit())"
                class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0"
              />
              <div class="font-mono text-xs">
                <span class="font-bold text-zinc-300">ONINIT LIFECYCLE</span>
              </div>
            </label>
          </div>

          <!-- Styling formats selection -->
          <div class="space-y-2 pt-2">
            <span class="text-xs font-mono font-bold text-zinc-400 block">STYLING STRATEGY</span>
            <div class="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              @for (option of ['css', 'scss', 'tailwind', 'none']; track option) {
                <button 
                  (click)="styleFormat.set(option)"
                  [class.bg-zinc-800]="styleFormat() === option"
                  [class.text-emerald-400]="styleFormat() === option"
                  class="flex-1 py-1.5 text-xs font-mono text-zinc-400 rounded-lg capitalize transition cursor-pointer"
                >
                  {{ option }}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Generated Export Panel -->
        <div class="flex flex-col h-[520px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <span class="text-xs font-semibold text-zinc-400 font-mono">EXPORT MODULE SOURCE</span>
            <button 
              (click)="copyCode()"
              class="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/35 border border-emerald-950 rounded transition font-mono flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-xs scale-75">{{ copySuccess() ? 'check' : 'content_copy' }}</mat-icon> 
              {{ copySuccess() ? 'COPIED!' : 'COPY' }}
            </button>
          </div>

          <div class="flex-1 w-full p-4 overflow-auto text-xs font-mono text-zinc-200 text-left bg-zinc-950/45 select-text leading-relaxed">
            <pre class="overflow-x-auto select-all whitespace-pre">{{ generatedCode() }}</pre>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AngularComponentGeneratorComponent {
  public componentName = signal<string>('UserProfile');
  public selectorPrefix = signal<string>('app');
  public isStandalone = signal<boolean>(true);
  public inlineTemplate = signal<boolean>(false);
  public useSignals = signal<boolean>(true);
  public includeOnInit = signal<boolean>(true);
  public styleFormat = signal<string>('tailwind');
  public copySuccess = signal<boolean>(false);

  // Sanitizes to PascalCase representation
  public className = computed(() => {
    const raw = this.componentName() || 'my-component';
    return raw
      .replace(/[-_]([a-z])/g, (_, g) => g.toUpperCase())
      .replace(/^[a-z]/, (g) => g.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '') + 'Component';
  });

  // Sanitizes to kebab-case prefix selector representation
  public kebabSelector = computed(() => {
    const rawName = this.componentName() || 'my-component';
    const kebab = rawName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    return `${this.selectorPrefix()}-${kebab}`;
  });

  // Full typescript content compiles reactively
  public generatedCode = computed(() => {
    const className = this.className();
    const selector = this.kebabSelector();
    const standalone = this.isStandalone();
    const inlineTpl = this.inlineTemplate();
    const signals = this.useSignals();
    const onInit = this.includeOnInit();
    const style = this.styleFormat();

    // Setup headers
    const coreAttrs = ['Component'];
    if (onInit) {
      coreAttrs.push('OnInit');
    }
    if (signals) {
      coreAttrs.push('input');
      coreAttrs.push('output');
    } else {
      coreAttrs.push('Input');
      coreAttrs.push('Output');
      coreAttrs.push('EventEmitter');
    }

    let out = `import { ${coreAttrs.join(', ')} } from '@angular/core';\n`;
    if (standalone) {
      out += `import { CommonModule } from '@angular/common';\n`;
    }
    out += `\n`;

    out += `@Component({\n`;
    out += `  selector: '${selector}',\n`;
    if (standalone) {
      out += `  standalone: true,\n`;
      out += `  imports: [CommonModule],\n`;
    }

    if (inlineTpl) {
      let templ = ``;
      if (style === 'tailwind') {
        templ = `
    <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm">
      <h2 class="text-lg font-bold text-white mb-2">{{ title() }}</h2>
      <p class="text-sm text-zinc-400">Welcome to standalone Angular 21 layout setups.</p>
    </div>
        `;
      } else {
        templ = `
    <div class="user-container">
      <h2>{{ title }}</h2>
      <p>Welcome to standalone Angular.</p>
    </div>
        `;
      }
      out += `  template: \`${templ.trim()}\`,\n`;
    } else {
      const parts = selector.startsWith('app-') ? selector.slice(4) : selector;
      out += `  templateUrl: './${parts}.component.html',\n`;
    }

    if (style === 'css') {
      out += `  styleUrls: ['./${selector}.component.css']\n`;
    } else if (style === 'scss') {
      out += `  styleUrls: ['./${selector}.component.scss']\n`;
    } else if (style === 'none' || style === 'tailwind') {
      // inline or tailwind is utilized via utility styling global frames
      out += `  styles: []\n`;
    }

    out += `})\n`;

    // Signatures
    const implementsLine = onInit ? ` implements OnInit` : ``;
    out += `export class ${className}${implementsLine} {\n`;
    
    // Properties Signals
    if (signals) {
      out += `  public title = input<string>('Standard Card Title');\n`;
      out += `  public onAction = output<void>();\n`;
    } else {
      out += `  @Input() public title = 'Standard Card Title';\n`;
      out += `  @Output() public onAction = new EventEmitter<void>();\n`;
    }
    
    out += `\n`;
    out += `  constructor() {}\n`;

    if (onInit) {
      out += `\n  public ngOnInit(): void {\n`;
      out += `    console.log('${className} initialized');\n`;
      out += `  }\n`;
    }

    out += `}\n`;
    return out;
  });

  public onNameInput(val: string): void {
    const clean = val.trim().replace(/Component$/, '');
    this.componentName.set(clean || 'UserProfile');
  }

  public copyCode(): void {
    const code = this.generatedCode();
    navigator.clipboard.writeText(code).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }
}
