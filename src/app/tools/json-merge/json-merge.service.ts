import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_MERGE_OPTIONS, INITIAL_STATISTICS, SAMPLE_JSONS, MergeInputFile,  MergeOptions,  MergeLog,  MergeStatistics,  JSONValue,  JSONConflict} from './json-merge.models';
import { validateJSONContent, mergeJSONValues, getJSONStats, sortJSONKeys } from './json-merge.utils';

@Injectable({
  providedIn: 'root'
})
export class JsonMergeStudioService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Core Writable Signals
  readonly files = signal<MergeInputFile[]>([]);
  readonly options = signal<MergeOptions>({ ...DEFAULT_MERGE_OPTIONS });
  readonly logs = signal<MergeLog[]>([]);
  readonly statistics = signal<MergeStatistics>({ ...INITIAL_STATISTICS });
  readonly mergedResult = signal<string>('');

  // Conflicts Signals
  readonly conflicts = signal<JSONConflict[]>([]);
  readonly resolvedConflicts = signal<Record<string, 'first' | 'second' | 'custom'>>({});
  readonly customResolvedValues = signal<Record<string, JSONValue>>({});

  // Active Process Writable Signals
  readonly isMerging = signal<boolean>(false);
  readonly mergeProgress = signal<number>(0);
  readonly mergeStatusText = signal<string>('');

  // Active Web Worker ref
  private activeWorker: Worker | null = null;

  constructor() {
    this.addInitialLogs();
    this.addSampleFiles();
  }

  private addInitialLogs(): void {
    this.addLog('info', 'JSON Merge Studio Initialized locally.');
    this.addLog('info', 'All data processing is 100% client-side in the browser. No files are uploaded to any server.');
  }

  private addSampleFiles(): void {
    // Add default sample files for the user to try instantly
    this.addFileWithContent('user_profile.json', SAMPLE_JSONS['userProfile']);
    this.addFileWithContent('user_preferences.json', SAMPLE_JSONS['userPreferences']);
  }

  toggleStrictValidation(): void {
    const next = !this.options().strictValidation;
    this.options.update(opts => ({ ...opts, strictValidation: next }));
    this.addLog('info', `Strict validation set to: ${next}`);

    // Re-evaluate validation for all existing files
    this.files.update(current =>
      current.map(f => {
        const validation = validateJSONContent(f.content, next);
        return {
          ...f,
          isValid: validation.isValid,
          error: validation.error,
          warning: validation.warning,
          duplicateKeys: validation.duplicateKeys,
          objectCount: validation.objectCount,
          arrayCount: validation.arrayCount,
          keysCount: validation.keysCount,
          depth: validation.depth,
          linesCount: validation.linesCount,
          charsCount: validation.charsCount
        };
      })
    );
    this.triggerMerge();
  }

  toggleSortKeys(): void {
    const next = !this.options().sortKeys;
    this.options.update(opts => ({ ...opts, sortKeys: next }));
    this.addLog('info', `Key sorting set to: ${next}`);
    this.triggerMerge();
  }

  addLog(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
    const newLog: MergeLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), level, message };
    this.logs.update(current => [newLog, ...current].slice(0, 500)); // keep last 500 logs
  }

  clearLogs(): void {
    this.logs.set([]);
    this.addLog('info', 'Logs cleared.');
  }

  addEmptyEditor(): void {
    const count = this.files().length + 1;
    const filename = `document_${count}.json`;
    const emptyJson = '{\n  \n}';
    this.addFileWithContent(filename, emptyJson);
  }

  addFileWithContent(name: string, content: string): void {
    const isLargeFile = content.length > 100 * 1024 * 1024; // 100MB limit

    // Validate with strict flag
    const validation = validateJSONContent(content, this.options().strictValidation);

    const newFile: MergeInputFile = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      content,
      fileSize: content.length,
      isLargeFile,
      isValid: validation.isValid,
      error: validation.error,
      warning: validation.warning,
      duplicateKeys: validation.duplicateKeys,
      objectCount: validation.objectCount,
      arrayCount: validation.arrayCount,
      keysCount: validation.keysCount,
      depth: validation.depth,
      linesCount: validation.linesCount,
      charsCount: validation.charsCount,
      isReadonly: false,
      wordWrap: 'off',
      isFullscreen: false
    };

    this.files.update(current => [...current, newFile]);
    this.addLog('success', `Added input: "${name}" (${this.formatBytes(content.length)}).`);
  }

  updateFileContent(id: string, content: string): void {
    this.files.update(current =>
      current.map(f => {
        if (f.id === id) {
          const validation = validateJSONContent(content, this.options().strictValidation);
          return {
            ...f,
            content,
            fileSize: content.length,
            isValid: validation.isValid,
            error: validation.error,
            warning: validation.warning,
            duplicateKeys: validation.duplicateKeys,
            objectCount: validation.objectCount,
            arrayCount: validation.arrayCount,
            keysCount: validation.keysCount,
            depth: validation.depth,
            linesCount: validation.linesCount,
            charsCount: validation.charsCount
          };
        }
        return f;
      })
    );
  }

  toggleFileReadonly(id: string): void {
    this.files.update(current =>
      current.map(f => (f.id === id ? { ...f, isReadonly: !f.isReadonly } : f))
    );
  }

  toggleFileWordWrap(id: string): void {
    this.files.update(current =>
      current.map(f => (f.id === id ? { ...f, wordWrap: f.wordWrap === 'on' ? 'off' : 'on' } : f))
    );
  }

  toggleFileFullscreen(id: string): void {
    this.files.update(current =>
      current.map(f => (f.id === id ? { ...f, isFullscreen: !f.isFullscreen } : f))
    );
  }

  removeFile(id: string): void {
    const fileToRemove = this.files().find(f => f.id === id);
    if (fileToRemove) {
      this.files.update(current => current.filter(f => f.id !== id));
      this.addLog('warn', `Removed input: "${fileToRemove.name}".`);
    }
  }

  duplicateFile(id: string): void {
    const fileToCopy = this.files().find(f => f.id === id);
    if (fileToCopy) {
      const match = fileToCopy.name.match(/^(.*?)(\(\d+\))?\.json$/);
      const baseName = match ? match[1].trim() : fileToCopy.name;
      const count = this.files().filter(f => f.name.startsWith(baseName)).length;
      const newName = `${baseName} (${count}).json`;

      const copy: MergeInputFile = {
        ...fileToCopy,
        id: Math.random().toString(36).substr(2, 9),
        name: newName,
        isFullscreen: false
      };

      this.files.update(current => [...current, copy]);
      this.addLog('success', `Duplicated "${fileToCopy.name}" as "${newName}".`);
    }
  }

  clearFiles(): void {
    this.files.set([]);
    this.statistics.set({ ...INITIAL_STATISTICS });
    this.mergedResult.set('');
    this.conflicts.set([]);
    this.resolvedConflicts.set({});
    this.customResolvedValues.set({});
    this.addLog('warn', 'All input files and merge outputs cleared.');
  }

  reorderFiles(fromIndex: number, toIndex: number): void {
    const list = [...this.files()];
    if (fromIndex >= 0 && fromIndex < list.length && toIndex >= 0 && toIndex < list.length) {
      const [removed] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, removed);
      this.files.set(list);
      this.addLog('info', `Reordered files index ${fromIndex} to ${toIndex}.`);
    }
  }

  resolveSingleConflict(path: string, choice: 'first' | 'second' | 'custom', customValue?: JSONValue): void {
    this.resolvedConflicts.update(current => ({ ...current, [path]: choice }));
    if (choice === 'custom' && customValue !== undefined) {
      this.customResolvedValues.update(current => ({ ...current, [path]: customValue }));
    }
    // Re-trigger merge with the updated conflict choices
    this.triggerMerge();
  }

  resolveAllConflicts(choice: 'first' | 'second'): void {
    const currentConflicts = this.conflicts();
    const updates: Record<string, 'first' | 'second'> = {};
    for (const conflict of currentConflicts) {
      updates[conflict.path] = choice;
    }
    this.resolvedConflicts.update(current => ({ ...current, ...updates }));
    this.addLog('info', `Bulk resolved all ${currentConflicts.length} conflicts as ${choice === 'first' ? 'First/Original' : 'Last/Incoming'}.`);
    this.triggerMerge();
  }

  cancelMerge(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
      this.isMerging.set(false);
      this.mergeProgress.set(0);
      this.mergeStatusText.set('');
      this.addLog('error', 'Merge process cancelled by user.');
    }
  }

  triggerMerge(): void {
    if (this.files().length === 0) {
      this.addLog('error', 'No files to merge. Please add at least one JSON file.');
      return;
    }

    // Check validity of all files first
    const invalidFiles = this.files().filter(f => !f.isValid);
    if (invalidFiles.length > 0) {
      this.addLog('error', `Cannot merge. Please fix syntax errors in: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    if (!this.isBrowser) {
      return;
    }

    this.isMerging.set(true);
    this.mergeProgress.set(5);
    this.mergeStatusText.set('Initializing background thread...');
    this.addLog('info', 'Spinning up Web Worker for non-blocking merge...');

    // Terminate existing worker if active
    if (this.activeWorker) {
      this.activeWorker.terminate();
    }

    // Instantiate worker
    try {
      this.activeWorker = new Worker(new URL('./json-merge.worker', import.meta.url), { type: 'module' });

      // Handle worker communications
      this.activeWorker.onmessage = ({ data }) => {
        const payload = data as {
          type: 'progress' | 'complete';
          percent?: number;
          message?: string;
          success?: boolean;
          mergedContent?: string;
          statistics?: MergeStatistics;
          conflicts?: JSONConflict[];
          logs?: MergeLog[];
          error?: string;
        };
        if (payload.type === 'progress') {
          this.mergeProgress.set(payload.percent ?? 0);
          this.mergeStatusText.set(payload.message ?? '');
        } else if (payload.type === 'complete') {
          this.isMerging.set(false);
          this.mergeProgress.set(100);
          this.mergeStatusText.set('');

          // Copy logs from worker
          if (payload.logs) {
            payload.logs.forEach((log: MergeLog) => {
              this.addLog(log.level, `[Worker] ${log.message}`);
            });
          }

          if (payload.success && payload.mergedContent && payload.statistics) {
            this.mergedResult.set(payload.mergedContent);
            this.statistics.set(payload.statistics);
            this.conflicts.set(payload.conflicts || []);

            this.addLog('success', `Merged output size: ${this.formatBytes(payload.statistics.mergedSize)}`);
          } else {
            this.addLog('error', `Merge failed: ${payload.error || 'Unknown error'}`);
          }

          this.activeWorker?.terminate();
          this.activeWorker = null;
        }
      };

      this.activeWorker.onerror = (err) => {
        this.isMerging.set(false);
        this.mergeProgress.set(0);
        this.mergeStatusText.set('');
        this.addLog('error', `Web Worker Error: ${err.message}`);
        this.activeWorker?.terminate();
        this.activeWorker = null;
      };

      // Prepare payload to send
      const workerPayload = {
        files: this.files().map(f => ({ name: f.name, content: f.content })),
        options: this.options(),
        resolvedConflicts: this.resolvedConflicts(),
        customResolvedValues: this.customResolvedValues()
      };

      this.activeWorker.postMessage(workerPayload);

    } catch (e) {
      const error = e as Error;
      this.isMerging.set(false);
      this.addLog('error', `Could not create Web Worker: ${error.message}. Falling back to synchronous processing...`);
      this.executeFallbackMerge();
    }
  }

  /**
   * Fallback synchronous merge if workers are not supported
   */
  private executeFallbackMerge(): void {
    this.isMerging.set(true);
    this.mergeProgress.set(30);
    this.mergeStatusText.set('Merging synchronously...');

    setTimeout(() => {
      try {
        const startTime = performance.now();
        const filesList = this.files();
        const parsed: { name: string; val: JSONValue }[] = [];

        for (const file of filesList) {
          parsed.push({ name: file.name, val: JSON.parse(file.content) as JSONValue });
        }

        const conflictsList: JSONConflict[] = [];
        let currentResult = parsed[0].val;
        let currentFileName = parsed[0].name;

        for (let i = 1; i < parsed.length; i++) {
          currentResult = mergeJSONValues(
            currentResult,
            parsed[i].val,
            this.options(),
            currentFileName,
            parsed[i].name,
            conflictsList,
            this.resolvedConflicts(),
            this.customResolvedValues()
          );
          currentFileName = `Merged(${currentFileName} + ${parsed[i].name})`;
        }

        let finalResult = currentResult;
        if (this.options().sortKeys) {
          finalResult = sortJSONKeys(currentResult);
        }

        const mergedString = JSON.stringify(finalResult, null, 2);
        const stats = getJSONStats(finalResult);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        this.mergedResult.set(mergedString);
        this.conflicts.set(conflictsList);
        this.statistics.set({
          filesLoaded: filesList.length,
          mergedSize: mergedString.length,
          objectsCount: stats.objectCount,
          arraysCount: stats.arrayCount,
          propertiesCount: stats.keysCount,
          mergeDuration: duration,
          memoryEstimate: mergedString.length * 2,
          largestFile: null,
          smallestFile: null,
          maxDepth: stats.maxDepth
        });

        this.addLog('success', 'Fallback synchronous merge completed successfully.');
      } catch (err) {
        const error = err as Error;
        this.addLog('error', `Fallback Merge failed: ${error.message}`);
      } finally {
        this.isMerging.set(false);
        this.mergeProgress.set(100);
      }
    }, 50);
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
