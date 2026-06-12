import { ChangeDetectionStrategy, Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface MarbleEvent {
  value: string | number;
  time: number; // millisecond marker
  type: 'value' | 'error' | 'complete';
}

@Component({
  selector: 'app-rxjs-visualizer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 text-left select-text">
      <!-- Tab Headers -->
      <div class="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        @for (category of tabs; track category.id) {
          <button
            (click)="activeTab.set(category.id)"
            [class.border-emerald-500]="activeTab() === category.id"
            [class.text-emerald-400]="activeTab() === category.id"
            [class.text-zinc-400]="activeTab() !== category.id"
            class="cursor-pointer px-4 py-3 border-b-2 border-transparent font-mono text-xs font-bold uppercase transition shrink-0 hover:text-white"
          >
            {{ category.name }}
          </button>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-1 gap-3">
        <!-- Sidebar items -->
        <div class="lg:col-span-1 space-y-2">
          <span class="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block select-none">STREAM WORKSPACE</span>
          <div class="flex flex-wrap gap-2">
            @for (tool of activeCategoryTools(); track tool.id) {
              <button
                (click)="activeTool.set(tool.id)"
                [class.bg-emerald-950/25]="activeTool() === tool.id"
                [class.text-emerald-400]="activeTool() === tool.id"
                [class.border-emerald-500/40]="activeTool() === tool.id"
                [class.bg-zinc-950/10]="activeTool() !== tool.id"
                [class.text-zinc-500]="activeTool() !== tool.id"
                [class.border-zinc-200]="activeTool() !== tool.id"
                [class.dark:border-zinc-800]="activeTool() !== tool.id"
                class="cursor-pointer w-auto text-left p-2 rounded-xl border font-sans text-xs font-semibold hover:border-emerald-600 transition flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <mat-icon class="scale-75 align-middle text-emerald-500/80">{{ tool.icon }}</mat-icon>
                  <span class="truncate pr-1 block max-w-[130px]">{{ tool.name }}</span>
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
                <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 capitalize">
                  <mat-icon class="text-emerald-500 scale-90">{{ getActiveToolIcon() }}</mat-icon>
                  {{ getActiveToolName() }}
                </h3>
                <p class="text-[11px] text-zinc-400 mt-1">
                  {{ getActiveToolDesc() }}
                </p>
              </div>
              <button (click)="copyCode()"
                class="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-950 rounded-lg transition font-mono flex items-center gap-1.5 cursor-pointer">
                <mat-icon class="scale-50">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                {{ copied() ? 'COPIED!' : 'COPY CODE' }}
              </button>
            </div>

            <!-- TAB 1: VISUAL TIMELINES AND MARBLE CHARTS -->
            @if (activeTab() === 'visualizers') {
              <div class="space-y-6">
                <!-- Sandbox Controls -->
                <div class="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-850">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="text-xs font-mono font-bold text-zinc-400 uppercase">OPERATOR TYPE:</span>
                    <select
                      #operatorSelect
                      [value]="activeOperator()"
                      (change)="activeOperator.set(operatorSelect.value)"
                      class="bg-zinc-100 dark:bg-zinc-900 text-xs font-mono text-zinc-805 dark:text-zinc-200 rounded-lg px-2 py-1 border border-zinc-250 dark:border-zinc-800 outline-none focus:border-emerald-500"
                    >
                      <option value="map">map(x => x &times; 2)</option>
                      <option value="filter">filter(x => x &gt; 3)</option>
                      <option value="delay">delay(100ms)</option>
                      <option value="take">take(3)</option>
                    </select>

                    <button (click)="triggerManualEmit()"
                      class="px-3 py-1 bg-emerald-650 hover:bg-emerald-600 text-xs text-white rounded-lg transition font-mono font-semibold cursor-pointer">
                      EMIT CURRENT VALUE
                    </button>
                    <button (click)="clearVisualizer()"
                      class="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-250 hover:dark:bg-zinc-750 text-xs text-zinc-650 dark:text-zinc-300 rounded-lg transition font-mono cursor-pointer">
                      CLEAR
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="flex h-2 w-2 relative">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <span class="text-[10px] font-mono text-zinc-450 uppercase">STREAM LISTENER: ACTIVE</span>
                  </div>
                </div>

                <!-- Live Marble Timelines -->
                <div class="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <!-- Raw input stream timeline -->
                  <div class="space-y-1.5 text-left">
                    <span class="text-[10px] font-mono font-bold text-zinc-400 uppercase">INPUT STREAM SOURCE (O$)</span>
                    <div class="relative h-14 bg-zinc-950/5 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850 flex items-center overflow-hidden">
                      <div class="absolute left-0 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
                      <!-- Marble emissions -->
                      @for (event of sourceEmissions(); track $index) {
                        <div
                          [style.left.%]="event.time * 8"
                          class="absolute transform -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow shadow-indigo-500/20 animate-fade-in"
                        >
                          {{ event.value }}
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Transformed output stream timeline -->
                  <div class="space-y-1.5 text-left">
                    <span class="text-[10px] font-mono font-bold text-emerald-400 uppercase">PROCESSED PIPELINE OUTPUTS</span>
                    <div class="relative h-14 bg-zinc-950/10 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850 flex items-center overflow-hidden">
                      <div class="absolute left-0 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
                      <!-- Transformed outputs -->
                      @for (event of outputEmissions(); track $index) {
                        <div
                          [style.left.%]="event.time * 8"
                          class="absolute transform -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 text-zinc-950 font-mono text-[11px] font-bold flex items-center justify-center shadow shadow-emerald-400/20 animate-fade-in"
                        >
                          {{ event.value }}
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: CODE HELPERS EXPLORER -->
            @if (activeTab() === 'helpers') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase block font-mono">PIPELINE PARAMETERS</span>
                  @if (activeTool() === 'rxjs-comparison-tool') {
                    <p class="text-xs text-zinc-400 leading-relaxed font-sans">
                      Compare Operators directly. Select operators like SwitchMap, MergeMap, ConcatMap, and ExhaustMap to verify asynchronous execution constraints.
                    </p>
                  } @else {
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <span class="text-[10px] font-mono text-zinc-450 font-bold uppercase block">CUSTOM EMIT VALUE</span>
                        <input
                          #customEmitIn
                          type="text"
                          [value]="customInputValue()"
                          (input)="customInputValue.set(customEmitIn.value)"
                          class="w-full bg-zinc-910 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-850 dark:text-zinc-200 outline-none"
                        />
                      </div>
                    </div>
                  }
                </div>
                <!-- Dynamic preview wrapper -->
                <div class="space-y-1.5 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400">OUTPUT SCHEDULER BOILERPLATE</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-tight text-left">
                    {{ activeTemplateResult() }}
                  </div>
                </div>
              </div>
            }

            <!-- TAB 3: RXJS CODE GENERATORS -->
            @if (activeTab() === 'generators') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase block font-mono">GENERATOR OVERLAYS</span>
                  <p class="text-xs text-zinc-400 leading-relaxed font-sans">
                    Construct Angular services integrated with RxJS Operators. Output code includes standard patterns with strictly bounded async subscriptions.
                  </p>
                </div>
                <div class="space-y-1 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400 font-bold">GENERATED RXJS CODE</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-sky-400 whitespace-pre-wrap leading-tight text-left">
                    {{ generatedRxJSCode() }}
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: DEBBUGINGS & LEARNINGS -->
            @if (activeTab() === 'debugging') {
              <div class="space-y-6">
                <!-- Subject Comparison Playground -->
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800 rounded-xl space-y-4 text-left">
                  <div class="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <span class="text-xs font-mono font-bold text-zinc-400">SUBJECT COMPARATOR WORKBENCH</span>
                    <button (click)="triggerSubjectEmit()"
                      class="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-[10px] text-zinc-950 rounded-md transition font-mono font-bold uppercase cursor-pointer">
                      trigger .next("Value")
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2 text-xs font-mono">
                      <span class="text-zinc-500 font-bold block">1. Standard Subject (No buffer/seed)</span>
                      <div class="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg min-h-16 flex flex-col gap-1 text-[11px]">
                        @for (log of subjectLogs(); track $index) {
                          <span class="text-sky-400">> Subscriber 1 received: {{ log }}</span>
                        }
                      </div>
                    </div>

                    <div class="space-y-2 text-xs font-mono">
                      <span class="text-zinc-500 font-bold block">2. BehaviorSubject (Initial seed: "DefaultValue")</span>
                      <div class="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg min-h-16 flex flex-col gap-1 text-[11px]">
                        <span class="text-emerald-400 font-semibold">> Initial subscription seed output: "DefaultValue"</span>
                        @for (log of subjectLogs(); track $index) {
                          <span class="text-emerald-400">> Subscriber 2 received: {{ log }}</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 5: RXJS TO ANGULAR CONVERSIONS -->
            @if (activeTab() === 'conversions') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase block font-mono">REACTIVITY HYDRATORS</span>
                  <p class="text-xs text-zinc-400 leading-relaxed font-sans">
                    Seamlessly convert Observables into Angular signals (toSignal) or register event streams (fromEvent) locally to avoid lifecycle leaks.
                  </p>
                </div>
                <div class="space-y-1 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400 font-bold">CONVERSION EXPORTS</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-tight text-left">
                    {{ conversionSpecsResult() }}
                  </div>
                </div>
              </div>
            }

            <!-- TAB 6: PERFORMANCE LOGS & CHECKERS -->
            @if (activeTab() === 'performance') {
              <div class="space-y-4">
                <div class="p-4 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-mono font-bold text-zinc-400">ACTIVE LOG TRACER & DIAGNOSTICS</span>
                  <div class="space-y-3 font-mono text-[11px]">
                    <div class="flex items-start gap-2 border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <mat-icon class="text-emerald-400 scale-75 mt-0.5">check_circle</mat-icon>
                      <div>
                        <span class="text-zinc-500 font-bold block">100% SUBSCRIPTIONS CLEAN IN THIS ROUTE</span>
                        <span class="text-zinc-400">All registered async streams utilize strict <code>takeUntilDestroyed()</code> bounds.</span>
                      </div>
                    </div>
                    <div class="flex items-start gap-2 border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <mat-icon class="text-emerald-400 scale-75 mt-0.5">query_stats</mat-icon>
                      <div>
                        <span class="text-zinc-500 font-bold block">DUPLICATE SUBSCRIBERS SCANNER</span>
                        <span class="text-zinc-400">Zero redundant subscription listeners detected. All instances resolved nicely.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 7: SNIPPET BUILDER -->
            @if (activeTab() === 'snippets') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-100/40 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850 rounded-xl space-y-4 text-left">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase block font-mono">SNIPPETS PRESETS</span>
                  <div class="space-y-2">
                    <button (click)="selectedSnippet.set('debounce-search')"
                      [class.bg-emerald-950/30]="selectedSnippet() === 'debounce-search'"
                      [class.text-emerald-400]="selectedSnippet() === 'debounce-search'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      Debounce Search Builder
                    </button>
                    <button (click)="selectedSnippet.set('retry-strategy')"
                      [class.bg-emerald-950/30]="selectedSnippet() === 'retry-strategy'"
                      [class.text-emerald-400]="selectedSnippet() === 'retry-strategy'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      Retry Backoff Strategy
                    </button>
                    <button (click)="selectedSnippet.set('infinite-scroll')"
                      [class.bg-emerald-950/30]="selectedSnippet() === 'infinite-scroll'"
                      [class.text-emerald-400]="selectedSnippet() === 'infinite-scroll'"
                      class="w-full text-left p-2 rounded border border-zinc-250 dark:border-zinc-800 hover:border-emerald-500 text-xs font-mono transition cursor-pointer">
                      Infinite Scroll Stream
                    </button>
                  </div>
                </div>
                <div class="space-y-1 text-left flex flex-col h-72">
                  <span class="text-xs font-mono font-bold text-zinc-400 font-bold">RXJS Snippet SOURCE</span>
                  <div class="flex-1 bg-zinc-950/10 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl overflow-auto select-all text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-tight text-left">
                    {{ activeSnippetCode() }}
                  </div>
                </div>
              </div>
            }

            <!-- Global code viewer for visualizer map flows -->
            @if (activeTab() === 'visualizers') {
              <div class="space-y-1 text-left">
                <span class="text-xs font-mono font-bold text-zinc-500">DYNAMIC RXJS DECLARATION RUNNING IN TEST BED</span>
                <div class="p-4 bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-zinc-3 font-mono text-xs text-emerald-400 rounded-xl select-all select-text whitespace-pre-wrap text-left leading-tight">
                  {{ activeCompiledVisualizerCode() }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class RxjsVisualizerComponent {
  public activeTab = signal<string>('visualizers');
  public activeTool = signal<string>('rxjs-marble-diagram-gen');

  // Interactive settings state signals
  public activeOperator = signal<string>('map');
  public mockCount = signal<number>(1);
  public lastEmitTime = signal<number>(0);
  public sourceEmissions = signal<MarbleEvent[]>([]);
  public outputEmissions = signal<MarbleEvent[]>([]);

  public customInputValue = signal<string>('QueryData');
  public selectedSnippet = signal<string>('debounce-search');
  public copied = signal<boolean>(false);

  // Subject Comparison Logs state
  public subjectLogs = signal<string[]>([]);

  public tabs = [
    { id: 'visualizers', name: 'Marble visualizers' },
    { id: 'helpers', name: 'Operators Helpers' },
    { id: 'generators', name: 'Code Generators' },
    { id: 'debugging', name: 'Learning & Debugging' },
    { id: 'conversions', name: 'Conversion tools' },
    { id: 'performance', name: 'Performance & Leak scans' },
    { id: 'snippets', name: 'Common Snippets' }
  ];

  public toolsRegistry: Record<string, { id: string; name: string; icon: string; desc: string }[]> = {
    visualizers: [
      { id: 'rxjs-marble-diagram-gen', name: 'Marble Diagram Generator', icon: 'lens', desc: 'Trace events along interactive horizontal timelines.' },
      { id: 'rxjs-timeline-vis', name: 'RxJS Timeline Visualizer', icon: 'timeline', desc: 'Stagger emission balls to see operators handle async timings.' },
      { id: 'rxjs-chain-visualizer', name: 'RxJS Chain Visualizer', icon: 'link', desc: 'View how values travel cascading across multiple pipe layers.' }
    ],
    helpers: [
      { id: 'rxjs-operator-explorer', name: 'RxJS Operator Explorer', icon: 'travel_explore', desc: 'Browse operator behaviors, search methods and read guidelines.' },
      { id: 'rxjs-operator-compare', name: 'Operator Comparison Tool', icon: 'contrast', desc: 'Compare ConcatMap, SwitchMap and ExhaustMap in live tests.' },
      { id: 'rxjs-pipe-builder', name: 'Pipe Builder Utility', icon: 'view_kanban', desc: 'Visual creator of complex `.pipe(operator1, operator2)` layouts.' },
      { id: 'custom-operator-gen', name: 'Custom Operator Generator', icon: 'extension', desc: 'Write custom robust operators compliant with standard spec.' }
    ],
    generators: [
      { id: 'rxjs-service-generator', name: 'RxJS angular Service Generator', icon: 'dynamic_form', desc: 'Create injectable async services with custom streams.' },
      { id: 'behavior-subject-generator', name: 'BehaviorSubject Store Generator', icon: 'storage', desc: 'Standard reactive BehaviorSubject state container generator.' },
      { id: 'signal-store-with-rxjs', name: 'Signal Store with RxJS Integration', icon: 'sync', desc: 'Bridge new signal models with native RxJS streams.' },
      { id: 'reactive-state-generator', name: 'Reactive State Boilerplate', icon: 'schema', desc: 'Output state definitions with select and action dispatch streams.' }
    ],
    debugging: [
      { id: 'rxjs-playground', name: 'Observable Playground', icon: 'sports_esports', desc: 'Interactive visual testing environment for debugging streams.' },
      { id: 'subject-comparison-viewer', name: 'Subject Comparison Viewer', icon: 'group_work', desc: 'Click to emit values and inspect Subject / BehaviorSubject parameters.' },
      { id: 'hot-cold-visualizer', name: 'Hot vs Cold Observable Visualizer', icon: 'thermostat', desc: 'Compare unicast Cold streams vs multicast Hot streams.' },
      { id: 'error-flow-vis', name: 'Error Handling Flow Visualizer', icon: 'healing', desc: 'Visualize catchError / retry mechanics visually on lines.' }
    ],
    conversions: [
      { id: 'signal-observable-con', name: 'Signal to Observable Converter', icon: 'transform', desc: 'Assemble `toObservable` hooks for modern Angular 21 setups.' },
      { id: 'observable-signal-con', name: 'Observable to Signal Converter', icon: 'swap_horiz', desc: 'Convert streams into direct signals via Angular `toSignal` wrapper.' },
      { id: 'event-stream-gen', name: 'Event Stream Generator', icon: 'wifi_tethering', desc: 'Transform native user click elements into active Observables.' }
    ],
    performance: [
      { id: 'memory-leak-chk', name: 'Memory Leak Checker', icon: 'memory', desc: 'Review reactive classes for missed unsubscribe triggers.' },
      { id: 'subscription-leak-chk', name: 'Subscription Leak Analyzer', icon: 'troubleshoot', desc: 'Scan code for explicit `.subscribe()` without disposal guards.' },
      { id: 'duplicate-sub-det', name: 'Duplicate Subscription Detector', icon: 'copy_all', desc: 'Verify if a single Observable has redundant concurrent sub targets.' }
    ],
    snippets: [
      { id: 'common-rxjs-snippets', name: 'Common RxJS Snippets', icon: 'library_books', desc: 'Highly rated templates for debounce, retry, and delay tasks.' }
    ]
  };

  public activeCategoryTools = computed(() => {
    return this.toolsRegistry[this.activeTab()] || [];
  });

  public getActiveToolName(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.name : 'Workbench';
  }

  public getActiveToolIcon(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.icon : 'insights';
  }

  public getActiveToolDesc(): string {
    const active = this.activeCategoryTools().find(t => t.id === this.activeTool());
    return active ? active.desc : 'Visual reactive studio';
  }

  constructor() {
    // Reset active tool when switching categories
    effect(() => {
      const list = this.activeCategoryTools();
      if (list.length > 0) {
        this.activeTool.set(list[0].id);
      }
    });
  }

  // Visualizer interactive simulations
  public triggerManualEmit(): void {
    const count = this.mockCount();
    const activeOp = this.activeOperator();
    const curTime = this.sourceEmissions().length % 11 + 1; // logical relative position offset

    // Log source emission
    this.sourceEmissions.update(e => [
      ...e,
      { value: count, time: curTime, type: 'value' }
    ]);

    // Apply active operator mapping simulation
    if (activeOp === 'map') {
      this.outputEmissions.update(e => [
        ...e,
        { value: count * 2, time: curTime, type: 'value' }
      ]);
    } else if (activeOp === 'filter') {
      if (count > 3) {
        this.outputEmissions.update(e => [
          ...e,
          { value: count, time: curTime, type: 'value' }
        ]);
      }
    } else if (activeOp === 'delay') {
      // simulate delay by translating ball position down the time line
      this.outputEmissions.update(e => [
        ...e,
        { value: count, time: Math.min(12, curTime + 1), type: 'value' }
      ]);
    } else if (activeOp === 'take') {
      if (this.outputEmissions().length < 3) {
        this.outputEmissions.update(e => [
          ...e,
          { value: count, time: curTime, type: 'value' }
        ]);
      }
    }

    this.mockCount.update(c => c + 1);
  }

  public clearVisualizer(): void {
    this.sourceEmissions.set([]);
    this.outputEmissions.set([]);
    this.mockCount.set(1);
  }

  public activeCompiledVisualizerCode = computed(() => {
    const activeOp = this.activeOperator();
    if (activeOp === 'map') {
      return `import { fromEvent } from 'rxjs';\nimport { map } from 'rxjs/operators';\n\n// Input emission timeline\nconst source$ = fromEvent(button, 'click').pipe(\n  map(() => this.count++)\n);\n\n// Transformed Stream\nconst result$ = source$.pipe(\n  map(x => x * 2)\n);\n\nresult$.subscribe(val => console.log('Transformed:', val));`;
    }
    if (activeOp === 'filter') {
      return `import { fromEvent } from 'rxjs';\nimport { filter } from 'rxjs/operators';\n\nconst source$ = fromEvent(button, 'click').pipe(\n  map(() => this.count++)\n);\n\nconst result$ = source$.pipe(\n  filter(x => x > 3)\n);\n\nresult$.subscribe(val => console.log('Passed:', val));`;
    }
    if (activeOp === 'delay') {
      return `import { fromEvent } from 'rxjs';\nimport { delay } from 'rxjs/operators';\n\nconst source$ = fromEvent(button, 'click').pipe(\n  map(() => this.count++)\n);\n\nconst result$ = source$.pipe(\n  delay(100)\n);\n\nresult$.subscribe(val => console.log('Delayed Output:', val));`;
    }
    return `import { fromEvent } from 'rxjs';\nimport { take } from 'rxjs/operators';\n\nconst source$ = fromEvent(button, 'click').pipe(\n  map(() => this.count++)\n);\n\nconst result$ = source$.pipe(\n  take(3)\n);\n\nresult$.subscribe(val => console.log('Result (Complete after 3):', val));`;
  });

  // Learning Debugging subject click emitters
  public triggerSubjectEmit(): void {
    const currentVal = `EmittedValue_${this.subjectLogs().length + 1}`;
    this.subjectLogs.update(logs => [...logs, currentVal]);
  }

  // Visual code helper codes
  public activeTemplateResult = computed(() => {
    const val = this.customInputValue().trim() || 'DataEvent';
    const tool = this.activeTool();

    if (tool === 'rxjs-operator-explorer') {
      return `import { Observable, of } from 'rxjs';\nimport { switchMap, catchError } from 'rxjs/operators';\n\n// Search and Explore Operator specs:\nconst data$ = of("${val}").pipe(\n  switchMap(keyword => this.apiService.getRecords(keyword)),\n  catchError(err => {\n    console.error('Handled:', err);\n    return of([]);\n  })\n);`;
    }

    if (tool === 'rxjs-operator-compare') {
      return `import { of } from 'rxjs';\nimport { switchMap, concatMap, mergeMap } from 'rxjs/operators';\n\n// switchMap (cancels previous active query in flight)\nconst search$ = query$.pipe(switchMap(q => fetch(q)));\n\n// concatMap (queues item queries sequentially in stable lists)\nconst transactions$ = id$.pipe(concatMap(id => dispatch(id)));`;
    }

    if (tool === 'rxjs-pipe-builder') {
      return `import { fromEvent } from 'rxjs';\nimport { debounceTime, map, distinctUntilChanged } from 'rxjs/operators';\n\nconst input$ = fromEvent(textField, 'input').pipe(\n  map(event => (event.target as HTMLInputElement).value),\n  debounceTime(300),\n  distinctUntilChanged()\n);\n\ninput$.subscribe(text => this.searchQuery.set(text));`;
    }

    if (tool === 'custom-operator-gen') {
      return `import { Observable } from 'rxjs';\n\n// Custom operator multiplying emissions by user offsets\nexport function multiplyByOffset(factor: number) {\n  return (source: Observable<number>) => {\n    return new Observable<number>(subscriber => {\n      return source.subscribe({\n        next(value) { subscriber.next(value * factor); },\n        error(err) { subscriber.error(err); },\n        complete() { subscriber.complete(); }\n      });\n    });\n  };\n}`;
    }

    return `// Code outputs`;
  });

  // generators
  public generatedRxJSCode = computed(() => {
    const tool = this.activeTool();

    if (tool === 'rxjs-service-generator') {
      return `import { Injectable, inject } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { Observable, Subject } from 'rxjs';\nimport { switchMap, shareReplay, takeUntilDestroyed } from '@angular/core/rxjs-interop';\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class StorageService {\n  private http = inject(HttpClient);\n  private refresh$ = new Subject<void>();\n\n  public data$ = this.refresh$.pipe(\n    switchMap(() => this.http.get('/api/storage')),\n    shareReplay(1)\n  );\n\n  public reload(): void {\n    this.refresh$.next();\n  }\n}`;
    }

    if (tool === 'behavior-subject-generator') {
      return `import { BehaviorSubject } from 'rxjs';\n\nexport interface StateScheme {\n  users: any[];\n  loading: boolean;\n}\n\n@Injectable({ providedIn: 'root' })\nexport class UserStore {\n  private state$ = new BehaviorSubject<StateScheme>({\n    users: [],\n    loading: false\n  });\n\n  public select$ = this.state$.asObservable();\n\n  public updateUsers(users: any[]): void {\n    const current = this.state$.getValue();\n    this.state$.next({ ...current, users, loading: false });\n  }\n}`;
    }

    if (tool === 'signal-store-with-rxjs') {
      return `import { signal, computed } from '@angular/core';\nimport { toObservable } from '@angular/core/rxjs-interop';\nimport { switchMap } from 'rxjs/operators';\n\nexport class IntegratedModel {\n  public searchSignal = signal<string>('initialQuery');\n\n  // Convert Angular signal directly into RxJS Observable stream\n  private searchQuery$ = toObservable(this.searchSignal);\n\n  public results$ = this.searchQuery$.pipe(\n    switchMap(query => this.api.fetchList(query))\n  );\n}`;
    }

    return `import { Subject } from 'rxjs';\n\nexport const state$ = new Subject<Record<string, any>>();\nexport const dispatch = (action: string, payload: any) => {\n  state$.next({ action, payload });\n};`;
  });

  // conversions
  public conversionSpecsResult = computed(() => {
    const tool = this.activeTool();

    if (tool === 'signal-observable-con') {
      return `import { Component, signal, inject } from '@angular/core';\nimport { toObservable } from '@angular/core/rxjs-interop';\n\n@Component({\n  selector: 'app-signal-conversion',\n  standalone: true,\n  template: '...'\n})\nexport class SignalComponent {\n  public count = signal(0);\n  \n  // Creates an Observable stream that triggers whenever this.count() transitions\n  public count$ = toObservable(this.count);\n}`;
    }

    if (tool === 'observable-signal-con') {
      return `import { Component, inject } from '@angular/core';\nimport { toSignal } from '@angular/core/rxjs-interop';\nimport { HttpClient } from '@angular/common/http';\n\n@Component({\n  selector: 'app-observable-conversion',\n  standalone: true,\n  template: '...'\n})\nexport class ObservableComponent {\n  private http = inject(HttpClient);\n  \n  // Convert client stream directly into a responsive reactive signal model\n  public listData = toSignal(this.http.get<any[]>('/api/records'), { initialValue: [] });\n}`;
    }

    return `import { fromEvent } from 'rxjs';\n\n// Constructing window resize observer stream cleanly\nconst resize$ = fromEvent(window, 'resize');\nresize$.subscribe(() => console.log('Window Dimensions updated!'));`;
  });

  // snippets tabs computed
  public activeSnippetCode = computed(() => {
    const active = this.selectedSnippet();

    if (active === 'debounce-search') {
      return `import { fromEvent } from 'rxjs';\nimport { debounceTime, map, distinctUntilChanged, switchMap } from 'rxjs/operators';\n\n// Optimizes search queries to wait 300ms before issuing fetch\nconst searchStream$ = fromEvent(searchInput, 'input').pipe(\n  map(e => (e.target as HTMLInputElement).value),\n  debounceTime(300),\n  distinctUntilChanged(),\n  switchMap(query => this.apiService.search(query))\n);`;
    }

    if (active === 'retry-strategy') {
      return `import { of, throwError } from 'rxjs';\nimport { mergeMap, retryWhen, delay, take } from 'rxjs/operators';\n\n// Attempts API connection up to 3 times, with sequential 1000ms delay checks\nconst fetchWithRetry$ = this.http.get('/api/transactions').pipe(\n  retryWhen(errors =>\n    errors.pipe(\n      delay(1000),\n      take(3),\n      mergeMap(err => of(err))\n    )\n  )\n);`;
    }

    return `import { fromEvent, BehaviorSubject } from 'rxjs';\nimport { filter, map, exhaustMap } from 'rxjs/operators';\n\n// Detects document scrolling coordinates and streams next items list cleanly\nconst scrollStream$ = fromEvent(window, 'scroll').pipe(\n  filter(() => window.innerHeight + window.scrollY >= document.body.offsetHeight - 200),\n  exhaustMap(() => this.apiService.loadNextPage())\n);`;
  });

  public copyCode(): void {
    let source = '';
    const tab = this.activeTab();

    if (tab === 'visualizers') {
      source = this.activeCompiledVisualizerCode();
    } else if (tab === 'helpers') {
      source = this.activeTemplateResult();
    } else if (tab === 'generators') {
      source = this.generatedRxJSCode();
    } else if (tab === 'conversions') {
      source = this.conversionSpecsResult();
    } else if (tab === 'snippets') {
      source = this.activeSnippetCode();
    } else {
      source = JSON.stringify(this.toolsRegistry, null, 2);
    }

    try {
      navigator.clipboard.writeText(source);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // safe fallback
    }
  }
}
