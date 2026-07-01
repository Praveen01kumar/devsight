import { Component, ChangeDetectionStrategy, HostListener, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

// Set pdfjs worker source CDN dynamically for browser-only usage
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

interface PdfJsPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvasContext: CanvasRenderingContext2D | null; viewport: unknown }): { promise: Promise<void> };
}

interface PdfJsDocument {
  numPages: number;
  getPage(index: number): Promise<PdfJsPage>;
}

export interface PageState {
  id: string;
  fileId: string;
  originalPageIndex: number;
  label: string;
  rotation: number; // 0, 90, 180, 270 degrees
  isDeleted: boolean;
  isInsertedBlank: boolean;
  isInsertedImage: boolean;
  imageDataUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  width: number; // pt
  height: number; // pt
  crop?: {
    left: number; // %
    top: number; // %
    width: number; // %
    height: number; // %
  };
  backgroundColor?: string;
  margin?: number; // points delta
  thumbnailUrl?: string;
}

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
}

export interface HistoryState {
  pages: PageState[];
  selectedIds: Set<string>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pdf-organizer',
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './pdf-organizer.html',
  styles: [
    `.cdk-drag-preview {
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 1rem;
      opacity: 0.9;
      transform: scale(1.05);
      background: white;
      pointer-events: none;
      z-index: 1000;
      border: 2px solid #007a55;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }`
  ]
})
export class PdfOrganizer {
  private readonly fb = inject(FormBuilder);

  // States
  loadedFiles: LoadedFile[] = [];
  pages = signal<PageState[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  isProcessing = signal<boolean>(false);
  progressMessage = signal<string>('');

  // Undo/Redo Stacks
  undoStack: HistoryState[] = [];
  redoStack: HistoryState[] = [];

  // Modals & Active Controls
  activePreviewPageId = signal<string | null>(null);
  previewZoom = signal<number>(100);
  previewRotation = signal<number>(0);

  croppingPageId = signal<string | null>(null);
  cropBoxPercent = signal({ left: 10, top: 10, width: 80, height: 80 });
  lockAspectRatio = signal<boolean>(false);
  aspectRatioValue = 1.0;

  activeDragAction: string | null = null;
  dragStartPos = { x: 0, y: 0 };
  dragStartCrop = { left: 0, top: 0, width: 0, height: 0 };

  lastClickedPageId: string | null = null;

  // Reactive Forms
  renumberForm = this.fb.nonNullable.group({
    prefix: [''],
    startNumber: [1, [Validators.required, Validators.min(1)]],
    style: ['arabic', Validators.required],
    selectedOnly: [false],
  });

  blankPageForm = this.fb.nonNullable.group({
    width: [595, [Validators.required, Validators.min(10)]], // A4 standard width (pt)
    height: [842, [Validators.required, Validators.min(10)]], // A4 standard height (pt)
    backgroundColor: ['#ffffff', Validators.required],
    placement: ['end', Validators.required],
  });

  movePagesForm = this.fb.nonNullable.group({
    targetLabel: ['', Validators.required],
    position: ['after', Validators.required],
  });

  splitForm = this.fb.nonNullable.group({
    method: ['selected', Validators.required],
    rangeStr: [''],
    batchSize: [2, [Validators.required, Validators.min(1)]],
  });

  searchForm = this.fb.nonNullable.group({
    query: ['', Validators.required],
  });

  // Computed signals
  totalPagesCount = computed(() => this.pages().length);
  selectedPagesCount = computed(() => this.selectedIds().size);
  hasSelection = computed(() => this.selectedIds().size > 0);
  canUndo = computed(() => this.undoStack.length > 0);
  canRedo = computed(() => this.redoStack.length > 0);
  isMainDocLoaded = computed(() => this.pages().length > 0);

  estimatedOutputSize = computed(() => {
    const list = this.pages();
    if (list.length === 0) return '0 KB';

    const originalFilesSize = this.loadedFiles.reduce((acc, f) => acc + f.size, 0);
    let totalOriginalPages = this.loadedFiles.reduce((acc, f) => {
      return acc + (this.pages().filter((p) => p.fileId === f.id).length || 1);
    }, 0);

    if (totalOriginalPages === 0) totalOriginalPages = 1;
    const avgPageSize = originalFilesSize / totalOriginalPages;

    let estimatedBytes = 0;
    for (const p of list) {
      if (p.isInsertedBlank) {
        estimatedBytes += 6000; // ~6 KB for blank
      } else if (p.isInsertedImage && p.imageDataUrl) {
        estimatedBytes += Math.floor(p.imageDataUrl.length * 0.75);
      } else {
        estimatedBytes += avgPageSize;
      }
    }

    if (estimatedBytes < 1024) return `${estimatedBytes} B`;
    if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`;
    return `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
  });

  // History Operations
  saveHistory() {
    this.undoStack.push({
      pages: JSON.parse(JSON.stringify(this.pages())),
      selectedIds: new Set(this.selectedIds()),
    });
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const current: HistoryState = {
      pages: JSON.parse(JSON.stringify(this.pages())),
      selectedIds: new Set(this.selectedIds()),
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.pages.set(prev.pages);
    this.selectedIds.set(prev.selectedIds);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const current: HistoryState = {
      pages: JSON.parse(JSON.stringify(this.pages())),
      selectedIds: new Set(this.selectedIds()),
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.pages.set(next.pages);
    this.selectedIds.set(next.selectedIds);
  }

  // Load PDF file from user input or drag-and-drop
  async loadPdfFile(file: File) {
    if (!file) return;
    this.isProcessing.set(true);
    this.progressMessage.set('Reading PDF file contents...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileId = Math.random().toString(36).substring(7);

      this.loadedFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        arrayBuffer
      });

      this.progressMessage.set('Reading page count...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdfDoc = (await loadingTask.promise) as PdfJsDocument;
      const numPages = pdfDoc.numPages;

      const newPages: PageState[] = [];

      for (let i = 1; i <= numPages; i++) {
        this.progressMessage.set(`Generating page thumbnail ${i} of ${numPages}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const scale = 160 / Math.max(viewport.width, viewport.height);
        const thumbViewport = page.getViewport({ scale });
        canvas.width = thumbViewport.width;
        canvas.height = thumbViewport.height;

        await page.render({ canvasContext: context!, viewport: thumbViewport }).promise;
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

        newPages.push({
          id: Math.random().toString(36).substring(7),
          fileId: fileId,
          originalPageIndex: i - 1,
          label: (this.pages().length + i).toString(),
          rotation: 0,
          isDeleted: false,
          isInsertedBlank: false,
          isInsertedImage: false,
          width: viewport.width,
          height: viewport.height,
          thumbnailUrl,
        });
      }

      this.saveHistory();
      this.pages.update((existing) => [...existing, ...newPages]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      alert('Error rendering PDF: ' + error.message);
    } finally {
      this.isProcessing.set(false);
      this.progressMessage.set('');
    }
  }

  // Handle image files
  async loadImageFile(file: File, placement: 'before' | 'after' | 'end') {
    if (!file) return;
    this.isProcessing.set(true);
    this.progressMessage.set('Decoding image...');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const newPage: PageState = {
        id: Math.random().toString(36).substring(7),
        fileId: 'image',
        originalPageIndex: 0,
        label: 'Image',
        rotation: 0,
        isDeleted: false,
        isInsertedBlank: false,
        isInsertedImage: true,
        imageDataUrl: dataUrl,
        imageWidth: img.width,
        imageHeight: img.height,
        width: img.width,
        height: img.height,
        thumbnailUrl: dataUrl,
      };

      this.saveHistory();
      this.insertPageAtLocation(newPage, placement);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      alert('Error decoding image file: ' + error.message);
    } finally {
      this.isProcessing.set(false);
      this.progressMessage.set('');
    }
  }

  // File Upload Handlers
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
        this.loadPdfFile(file);
      } else if (file.type.startsWith('image/')) {
        this.loadImageFile(file, 'end');
      } else {
        alert('Supported file formats are PDF or Image (PNG/JPG).');
      }
    }
  }

  onAppendFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
        this.loadPdfFile(file);
      } else if (file.type.startsWith('image/')) {
        this.loadImageFile(file, 'end');
      }
    }
  }

  // Drag-and-drop file upload
  onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        this.loadPdfFile(file);
      } else if (file.type.startsWith('image/')) {
        this.loadImageFile(file, 'end');
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Drag and drop reordering inside page grid
  onDrop(event: CdkDragDrop<PageState[]>) {
    if (event.previousIndex === event.currentIndex) return;
    this.saveHistory();

    const arr = [...this.pages()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.pages.set(this.autoUpdateLabels(arr));
  }

  // Page Selection
  onPageClick(event: Event, pageId: string) {
    const list = this.pages();
    const currentSelected = new Set(this.selectedIds());
    const isShift = 'shiftKey' in event && (event as KeyboardEvent | MouseEvent).shiftKey;
    const isCtrl = ('ctrlKey' in event && (event as KeyboardEvent | MouseEvent).ctrlKey) ||
      ('metaKey' in event && (event as KeyboardEvent | MouseEvent).metaKey);

    if (isShift && this.lastClickedPageId) {
      const startIdx = list.findIndex((p) => p.id === this.lastClickedPageId);
      const endIdx = list.findIndex((p) => p.id === pageId);

      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);

        const newSelected = new Set(this.selectedIds());
        for (let i = min; i <= max; i++) {
          newSelected.add(list[i].id);
        }
        this.selectedIds.set(newSelected);
      }
    } else if (isCtrl) {
      if (currentSelected.has(pageId)) {
        currentSelected.delete(pageId);
      } else {
        currentSelected.add(pageId);
      }
      this.selectedIds.set(currentSelected);
    } else {
      const target = event.target as HTMLElement;
      const isCheckbox = target.closest('.selection-checkbox') !== null;

      if (isCheckbox) {
        if (currentSelected.has(pageId)) {
          currentSelected.delete(pageId);
        } else {
          currentSelected.add(pageId);
        }
        this.selectedIds.set(currentSelected);
      } else {
        const newSel = new Set<string>();
        newSel.add(pageId);
        this.selectedIds.set(newSel);
      }
    }

    this.lastClickedPageId = pageId;
  }

  togglePageSelection(pageId: string) {
    const current = new Set(this.selectedIds());
    if (current.has(pageId)) {
      current.delete(pageId);
    } else {
      current.add(pageId);
    }
    this.selectedIds.set(current);
  }

  selectAllPages() {
    this.selectedIds.set(new Set(this.pages().map((p) => p.id)));
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  invertSelection() {
    const allIds = this.pages().map((p) => p.id);
    const current = this.selectedIds();
    const next = new Set<string>();
    for (const id of allIds) {
      if (!current.has(id)) {
        next.add(id);
      }
    }
    this.selectedIds.set(next);
  }

  // Rotate pages
  rotatePages(direction: 'left' | 'right' | '180', scope: 'single' | 'selected' | 'all', pageId?: string) {
    this.saveHistory();
    const list = [...this.pages()];
    const selected = this.selectedIds();

    const getNewRotation = (current: number): number => {
      if (direction === '180') return (current + 180) % 360;
      const delta = direction === 'right' ? 90 : 270;
      return (current + delta) % 360;
    };

    const updated = list.map((p) => {
      let apply = false;
      if (scope === 'all') apply = true;
      else if (scope === 'selected' && selected.has(p.id)) apply = true;
      else if (scope === 'single' && p.id === pageId) apply = true;

      if (apply) {
        return { ...p, rotation: getNewRotation(p.rotation) };
      }
      return p;
    });

    this.pages.set(updated);
  }

  // Duplicate pages
  duplicatePages(scope: 'single' | 'selected', pageId?: string) {
    this.saveHistory();
    const list = [...this.pages()];
    const selected = this.selectedIds();
    const updated: PageState[] = [];

    for (const p of list) {
      updated.push(p);

      let apply = false;
      if (scope === 'selected' && selected.has(p.id)) apply = true;
      else if (scope === 'single' && p.id === pageId) apply = true;

      if (apply) {
        updated.push({
          ...p,
          id: Math.random().toString(36).substring(7),
          label: p.label + ' (Copy)',
        });
      }
    }

    this.pages.set(this.autoUpdateLabels(updated));
  }

  // Delete pages
  deletePages(scope: 'single' | 'selected' | 'empty', pageId?: string) {
    const selected = this.selectedIds();
    const count = scope === 'selected' ? selected.size : 1;

    if (!confirm(`Are you sure you want to delete ${count} page(s)?`)) return;

    this.saveHistory();
    const list = [...this.pages()];

    const updated = list.filter((p) => {
      if (scope === 'selected' && selected.has(p.id)) return false;
      if (scope === 'single' && p.id === pageId) return false;
      return true;
    });

    if (scope === 'selected') {
      this.selectedIds.set(new Set());
    } else if (pageId) {
      const nextSelected = new Set(this.selectedIds());
      nextSelected.delete(pageId);
      this.selectedIds.set(nextSelected);
    }

    this.pages.set(this.autoUpdateLabels(updated));
  }

  // Move Selected Pages
  moveSelectedPages(targetIndex: number) {
    this.saveHistory();
    const list = [...this.pages()];
    const selected = this.selectedIds();

    const selectedPages = list.filter((p) => selected.has(p.id));
    const remainingPages = list.filter((p) => !selected.has(p.id));

    const index = Math.max(0, Math.min(targetIndex, remainingPages.length));
    remainingPages.splice(index, 0, ...selectedPages);

    this.pages.set(this.autoUpdateLabels(remainingPages));
  }

  onMoveSubmit() {
    if (this.movePagesForm.invalid) return;
    const { targetLabel, position } = this.movePagesForm.getRawValue();

    const list = this.pages();
    const idx = list.findIndex(p => p.label.toLowerCase() === targetLabel.toLowerCase() || p.id === targetLabel);
    if (idx === -1) {
      alert(`Target page label "${targetLabel}" not found.`);
      return;
    }

    const selected = this.selectedIds();
    const remainingBefore = list.slice(0, idx).filter((p) => !selected.has(p.id));

    let targetIndex = remainingBefore.length;
    if (position === 'after') {
      targetIndex += 1;
    }

    this.moveSelectedPages(targetIndex);
    this.movePagesForm.reset({ targetLabel: '', position: 'after' });
  }

  moveSelectedToBeginning() {
    this.moveSelectedPages(0);
  }

  moveSelectedToEnd() {
    this.moveSelectedPages(this.pages().length);
  }

  // Page Labels (Renumbering)
  onRenumberSubmit() {
    if (this.renumberForm.invalid) return;
    const { prefix, startNumber, style, selectedOnly } = this.renumberForm.getRawValue();

    this.saveHistory();
    const list = [...this.pages()];
    let counter = startNumber;

    const romanize = (num: number): string => {
      const lookup: Record<string, number> = {
        M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
      };
      let roman = '';
      for (const i in lookup) {
        while (num >= lookup[i]) {
          roman += i;
          num -= lookup[i];
        }
      }
      return roman;
    };

    const alphabetize = (num: number): string => {
      let result = '';
      while (num > 0) {
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - remainder) / 26);
      }
      return result || 'A';
    };

    const formatLabel = (num: number): string => {
      let numStr = '';
      if (style === 'roman') {
        numStr = romanize(num);
      } else if (style === 'alpha') {
        numStr = alphabetize(num);
      } else {
        numStr = num.toString();
      }
      return prefix ? `${prefix}-${numStr}` : numStr;
    };

    const updated = list.map((p) => {
      const isSelected = this.selectedIds().has(p.id);
      if (!selectedOnly || isSelected) {
        const label = formatLabel(counter);
        counter++;
        return { ...p, label };
      }
      return p;
    });

    this.pages.set(updated);
  }

  // Background and Margins
  applyBackgroundColor(color: string, selectedOnly: boolean) {
    this.saveHistory();
    const updated = this.pages().map((p) => {
      const isSelected = this.selectedIds().has(p.id);
      if (!selectedOnly || isSelected) {
        return { ...p, backgroundColor: color };
      }
      return p;
    });
    this.pages.set(updated);
  }

  applyMargins(delta: number, selectedOnly: boolean) {
    this.saveHistory();
    const updated = this.pages().map((p) => {
      const isSelected = this.selectedIds().has(p.id);
      if (!selectedOnly || isSelected) {
        return { ...p, margin: delta };
      }
      return p;
    });
    this.pages.set(updated);
  }

  async autoTrimMarginsForSelected() {
    const selected = Array.from(this.selectedIds());
    if (selected.length === 0) {
      alert('Please select at least one page to auto-trim margins.');
      return;
    }

    this.isProcessing.set(true);
    this.progressMessage.set('Detecting margins and cropping blank border regions...');

    try {
      for (const id of selected) {
        const page = this.pages().find((p) => p.id === id);
        if (!page || !page.thumbnailUrl) continue;

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = page.thumbnailUrl!;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            const isWhiteOrTransparent = (r > 240 && g > 240 && b > 240) || a < 15;
            if (!isWhiteOrTransparent) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const paddingX = Math.floor(width * 0.02);
          const paddingY = Math.floor(height * 0.02);

          minX = Math.max(0, minX - paddingX);
          minY = Math.max(0, minY - paddingY);
          maxX = Math.min(width, maxX + paddingX);
          maxY = Math.min(height, maxY + paddingY);

          const left = (minX / width) * 100;
          const top = (minY / height) * 100;
          const cropWidth = ((maxX - minX) / width) * 100;
          const cropHeight = ((maxY - minY) / height) * 100;

          this.saveHistory();
          const updated = this.pages().map((p) => {
            if (p.id === id) {
              return {
                ...p,
                crop: { left, top, width: cropWidth, height: cropHeight },
              };
            }
            return p;
          });
          this.pages.set(updated);
        }
      }
    } catch (err: unknown) {
      console.error(err as Error);
    } finally {
      this.isProcessing.set(false);
      this.progressMessage.set('');
    }
  }

  // Insert Pages (Blank/Images)
  onInsertBlankSubmit() {
    if (this.blankPageForm.invalid) return;
    const { width, height, backgroundColor, placement } = this.blankPageForm.getRawValue();

    this.saveHistory();

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;
    ctx.fillRect(0, 0, 120, 160);
    ctx.strokeStyle = '#e4e4e7';
    ctx.strokeRect(0, 0, 120, 160);

    const newPage: PageState = {
      id: Math.random().toString(36).substring(7),
      fileId: 'blank',
      originalPageIndex: 0,
      label: 'Blank',
      rotation: 0,
      isDeleted: false,
      isInsertedBlank: true,
      isInsertedImage: false,
      width,
      height,
      backgroundColor,
      thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
    };

    this.insertPageAtLocation(newPage, placement as 'before' | 'after' | 'end');
  }

  insertPageAtLocation(page: PageState, placement: 'before' | 'after' | 'end') {
    const currentPages = [...this.pages()];
    const selectedList = Array.from(this.selectedIds());

    let index = currentPages.length;

    if (selectedList.length > 0) {
      const lastSelectedId = selectedList[selectedList.length - 1];
      const selIdx = currentPages.findIndex((p) => p.id === lastSelectedId);
      if (selIdx !== -1) {
        if (placement === 'before') {
          index = selIdx;
        } else if (placement === 'after') {
          index = selIdx + 1;
        }
      }
    }

    currentPages.splice(index, 0, page);
    this.pages.set(this.autoUpdateLabels(currentPages));
  }

  // Cropping Modal Interactions
  openCropModal(pageId: string) {
    const page = this.pages().find((p) => p.id === pageId);
    if (!page) return;

    this.croppingPageId.set(pageId);
    if (page.crop) {
      this.cropBoxPercent.set({ ...page.crop });
    } else {
      this.cropBoxPercent.set({ left: 10, top: 10, width: 80, height: 80 });
    }
    this.aspectRatioValue = page.width / page.height;
  }

  onCropDragStart(event: MouseEvent | TouchEvent, action: string) {
    event.preventDefault();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    this.activeDragAction = action;
    this.dragStartPos = { x: clientX, y: clientY };
    this.dragStartCrop = { ...this.cropBoxPercent() };

    const moveHandler = (e: MouseEvent | TouchEvent) => this.onCropDragMove(e);
    const upHandler = () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', upHandler);
      this.activeDragAction = null;
    };

    window.addEventListener('mousemove', moveHandler, { passive: false });
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', upHandler);
  }

  onCropDragMove(event: MouseEvent | TouchEvent) {
    if (!this.activeDragAction) return;
    event.preventDefault();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const container = document.getElementById('crop-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const deltaX = clientX - this.dragStartPos.x;
    const deltaY = clientY - this.dragStartPos.y;

    const pctX = (deltaX / rect.width) * 100;
    const pctY = (deltaY / rect.height) * 100;

    let { left, top, width, height } = this.dragStartCrop;

    if (this.activeDragAction === 'move') {
      left = Math.max(0, Math.min(left + pctX, 100 - width));
      top = Math.max(0, Math.min(top + pctY, 100 - height));
    } else {
      if (this.activeDragAction.includes('t')) {
        const bottom = top + height;
        const proposedTop = Math.max(0, Math.min(top + pctY, bottom - 10));
        top = proposedTop;
        height = bottom - top;
      }
      if (this.activeDragAction.includes('b')) {
        height = Math.max(10, Math.min(height + pctY, 100 - top));
      }
      if (this.activeDragAction.includes('l')) {
        const right = left + width;
        const proposedLeft = Math.max(0, Math.min(left + pctX, right - 10));
        left = proposedLeft;
        width = right - left;
      }
      if (this.activeDragAction.includes('r')) {
        width = Math.max(10, Math.min(width + pctX, 100 - left));
      }

      if (this.lockAspectRatio()) {
        const origRatio = this.aspectRatioValue;
        const containerRatio = rect.width / rect.height;

        if (this.activeDragAction.includes('r') || this.activeDragAction.includes('l')) {
          height = (width / origRatio) * containerRatio;
        } else {
          width = (height * origRatio) / containerRatio;
        }

        if (left + width > 100) width = 100 - left;
        if (top + height > 100) height = 100 - top;
      }
    }

    this.cropBoxPercent.set({ left, top, width, height });
  }

  saveCrop() {
    const targetId = this.croppingPageId();
    if (!targetId) return;

    this.saveHistory();
    const updated = this.pages().map((p) => {
      if (p.id === targetId) {
        return { ...p, crop: { ...this.cropBoxPercent() } };
      }
      return p;
    });
    this.pages.set(updated);
    this.croppingPageId.set(null);
  }

  resetCropInModal() {
    this.cropBoxPercent.set({ left: 0, top: 0, width: 100, height: 100 });
  }

  // Page Previews
  openPagePreview(pageId: string) {
    this.activePreviewPageId.set(pageId);
    this.previewZoom.set(100);
    this.previewRotation.set(0);
  }

  navigatePreview(direction: 'prev' | 'next') {
    const current = this.pages();
    const idx = current.findIndex((p) => p.id === this.activePreviewPageId());
    if (idx === -1) return;

    const nextIdx = idx + (direction === 'next' ? 1 : -1);
    if (nextIdx >= 0 && nextIdx < current.length) {
      this.activePreviewPageId.set(current[nextIdx].id);
      this.previewZoom.set(100);
      this.previewRotation.set(0);
    }
  }

  zoomPreview(delta: number) {
    this.previewZoom.update((z) => Math.max(50, Math.min(300, z + delta)));
  }

  rotatePreview() {
    this.previewRotation.update((r) => (r + 90) % 360);
  }

  // Search function
  onSearchSubmit() {
    if (this.searchForm.invalid) return;
    const { query } = this.searchForm.getRawValue();

    const list = this.pages();
    const page = list.find(
      (p) => p.label.toLowerCase() === query.toLowerCase() || p.label.startsWith(query)
    );

    if (page) {
      const el = document.getElementById(`page-card-${page.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-[#007a55]', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-[#007a55]');
        }, 1500);
      }
    } else {
      alert(`No page found matching label "${query}".`);
    }
  }

  // Final PDF Generation & Export
  async generatePdfBuffer(pagesToExport: PageState[]): Promise<Uint8Array> {
    const destDoc = await PDFDocument.create();
    const fileCache = new Map<string, PDFDocument>();

    for (const p of pagesToExport) {
      if (p.isDeleted) continue;

      if (p.isInsertedBlank) {
        const blankPage = destDoc.addPage([p.width, p.height]);
        if (p.backgroundColor && p.backgroundColor !== 'transparent') {
          const hex = p.backgroundColor.replace('#', '');
          const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
          const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
          const b = Number.parseInt(hex.substring(4, 6), 16) / 255;
          blankPage.drawRectangle({
            x: 0,
            y: 0,
            width: p.width,
            height: p.height,
            color: rgb(r, g, b),
          });
        }
      } else if (p.isInsertedImage && p.imageDataUrl) {
        const isPng = p.imageDataUrl.includes('image/png');
        const base64Data = p.imageDataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const embeddedImg = isPng
          ? await destDoc.embedPng(bytes)
          : await destDoc.embedJpg(bytes);

        const imgPage = destDoc.addPage([p.width, p.height]);
        imgPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: p.width,
          height: p.height
        });
      } else {
        let srcDoc = fileCache.get(p.fileId);
        if (!srcDoc) {
          const fileObj = this.loadedFiles.find((f) => f.id === p.fileId);
          if (!fileObj) {
            throw new Error('Source file buffer not found');
          }
          srcDoc = await PDFDocument.load(fileObj.arrayBuffer.slice(0));
          fileCache.set(p.fileId, srcDoc);
        }

        const [copiedPage] = await destDoc.copyPages(srcDoc, [p.originalPageIndex]);

        // Accumulate original rotation and local rotation transformations
        const originalAngle = copiedPage.getRotation().angle;
        const finalAngle = (originalAngle + p.rotation) % 360;
        copiedPage.setRotation(degrees(finalAngle));

        // Crop Box Calculation (PDF origin starts at bottom-left)
        if (p.crop) {
          const cropBox = copiedPage.getCropBox() || copiedPage.getMediaBox();
          const origX = cropBox.x;
          const origY = cropBox.y;
          const origW = cropBox.width;
          const origH = cropBox.height;

          const leftPt = origW * (p.crop.left / 100);
          const widthPt = origW * (p.crop.width / 100);
          const heightPt = origH * (p.crop.height / 100);
          const bottomPt = origH * (1 - (p.crop.top + p.crop.height) / 100);

          copiedPage.setCropBox(origX + leftPt, origY + bottomPt, widthPt, heightPt);
        }

        // Custom margin spacing if added
        if (p.margin && p.margin !== 0) {
          const cropBox = copiedPage.getCropBox() || copiedPage.getMediaBox();
          copiedPage.setCropBox(
            cropBox.x - p.margin,
            cropBox.y - p.margin,
            cropBox.width + 2 * p.margin,
            cropBox.height + 2 * p.margin
          );
        }

        // Apply blended background tint overlay
        if (p.backgroundColor && p.backgroundColor !== 'transparent') {
          const hex = p.backgroundColor.replace('#', '');
          const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
          const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
          const b = Number.parseInt(hex.substring(4, 6), 16) / 255;
          copiedPage.drawRectangle({
            x: 0,
            y: 0,
            width: p.width,
            height: p.height,
            color: rgb(r, g, b),
            opacity: 0.15,
          });
        }

        destDoc.addPage(copiedPage);
      }
    }

    return await destDoc.save();
  }

  downloadPdf(uint8Array: Uint8Array, filename: string) {
    const blob = new Blob([uint8Array as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async saveAndDownloadAll() {
    const list = this.pages();
    if (list.length === 0) return;

    this.isProcessing.set(true);
    this.progressMessage.set('Assembling final vector PDF output locally...');

    try {
      const buffer = await this.generatePdfBuffer(list);
      this.downloadPdf(buffer, 'organized_document.pdf');
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      alert('Failed to generate PDF output: ' + error.message);
    } finally {
      this.isProcessing.set(false);
      this.progressMessage.set('');
    }
  }

  // Split & Extract Actions
  async onSplitSubmit() {
    const list = this.pages();
    if (list.length === 0) return;

    if (this.splitForm.invalid) return;
    const { method, rangeStr, batchSize } = this.splitForm.getRawValue();

    this.isProcessing.set(true);
    this.progressMessage.set('Processing PDF splitting operation...');

    try {
      if (method === 'selected') {
        const selectedList = list.filter((p) => this.selectedIds().has(p.id));
        if (selectedList.length === 0) {
          alert('Please select at least one page to extract.');
          return;
        }
        const buffer = await this.generatePdfBuffer(selectedList);
        this.downloadPdf(buffer, 'extracted_selection.pdf');
      } else if (method === 'every') {
        const size = batchSize;
        let fileIndex = 1;
        for (let i = 0; i < list.length; i += size) {
          this.progressMessage.set(`Generating split file part ${fileIndex}...`);
          const chunk = list.slice(i, i + size);
          const buffer = await this.generatePdfBuffer(chunk);
          this.downloadPdf(buffer, `split_part_${fileIndex}.pdf`);
          fileIndex++;
          await new Promise((r) => setTimeout(r, 250)); // stagger downloads
        }
      } else if (method === 'range' && rangeStr) {
        const ranges = rangeStr.split(',');
        for (const r of ranges) {
          const trimmed = r.trim();
          if (!trimmed) continue;

          let start = 0;
          let end = 0;

          if (trimmed.includes('-')) {
            const parts = trimmed.split('-');
            start = parseInt(parts[0], 10) - 1;
            end = parseInt(parts[1], 10) - 1;
          } else {
            start = parseInt(trimmed, 10) - 1;
            end = start;
          }

          if (isNaN(start) || isNaN(end) || start < 0 || end >= list.length || start > end) {
            throw new Error(`Invalid range specifier: "${trimmed}"`);
          }

          this.progressMessage.set(`Compiling range segment ${trimmed}...`);
          const chunk = list.slice(start, end + 1);
          const buffer = await this.generatePdfBuffer(chunk);
          this.downloadPdf(buffer, `split_range_${trimmed}.pdf`);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      alert('Failed during splitting: ' + error.message);
    } finally {
      this.isProcessing.set(false);
      this.progressMessage.set('');
    }
  }

  // Automatically update numeric labels sequentially
  autoUpdateLabels(pagesList: PageState[]): PageState[] {
    return pagesList.map((p, index) => {
      if (/^\d+$/.test(p.label) || p.label.includes('Copy') || p.label === 'Blank' || p.label === 'Image') {
        return { ...p, label: (index + 1).toString() };
      }
      return p;
    });
  }

  // Keyboard accessibility helper for reselecting or page lists
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const activeEl = document.activeElement as HTMLElement;
    const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;
    if (isInput) return;

    if (isCtrlOrCmd && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectAllPages();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (this.hasSelection()) {
        this.deletePages('selected');
      }
    } else if (isCtrlOrCmd && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.undo();
    } else if (
      (isCtrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'z') ||
      (isCtrlOrCmd && event.key.toLowerCase() === 'y')
    ) {
      event.preventDefault();
      this.redo();
    } else if (isCtrlOrCmd && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      if (this.hasSelection()) {
        this.duplicatePages('selected');
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.activePreviewPageId.set(null);
      this.croppingPageId.set(null);
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      this.navigatePageFocus(event.key);
    }
  }

  navigatePageFocus(key: string) {
    const list = this.pages();
    if (list.length === 0) return;

    const currentIdx = list.findIndex((p) => p.id === this.lastClickedPageId);
    if (currentIdx === -1) {
      this.lastClickedPageId = list[0].id;
      this.selectedIds.set(new Set([list[0].id]));
      return;
    }

    let nextIdx = currentIdx;
    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIdx = currentIdx - 1;
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIdx = currentIdx + 1;
    }

    if (nextIdx >= 0 && nextIdx < list.length) {
      const pageId = list[nextIdx].id;
      this.lastClickedPageId = pageId;
      this.selectedIds.set(new Set([pageId]));

      const el = document.getElementById(`page-card-${pageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
}

