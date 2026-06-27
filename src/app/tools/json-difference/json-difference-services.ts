import { Injectable, PLATFORM_ID, inject, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ComparisonOptions, DiffItem, DiffNode, ValidationError, ComparisonStats, LogMessage } from './json-difference.interfaces';

const DEFAULT_OPTIONS: ComparisonOptions = {
  ignoreWhitespace: true,
  ignorePropertyOrder: true,
  ignoreKeyCase: false,
  ignoreStringValueCase: false,
  ignoreArrayOrder: false,
  differencesOnly: false,
  ignoreEmptyLines: true,
  ignoreNullVsMissing: false,
  ignoreNumericPrecision: true,
  strictTypeComparison: true
};

@Injectable({
  providedIn: 'root'
})
export class JsonDifference {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private worker: Worker | null = null;

  // Primary Document State
  leftJSON = signal<string>('');
  rightJSON = signal<string>('');
  leftFilename = signal<string>('document-a.json');
  rightFilename = signal<string>('document-b.json');
  leftSize = signal<number>(0);
  rightSize = signal<number>(0);

  // Layout and Display Settings
  viewMode = signal<'split' | 'unified'>('split');
  options = signal<ComparisonOptions>({ ...DEFAULT_OPTIONS });
  searchQuery = signal<string>('');

  // Analysis / Validation Results
  leftValid = signal<boolean>(true);
  rightValid = signal<boolean>(true);
  leftErrors = signal<ValidationError[]>([]);
  rightErrors = signal<ValidationError[]>([]);
  leftWarnings = signal<ValidationError[]>([]);
  rightWarnings = signal<ValidationError[]>([]);
  leftLineMap = signal<Record<string, { startLine: number; endLine: number }>>({});
  rightLineMap = signal<Record<string, { startLine: number; endLine: number }>>({});

  // Comparison Results
  diffs = signal<DiffItem[]>([]);
  tree = signal<DiffNode | null>(null);
  stats = signal<ComparisonStats | null>(null);
  currentDiffIndex = signal<number>(0); // 1-indexed, 0 means none selected

  // UI States
  loading = signal<boolean>(false);
  logs = signal<LogMessage[]>([]);

  // Navigation Filters & Selection State
  selectedPath = signal<string>('');

  constructor() {
    this.addLog('info', 'JSON Difference Studio Initialized.');
    if (this.isBrowser) {
      const savedOpts = localStorage.getItem('diff-studio-options');
      if (savedOpts) {
        try {
          this.options.set({ ...DEFAULT_OPTIONS, ...JSON.parse(savedOpts) });
        } catch {
          // ignore parsing failures
        }
      }

      const savedMode = localStorage.getItem('diff-studio-view-mode') as 'split' | 'unified';
      if (savedMode) {
        this.viewMode.set(savedMode);
      }

      effect(() => {
        localStorage.setItem('diff-studio-options', JSON.stringify(this.options()));
        this.compare();
      });

      effect(() => {
        localStorage.setItem('diff-studio-view-mode', this.viewMode());
      });

      // 3. Initialize Worker
      this.initWorker();
      // Load initial sandboxed demo values
      this.loadDemoData();
    }
  }

  private initWorker() {
    if (!this.isBrowser) return;
    try {
      this.worker = new Worker(
        new URL('./json-difference.worker', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = ({ data }) => {
        this.loading.set(false);
        if (data.success) {
          this.leftValid.set(data.leftValid);
          this.leftErrors.set(data.leftErrors || []);
          this.leftWarnings.set(data.leftWarnings || []);
          this.leftLineMap.set(data.leftLineMap || {});

          this.rightValid.set(data.rightValid);
          this.rightErrors.set(data.rightErrors || []);
          this.rightWarnings.set(data.rightWarnings || []);
          this.rightLineMap.set(data.rightLineMap || {});

          this.diffs.set(data.diffs || []);
          this.tree.set(data.tree);
          this.stats.set(data.stats);

          // Reset navigation
          if (data.diffs && data.diffs.length > 0) {
            this.currentDiffIndex.set(1);
          } else {
            this.currentDiffIndex.set(0);
          }

          this.addLog('success', `Comparison completed. Detected ${data.diffs?.length || 0} differences in ${data.stats?.workerTime?.toFixed(1) || 0}ms.`);
        } else {
          this.addLog('error', `Worker Error: ${data.error}`);
        }
      };

      this.worker.onerror = (err) => {
        this.loading.set(false);
        this.addLog('error', `Worker execution failed: ${err.message}`);
      };
    } catch (e: unknown) {
      const err = e as Error;
      this.addLog('error', `Failed to initialize background worker: ${err.message}`);
    }
  }

  compare() {
    if (!this.isBrowser) return;
    this.loading.set(true);
    if (!this.worker) {
      this.initWorker();
    }

    if (this.worker) {
      this.worker.postMessage({
        task: 'compare',
        leftJSON: this.leftJSON(),
        rightJSON: this.rightJSON(),
        options: this.options(),
        leftFilename: this.leftFilename(),
        rightFilename: this.rightFilename(),
        leftSize: this.leftSize(),
        rightSize: this.rightSize()
      });
    } else {
      this.loading.set(false);
      this.addLog('error', 'Worker offline. Direct thread-blocking comparison fallback not implemented.');
    }
  }

  addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.update(prev => [{ timestamp, level, message }, ...prev.slice(0, 49)]);
  }

  updateLeftJSON(val: string, filename?: string) {
    this.leftJSON.set(val);
    this.leftSize.set(val.length);
    if (filename) {
      this.leftFilename.set(filename);
    }
    this.compare();
  }

  updateRightJSON(val: string, filename?: string) {
    this.rightJSON.set(val);
    this.rightSize.set(val.length);
    if (filename) {
      this.rightFilename.set(filename);
    }
    this.compare();
  }

  setOptions(opts: Partial<ComparisonOptions>) {
    this.options.update(prev => ({ ...prev, ...opts }));
  }

  setViewMode(mode: 'split' | 'unified') {
    this.viewMode.set(mode);
    this.addLog('info', `Switched viewing mode to: ${mode.toUpperCase()}`);
  }

  setCurrentDiffIndex(idx: number) {
    const len = this.diffs().length;
    if (len === 0) {
      this.currentDiffIndex.set(0);
      return;
    }
    const safeIdx = Math.max(1, Math.min(len, idx));
    this.currentDiffIndex.set(safeIdx);
    // Auto-select path as well for highlight references
    const diff = this.diffs()[safeIdx - 1];
    if (diff) {
      this.selectedPath.set(diff.path);
    }
  }

  nextDifference() {
    const cur = this.currentDiffIndex();
    const len = this.diffs().length;
    if (len > 0) {
      this.setCurrentDiffIndex(cur === len ? 1 : cur + 1);
    }
  }

  previousDifference() {
    const cur = this.currentDiffIndex();
    const len = this.diffs().length;
    if (len > 0) {
      this.setCurrentDiffIndex(cur <= 1 ? len : cur - 1);
    }
  }

  formatDocument(side: 'left' | 'right') {
    const jsonStr = side === 'left' ? this.leftJSON() : this.rightJSON();
    try {
      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, 2);
      if (side === 'left') {
        this.updateLeftJSON(formatted);
      } else {
        this.updateRightJSON(formatted);
      }
      this.addLog('success', `Formatted ${side.toUpperCase()} document successfully.`);
    } catch (e: unknown) {
      const err = e as Error;
      this.addLog('warn', `Failed to format ${side.toUpperCase()}: ${err.message}`);
    }
  }

  minifyDocument(side: 'left' | 'right') {
    const jsonStr = side === 'left' ? this.leftJSON() : this.rightJSON();
    try {
      const parsed = JSON.parse(jsonStr);
      const minified = JSON.stringify(parsed);
      if (side === 'left') {
        this.updateLeftJSON(minified);
      } else {
        this.updateRightJSON(minified);
      }
      this.addLog('success', `Minified ${side.toUpperCase()} document successfully.`);
    } catch (e: unknown) {
      const err = e as Error;
      this.addLog('warn', `Failed to minify ${side.toUpperCase()}: ${err.message}`);
    }
  }

  swapDocuments() {
    const tempJSON = this.leftJSON();
    const tempName = this.leftFilename();
    const tempSize = this.leftSize();

    this.leftJSON.set(this.rightJSON());
    this.leftFilename.set(this.rightFilename());
    this.leftSize.set(this.rightSize());

    this.rightJSON.set(tempJSON);
    this.rightFilename.set(tempName);
    this.rightSize.set(tempSize);

    this.addLog('info', 'Swapped Left and Right documents.');
    this.compare();
  }

  clearAll() {
    this.leftJSON.set('');
    this.rightJSON.set('');
    this.leftSize.set(0);
    this.rightSize.set(0);
    this.leftFilename.set('document-a.json');
    this.rightFilename.set('document-b.json');
    this.diffs.set([]);
    this.tree.set(null);
    this.stats.set(null);
    this.currentDiffIndex.set(0);
    this.addLog('info', 'Cleared workspace.');
  }

  loadDemoData() {
    const leftDemo = {
      name: 'JSON Difference Studio',
      version: '1.0.0',
      active: true,
      theme: 'light',
      features: ['side-by-side editing', 'unified diff views', 'syntactic analysis'],
      settings: {
        ignoreWhitespace: true,
        maxFileSize: 1000000,
        autoFormat: false
      },
      metadata: {
        creationDate: '2026-01-01'
      }
    };

    const rightDemo = {
      name: 'JSON Difference Studio',
      version: '1.1.0',
      active: true,
      features: ['unified diff views', 'side-by-side editing', 'syntactic analysis', 'web worker processing'],
      settings: {
        ignoreWhitespace: true,
        autoFormat: true,
        ignorePropertyOrder: true
      },
      author: 'Google DeepMind'
    };

    this.leftJSON.set(JSON.stringify(leftDemo, null, 2));
    this.leftFilename.set('left-sample.json');
    this.leftSize.set(this.leftJSON().length);

    this.rightJSON.set(JSON.stringify(rightDemo, null, 2));
    this.rightFilename.set('right-sample.json');
    this.rightSize.set(this.rightJSON().length);

    this.addLog('info', 'Loaded interactive sample documents.');
    this.compare();
  }
}
