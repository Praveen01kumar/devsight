import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { SelectionController } from './services/selection-controller';
import { ViewerController } from './services/viewer-controller';

@Component({
  selector: 'app-svg-canvas',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #canvasViewport id="svg-viewport"
      class="relative w-full h-full overflow-hidden select-none transition-colors duration-300 flex items-center justify-center outline-none"
      [class.bg-slate-950]="theme() === 'dark'"
      [class.bg-slate-50]="theme() === 'light'"
      [class.cursor-grab]="isSpacePressed() && !isPanning()"
      [class.cursor-grabbing]="isPanning()"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
      (mouseleave)="onMouseUp()"
      (wheel)="onWheel($event)"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (click)="onViewportClick()"
      tabindex="0">

      <!-- Checkered transparent background texture inside viewport -->
      <div class="absolute inset-0 transparency-grid pointer-events-none opacity-40"></div>

      <!-- Backdrop grid (designer style) -->
      @if (theme() === 'dark') {
        <div class="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px;">
        </div>
      } @else {
        <div class="absolute inset-0 pointer-events-none opacity-[0.05]" 
             style="background-image: radial-gradient(circle, #000 1px, transparent 1px); background-size: 24px 24px;">
        </div>
      }

      @if (svgHtml()) {
        <!-- Dynamic Transformation Container -->
        <div 
          #innerStage
          class="absolute top-0 left-0 origin-top-left transition-transform duration-75 select-none"
          [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoom() + ')'"
          style="will-change: transform;">
          
          <!-- Outer margin frame shadow to emphasize the main SVG boundaries -->
          <div 
            class="relative outline-none select-none"
            [style.width.px]="canvasWidth()"
            [style.height.px]="canvasHeight()"
            (click)="onCanvasClick($event)">
            
            <!-- Injected SVG element -->
            <div 
              id="rendered-svg-wrapper"
              [innerHTML]="safeSvgHtml()"
              (mouseover)="onMouseOverNative($event)"
              (mouseout)="onMouseOutNative()">
            </div>

            <!-- HOVER OUTLINE WRAPPER (rendered local scale) -->
            @if (hoveredBBox() && hoveredId() !== selectedId()) {
              <div class="absolute pointer-events-none border border-dashed border-sky-400 bg-sky-400/5 select-none"
                   [style.left.px]="hoveredBBox()!.x"
                   [style.top.px]="hoveredBBox()!.y"
                   [style.width.px]="hoveredBBox()!.width"
                   [style.height.px]="hoveredBBox()!.height">
              </div>
            }

            <!-- SELECTED SELECTION BOUNDING BOX OVERLAY (rendered local scale) -->
            @if (selectedBBox()) {
              <div 
                id="svg-selection-bound-box"
                class="absolute pointer-events-none border-2 border-sky-500/90 bg-sky-500/10 shadow-lg select-none"
                [style.left.px]="selectedBBox()!.x"
                [style.top.px]="selectedBBox()!.y"
                [style.width.px]="selectedBBox()!.width"
                [style.height.px]="selectedBBox()!.height">
                
                <!-- Sizing badge under the bbox -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded shadow text-[10px] font-mono text-cyan-400 flex items-center space-x-1 scale-90 whitespace-nowrap">
                  <span>{{ getTagName() }}</span>
                  <span class="text-slate-500">|</span>
                  <span>w: {{ selectedBBox()!.width.toFixed(0) }} px</span>
                  <span class="text-slate-500">|</span>
                  <span>h: {{ selectedBBox()!.height.toFixed(0) }} px</span>
                </div>

                <!-- Custom designer resize handles (aesthetic) -->
                <span class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-600 rounded-full"></span>
                <span class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-600 rounded-full"></span>
                <span class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-600 rounded-full"></span>
                <span class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-600 rounded-full"></span>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Drag & Drop Upload Zone State -->
        <div 
          id="canvas-upload-dropzone"
          class="max-w-md w-full mx-auto p-10 mx-6 rounded-2xl border-4 border-dashed border-slate-800 bg-slate-900/40 text-center flex flex-col items-center justify-center transition-all duration-300 hover:border-sky-500/40 hover:bg-slate-900/65"
          [class.border-slate-800]="theme() === 'dark'"
          [class.border-slate-300]="theme() === 'light'">
          
          <div class="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-5 animate-pulse">
            <mat-icon class="text-3xl">cloud_upload</mat-icon>
          </div>

          <p class="text-base font-sans font-medium text-slate-100 mb-2">
            Drag & drop an SVG file here
          </p>
          <p class="text-xs font-sans text-slate-400 mb-6">
            Supports Standard valid .svg files of up to 50MB
          </p>
          
          <!-- Hidden Native Input -->
          <input
            #fileInput
            type="file"
            accept=".svg"
            class="hidden"
            (change)="onFileSelected($event)">

          <button 
            id="browse-btn-dropzone"
            (click)="fileInput.click()"
            class="cursor-pointer px-5 py-2.5 bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-600/5 active:bg-sky-700 text-white rounded-xl text-xs font-sans font-semibold transition-colors flex items-center space-x-2">
            <mat-icon class="text-base">add</mat-icon>
            <span>Browse Computer</span>
          </button>

          <!-- Preloaded templates helper -->
          <div class="mt-8 pt-6 border-t border-white/5 w-full">
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-3">Or choose a professional vector example</span>
            <div class="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              <button 
                (click)="loadDemo('rocket')"
                class="cursor-pointer px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-lg text-slate-300 text-[11px] font-sans transition-colors flex items-center justify-center space-x-1">
                <mat-icon class="text-xs text-indigo-400">rocket_launch</mat-icon>
                <span>Rocket Ship</span>
              </button>
              <button 
                (click)="loadDemo('gear')"
                class="cursor-pointer px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-lg text-slate-300 text-[11px] font-sans transition-colors flex items-center justify-center space-x-1">
                <mat-icon class="text-xs text-amber-400">settings</mat-icon>
                <span>Gear Cog</span>
              </button>
              <button 
                (click)="loadDemo('sunset')"
                class="cursor-pointer px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-lg text-slate-300 text-[11px] font-sans transition-colors flex items-center justify-center space-x-1">
                <mat-icon class="text-xs text-rose-400">wb_sunny</mat-icon>
                <span>Gradient Sunset</span>
              </button>
              <button 
                (click)="loadDemo('tree')"
                class="cursor-pointer px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-lg text-slate-300 text-[11px] font-sans transition-colors flex items-center justify-center space-x-1">
                <mat-icon class="text-xs text-emerald-400">spa</mat-icon>
                <span>Zen Bio-Leaf</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .transparency-grid {
      background-size: 20px 20px;
      background-position: 0 0, 10px 10px;
      background-image: 
        linear-gradient(45deg, rgba(128,128,128,0.06) 25%, transparent 25%, transparent 75%, rgba(128,128,128,0.06) 75%, rgba(128,128,128,0.06)), 
        linear-gradient(45deg, rgba(128,128,128,0.06) 25%, rgba(10,15,30,0.04) 25%, rgba(10,15,30,0.04) 75%, rgba(128,128,128,0.06) 75%, rgba(128,128,128,0.06));
    }
    :host-context(.light-mode) .transparency-grid {
      background-image: 
        linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03));
    }
    .canvas-checkerboard {
      background-size: 16px 16px;
      background-position: 0 0, 8px 8px;
      background-image: 
        linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 75%, #f1f5f9 75%, #f1f5f9), 
        linear-gradient(45deg, #f1f5f9 25%, #ffffff 25%, #ffffff 75%, #f1f5f9 75%, #f1f5f9);
    }
    #rendered-svg-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000000; /* Prevent global theme text color from bleeding into SVG elements via currentColor */
    }
    #rendered-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
  `]
})
export class SvgCanvas {
  private readonly selection = inject(SelectionController);
  private readonly viewer = inject(ViewerController);
  private readonly sanitizer = inject(DomSanitizer);

  svgHtml = input<string>('');
  safeSvgHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.svgHtml()));
  uploadFile = output<{ content: string; name: string; size: number }>();

  @ViewChild('canvasViewport') viewportRef!: ElementRef<HTMLDivElement>;

  // Canvas calculated native dimensions
  canvasWidth = signal<number>(800);
  canvasHeight = signal<number>(600);

  // Synchronized view statuses directly from SvgViewer service
  zoom = this.viewer.zoom.asReadonly();
  panX = this.viewer.panX.asReadonly();
  panY = this.viewer.panY.asReadonly();
  theme = this.viewer.theme.asReadonly();

  // Bbox helper states
  selectedId = this.selection.selectedId.asReadonly();
  selectedBBox = this.selection.selectedBBox.asReadonly();

  hoveredBBox = signal<{ x: number; y: number; width: number; height: number } | null>(null);
  hoveredId = signal<string | null>(null);

  // Keyboard and Panning support states
  isSpacePressed = signal<boolean>(false);
  isPanning = signal<boolean>(false);

  constructor() {
    // Automatically recalculate and center whenever SVG changes
    effect(() => {
      const html = this.svgHtml();
      if (html) {
        this.fitViewToViewport();
      }
    });
  }

  private lastMouseX = 0;
  private lastMouseY = 0;

  getTagName(): string {
    const node = this.selection.selectedNode();
    return node ? node.tagName.toLowerCase() : '';
  }

  // Keyboard state managers
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      // Don't intercept if focus is inside search bar
      const activeObj = document.activeElement;
      if (activeObj?.id !== 'search-input-field') {
        event.preventDefault();
        this.isSpacePressed.set(true);
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.isSpacePressed.set(false);
    }
  }

  onMouseDown(event: MouseEvent) {
    // Left-click pan when holding space, OR any middle mouse button drag
    const isMiddleClick = event.button === 1;
    const isBackgroundPan = event.target === this.viewportRef?.nativeElement || (event.target as HTMLElement).id === 'svg-viewport';
    
    if (this.isSpacePressed() || isMiddleClick || isBackgroundPan) {
      event.preventDefault();
      this.isPanning.set(true);
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      // Focus viewport so it gets hotkey listeners
      this.viewportRef?.nativeElement.focus();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isPanning()) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      
      this.viewer.pan(dx, dy);
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  onMouseUp() {
    this.isPanning.set(false);
  }

  // Double trigger coordinate mapping when wheel scrolling
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.15 : 0.85;
    
    // Zoom relative to current cursor position for a highly professional feel!
    const rect = this.viewportRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const currentZoom = this.zoom();
    const nextZoom = Math.max(this.viewer.minZoom, Math.min(this.viewer.maxZoom, currentZoom * zoomFactor));

    // Calculate next pans to align under zoom point
    const dx = mouseX - this.panX();
    const dy = mouseY - this.panY();
    const newPanX = mouseX - dx * (nextZoom / currentZoom);
    const newPanY = mouseY - dy * (nextZoom / currentZoom);

    this.viewer.setZoom(nextZoom);
    this.viewer.setPan(newPanX, newPanY);

    // Refresh selected box to avoid offset slips
    const selected = this.selectedId();
    if (selected) {
      this.selection.updateBBox(selected);
    }
  }

  onViewportClick() {
    if (this.isSpacePressed()) return;
    this.selection.select(null);
  }

  // Element Selector from mouse direct click
  onCanvasClick(event: MouseEvent) {
    if (this.isSpacePressed()) return; // ignore clicking if panning

    const targetEl = event.target as SVGGraphicsElement;
    if (targetEl) {
      // Traverse up to find data-svg-viewer-id
      const actualViewerEl = targetEl.closest('[data-svg-viewer-id]') as SVGGraphicsElement;
      if (actualViewerEl && actualViewerEl.tagName.toLowerCase() !== 'svg') {
        event.stopPropagation();
        const viewerId = actualViewerEl.getAttribute('data-svg-viewer-id');
        this.selection.select(viewerId);
        return;
      }
    }

    // click on canvas backing or empty area clears selection
    this.selection.select(null);
  }

  // Hover Outline calculations
  onMouseOverNative(event: MouseEvent) {
    const targetEl = event.target as SVGGraphicsElement;
    if (targetEl) {
      const actualViewerEl = targetEl.closest('[data-svg-viewer-id]') as SVGGraphicsElement;
      if (actualViewerEl && actualViewerEl.tagName.toLowerCase() !== 'svg') {
        const id = actualViewerEl.getAttribute('data-svg-viewer-id');
        this.hoveredId.set(id);

        try {
          const bbox = actualViewerEl.getBBox();
          this.hoveredBBox.set({
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
          });
        } catch {
          const rect = actualViewerEl.getBoundingClientRect();
          this.hoveredBBox.set({
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height,
          });
        }
        return;
      }
    }
    this.onMouseOutNative();
  }

  onMouseOutNative() {
    this.hoveredId.set(null);
    this.hoveredBBox.set(null);
  }

  // Triggered when resizing or on fresh mount to force FIT view size
  fitViewToViewport() {
    setTimeout(() => {
      const parentEl = this.viewportRef?.nativeElement;
      if (!parentEl) return;

      const pRect = parentEl.getBoundingClientRect();
      const svgEl = document.querySelector('#rendered-svg-wrapper svg') as SVGSVGElement;
      
      let sRect = { width: 0, height: 0 };
      let vBoxWidth = 0;
      let vBoxHeight = 0;
      let widthAttr = 0;
      let heightAttr = 0;

      if (svgEl) {
        const vBox = svgEl.viewBox?.baseVal;
        if (vBox && vBox.width > 0 && vBox.height > 0) {
          vBoxWidth = vBox.width;
          vBoxHeight = vBox.height;
        }
        widthAttr = parseFloat(svgEl.getAttribute('width') || '0');
        heightAttr = parseFloat(svgEl.getAttribute('height') || '0');
      }

      // If DOM element not rendered/processed yet, or missing critical info, parse from source string!
      if (!svgEl || (vBoxWidth === 0 && widthAttr === 0)) {
        try {
          const rawString = this.svgHtml();
          if (rawString) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawString, 'image/svg+xml');
            const parsedSvg = doc.querySelector('svg');
            if (parsedSvg) {
              const viewBoxStr = parsedSvg.getAttribute('viewBox');
              if (viewBoxStr) {
                const parts = viewBoxStr.trim().split(/\s+/);
                if (parts.length === 4) {
                  vBoxWidth = parseFloat(parts[2]);
                  vBoxHeight = parseFloat(parts[3]);
                }
              }
              widthAttr = parseFloat(parsedSvg.getAttribute('width') || '0');
              heightAttr = parseFloat(parsedSvg.getAttribute('height') || '0');
            }
          }
        } catch (e) {
          console.error('Error parsing robust dimensions from SVG string:', e);
        }
      }

      // Resolve final dimensions matching our parse results
      if (vBoxWidth > 0 && vBoxHeight > 0) {
        sRect = { width: vBoxWidth, height: vBoxHeight };
      } else if (widthAttr > 0 && heightAttr > 0) {
        sRect = { width: widthAttr, height: heightAttr };
      } else if (svgEl) {
        const bounding = svgEl.getBoundingClientRect();
        sRect = { width: bounding.width || 800, height: bounding.height || 600 };
      } else {
        sRect = { width: 800, height: 600 };
      }

      this.canvasWidth.set(sRect.width);
      this.canvasHeight.set(sRect.height);
      this.viewer.fitToScreen(pRect.width, pRect.height, sRect.width, sRect.height);
      
      // Update Selection box overlay if needed
      const selId = this.selectedId();
      if (selId) {
        this.selection.updateBBox(selId);
      }
    }, 150);
  }

  // File Selection Management
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.readFile(file);
    }
  }

  private readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const content = event.target?.result as string;
      this.uploadFile.emit({
        content,
        name: file.name,
        size: file.size,
      });
      // automatically fit view after rendering
      this.fitViewToViewport();
    };
    reader.readAsText(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.svg')) {
        this.readFile(file);
      }
    }
  }

  loadDemo(type: 'rocket' | 'sunset' | 'gear' | 'tree') {
    let rawStr = '';
    let name = '';
    
    if (type === 'rocket') {
      rawStr = `<svg viewBox="0 0 400 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#skyGrad)" r="12" />
  <circle cx="80" cy="120" r="3" fill="#ffffff" opacity="0.8" />
  <circle cx="280" cy="80" r="2" fill="#ffffff" opacity="0.6" />
  <circle cx="340" cy="240" r="4" fill="#ffffff" opacity="0.9" />
  <span fill="#fff" opacity="0.2">
    <circle cx="150" cy="60" r="1.5" />
    <circle cx="210" cy="280" r="2.5" />
  </span>
  <g id="rocket-body" transform="translate(150, 100)">
    <path id="wing-left" d="M 10,90 Q -30,130 5,160 Z" fill="#475569" />
    <path id="wing-right" d="M 90,90 Q 130,130 95,160 Z" fill="#475569" />
    <path id="thruster-exhaust" d="M 40,165 Q 50,210 60,165 Z" fill="url(#fireGrad)" />
    <rect id="cabin-cylinder" x="20" y="30" width="60" height="130" rx="30" fill="url(#rocketGrad)" />
    <path id="nose-cone" d="M 20,40 Q 50,-10 80,40 Z" fill="#dc2626" />
    <circle id="window-outer" cx="50" cy="80" r="16" fill="#334155" />
    <circle id="window-glass" cx="50" cy="80" r="11" fill="#38bdf8" />
  </g>
</svg>`;
      name = 'rocket_illustration.svg';
    } else if (type === 'sunset') {
      rawStr = `<svg viewBox="0 0 500 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="40%" stop-color="#f43f5e" />
      <stop offset="80%" stop-color="#eab308" />
    </linearGradient>
    <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="100%" height="200" fill="url(#sunsetGrad)" />
  <circle id="sun" cx="250" cy="170" r="50" fill="#fffbeb" opacity="0.9" />
  <rect id="sea" y="200" width="100%" height="100" fill="url(#seaGrad)" />
  <g id="mountains" opacity="0.3">
    <polygon points="0,200 120,80 220,200" fill="#1e1b4b" />
    <polygon points="180,200 320,60 450,200" fill="#1e1b4b" />
  </g>
  <path id="birds" d="M 320,80 Q 325,75 330,80 Q 335,75 340,80" fill="none" stroke="#fff" stroke-width="2" />
</svg>`;
      name = 'vibrant_gradient_sunset.svg';
    } else if (type === 'gear') {
      rawStr = `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <g id="gear-assembly" transform="translate(50, 50)" fill="#64748b" stroke="#334155" stroke-width="2">
    <circle id="center-hole" cx="0" cy="0" r="10" fill="#0f172a" />
    <path id="outer-teeth" d="M -8,-35 L -12,-45 L 12,-45 L 8,-35 C 15,-30 25,-20 30,-10 L 42,-14 L 42,14 L 30,10 C 25,20 15,30 2,34 L 10,45 L -10,45 L -2,34 C -12,30 -22,20 -30,10 L -42,14 L -42,-14 L -30,-10" />
    <circle id="bearing-rim" cx="0" cy="0" r="22" fill="none" stroke-width="3" />
  </g>
</svg>`;
      name = 'mechanical_gear.svg';
    } else if (type === 'tree') {
      rawStr = `<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <g id="leaf-graphics" transform="translate(100,20)">
    <path id="main-stalk" d="M 0,0 C 20,40 10,130 0,160" fill="none" stroke="#059669" stroke-width="4" stroke-linecap="round" />
    <path id="primary-leaf" d="M 0,0 C 50,30 40,110 0,140 C -40,110 -50,30 0,0 Z" fill="#10b981" opacity="0.85" />
    <path id="left-ribs" d="M 0,30 Q -15,40 -25,35 M 0,60 Q -20,70 -35,62 M 0,90 Q -25,95 -32,85" stroke="#34d399" stroke-width="2" fill="none" />
    <path id="right-ribs" d="M 0,30 Q 15,40 25,35 M 0,60 Q 20,70 35,62 M 0,90 Q 25,95 32,85" stroke="#34d399" stroke-width="2" fill="none" />
  </g>
</svg>`;
      name = 'bio_zen_leaf.svg';
    }

    this.uploadFile.emit({
      content: rawStr,
      name,
      size: rawStr.length,
    });
    this.fitViewToViewport();
  }
}
