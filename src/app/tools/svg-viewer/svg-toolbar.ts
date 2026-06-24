import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ViewerController } from './services/viewer-controller';
import { SelectionController } from './services/selection-controller';
import { ExportController } from './services/export-controller';

@Component({
  selector: 'app-svg-toolbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 text-slate-100 font-sans select-none shrink-0 z-50">
      <!-- Left Side Actions: File Upload / Reset -->
      <div class="flex items-center space-x-2">
        <label id="toolbar-upload-btn"
          title="Upload new SVG file"
          class="px-3.5 py-1.5 bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-600/5 active:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center">
          <mat-icon class="text-base w-4 h-4">cloud_upload</mat-icon>
          <input type="file" accept=".svg" class="hidden" (change)="onFileManualUpload($event)">
        </label>

        <div class="w-px h-5 bg-zinc-800 mx-1"></div>

        <button id="toolbar-reset-btn"
          title="Reset transformations to 100%"
          (click)="resetView()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">refresh</mat-icon>
        </button>

        <button id="toolbar-fit-btn"
          title="Fit SVG to active Viewport screen size"
          (click)="triggerFitToScreen()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">crop_free</mat-icon>
        </button>
      </div>

      <!-- Centered Information or Zoom Level Slider -->
      <div class="flex items-center space-x-3 bg-slate-950/40 px-3 py-1.5 rounded-full border border-zinc-800">
        <!-- Zoom Out button -->
        <button id="toolbar-zoom-out"
          title="Zoom Out (Ctrl + -)"
          (click)="zoomOut()"
          class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
          <mat-icon class="text-sm">remove</mat-icon>
        </button>

        <!-- Current zoom formatted scale -->
        <span class="text-xs font-mono font-bold text-slate-100 min-w-[50px] text-center">
          {{ zoomPercent() }}%
        </span>

        <!-- Zoom In button -->
        <button id="toolbar-zoom-in"
          title="Zoom In (Ctrl + +)"
          (click)="zoomIn()"
          class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
          <mat-icon class="text-sm">add</mat-icon>
        </button>

        <div class="w-px h-4 bg-zinc-800 mx-0.5"></div>

        <!-- Predefined zoom percentages shortcuts dropdown -->
        <button id="toolbar-zoom-actual"
          title="Actual Size (100%)"
          (click)="zoomTo100()"
          class="cursor-pointer px-2 py-0.5 text-[10px] font-bold font-mono bg-zinc-950 border border-zinc-800 rounded text-sky-400 hover:bg-slate-850 transition-colors">
          100%
        </button>
      </div>

      <!-- Right Side Actions: Theme toggle / Fullscreen / Exports -->
      <div class="flex items-center space-x-2">
        <!-- Brightness / Theme Switcher -->
        <button id="toolbar-theme-toggle"
          [title]="theme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          (click)="toggleTheme()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">
            {{ theme() === 'dark' ? 'wb_sunny' : 'nightlight_round' }}
          </mat-icon>
        </button>

        <!-- Fullscreen Switcher -->
        <button id="toolbar-fullscreen-toggle"
          [title]="isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'"
          (click)="toggleFullscreen()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-base w-4 h-4">
            {{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}
          </mat-icon>
        </button>

        <div class="w-px h-5 bg-zinc-800 mx-1"></div>

        <!-- Downloads Export options -->
        <button id="toolbar-export-svg"
          title="Export total SVG"
          (click)="exportCurrentAsSvg()"
          class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl bg-slate-850 hover:bg-zinc-800 text-slate-400 hover:text-white border border-zinc-800 transition-colors">
          <mat-icon class="text-sm">file_download</mat-icon>
        </button>
      </div>

    </div>
  `
})
export class SvgToolbar {
  private readonly viewer = inject(ViewerController);
  private readonly selection = inject(SelectionController);
  private readonly exportC = inject(ExportController);

  zoom = this.viewer.zoom;
  theme = this.viewer.theme;
  isFullscreen = this.viewer.isFullscreen;

  zoomPercent = computed(() => Math.round(this.zoom() * 100));

  zoomIn() {
    this.viewer.zoomIn();
  }

  zoomOut() {
    this.viewer.zoomOut();
  }

  zoomTo100() {
    this.viewer.setZoom(1);
  }

  resetView() {
    this.viewer.resetView();
  }

  toggleTheme() {
    this.viewer.toggleTheme();
  }

  toggleFullscreen() {
    // Attempt to toggle fullscreen on viewport root
    const viewport = document.getElementById('svg-viewport');
    if (viewport) {
      this.viewer.toggleFullscreen(viewport);
    }
  }

  triggerFitToScreen() {
    // Find canvas viewport layout and fit
    const canvasViewport = document.getElementById('svg-viewport');
    const svgEl = document.querySelector('#rendered-svg-wrapper svg') as SVGSVGElement;
    if (canvasViewport && svgEl) {
      const pRect = canvasViewport.getBoundingClientRect();
      let sWidth = 800;
      let sHeight = 600;

      const vBox = svgEl.viewBox.baseVal;
      if (vBox && vBox.width > 0 && vBox.height > 0) {
        sWidth = vBox.width;
        sHeight = vBox.height;
      } else {
        const widthAttr = Number.parseFloat(svgEl.getAttribute('width') || '0');
        const heightAttr = Number.parseFloat(svgEl.getAttribute('height') || '0');
        if (widthAttr > 0 && heightAttr > 0) {
          sWidth = widthAttr;
          sHeight = heightAttr;
        } else {
          sWidth = svgEl.clientWidth || 800;
          sHeight = svgEl.clientHeight || 600;
        }
      }

      this.viewer.fitToScreen(pRect.width, pRect.height, sWidth, sHeight);
    }
  }

  onFileManualUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Triggers upload event using custom selectors
        const wrapper = document.querySelector('app-svg-canvas');
        if (wrapper) {
          // Trigger file read through custom DOM events or direct invoke in container
          const fileLoadButton = document.getElementById('rendered-svg-wrapper');
          if (fileLoadButton) {
            // we will dispatch event back to the container
          }
        }
        // Dispatches reload event with mock file size to parent SvgViewer component
        const detailObj = { content, name: file.name, size: file.size };
        const loadEvt = new CustomEvent('svg-file-load-payload', { bubbles: true, detail: detailObj });
        input.dispatchEvent(loadEvt);
      };
      reader.readAsText(file);
    }
  }

  exportCurrentAsSvg() {
    // Retrieve rendered SVG wrapper string content
    const wrapper = document.getElementById('rendered-svg-wrapper');
    if (wrapper) {
      const svg = wrapper.querySelector('svg');
      if (svg) {
        const serializer = new XMLSerializer();
        const str = serializer.serializeToString(svg);
        this.exportC.exportAsSvg(str, 'exported_canvas.svg');
      }
    }
  }
}
