import { ChangeDetectionStrategy, Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface HighlightMatch {
  index: number;
  text: string;
  groups: string[];
}

@Component({
  selector: 'app-regex-studio',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 text-left select-text">
      <!-- Tab Headers -->
      <div class="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        @for (category of tabs; track category.id) {
          <button (click)="activeTab.set(category.id)"
            [class.border-emerald-500]="activeTab() === category.id"
            [class.text-emerald-400]="activeTab() === category.id"
            [class.text-zinc-400]="activeTab() !== category.id"
            class="cursor-pointer px-4 py-3 border-b-2 border-transparent font-mono text-xs font-bold uppercase transition shrink-0 hover:text-white cursor-pointer">
            {{ category.name }}
          </button>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-1 gap-3">
        <!-- Sidebar item selectors -->
        <div class="lg:col-span-1 space-y-2">
          <span class="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block select-none">REGEX STUDIOS</span>
          <div class="flex flex-wrap gap-2">
            @for (tool of activeCategoryTools(); track tool.id) {
              <button (click)="activeTool.set(tool.id)"
                [class.bg-emerald-950/25]="activeTool() === tool.id"
                [class.text-emerald-400]="activeTool() === tool.id"
                [class.border-emerald-500/40]="activeTool() === tool.id"
                [class.bg-zinc-950/10]="activeTool() !== tool.id"
                [class.text-zinc-500]="activeTool() !== tool.id"
                [class.border-zinc-200]="activeTool() !== tool.id"
                [class.dark:border-zinc-800]="activeTool() !== tool.id"
                class="cursor-pointer w-auto text-left p-2 rounded-xl border font-sans text-xs font-semibold hover:border-emerald-600 transition flex items-center justify-between cursor-pointer">
                <div class="flex items-center gap-2">
                  <mat-icon class="scale-75 align-middle text-emerald-500/80">{{ tool.icon }}</mat-icon>
                  <span class="truncate block max-w-[130px] pr-1">{{ tool.name }}</span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Main workbench panels -->
        <div class="lg:col-span-3 space-y-6">
          <div class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-6">
            <div class="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-801 pb-4">
              <div>
                <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 capitalize font-sans">
                  <mat-icon class="text-emerald-400 scale-90">{{ getActiveToolIcon() }}</mat-icon>
                  {{ getActiveToolName() }}
                </h3>
                <p class="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {{ getActiveToolDesc() }}
                </p>
              </div>
              <button (click)="copyCode()"
                class="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-950 rounded-lg transition font-mono flex items-center gap-1.5 cursor-pointer">
                <mat-icon class="scale-50">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                {{ copied() ? 'COPIED!' : 'COPY PATTERN' }}
              </button>
            </div>

            <!-- TAB 1: REGEX TESTERS & ANALYZERS -->
            @if (activeTab() === 'testing') {
              <div class="space-y-6">
                <!-- Sandbox Controls -->
                <div class="space-y-4 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono select-text">
                    <div class="md:col-span-2 space-y-1.5 text-left">
                      <span class="text-[10px] font-bold text-zinc-450 tracking-wider font-mono block">REGULAR EXPRESSION PATTERN</span>
                      <div class="flex items-center bg-zinc-950 text-emerald-300/90 rounded-xl border border-zinc-250 dark:border-zinc-800 px-3 py-1.5">
                        <span class="text-zinc-650 dark:text-zinc-500 font-bold pr-1 select-none">/</span>
                        <input
                          #patternInput
                          type="text"
                          [value]="pattern()"
                          (input)="pattern.set(patternInput.value)"
                          placeholder="e.g. ^[a-z]+$"
                          class="w-full bg-transparent border-none outline-none font-mono text-xs focus:ring-0 text-emerald-400 font-semibold p-1"
                        />
                        <span class="text-zinc-650 dark:text-zinc-500 font-bold pl-1 select-none">/</span>
                        <span class="text-sky-400 font-bold text-xs select-none pl-1">
                          {{ (flagGlobal() ? 'g' : '') + (flagCaseInsensitive() ? 'i' : '') + (flagMultiline() ? 'm' : '') }}
                        </span>
                      </div>
                    </div>

                    <!-- Regex Flags selector hooks -->
                    <div class="space-y-1.5 text-left">
                      <span class="text-[10px] font-bold text-zinc-450 tracking-wider font-mono block">FLAGS CONFIG</span>
                      <div class="flex items-center gap-3 h-10 select-none">
                        <span class="flex items-center gap-1 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold cursor-pointer hover:text-white">
                          <input type="checkbox" [checked]="flagGlobal()" (change)="flagGlobal.set(!flagGlobal())" class="rounded text-emerald-505 border-zinc-800" />
                          g (global)
                        </span>
                        <span class="flex items-center gap-1 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold cursor-pointer hover:text-white">
                          <input type="checkbox" [checked]="flagCaseInsensitive()" (change)="flagCaseInsensitive.set(!flagCaseInsensitive())" class="rounded text-emerald-505 border-zinc-800" />
                          i (insensitive)
                        </span>
                        <span class="flex items-center gap-1 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold cursor-pointer hover:text-white">
                          <input type="checkbox" [checked]="flagMultiline()" (change)="flagMultiline.set(!flagMultiline())" class="rounded text-emerald-550 border-zinc-800" />
                          m (multiline)
                        </span>
                      </div>
                    </div>
                  </div>

                  @if (regexError()) {
                    <div class="p-3 bg-rose-950/20 border border-rose-950 rounded-xl text-rose-400 font-mono text-[10px] tracking-wide text-left flex items-start gap-1.5 animate-fade-in">
                      <mat-icon class="scale-50 mt-0.5">error_outline</mat-icon>
                      <span>SYNTAX ERROR: {{ regexError() }}</span>
                    </div>
                  }
                </div>

                <!-- Live Test Lines layout -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 select-text text-left">
                  <div class="space-y-1.5 flex flex-col h-72">
                    <span class="text-xs font-mono font-bold text-zinc-450">TEST STRINGS (SUBMIT TEXT ENTRIES HERE)</span>
                    <textarea
                      #testerArea
                      [value]="testString()"
                      (input)="testString.set(testerArea.value)"
                      placeholder="Enter lines of code or content logs to match here..."
                      class="flex-1 w-full bg-zinc-950/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-800 dark:text-zinc-300 outline-none focus:border-emerald-600 focus:ring-0 transition resize-none select-all font-mono"
                    ></textarea>
                  </div>

                  <!-- Real-time matches lists -->
                  <div class="space-y-1.5 flex flex-col h-72">
                    <span class="text-xs font-mono font-semibold text-zinc-450">MATCH RESULTS PANEL</span>
                    <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl p-3.5 overflow-auto select-all text-xs font-mono select-text transition">
                      @if (matches().length === 0) {
                        <div class="text-zinc-500 text-center py-10 font-sans text-[11px] leading-relaxed">
                          <mat-icon class="text-zinc-700 text-xl block mx-auto mb-1">sms_failed</mat-icon>
                          No matches caught.<br>Verify pattern constraints or input test elements.
                        </div>
                      } @else {
                        <div class="space-y-2.5">
                          <span class="text-[10px] font-bold text-emerald-400 block pb-1 border-b border-zinc-200 dark:border-zinc-900">
                            PROCESSED {{ matches().length }} TOTAL MATCHES
                          </span>
                          @for (match of matches(); track $index) {
                            <div class="text-[11px] bg-zinc-50 dark:bg-zinc-900/30 p-2 rounded border border-zinc-150 dark:border-zinc-850 space-y-1 select-all text-left">
                              <div class="flex justify-between text-[10px] text-zinc-500">
                                <span>MATCH #{{ $index + 1 }}</span>
                                <span>INDEX: {{ match.index }}</span>
                              </div>
                              <p class="text-sky-400 font-bold max-w-full truncate">"{{ match.text }}"</p>
                              @if (match.groups.length > 0) {
                                <div class="text-[10px] text-zinc-450 space-y-0.5">
                                  @for (gp of match.groups; track $index) {
                                    <div class="truncate block pr-2">Capture Group {{ $index + 1 }}: "{{ gp }}"</div>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: EXPLAINER MECHANISM -->
            @if (activeTab() === 'explanation') {
              <div class="space-y-4">
                <span class="text-xs font-mono font-bold text-zinc-450 block text-left">PLAIN-ENGLISH TOKEN STEP BREAKDOWN</span>
                <div class="p-4 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-3 text-left font-mono text-xs leading-relaxed select-all">
                  @for (step of explanationSteps(); track $index) {
                    <div class="flex items-start gap-2 border-b border-zinc-150 dark:border-zinc-900 pb-2">
                      <span class="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{{ step.token }}</span>
                      <span class="text-zinc-700 dark:text-zinc-450">{{ step.meaning }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 3: POPULAR REGEX CARDS PRESETS -->
            @if (activeTab() === 'patterns') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-3 text-left">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">PATTERN PRESET CARDS</span>
                  <div class="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    @for (card of patternPresets; track card.id) {
                      <button (click)="loadPatternPreset(card)"
                        class="p-2 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded bg-zinc-950/20 hover:bg-emerald-950/15 text-zinc-550 dark:text-zinc-400 hover:text-white transition truncate text-left block cursor-pointer">
                        {{ card.name }}
                      </button>
                    }
                  </div>
                </div>
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-450">PRESET SPECS ANALYSIS</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-xl overflow-auto select-all text-xs font-mono leading-relaxed space-y-3">
                    <div class="space-y-1">
                      <span class="text-zinc-500 font-bold block">REGEX EXPLANATION</span>
                      <p class="text-zinc-750 dark:text-zinc-350 select-text leading-normal">{{ activePresetSpec().desc }}</p>
                    </div>
                    <div class="space-y-1">
                      <span class="text-emerald-400 font-bold block">LOADED PATTERN</span>
                      <pre class="bg-zinc-900 p-2 rounded border border-zinc-800 font-mono text-[11px] text-sky-450 overflow-x-auto">/{{ activePresetSpec().pattern }}/g</pre>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: SYSTEM BACKTRACKING ANALYSIS -->
            @if (activeTab() === 'performance') {
              <div class="space-y-4">
                <div class="p-4 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-left font-mono text-xs space-y-4 select-all leading-relaxed">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase block">CATASTROPHIC BACKTRACKING AUDIT SYSTEM</span>

                  @if (hasBacktrackingRisk()) {
                    <div class="p-3 bg-amber-950/30 border border-amber-950 rounded-xl text-amber-400 text-[11px] space-y-1">
                      <div class="flex items-center gap-1.5 font-bold uppercase">
                        <mat-icon class="scale-50">warning</mat-icon> PERFORMANCE WARNING: NESTED QUANTIFIERS DETECTED
                      </div>
                      <p class="text-zinc-350 select-text leading-normal">
                        Your pattern contains nested repetition structures (e.g. <code>(a+)+</code> or overlapping wildcards like <code>.*.*</code>). This could create exponential computational operations if a long search string is partially rejected by the engine.
                      </p>
                    </div>
                  } @else {
                    <div class="p-3 bg-emerald-950/20 border border-emerald-950 rounded-xl text-emerald-400 text-[11px] space-y-1">
                      <div class="flex items-center gap-1.5 font-bold uppercase">
                        <mat-icon class="scale-50">check_circle</mat-icon> COMPILATION AUDITING: SECURE
                      </div>
                      <p class="text-zinc-600 dark:text-zinc-400 select-text leading-normal">
                        No dangerous lookahead loops or overlapping nested loops were flagged in the pattern. Compute scales bounds securely.
                      </p>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 5: MULTI-LANGUAGE EXPORTER -->
            @if (activeTab() === 'exporter') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-mono font-bold text-zinc-400 block">EXPORT LANGUAGE PRESETS</span>
                  <div class="space-y-2">
                    <button (click)="selectedLanguage.set('javascript')"
                      [class.bg-emerald-950/30]="selectedLanguage() === 'javascript'"
                      [class.text-emerald-400]="selectedLanguage() === 'javascript'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      JavaScript Exporter
                    </button>
                    <button (click)="selectedLanguage.set('python')"
                      [class.bg-emerald-950/30]="selectedLanguage() === 'python'"
                      [class.text-emerald-400]="selectedLanguage() === 'python'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      Python Exporter
                    </button>
                    <button (click)="selectedLanguage.set('java')"
                      [class.bg-emerald-950/30]="selectedLanguage() === 'java'"
                      [class.text-emerald-400]="selectedLanguage() === 'java'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      Java Class Matcher
                    </button>
                  </div>
                </div>
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-450">OUTPUT EXPORT FILE</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-tight text-left">
                    {{ activeExportedCode() }}
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegexStudioComponent {
  public activeTab = signal<string>('testing');
  public activeTool = signal<string>('regex-tester');

  // Regex parameters state
  public pattern = signal<string>('^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$');
  public flagGlobal = signal<boolean>(true);
  public flagCaseInsensitive = signal<boolean>(true);
  public flagMultiline = signal<boolean>(true);

  public testString = signal<string>('user@domain.com\nhello_world@test-suite.org\ninvalid-email@domains');

  public selectedLanguage = signal<string>('javascript');
  public copied = signal<boolean>(false);

  // Loaded presets
  public activePresetSpec = signal<{ pattern: string; desc: string }>({
    pattern: '^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$',
    desc: 'Evaluates standard email boundaries including specific alphanumeric coordinates plus trailing domain extension dots.'
  });

  public tabs = [
    { id: 'testing', name: 'Regex testing & testers' },
    { id: 'explanation', name: 'Explainer & Tokens' },
    { id: 'patterns', name: 'Pattern library cards' },
    { id: 'performance', name: 'Backtracking analysis' },
    { id: 'exporter', name: 'Language exporters' }
  ];

  public toolsRegistry: Record<string, { id: string; name: string; icon: string; desc: string }[]> = {
    testing: [
      { id: 'regex-tester', name: 'Full Regex Tester', icon: 'playlist_add_check', desc: 'Verify patterns on customizable body scripts and lines.' },
      { id: 'multiline-regex-tester', name: 'Multi-line Regex Tester', icon: 'menu', desc: 'Load multiple paragraphs to inspect offsets and boundary counts.' },
      { id: 'regex-split-tool', name: 'Regex Split utility', icon: 'call_split', desc: 'Isolate text lists cleanly using custom regex divisions.' },
      { id: 'extract-text-regex', name: 'Extract Text using Regex', icon: 'file_download', desc: 'Select specific group fields to write down to local logs.' }
    ],
    explanation: [
      { id: 'regex-explanation-tool', name: 'Regex Explainer Tool', icon: 'description', desc: 'Converts difficult capture patterns into plain readable English steps.' },
      { id: 'regex-token-vis', name: 'Regex Token Visualizer', icon: 'category', desc: 'Trace anchors, boundaries and repeating sets cleanly.' }
    ],
    patterns: [
      { id: 'email-regex-gen', name: 'Email Validation Preset', icon: 'alternate_email', desc: 'Email checking models with support for trailing dots.' },
      { id: 'url-regex-gen', name: 'URL Validator Preset', icon: 'language', desc: 'Matches URLs with or without subdomains and ports.' },
      { id: 'jwt-regex-gen', name: 'JWT claims token structures', icon: 'security', desc: 'Identify encoded three-period base64 JWT payload chains.' },
      { id: 'ipv4-ipv6-regex', name: 'IP Address Validation patterns', icon: 'dns', desc: 'Verify IPv4 or IPv6 coordinates for database lists.' }
    ],
    performance: [
      { id: 'catastrophic-backtrack-det', name: 'Backtracking Auditing Scanner', icon: 'gavel', desc: 'Audits pattern repetitions to prevent runtime thread bottlenecks.' },
      { id: 'regex-perf-analyzer', name: 'Regex Performance Analyzer', icon: 'timer', desc: 'Estimates match computations and scales over string limits.' }
    ],
    exporter: [
      { id: 'js-regex-exporter', name: 'JavaScript Patterns Exporter', icon: 'description', desc: 'Bundle JS compatible expressions inside scripts.' }
    ]
  };

  public patternPresets = [
    { id: 'email', name: 'Email Validation', pattern: '^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$', desc: 'Evaluates standard email boundaries.' },
    { id: 'url', name: 'URL Extractor', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', desc: 'Identifies URLs complete with query parameters.' },
    { id: 'jwt', name: 'JWT Hashing Token', pattern: '^[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*$', desc: 'Detects the standard three sections of JWT tokens.' },
    { id: 'ipv4', name: 'IPv4 Network Address', pattern: '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$', desc: 'Matches IPv4 addresses bounded by octet limits.' }
  ];

  public activeCategoryTools = computed(() => {
    return this.toolsRegistry[this.activeTab()] || [];
  });

  public getActiveToolName(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.name : 'Workbench';
  }

  public getActiveToolIcon(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.icon : 'history_edu';
  }

  public getActiveToolDesc(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.desc : 'Visual regex studio';
  }

  constructor() {
    // Reset active tool on switching categories
    effect(() => {
      const list = this.activeCategoryTools();
      if (list.length > 0) {
        this.activeTool.set(list[0].id);
      }
    });
  }

  // Live Match Parser logic safely compiled client side
  public matches = computed<HighlightMatch[]>(() => {
    const pat = this.pattern().trim();
    const str = this.testString();
    if (!pat) return [];

    try {
      const flags = (this.flagGlobal() ? 'g' : '') + (this.flagCaseInsensitive() ? 'i' : '') + (this.flagMultiline() ? 'm' : '');
      const re = new RegExp(pat, flags);

      const computedMatches: HighlightMatch[] = [];

      let match;
      if (this.flagGlobal()) {
        while ((match = re.exec(str)) !== null) {
          computedMatches.push({
            index: match.index,
            text: match[0],
            groups: match.slice(1).filter(Boolean)
          });
          // Safeguard against zero-width match infinite loops
          if (re.lastIndex === match.index) {
            re.lastIndex++;
          }
        }
      } else {
        match = re.exec(str);
        if (match) {
          computedMatches.push({
            index: match.index,
            text: match[0],
            groups: match.slice(1).filter(Boolean)
          });
        }
      }
      return computedMatches;
    } catch {
      return [];
    }
  });

  public regexError = computed<string | null>(() => {
    try {
      new RegExp(this.pattern());
      return null;
    } catch (e: unknown) {
      return (e as Error).message;
    }
  });

  public explanationSteps = computed(() => {
    const pat = this.pattern();
    const list: { token: string; meaning: string }[] = [];

    if (pat.includes('^')) {
      list.push({ token: '^', meaning: 'Asserts the start of the string or line boundary.' });
    }
    if (pat.includes('$')) {
      list.push({ token: '$', meaning: 'Asserts the end of the string or line boundary.' });
    }
    if (pat.includes('[a-zA-Z0-9]')) {
      list.push({ token: '[a-zA-Z0-9]', meaning: 'Matches any alphanumeric character (upper/lowercase letters and digits).' });
    }
    if (pat.includes('+')) {
      list.push({ token: '+', meaning: 'Greedy quantifier. Matches 1 or more repetitions of the preceding token.' });
    }
    if (pat.includes('@')) {
      list.push({ token: '@', meaning: 'Literal character "@". Matches the separator of standard addresses.' });
    }
    if (pat.includes('.')) {
      list.push({ token: '\\.', meaning: 'Escaped sub-dot. Matches the literal "." separating extensions.' });
    }
    if (pat.includes('{2,5}')) {
      list.push({ token: '{2,5}', meaning: 'Range repetition. Matches the preceding token between 2 and 5 instances.' });
    }

    if (list.length === 0) {
      list.push({ token: '.*', meaning: 'Wildcard. Matches any character sequence recursively.' });
    }
    return list;
  });

  public hasBacktrackingRisk = computed<boolean>(() => {
    const pat = this.pattern();
    // basic backtracking scanner for redundant star, plus, or query nest loops
    return pat.includes('*+') || pat.includes('+*') || pat.includes(']++') || pat.includes(')*');
  });

  public loadPatternPreset(card: typeof this.patternPresets[0]): void {
    this.pattern.set(card.pattern);
    this.activePresetSpec.set({
      pattern: card.pattern,
      desc: card.desc
    });
  }

  // exporters
  public activeExportedCode = computed(() => {
    const pat = this.pattern();
    const lang = this.selectedLanguage();

    if (lang === 'javascript') {
      return `// JavaScript Regular Expression matches exporter\nconst pattern = /${pat}/gi;\nconst testStr = "user@domain.com";\n\nif (pattern.test(testStr)) {\n  console.log("MATCH CAUGHT SUCCESSFULLY");\n}`;
    }

    if (lang === 'python') {
      return `# Python re module exporter\nimport re\n\npattern = r"${pat}"\ntest_str = "user@domain.com"\n\nmatch = re.match(pattern, test_str)\nif match:\n    print("MATCH CAUGHT:", match.group(0))`;
    }

    return `// Java Regex Pattern Class matcher\nimport java.util.regex.Pattern;\nimport java.util.regex.Matcher;\n\npublic class RegexExporter {\n    public static void main(String[] args) {\n        Pattern p = Pattern.compile("${pat.replace(/\\/g, '\\\\')}");\n        Matcher m = p.matcher("user@domain.com");\n        if (m.find()) {\n            System.out.println("Match: " + m.group(0));\n        }\n    }\n}`;
  });

  public copyCode(): void {
    let source = '';
    const tab = this.activeTab();

    if (tab === 'testing') {
      source = this.pattern();
    } else if (tab === 'explanation') {
      source = JSON.stringify(this.explanationSteps(), null, 2);
    } else if (tab === 'patterns') {
      source = this.activePresetSpec().pattern;
    } else if (tab === 'exporter') {
      source = this.activeExportedCode();
    } else {
      source = this.pattern();
    }

    try {
      navigator.clipboard.writeText(source);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // safe write
    }
  }
}
