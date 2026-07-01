import { ChangeDetectionStrategy, Component, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { PdfAnalysisService, PdfAnalysisResult } from './pdf-analysis.service';
import { PdfCompressionService, CompressionProgress } from './pdf-compression.service';
import * as pdfjsLib from 'pdfjs-dist';

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  timeTaken: number;
  targetUnachievable: boolean;
  minPossibleSize?: number;
  reason?: string;
  qualityUsed?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pdf-compressor',
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  templateUrl: './pdf-compressor.html'
})
export class PdfCompressor {
  private readonly analysisService = inject(PdfAnalysisService);
  private readonly compressionService = inject(PdfCompressionService);

  @ViewChild('previewCanvas') previewCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('resultCanvas') resultCanvas?: ElementRef<HTMLCanvasElement>;

  currentStep = signal<'upload' | 'analyze' | 'compressing' | 'result'>('upload');
  uploadedFile = signal<File | null>(null);
  fileBuffer = signal<ArrayBuffer | null>(null);
  analysis = signal<PdfAnalysisResult | null>(null);
  progress = signal<CompressionProgress | null>(null);
  compressedBytes = signal<Uint8Array | null>(null);
  result = signal<CompressionResult | null>(null);

  isDragging = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  targetIterationLogs = signal<string[]>([]);

  compressionForm = new FormGroup({
    mode: new FormControl<'lossless' | 'smart' | 'high' | 'custom'>('smart', { nonNullable: true }),
    targetSizeEnabled: new FormControl<boolean>(false, { nonNullable: true }),
    targetSizeMb: new FormControl<number>(2, { nonNullable: true, validators: [Validators.required, Validators.min(0.1)] }),
    imageQuality: new FormControl<number>(75, { nonNullable: true, validators: [Validators.required, Validators.min(10), Validators.max(100)] }),
    maxDpi: new FormControl<number>(200, { nonNullable: true }),
    optimizeImages: new FormControl<boolean>(true, { nonNullable: true }),
    optimizeFonts: new FormControl<boolean>(true, { nonNullable: true }),
    optimizeStreams: new FormControl<boolean>(true, { nonNullable: true }),
    removeMetadata: new FormControl<boolean>(true, { nonNullable: true }),
    removeThumbnails: new FormControl<boolean>(true, { nonNullable: true }),
    removeAnnotations: new FormControl<boolean>(false, { nonNullable: true })
  });

  selectedMode = computed(() => this.compressionForm.value.mode || 'smart');
  targetSizeEnabled = computed(() => this.compressionForm.value.targetSizeEnabled || false);

  estimatedOutput = computed(() => {
    const ana = this.analysis();
    if (!ana) return null;

    const val = this.compressionForm.value;
    const mode = val.mode || 'smart';
    const isTarget = val.targetSizeEnabled || false;
    const targetMb = val.targetSizeMb || 2;

    if (isTarget) {
      const targetBytes = targetMb * 1024 * 1024;
      const minBytes = ana.estimatedHighSize;
      if (targetBytes < minBytes) {
        return {
          type: 'impossible' as const,
          estimatedSize: minBytes,
          targetSize: targetBytes,
          reason: 'Document structure limits further compression.'
        };
      }
      return {
        type: 'target' as const,
        minRange: targetBytes * 0.97,
        maxRange: targetBytes * 1.03,
        confidence: 'High'
      };
    }

    let estimatedSize = ana.estimatedSmartSize;
    if (mode === 'lossless') {
      estimatedSize = ana.estimatedLosslessSize;
    } else if (mode === 'high') {
      estimatedSize = ana.estimatedHighSize;
    } else if (mode === 'custom') {
      const quality = (val.imageQuality || 75) / 100;
      const removeMeta = val.removeMetadata ?? true;

      let imgFactor = 0.35;
      if (quality > 0.9) imgFactor = 0.85;
      else if (quality > 0.7) imgFactor = 0.6;
      else if (quality > 0.5) imgFactor = 0.4;
      else imgFactor = 0.2;

      const base = ana.estimatedTextSize * (removeMeta ? 0.85 : 0.98) + ana.estimatedFontSize * 0.9;
      const images = ana.estimatedImageSize * imgFactor;
      estimatedSize = Math.round(base + images);
    }

    return {
      type: 'fixed' as const,
      estimatedSize
    };
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    this.errorMessage.set(null);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  async handleFile(file: File): Promise<void> {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.errorMessage.set('Invalid file format. Please upload a PDF file.');
      return;
    }

    this.uploadedFile.set(file);
    this.currentStep.set('analyze');

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      this.fileBuffer.set(buffer);

      const result = await this.analysisService.analyzePdf(buffer.slice(0));
      this.analysis.set(result);

      setTimeout(() => {
        if (this.previewCanvas?.nativeElement) {
          this.renderFirstPage(buffer.slice(0), this.previewCanvas.nativeElement);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  }

  async renderFirstPage(buffer: ArrayBuffer, canvas: HTMLCanvasElement): Promise<void> {
    try {
      const version = pdfjsLib.version || '6.1.200';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const targetWidth = 240;
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          canvas: canvas
        };
        await page.render(renderContext).promise;
      }
    } catch (err) {
      console.error('Error rendering PDF page preview:', err);
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  async triggerCompression(): Promise<void> {
    const buffer = this.fileBuffer();
    if (!buffer) return;

    this.currentStep.set('compressing');
    this.progress.set({ message: 'Initializing optimization matrix...', percent: 5 });
    this.targetIterationLogs.set([]);

    const formVal = this.compressionForm.value;

    try {
      const result = await this.compressionService.compressPdf(
        buffer.slice(0),
        {
          mode: formVal.mode || 'smart',
          imageQuality: formVal.imageQuality,
          maxDpi: formVal.maxDpi,
          optimizeImages: formVal.optimizeImages,
          optimizeFonts: formVal.optimizeFonts,
          optimizeStreams: formVal.optimizeStreams,
          removeMetadata: formVal.removeMetadata,
          removeThumbnails: formVal.removeThumbnails,
          removeAnnotations: formVal.removeAnnotations,
          targetSizeEnabled: formVal.targetSizeEnabled,
          targetSizeMb: formVal.targetSizeMb
        },
        (progressInfo) => {
          this.progress.set(progressInfo);
          if (progressInfo.currentSize) {
            const sizeMb = (progressInfo.currentSize / (1024 * 1024)).toFixed(2);
            const qualityStr = progressInfo.currentQuality ? ` (Quality: ${progressInfo.currentQuality}%)` : '';
            this.targetIterationLogs.update(logs => [
              ...logs,
              `Iteration ${progressInfo.iteration ?? logs.length + 1}${qualityStr} Result Size: ${sizeMb} MB`
            ]);
          }
        }
      );

      this.compressedBytes.set(result.pdfBytes);
      this.result.set({
        originalSize: buffer.byteLength,
        compressedSize: result.actualSize,
        reductionPercent: ((buffer.byteLength - result.actualSize) / buffer.byteLength) * 100,
        timeTaken: result.timeTaken,
        targetUnachievable: result.targetUnachievable || false,
        minPossibleSize: result.minPossibleSize,
        reason: result.reason,
        qualityUsed: result.qualityUsed
      });

      this.currentStep.set('result');

      setTimeout(() => {
        if (this.resultCanvas?.nativeElement && result.pdfBytes) {
          this.renderFirstPage(result.pdfBytes.buffer.slice(0) as ArrayBuffer, this.resultCanvas.nativeElement);
        }
      }, 50);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || 'Unknown error');
      this.errorMessage.set(`Compression failed: ${msg}. Please check the PDF contents and try again.`);
      this.currentStep.set('analyze');
    }
  }

  downloadOptimized(): void {
    const bytes = this.compressedBytes();
    const file = this.uploadedFile();
    if (!bytes || !file) return;

    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const originalName = file.name;
    const nameParts = originalName.split('.');
    const extension = nameParts.pop();
    const newName = `${nameParts.join('.')}_optimized.${extension}`;
    a.download = newName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset(): void {
    this.uploadedFile.set(null);
    this.fileBuffer.set(null);
    this.analysis.set(null);
    this.progress.set(null);
    this.compressedBytes.set(null);
    this.result.set(null);
    this.targetIterationLogs.set([]);
    this.errorMessage.set(null);
    this.currentStep.set('upload');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
