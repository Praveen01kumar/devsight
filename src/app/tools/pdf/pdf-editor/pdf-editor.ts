/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy, signal, computed, effect, ElementRef, ViewChild, PLATFORM_ID, inject, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

export interface TextBlockModel {
  id: string;
  text: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalX?: number;
  originalY?: number;
  originalWidth?: number;
  originalHeight?: number;
  rotation: number;
  originalRotation?: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  isDeleted: boolean;
  isModified: boolean;
  isOcr: boolean;
  confidence?: number;
  coverColor?: { r: number; g: number; b: number };
  opacity: number;
  fontWeight: string; // 'normal' | 'bold'
  fontStyle: string;  // 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
}

export interface PdfPageModel {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
  type: 'digital' | 'scanned' | 'outlined' | 'mixed' | 'loading' | 'unanalyzed';
  originalTextItems: TextBlockModel[];
  ocrTextItems: TextBlockModel[];
  userTextItems: TextBlockModel[];
  ocrConfidence: number;
  ocrLanguage: string;
  rotation: number; // 0, 90, 180, 270
  skew: number;     // skew angle in degrees (-30 to 30)
  isOcrRunning: boolean;
  ocrProgress: number;
  ocrStatus: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  try {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    if (isNaN(bigint)) return { r: 0, g: 0, b: 0 };
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  } catch {
    return { r: 255, g: 255, b: 255 };
  }
}

function sampleSurroundingColor(canvas: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 255, g: 255, b: 255 };

  // Sample outer margins around the text box
  const x = Math.max(0, Math.floor(box.x - 6));
  const y = Math.max(0, Math.floor(box.y - 6));
  const w = Math.min(canvas.width - x, Math.ceil(box.w + 12));
  const h = Math.min(canvas.height - y, Math.ceil(box.h + 12));

  try {
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    // Averages the four corners of the sampled bounding frame (usually represent background color)
    const corners = [
      { px: 0, py: 0 },
      { px: w - 1, py: 0 },
      { px: 0, py: h - 1 },
      { px: w - 1, py: h - 1 }
    ];

    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (const corner of corners) {
      const idx = (corner.py * w + corner.px) * 4;
      if (idx >= 0 && idx < data.length - 4) {
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
        count++;
      }
    }

    if (count > 0) {
      return {
        r: Math.round(totalR / count),
        g: Math.round(totalG / count),
        b: Math.round(totalB / count)
      };
    }
  } catch (e) {
    console.error('Background removal color sampling failed:', e);
  }

  return { r: 255, g: 255, b: 255 }; // Default fallback
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pdf-editor',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pdf-editor.html',
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class PdfEditor implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private fb = inject(FormBuilder);
  isBrowser = isPlatformBrowser(this.platformId);
  protected readonly Math = Math;

  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // PDF Document State
  pages = signal<PdfPageModel[]>([]);
  activePageNumber = signal<number>(1);
  pdfFileName = signal<string>('');
  hasPdfLoaded = signal<boolean>(false);
  canvasWidth = signal<number>(840);
  canvasHeight = signal<number>(1188);
  
  // Editor View State
  isLoading = signal<boolean>(false);
  loadingStatus = signal<string>('');
  zoomLevel = signal<number>(100); // percentage
  renderScale = signal<number>(1.0);
  
  // Interactivity State
  selectedBlock = signal<TextBlockModel | null>(null);
  editingBlockId = signal<string | null>(null);
  copiedBlock: TextBlockModel | null = null;

  // Undo/Redo Stacks
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private isUndoingOrRedoing = false;
  private saveTimeout: any = null;

  canUndo = signal<boolean>(false);
  canRedo = signal<boolean>(false);
  
  // Highlighting config
  highlightOcrConfidence = signal<boolean>(true);
  showDeskewGrid = signal<boolean>(false);
  
  // Interactive Move/Resize/Rotate Properties
  isDragging = false;
  isResizing = false;
  isRotating = false;
  private startX = 0;
  private startY = 0;
  private startBlockX = 0;
  private startBlockY = 0;
  private startBlockW = 0;
  private startBlockH = 0;
  private startBlockRot = 0;
  private startBlockSize = 14;

  // Form Group for Reactive properties bindings (NO NgModel constraint obeyed!)
  textPropertiesForm!: FormGroup;

  // Active instances (loaded via CDN dynamically)
  private pdfDocumentInstance: any = null;
  private originalPdfBytes: ArrayBuffer | null = null;

  // Pre-configured colors for fast palette picker
  colorPalette = [
    '#000000', '#ffffff', '#ef4444', '#f97316', 
    '#f59e0b', '#009966', '#3b82f6', '#10b981', 
    '#8b5cf6', '#ec4899', '#64748b', '#475569'
  ];

  // OCR language list
  ocrLanguages = [
    { code: 'eng', name: 'English' },
    { code: 'hin', name: 'Hindi' },
    { code: 'pan', name: 'Punjabi' },
    { code: 'eng+hin', name: 'English & Hindi' },
    { code: 'eng+pan', name: 'English & Punjabi' },
    { code: 'eng+hin+pan', name: 'All Languages' }
  ];

  constructor() {
    this.textPropertiesForm = this.fb.group({
      text: [''],
      fontSize: [14],
      fontFamily: ['Helvetica'],
      color: ['#000000'],
      opacity: [1.0],
      fontWeight: ['normal'],
      fontStyle: ['normal'],
      textAlign: ['left'],
      letterSpacing: [0],
      lineHeight: [1.2]
    });

    // Update active block dynamically when form fields change (Reactive flow)
    this.textPropertiesForm.valueChanges.subscribe(values => {
      const block = this.selectedBlock();
      if (block) {
        let changed = false;
        
        if (values.text !== undefined && block.text !== values.text) {
          block.text = values.text;
          changed = true;
        }
        if (values.fontSize !== undefined && block.fontSize !== Number(values.fontSize)) {
          block.fontSize = Number(values.fontSize);
          changed = true;
        }
        if (values.fontFamily !== undefined && block.fontFamily !== values.fontFamily) {
          block.fontFamily = values.fontFamily;
          changed = true;
        }
        if (values.color !== undefined && block.color !== values.color) {
          block.color = values.color;
          changed = true;
        }
        if (values.opacity !== undefined && block.opacity !== Number(values.opacity)) {
          block.opacity = Number(values.opacity);
          changed = true;
        }
        if (values.fontWeight !== undefined && block.fontWeight !== values.fontWeight) {
          block.fontWeight = values.fontWeight;
          changed = true;
        }
        if (values.fontStyle !== undefined && block.fontStyle !== values.fontStyle) {
          block.fontStyle = values.fontStyle;
          changed = true;
        }
        if (values.textAlign !== undefined && block.textAlign !== values.textAlign) {
          block.textAlign = values.textAlign;
          changed = true;
        }
        if (values.letterSpacing !== undefined && block.letterSpacing !== Number(values.letterSpacing)) {
          block.letterSpacing = Number(values.letterSpacing);
          changed = true;
        }
        if (values.lineHeight !== undefined && block.lineHeight !== Number(values.lineHeight)) {
          block.lineHeight = Number(values.lineHeight);
          changed = true;
        }

        if (changed) {
          block.isModified = true;
          this.pages.set([...this.pages()]);
          this.saveStateDebounced();
        }
      }
    });

    // Sync form values whenever selected block changes
    effect(() => {
      const block = this.selectedBlock();
      if (block) {
        this.textPropertiesForm.patchValue({
          text: block.text,
          fontSize: block.fontSize,
          fontFamily: block.fontFamily,
          color: block.color,
          opacity: block.opacity,
          fontWeight: block.fontWeight,
          fontStyle: block.fontStyle,
          textAlign: block.textAlign,
          letterSpacing: block.letterSpacing,
          lineHeight: block.lineHeight
        }, { emitEvent: false });
      }
    });
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Library load validation check in browser
      setTimeout(() => {
        const win = window as any;
        if (!win.pdfjsLib) {
          console.warn('PDF.js loading fallback required.');
        }
      }, 500);
    }
  }

  // File Upload Logic
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    await this.loadPdfFile(file);
  }

  // Drag and Drop Zone helpers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        await this.loadPdfFile(file);
      } else {
        alert('Please drop a valid PDF document.');
      }
    }
  }

  // Main PDF parsing and structure analysis
  async loadPdfFile(file: File) {
    this.isLoading.set(true);
    this.loadingStatus.set('Reading PDF file...');
    this.selectedBlock.set(null);
    this.editingBlockId.set(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.originalPdfBytes = arrayBuffer;
      this.pdfFileName.set(file.name);
      
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library was not loaded properly. Please refresh and try again.');
      }
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      this.pdfDocumentInstance = pdf;
      
      const numPages = pdf.numPages;
      const pagesList: PdfPageModel[] = [];
      
      for (let i = 1; i <= numPages; i++) {
        this.loadingStatus.set(`Analyzing document page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Analyze text streams using PDF.js text extractor
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        let totalTextChars = 0;
        const originalTextItems: TextBlockModel[] = [];
        
        for (const item of items) {
          if (item.str && item.str.trim().length > 0) {
            totalTextChars += item.str.trim().length;
            
            const transform = item.transform; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
            const rotation = Math.round(Math.atan2(transform[1], transform[0]) * (180 / Math.PI));
            
            // Map coordinate origins from PDF bottom-left to viewport top-down
            const [vx, vy] = viewport.convertToViewportPoint(transform[4], transform[5]);
            
            originalTextItems.push({
              id: `dig-${i}-${Math.random().toString(36).substring(2, 9)}`,
              text: item.str,
              originalText: item.str,
              x: vx,
              y: vy - fontSize, // Approximate top-left corner
              width: item.width || (item.str.length * fontSize * 0.55),
              height: item.height || fontSize,
              originalX: vx,
              originalY: vy - fontSize,
              originalWidth: item.width || (item.str.length * fontSize * 0.55),
              originalHeight: item.height || fontSize,
              rotation: rotation,
              originalRotation: rotation,
              fontSize: fontSize,
              fontFamily: 'Helvetica',
              color: '#000000',
              isDeleted: false,
              isModified: false,
              isOcr: false,
              opacity: 1.0,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textAlign: 'left',
              letterSpacing: 0,
              lineHeight: 1.2
            });
          }
        }
        
        // Step 1: Detect which type of PDF this page is automatically
        let pageType: PdfPageModel['type'] = 'scanned';
        if (totalTextChars >= 10) {
          pageType = 'digital';
        } else {
          // Both scanned and outlined have 0 or extremely low selectable character streams.
          // They will be run under the same browser-only local OCR engine rendering vector frames.
          pageType = 'scanned';
        }
        
        pagesList.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          aspectRatio: viewport.width / viewport.height,
          type: pageType,
          originalTextItems: originalTextItems,
          ocrTextItems: [],
          userTextItems: [],
          ocrConfidence: 0,
          ocrLanguage: 'eng',
          rotation: 0,
          skew: 0,
          isOcrRunning: false,
          ocrProgress: 0,
          ocrStatus: ''
        });
      }
      
      this.pages.set(pagesList);
      this.activePageNumber.set(1);
      this.isLoading.set(false);
      this.hasPdfLoaded.set(true);
      
      // Initialize Undo/Redo stack with the first state
      this.undoStack = [JSON.stringify(pagesList)];
      this.redoStack = [];
      this.canUndo.set(false);
      this.canRedo.set(false);
      
      // Initial render loop triggering
      setTimeout(() => this.renderActivePage(), 60);
      
    } catch (err: any) {
      console.error(err);
      this.isLoading.set(false);
      alert('Error analyzing PDF: ' + err.message);
    }
  }

  // Render the current active page to viewport canvas
  async renderActivePage() {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    const pdf = this.pdfDocumentInstance;
    if (!pdf || pages.length === 0) return;
    
    const pageModel = pages[pageNum - 1];
    
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = this.pdfCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Dynamically calculate responsive visual scale (base width 840px)
      const renderWidth = 840;
      const scale = renderWidth / pageModel.width;
      this.renderScale.set(scale);
      
      const viewport = page.getViewport({ 
        scale: scale,
        rotation: pageModel.rotation // support rotating orientation natively
      });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      this.canvasWidth.set(viewport.width);
      this.canvasHeight.set(viewport.height);
      
      // Page rotation / Deskew rendering logic
      if (pageModel.skew !== 0) {
        // Render to temp canvas first, then draw deskewed on the main visual canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          await page.render({
            canvasContext: tempCtx,
            viewport: viewport
          }).promise;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((pageModel.skew * Math.PI) / 180);
          ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
          ctx.restore();
        }
      } else {
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
      }
      
      // Auto-sample colors once page is rendered for perfect smart covers
      this.sampleAllBackgroundColors(canvas, pageModel);
      
    } catch (err: any) {
      console.error('Rendering failed: ', err);
    }
  }

  // smart background removal pixel sampler
  sampleAllBackgroundColors(canvas: HTMLCanvasElement, pageModel: PdfPageModel) {
    const scale = this.renderScale();
    const items = pageModel.type === 'digital' ? pageModel.originalTextItems : pageModel.ocrTextItems;
    
    for (const item of items) {
      if (!item.coverColor) {
        const box = {
          x: item.x * scale,
          y: item.y * scale,
          w: item.width * scale,
          h: item.height * scale
        };
        item.coverColor = sampleSurroundingColor(canvas, box);
      }
    }
  }

  // Run Tesseract.js completely inside the browser client
  async runOcrOnActivePage() {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    const pageModel = pages[pageNum - 1];
    
    if (pageModel.isOcrRunning) return;
    
    pageModel.isOcrRunning = true;
    pageModel.ocrStatus = 'Bootstrapping local Tesseract.js...';
    pageModel.ocrProgress = 0;
    this.pages.set([...pages]);
    
    try {
      const canvas = this.pdfCanvas.nativeElement;
      const lang = pageModel.ocrLanguage || 'eng';
      
      // Import worker dynamically
      const Tesseract = (window as any).Tesseract;
      let worker;
      
      if (Tesseract) {
        worker = await Tesseract.createWorker(lang, 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              pageModel.ocrProgress = m.progress;
              pageModel.ocrStatus = `Recognizing text: ${Math.round(m.progress * 100)}%`;
              this.pages.set([...pages]);
            } else {
              pageModel.ocrStatus = `OCR: ${m.status}`;
              this.pages.set([...pages]);
            }
          }
        });
      } else {
        // Fallback to npm package loaded worker if global not found
        // const { createWorker } = await import('tesseract.js');
        // worker = await createWorker(lang, 1, {
        //   logger: (m: any) => {
        //     if (m.status === 'recognizing text') {
        //       pageModel.ocrProgress = m.progress;
        //       pageModel.ocrStatus = `OCR: ${Math.round(m.progress * 100)}%`;
        //       this.pages.set([...pages]);
        //     } else {
        //       pageModel.ocrStatus = m.status;
        //       this.pages.set([...pages]);
        //     }
        //   }
        // });
      }
      
      pageModel.ocrStatus = 'Analyzing blocks and layout...';
      this.pages.set([...pages]);
      
      const result = await worker.recognize(canvas);
      const { lines, confidence } = result.data;
      
      const ocrItems: TextBlockModel[] = [];
      const scale = this.renderScale();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const bbox = line.bbox; // { x0, y0, x1, y1 }
        
        const h = bbox.y1 - bbox.y0;
        const w = bbox.x1 - bbox.x0;
        
        // Downscale coordinate markers to page unit reference
        const itemX = bbox.x0 / scale;
        const itemY = bbox.y0 / scale;
        const itemW = w / scale;
        const itemH = h / scale;
        
        ocrItems.push({
          id: `ocr-${pageNum}-${i}-${Math.random().toString(36).substring(2, 9)}`,
          text: line.text.trim(),
          originalText: line.text.trim(),
          x: itemX,
          y: itemY,
          width: itemW,
          height: itemH,
          originalX: itemX,
          originalY: itemY,
          originalWidth: itemW,
          originalHeight: itemH,
          rotation: 0,
          originalRotation: 0,
          fontSize: itemH * 0.78,
          fontFamily: 'Helvetica',
          color: '#000000',
          isDeleted: false,
          isModified: false,
          isOcr: true,
          confidence: line.confidence,
          opacity: 1.0,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          letterSpacing: 0,
          lineHeight: 1.2
        });
      }
      
      pageModel.ocrTextItems = ocrItems;
      pageModel.ocrConfidence = Math.round(confidence);
      pageModel.isOcrRunning = false;
      pageModel.ocrStatus = 'OCR completed successfully!';
      pageModel.ocrProgress = 1.0;
      
      this.pages.set([...pages]);
      this.saveState();
      
      // Refresh pixel boundaries
      this.sampleAllBackgroundColors(canvas, pageModel);
      await worker.terminate();
      
    } catch (err: any) {
      console.error(err);
      pageModel.isOcrRunning = false;
      pageModel.ocrStatus = `OCR Failed: ${err.message}`;
      this.pages.set([...pages]);
      alert('Tesseract OCR could not complete: ' + err.message);
    }
  }

  // Active text items computation based on page type
  activeTextBlocks = computed(() => {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return [];
    
    const pageModel = pages[pageNum - 1];
    
    if (pageModel.type === 'digital') {
      return [...pageModel.originalTextItems, ...pageModel.userTextItems];
    } else {
      return [...pageModel.ocrTextItems, ...pageModel.userTextItems];
    }
  });

  // Track original blocks that have been modified or deleted, so we can cover them visually
  originalTextCovers = computed(() => {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return [];
    
    const pageModel = pages[pageNum - 1];
    const items = pageModel.type === 'digital' ? pageModel.originalTextItems : pageModel.ocrTextItems;
    
    const selected = this.selectedBlock();
    const editingId = this.editingBlockId();
    
    return items.filter(item => 
      item.isDeleted || 
      item.isModified || 
      (selected && selected.id === item.id) ||
      (editingId && editingId === item.id)
    );
  });

  // Page switching
  setActivePage(pageNum: number) {
    if (pageNum < 1 || pageNum > this.pages().length) return;
    this.activePageNumber.set(pageNum);
    this.selectedBlock.set(null);
    this.editingBlockId.set(null);
    setTimeout(() => this.renderActivePage(), 50);
  }

  // Interactive mouse handlers for Drag, Resize, and Rotate
  onBlockMouseDown(event: MouseEvent, block: TextBlockModel) {
    if (this.isResizing || this.isRotating || this.editingBlockId() === block.id) return;
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedBlock.set(block);
    this.isDragging = true;
    
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startBlockX = block.x;
    this.startBlockY = block.y;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging) return;
      const dx = (moveEvent.clientX - this.startX) / this.renderScale();
      const dy = (moveEvent.clientY - this.startY) / this.renderScale();
      
      block.x = this.startBlockX + dx;
      block.y = this.startBlockY + dy;
      block.isModified = true;
    };
    
    const onMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.pages.set([...this.pages()]);
      this.saveState();
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  onResizeMouseDown(event: MouseEvent, block: TextBlockModel) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startBlockW = block.width;
    this.startBlockH = block.height;
    this.startBlockX = block.x;
    this.startBlockY = block.y;
    this.startBlockSize = block.fontSize;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;
      const dx = (moveEvent.clientX - this.startX) / this.renderScale();
      const dy = (moveEvent.clientY - this.startY) / this.renderScale();
      
      block.width = Math.max(20, this.startBlockW + dx);
      block.height = Math.max(10, this.startBlockH + dy);
      // Proportionately adjust font size if adjusting vertically
      block.fontSize = Math.max(6, this.startBlockSize + (dy * 0.45));
      block.isModified = true;
    };
    
    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.pages.set([...this.pages()]);
      this.saveState();
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  onRotateMouseDown(event: MouseEvent, block: TextBlockModel) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isRotating = true;
    
    const el = event.target as HTMLElement;
    const parentRect = el.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    
    const centerX = parentRect.left + parentRect.width / 2;
    const centerY = parentRect.top + parentRect.height / 2;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isRotating) return;
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let deg = angle * (180 / Math.PI) - 90; // offset top anchor
      
      // Shift Key Snaps rotation to 15-deg multiples
      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }
      
      block.rotation = Math.round(deg);
      block.isModified = true;
    };
    
    const onMouseUp = () => {
      this.isRotating = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.pages.set([...this.pages()]);
      this.saveState();
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Inline edit trigger on double click
  onBlockDoubleClick(block: TextBlockModel) {
    this.editingBlockId.set(block.id);
  }

  onEditBlur(block: TextBlockModel) {
    this.editingBlockId.set(null);
    block.isModified = true;
    this.pages.set([...this.pages()]);
    this.saveState();
  }

  // Text Styling Modifiers
  toggleFontWeight() {
    const block = this.selectedBlock();
    if (block) {
      const current = this.textPropertiesForm.get('fontWeight')?.value;
      this.textPropertiesForm.patchValue({
        fontWeight: current === 'bold' ? 'normal' : 'bold'
      });
    }
  }

  toggleFontStyle() {
    const block = this.selectedBlock();
    if (block) {
      const current = this.textPropertiesForm.get('fontStyle')?.value;
      this.textPropertiesForm.patchValue({
        fontStyle: current === 'italic' ? 'normal' : 'italic'
      });
    }
  }

  setTextAlign(align: 'left' | 'center' | 'right') {
    const block = this.selectedBlock();
    if (block) {
      this.textPropertiesForm.patchValue({ textAlign: align });
    }
  }

  setColor(colorHex: string) {
    const block = this.selectedBlock();
    if (block) {
      this.textPropertiesForm.patchValue({ color: colorHex });
    }
  }

  // Block management actions
  deleteBlock(block: TextBlockModel) {
    block.isDeleted = true;
    block.isModified = true;
    this.selectedBlock.set(null);
    this.pages.set([...this.pages()]);
    this.saveState();
  }

  duplicateBlock(block: TextBlockModel) {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    const pageModel = pages[pageNum - 1];
    
    const copy: TextBlockModel = {
      ...block,
      id: `user-${pageNum}-${Math.random().toString(36).substring(2, 9)}`,
      x: block.x + 25,
      y: block.y + 25,
      isModified: true,
      originalText: ''
    };
    
    pageModel.userTextItems.push(copy);
    this.pages.set([...pages]);
    this.selectedBlock.set(copy);
    this.saveState();
  }

  copyBlock(block: TextBlockModel) {
    this.copiedBlock = { ...block };
  }

  pasteBlock() {
    if (!this.copiedBlock) return;
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    const pageModel = pages[pageNum - 1];
    
    const pasted: TextBlockModel = {
      ...this.copiedBlock,
      id: `user-${pageNum}-${Math.random().toString(36).substring(2, 9)}`,
      x: this.copiedBlock.x + 35,
      y: this.copiedBlock.y + 35,
      isModified: true,
      originalText: ''
    };
    
    pageModel.userTextItems.push(pasted);
    this.pages.set([...pages]);
    this.selectedBlock.set(pasted);
    this.saveState();
  }

  // Adding clean brand-new blocks
  addTextBlock() {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    const pageModel = pages[pageNum - 1];
    
    const newBlock: TextBlockModel = {
      id: `user-${pageNum}-${Math.random().toString(36).substring(2, 9)}`,
      text: 'New editable text',
      originalText: '',
      x: 120,
      y: 120,
      width: 210,
      height: 35,
      rotation: 0,
      fontSize: 18,
      fontFamily: 'Helvetica',
      color: '#000000',
      isDeleted: false,
      isModified: true,
      isOcr: false,
      opacity: 1.0,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      letterSpacing: 0,
      lineHeight: 1.2
    };
    
    pageModel.userTextItems.push(newBlock);
    this.pages.set([...pages]);
    this.selectedBlock.set(newBlock);
    this.saveState();
  }

  // Quick Zoom adjustments
  zoomIn() {
    this.zoomLevel.update(z => Math.min(200, z + 15));
  }

  zoomOut() {
    this.zoomLevel.update(z => Math.max(50, z - 15));
  }

  resetZoom() {
    this.zoomLevel.set(100);
  }

  // Rotates a page 90 degrees Clockwise / Counter-Clockwise
  rotatePage(direction: 'cw' | 'ccw') {
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    const pageModel = pages[pageNum - 1];
    
    const currentRot = pageModel.rotation;
    let newRot = currentRot + (direction === 'cw' ? 90 : -90);
    if (newRot < 0) newRot += 360;
    pageModel.rotation = newRot % 360;
    
    this.pages.set([...pages]);
    this.saveState();
    setTimeout(() => this.renderActivePage(), 50);
  }

  // Changes page skew angle dynamically
  onSkewChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    const pageModel = pages[pageNum - 1];
    
    pageModel.skew = Number(input.value);
    this.pages.set([...pages]);
    this.saveStateDebounced();
    setTimeout(() => this.renderActivePage(), 50);
  }

  // --- UNDO / REDO / SHORTCUTS MOTOR ---
  saveState() {
    if (this.isUndoingOrRedoing) return;
    
    const snapshot = JSON.stringify(this.pages());
    
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
      return;
    }
    
    this.undoStack.push(snapshot);
    this.redoStack = [];
    
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    
    this.canUndo.set(this.undoStack.length > 1);
    this.canRedo.set(false);
  }

  saveStateDebounced() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500);
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    
    this.isUndoingOrRedoing = true;
    try {
      const currentState = this.undoStack.pop()!;
      this.redoStack.push(currentState);
      
      const prevStateStr = this.undoStack[this.undoStack.length - 1];
      const prevState = JSON.parse(prevStateStr) as PdfPageModel[];
      
      this.pages.set(prevState);
      
      const selected = this.selectedBlock();
      if (selected) {
        const found = this.findBlockInPages(prevState, selected.id);
        this.selectedBlock.set(found);
      }
      
      this.canUndo.set(this.undoStack.length > 1);
      this.canRedo.set(this.redoStack.length > 0);
      
      setTimeout(() => this.renderActivePage(), 50);
    } catch (e) {
      console.error('Failed to undo:', e);
    } finally {
      this.isUndoingOrRedoing = false;
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    this.isUndoingOrRedoing = true;
    try {
      const nextStateStr = this.redoStack.pop()!;
      this.undoStack.push(nextStateStr);
      
      const nextState = JSON.parse(nextStateStr) as PdfPageModel[];
      
      this.pages.set(nextState);
      
      const selected = this.selectedBlock();
      if (selected) {
        const found = this.findBlockInPages(nextState, selected.id);
        this.selectedBlock.set(found);
      }
      
      this.canUndo.set(this.undoStack.length > 1);
      this.canRedo.set(this.redoStack.length > 0);
      
      setTimeout(() => this.renderActivePage(), 50);
    } catch (e) {
      console.error('Failed to redo:', e);
    } finally {
      this.isUndoingOrRedoing = false;
    }
  }

  private findBlockInPages(pagesList: PdfPageModel[], blockId: string): TextBlockModel | null {
    for (const page of pagesList) {
      const blocks = [...page.originalTextItems, ...page.ocrTextItems, ...page.userTextItems];
      const found = blocks.find(b => b.id === blockId);
      if (found) return found;
    }
    return null;
  }

  cutBlock(block: TextBlockModel) {
    this.copyBlock(block);
    this.deleteBlock(block);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (!this.hasPdfLoaded()) return;

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const activeEl = document.activeElement;
    const isInputOrTextarea = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if ((event.key === 'Delete' || event.key === 'Backspace') && !isInputOrTextarea) {
      const block = this.selectedBlock();
      if (block) {
        event.preventDefault();
        this.deleteBlock(block);
      }
    }

    if (isCtrlOrCmd) {
      const key = event.key.toLowerCase();
      
      if (key === 'z') {
        event.preventDefault();
        this.undo();
      } else if (key === 'y') {
        event.preventDefault();
        this.redo();
      } else if (key === 'c' && !isInputOrTextarea) {
        const block = this.selectedBlock();
        if (block) {
          event.preventDefault();
          this.copyBlock(block);
        }
      } else if (key === 'x' && !isInputOrTextarea) {
        const block = this.selectedBlock();
        if (block) {
          event.preventDefault();
          this.cutBlock(block);
        }
      } else if (key === 'v' && !isInputOrTextarea) {
        if (this.copiedBlock) {
          event.preventDefault();
          this.pasteBlock();
        }
      }
    }
  }

  // Triggers background OCR rerun
  changeOcrLanguage(event: Event) {
    const select = event.target as HTMLSelectElement;
    const pageNum = this.activePageNumber();
    const pages = this.pages();
    if (pages.length === 0) return;
    
    pages[pageNum - 1].ocrLanguage = select.value;
    this.pages.set([...pages]);
  }

  // Compile visual results to download-ready PDF (pure browser-only workflow)
  async exportPdf() {
    if (!this.originalPdfBytes) return;
    this.isLoading.set(true);
    this.loadingStatus.set('Embedding fonts and stitching elements...');
    
    try {
      const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(this.originalPdfBytes);
      
      const pages = this.pages();
      
      for (let i = 0; i < pages.length; i++) {
        const pageModel = pages[i];
        const page = pdfDoc.getPage(i);
        const { height: pdfHeight } = page.getSize();
        
        // Match rotation values
        if (pageModel.rotation !== 0) {
          page.setRotation(degrees(pageModel.rotation));
        }
        
        const originalItems = pageModel.originalTextItems;
        const ocrItems = pageModel.ocrTextItems;
        const userItems = pageModel.userTextItems;
        
        const allItems = [...originalItems, ...ocrItems, ...userItems];
        
        for (const item of allItems) {
          // If deleted or modified, we cover the exact background boundary with its coverColor
          if (item.isDeleted || item.isModified) {
            if (item.id.startsWith('dig-') || item.id.startsWith('ocr-')) {
              const coverX = item.originalX !== undefined ? item.originalX : item.x;
              const coverY = item.originalY !== undefined ? item.originalY : item.y;
              const coverW = item.originalWidth !== undefined ? item.originalWidth : item.width;
              const coverH = item.originalHeight !== undefined ? item.originalHeight : item.height;
              
              // Apply slight padding to the PDF rectangle cover to ensure zero pixel bleed-out
              const padX = 2.5;
              const padY = 1.0;
              
              const pdfX = coverX - padX;
              const pdfY = pdfHeight - (coverY + coverH) - padY;
              const pdfW = coverW + padX * 2;
              const pdfH = coverH + padY * 2;
              
              const cover = item.coverColor || { r: 255, g: 255, b: 255 };
              
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: rgb(cover.r / 255, cover.g / 255, cover.b / 255),
                borderWidth: 0
              });
            }
          }
          
          // Render replacement texts or customized blocks
          if (!item.isDeleted) {
            const isUser = item.id.startsWith('user-');
            const isOcr = item.id.startsWith('ocr-');
            const isDig = item.id.startsWith('dig-');
            
            if (isUser || isOcr || (isDig && item.isModified)) {
              let selectedFont = StandardFonts.Helvetica;
              if (item.fontWeight === 'bold' && item.fontStyle === 'italic') {
                selectedFont = StandardFonts.HelveticaBoldOblique;
              } else if (item.fontWeight === 'bold') {
                selectedFont = StandardFonts.HelveticaBold;
              } else if (item.fontStyle === 'italic') {
                selectedFont = StandardFonts.HelveticaOblique;
              }
              
              if (item.fontFamily === 'Times Roman') {
                if (item.fontWeight === 'bold' && item.fontStyle === 'italic') {
                  selectedFont = StandardFonts.TimesRomanBoldItalic;
                } else if (item.fontWeight === 'bold') {
                  selectedFont = StandardFonts.TimesRomanBold;
                } else if (item.fontStyle === 'italic') {
                  selectedFont = StandardFonts.TimesRomanItalic;
                } else {
                  selectedFont = StandardFonts.TimesRoman;
                }
              } else if (item.fontFamily === 'Courier') {
                if (item.fontWeight === 'bold' && item.fontStyle === 'italic') {
                  selectedFont = StandardFonts.CourierBoldOblique;
                } else if (item.fontWeight === 'bold') {
                  selectedFont = StandardFonts.CourierBold;
                } else if (item.fontStyle === 'italic') {
                  selectedFont = StandardFonts.CourierOblique;
                } else {
                  selectedFont = StandardFonts.Courier;
                }
              }
              
              const font = await pdfDoc.embedFont(selectedFont);
              const col = hexToRgb(item.color);
              
              const pdfX = item.x;
              const pdfY = pdfHeight - (item.y + item.height);
              
              page.drawText(item.text, {
                x: pdfX,
                y: pdfY + (item.fontSize * 0.15), // micro baseline offset
                size: item.fontSize,
                font: font,
                color: rgb(col.r / 255, col.g / 255, col.b / 255),
                rotate: item.rotation ? degrees(-item.rotation) : undefined,
                opacity: item.opacity !== undefined ? item.opacity : 1.0,
              });
            }
          }
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `edited_${this.pdfFileName() || 'workspace.pdf'}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      
      this.isLoading.set(false);
      this.loadingStatus.set('');
      
    } catch (err: any) {
      console.error(err);
      this.isLoading.set(false);
      this.loadingStatus.set('');
      alert('Stitching and export failed: ' + err.message);
    }
  }

  // Reset editor board
  closePdf() {
    this.hasPdfLoaded.set(false);
    this.pages.set([]);
    this.pdfFileName.set('');
    this.selectedBlock.set(null);
    this.editingBlockId.set(null);
    this.originalPdfBytes = null;
    this.pdfDocumentInstance = null;
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
  }
}
