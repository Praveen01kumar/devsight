import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PdfEngine } from './pdf-engine';

export interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  thumbnailUrl: string | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

@Component({
  selector: 'app-pdf-merge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './pdf-merge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragenter)': 'onDragEnter($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)'
  }
})
export class PdfMerge {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly pdfEngine = inject(PdfEngine);

  // Core state signals
  files = signal<PDFFile[]>([]);
  isDragging = signal<boolean>(false);
  isMerging = signal<boolean>(false);
  mergeProgress = signal<number>(0);
  currentMergeStep = signal<string>('');
  globalError = signal<string | null>(null);

  // Reactive Form Control for filename
  outputFilenameControl = new FormControl<string>('Merged.pdf', {
    nonNullable: true,
    validators: [Validators.required]
  });

  // Drag-and-drop boundary counter to avoid parent-child hover flicker
  private dragCounter = 0;

  // Computed properties
  totalPageCount = computed(() => this.files().reduce((sum, f) => sum + f.pageCount, 0));
  totalSize = computed(() => this.files().reduce((sum, f) => sum + f.size, 0));
  readyFileCount = computed(() => this.files().filter(f => f.status === 'ready').length);
  hasErrorFiles = computed(() => this.files().some(f => f.status === 'error'));

  // Drag over host
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Drag enter host
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    if (this.dragCounter === 1) {
      this.isDragging.set(true);
    }
  }

  // Drag leave host
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDragging.set(false);
    }
  }

  // Drop on host
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = 0;
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  // File selection from input click
  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
      input.value = ''; // Reset input so same file can be selected again
    }
  }

  // Process and validate files
  async handleFiles(fileList: FileList | File[]) {
    if (!this.isBrowser) return;

    const filesArray = Array.from(fileList);
    const pdfFiles: File[] = [];
    let skippedCount = 0;

    for (const file of filesArray) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(file);
      } else {
        skippedCount++;
      }
    }

    if (skippedCount > 0) {
      this.globalError.set(`Skipped ${skippedCount} non-PDF file(s). Only PDF files are supported.`);
      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        this.globalError.update(current => 
          current && current.includes(`Skipped ${skippedCount}`) ? null : current
        );
      }, 6000);
    }

    if (pdfFiles.length === 0) return;

    // Create entry items with 'loading' status
    const newEntries: PDFFile[] = pdfFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      thumbnailUrl: null,
      status: 'loading'
    }));

    // Update the list of files
    this.files.update(current => [...current, ...newEntries]);

    // Throttled processing queue to prevent browser lag with hundreds of files
    const queue = [...newEntries];
    const maxConcurrency = 3;

    const processNext = async () => {
      if (queue.length === 0) return;
      const item = queue.shift();
      if (!item) return;

      try {
        const info = await this.pdfEngine.getPageCountAndThumbnail(item.file);
        this.files.update(current => 
          current.map(f => f.id === item.id ? {
            ...f,
            pageCount: info.pageCount,
            thumbnailUrl: info.thumbnailUrl,
            status: 'ready'
          } : f)
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Corrupted or secure PDF';
        console.error(`Error processing file ${item.name}:`, err);
        this.files.update(current => 
          current.map(f => f.id === item.id ? {
            ...f,
            status: 'error',
            errorMessage: errorMsg
          } : f)
        );
      } finally {
        processNext();
      }
    };

    // Spin up parallel workers up to concurrency limit
    for (let i = 0; i < Math.min(maxConcurrency, queue.length); i++) {
      processNext();
    }
  }

  // Reorder files using CDK
  onDropListDropped(event: CdkDragDrop<PDFFile[]>) {
    const list = [...this.files()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.files.set(list);
  }

  // Remove a single file from list
  removeFile(id: string) {
    this.files.update(current => current.filter(f => f.id !== id));
  }

  // Reset all
  clearAll() {
    this.files.set([]);
    this.globalError.set(null);
    this.dragCounter = 0;
  }

  // Format bytes to readable string (KB, MB etc)
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Clear global error message
  clearGlobalError() {
    this.globalError.set(null);
  }

  // Trigger PDF merging process
  async mergePDFs() {
    if (!this.isBrowser) return;

    const readyFiles = this.files().filter(f => f.status === 'ready');
    if (readyFiles.length < 2) {
      this.globalError.set('Please import and load at least 2 valid PDFs to merge.');
      return;
    }

    this.isMerging.set(true);
    this.mergeProgress.set(0);
    this.currentMergeStep.set('Reading documents...');

    try {
      const actualFiles = readyFiles.map(f => f.file);
      const mergedBytes = await this.pdfEngine.mergeFiles(actualFiles, (progress) => {
        this.mergeProgress.set(progress);
        const fileIndex = Math.min(Math.ceil((progress / 100) * actualFiles.length), actualFiles.length);
        this.currentMergeStep.set(`Processing file ${fileIndex} of ${actualFiles.length}...`);
      });

      this.currentMergeStep.set('Generating final output...');
      let filename = this.outputFilenameControl.value.trim();
      if (!filename) {
        filename = 'Merged.pdf';
      }
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }

      // Download file to browser locally
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.currentMergeStep.set('Merged PDF successfully saved!');
      setTimeout(() => {
        this.isMerging.set(false);
      }, 800);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during merging. Ensure none of the PDFs are password-protected.';
      this.globalError.set(errorMsg);
      this.isMerging.set(false);
    }
  }
}
