import { Component, ChangeDetectionStrategy, signal, computed, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import * as UTIF from 'utif';
import ICO from 'icojs';

interface BulkFile {
  id: string;
  file: File;
  name: string;
  size: number;
  originalFormat: string;
  targetFormat: string;
  status: 'pending' | 'converting' | 'completed' | 'failed';
  progress: number;
  error?: string;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-type-converter',
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './image-type-converter.html'
})
export class ImageTypeConverter implements OnInit, OnDestroy {
  // Navigation & Theme
  currentTab = signal<'single' | 'bulk'>('single');

  // Drag states
  isSingleDragging = signal<boolean>(false);
  isBulkDragging = signal<boolean>(false);

  // Single Convert State
  singleFile = signal<File | null>(null);
  singlePreviewUrl = signal<string | null>(null);
  singleStatus = signal<'idle' | 'converting' | 'completed' | 'failed'>('idle');
  singleError = signal<string | null>(null);
  singleConvertedBlob = signal<Blob | null>(null);
  singleConvertedUrl = signal<string | null>(null);
  singleTargetFormat = signal<string>('PNG');

  // Computed properties for Single Convert
  singleFileName = computed(() => this.singleFile()?.name || '');
  singleFileSize = computed(() => this.singleFile()?.size || 0);
  singleFileFormat = computed(() => {
    const file = this.singleFile();
    if (!file) return '';
    return file.name.split('.').pop()?.toUpperCase() || '';
  });
  singleConvertedSize = computed(() => this.singleConvertedBlob()?.size || 0);

  // Options Forms
  singleOptionsForm = new FormGroup({
    jpgQuality: new FormControl<number>(95),
    webpQuality: new FormControl<number>(95),
    avifQuality: new FormControl<number>(95),
    icoSize: new FormControl<string>('all'),
  });

  // Bulk Convert State
  bulkFiles = signal<BulkFile[]>([]);
  bulkTargetFormat = signal<string>('PNG');

  bulkOptionsForm = new FormGroup({
    jpgQuality: new FormControl<number>(95),
    webpQuality: new FormControl<number>(95),
    avifQuality: new FormControl<number>(95),
    icoSize: new FormControl<string>('all'),
  });

  // Computed properties for Bulk Convert
  isBulkConverting = computed(() => this.bulkFiles().some(f => f.status === 'converting'));
  bulkCompletedCount = computed(() => this.bulkFiles().filter(f => f.status === 'completed').length);
  bulkTotalCount = computed(() => this.bulkFiles().length);
  canDownloadAllZip = computed(() => this.bulkFiles().some(f => f.status === 'completed' && f.convertedBlob));

  // Registered Object URLs to clean up and prevent memory leaks
  private readonly createdUrls = new Set<string>();

  // Available options
  readonly outputFormats = ['JPG', 'PNG', 'WEBP', 'AVIF', 'TIFF', 'ICO'];
  readonly icoSizes = [
    { value: '16', label: '16 x 16 px (Favicon)' },
    { value: '32', label: '32 x 32 px (Standard)' },
    { value: '48', label: '48 x 48 px (Large)' },
    { value: '64', label: '64 x 64 px' },
    { value: '128', label: '128 x 128 px' },
    { value: '256', label: '256 x 256 px' },
    { value: 'all', label: 'Multi-resolution ICO (all sizes)' },
  ];

  constructor() {
  }

  ngOnInit() {

  }

  ngOnDestroy() {
    this.clearAllUrls();
  }

  // --- URL Tracking & Cleanup ---
  private registerUrl(url: string): string {
    this.createdUrls.add(url);
    return url;
  }

  private revokeUrl(url: string) {
    if (this.createdUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.createdUrls.delete(url);
    }
  }

  private clearAllUrls() {
    this.createdUrls.forEach(url => URL.revokeObjectURL(url));
    this.createdUrls.clear();
  }

  // --- Format Support Check ---
  isFormatSupported(mimeType: string): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`);
    } catch {
      return false;
    }
  }

  // --- Image Reading (Loads to Canvas) ---
  private async loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'tiff' || ext === 'tif') {
      const arrayBuffer = await file.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);
      if (!ifds || ifds.length === 0) {
        throw new Error('Invalid or corrupted TIFF image.');
      }
      UTIF.decodeImage(arrayBuffer, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]);
      const width = ifds[0].width;
      const height = ifds[0].height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not instantiate 2D context.');
      const imgData = ctx.createImageData(width, height);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      this.registerUrl(objectUrl);

      img.onload = () => {
        this.revokeUrl(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not instantiate 2D context.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };

      img.onerror = () => {
        this.revokeUrl(objectUrl);
        reject(new Error(`Failed to load image. The format (.${ext.toUpperCase()}) might be corrupted or unsupported.`));
      };

      img.src = objectUrl;
    });
  }

  // --- Canvas to Target Blob ---
  private async convertCanvasToBlob(
    canvas: HTMLCanvasElement,
    targetFormat: string,
    options: { quality: number; icoSize: string }
  ): Promise<Blob> {
    const formatLower = targetFormat.toLowerCase();

    // TIFF Output
    if (formatLower === 'tiff' || formatLower === 'tif') {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not instantiate 2D context.');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const rgba = new Uint8Array(imgData.data.buffer);
      const tiffBuffer = UTIF.encodeImage(rgba, canvas.width, canvas.height);
      return new Blob([tiffBuffer], { type: 'image/tiff' });
    }

    // ICO Output
    if (formatLower === 'ico') {
      const icoSize = options.icoSize;
      const sizes = icoSize === 'all' ? [16, 32, 48, 64, 128, 256] : [parseInt(icoSize, 10)];
      const pngBuffers: ArrayBuffer[] = [];

      for (const size of sizes) {
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = size;
        resizedCanvas.height = size;
        const rCtx = resizedCanvas.getContext('2d');
        if (!rCtx) throw new Error('Could not create canvas context for size scaling.');

        rCtx.imageSmoothingEnabled = true;
        rCtx.imageSmoothingQuality = 'high';

        // Draw preserving aspect ratio in a centered square box
        const scale = Math.min(size / canvas.width, size / canvas.height);
        const w = canvas.width * scale;
        const h = canvas.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        rCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, w, h);

        const blob = await new Promise<Blob | null>((resolve) => resizedCanvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Error creating scaled PNG for ICO container.');
        const buffer = await blob.arrayBuffer();
        pngBuffers.push(buffer);
      }

      const icoBuffer = await ICO.encode(pngBuffers);
      return new Blob([icoBuffer], { type: 'image/x-icon' });
    }

    // Normal formats (JPG, PNG, WEBP, AVIF)
    let mimeType = 'image/png';
    let quality: number | undefined = undefined;

    if (formatLower === 'jpg' || formatLower === 'jpeg') {
      mimeType = 'image/jpeg';
      quality = options.quality / 100;
    } else if (formatLower === 'webp') {
      mimeType = 'image/webp';
      quality = options.quality / 100;
    } else if (formatLower === 'avif') {
      mimeType = 'image/avif';
      quality = options.quality / 100;
    }

    // Fallback checks for browser output support
    if (!this.isFormatSupported(mimeType)) {
      if (formatLower === 'avif') {
        // Fallback to high-quality WEBP or JPEG if AVIF is unsupported natively
        if (this.isFormatSupported('image/webp')) {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg';
        }
        console.warn('AVIF encoding not supported natively in this browser. Falling back to WEBP/JPEG.');
      }
    }

    const mimeToUse = mimeType;
    const qualityToUse = quality;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to encode canvas to ${targetFormat}.`));
          }
        },
        mimeToUse,
        qualityToUse
      );
    });
  }

  // --- File validation helper ---
  private validateFile(file: File): string | null {
    const maxBytes = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxBytes) {
      return `File size exceeds the 50 MB limit. (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'bmp'];

    if (!allowedExtensions.includes(ext)) {
      return `Unsupported file format (.${ext.toUpperCase()}). Supported inputs are JPG, JPEG, PNG, WEBP, AVIF, TIFF, BMP.`;
    }

    return null;
  }

  // --- Tab Selection ---
  selectTab(tab: 'single' | 'bulk') {
    this.currentTab.set(tab);
  }

  // ==========================================
  // SINGLE CONVERT LOGIC
  // ==========================================

  // Drag over drop handlers
  onSingleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isSingleDragging.set(true);
  }

  onSingleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isSingleDragging.set(false);
  }

  onSingleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isSingleDragging.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.handleSingleFileSelect(e.dataTransfer.files[0]);
    }
  }

  onSingleFilePicked(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleSingleFileSelect(target.files[0]);
    }
  }

  private handleSingleFileSelect(file: File) {
    // Reset previous states
    this.resetSingleConvertState();

    const validationError = this.validateFile(file);
    if (validationError) {
      this.singleError.set(validationError);
      this.singleStatus.set('failed');
      return;
    }

    this.singleFile.set(file);
    this.singleStatus.set('idle');

    // Generate safe preview URL
    try {
      const url = URL.createObjectURL(file);
      this.singlePreviewUrl.set(this.registerUrl(url));
    } catch (err) {
      console.error('Error generating preview:', err);
    }
  }

  async convertSingleImage() {
    const file = this.singleFile();
    if (!file) return;

    this.singleStatus.set('converting');
    this.singleError.set(null);

    // Revoke previous converted file URL to save memory
    const prevUrl = this.singleConvertedUrl();
    if (prevUrl) this.revokeUrl(prevUrl);
    this.singleConvertedBlob.set(null);
    this.singleConvertedUrl.set(null);

    try {
      const targetFormat = this.singleTargetFormat();
      const val = this.singleOptionsForm.value;
      const quality =
        targetFormat === 'JPG'
          ? (val.jpgQuality ?? 90)
          : targetFormat === 'WEBP'
          ? (val.webpQuality ?? 90)
          : (val.avifQuality ?? 85);
      const icoSize = val.icoSize ?? '32';

      // 1. Load image to canvas
      const canvas = await this.loadImageToCanvas(file);

      // 2. Convert canvas to blob
      const blob = await this.convertCanvasToBlob(canvas, targetFormat, { quality, icoSize });

      this.singleConvertedBlob.set(blob);
      const outputUrl = URL.createObjectURL(blob);
      this.singleConvertedUrl.set(this.registerUrl(outputUrl));
      this.singleStatus.set('completed');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'An error occurred during conversion.';
      this.singleError.set(msg);
      this.singleStatus.set('failed');
    }
  }

  downloadSingleResult() {
    const blob = this.singleConvertedBlob();
    const originalFile = this.singleFile();
    if (!blob || !originalFile) return;

    const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
    const ext = this.singleTargetFormat().toLowerCase();
    saveAs(blob, `${baseName}_converted.${ext}`);
  }

  removeSingleFile() {
    this.resetSingleConvertState();
  }

  private resetSingleConvertState() {
    const currentPreview = this.singlePreviewUrl();
    if (currentPreview) this.revokeUrl(currentPreview);

    const currentConverted = this.singleConvertedUrl();
    if (currentConverted) this.revokeUrl(currentConverted);

    this.singleFile.set(null);
    this.singlePreviewUrl.set(null);
    this.singleConvertedBlob.set(null);
    this.singleConvertedUrl.set(null);
    this.singleStatus.set('idle');
    this.singleError.set(null);
  }

  // ==========================================
  // BULK CONVERT LOGIC
  // ==========================================

  onBulkDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isBulkDragging.set(true);
  }

  onBulkDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isBulkDragging.set(false);
  }

  onBulkDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isBulkDragging.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.addBulkFiles(Array.from(e.dataTransfer.files));
    }
  }

  onBulkFilesPicked(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.addBulkFiles(Array.from(target.files));
    }
  }

  private addBulkFiles(files: File[]) {
    const currentList = [...this.bulkFiles()];

    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'IMG';
      const validationError = this.validateFile(file);

      const bulkItem: BulkFile = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        originalFormat: ext,
        targetFormat: this.bulkTargetFormat(),
        status: validationError ? 'failed' : 'pending',
        progress: 0,
        error: validationError || undefined,
      };

      currentList.push(bulkItem);
    });

    this.bulkFiles.set(currentList);
  }

  removeBulkFile(id: string) {
    const targetItem = this.bulkFiles().find(f => f.id === id);
    if (targetItem?.convertedUrl) {
      this.revokeUrl(targetItem.convertedUrl);
    }
    this.bulkFiles.set(this.bulkFiles().filter(f => f.id !== id));
  }

  clearAllBulkFiles() {
    this.bulkFiles().forEach(item => {
      if (item.convertedUrl) {
        this.revokeUrl(item.convertedUrl);
      }
    });
    this.bulkFiles.set([]);
  }

  updateAllBulkTargetFormat(format: string) {
    this.bulkTargetFormat.set(format);
    // Update target format for all pending files
    this.bulkFiles.update(files =>
      files.map(f => {
        if (f.status === 'pending' || f.status === 'failed') {
          // If it had a size error, keep status failed, otherwise reset to pending on format change
          const hasSizeError = f.error && f.error.includes('size');
          return {
            ...f,
            targetFormat: format,
            status: hasSizeError ? 'failed' : 'pending',
            error: hasSizeError ? f.error : undefined,
            convertedBlob: undefined,
            convertedUrl: undefined,
            convertedSize: undefined,
          };
        }
        return f;
      })
    );
  }

  async convertBulkImages() {
    if (this.isBulkConverting()) return;

    const filesToConvert = this.bulkFiles().filter(f => f.status === 'pending');
    if (filesToConvert.length === 0) return;

    // Retrieve form settings
    const targetFormat = this.bulkTargetFormat();
    const val = this.bulkOptionsForm.value;
    const quality =
      targetFormat === 'JPG'
        ? (val.jpgQuality ?? 90)
        : targetFormat === 'WEBP'
        ? (val.webpQuality ?? 90)
        : (val.avifQuality ?? 85);
    const icoSize = val.icoSize ?? '32';

    // Loop through each file sequentially to avoid overwhelming browser thread/memory
    for (const item of filesToConvert) {
      // Update status to converting
      this.updateBulkFileStatus(item.id, { status: 'converting', progress: 10 });

      try {
        // 1. Load file to canvas
        const canvas = await this.loadImageToCanvas(item.file);
        this.updateBulkFileStatus(item.id, { progress: 50 });

        // 2. Convert canvas to blob
        const blob = await this.convertCanvasToBlob(canvas, targetFormat, { quality, icoSize });
        const outputUrl = URL.createObjectURL(blob);
        this.registerUrl(outputUrl);

        this.updateBulkFileStatus(item.id, {
          status: 'completed',
          progress: 100,
          convertedBlob: blob,
          convertedUrl: outputUrl,
          convertedSize: blob.size,
        });
      } catch (err) {
        console.error(`Bulk conversion failed for: ${item.name}`, err);
        const msg = err instanceof Error ? err.message : 'Conversion failed.';
        this.updateBulkFileStatus(item.id, {
          status: 'failed',
          progress: 100,
          error: msg,
        });
      }
    }
  }

  private updateBulkFileStatus(id: string, updates: Partial<BulkFile>) {
    this.bulkFiles.update(files =>
      files.map(f => {
        if (f.id === id) {
          // If there's an existing converted URL being replaced, revoke it
          if (updates.convertedUrl && f.convertedUrl && f.convertedUrl !== updates.convertedUrl) {
            this.revokeUrl(f.convertedUrl);
          }
          return { ...f, ...updates };
        }
        return f;
      })
    );
  }

  downloadBulkFile(id: string) {
    const item = this.bulkFiles().find(f => f.id === id);
    if (!item || !item.convertedBlob) return;

    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const ext = item.targetFormat.toLowerCase();
    saveAs(item.convertedBlob, `${baseName}_converted.${ext}`);
  }

  async downloadAllAsZip() {
    const completedFiles = this.bulkFiles().filter(f => f.status === 'completed' && f.convertedBlob);
    if (completedFiles.length === 0) return;

    try {
      const zip = new JSZip();

      completedFiles.forEach(item => {
        if (item.convertedBlob) {
          const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
          const ext = item.targetFormat.toLowerCase();
          zip.file(`${baseName}_converted.${ext}`, item.convertedBlob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'converted_images.zip');
    } catch (err) {
      console.error('Error generating bulk ZIP file:', err);
    }
  }

  // --- Helper to format file sizes ---
  formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
