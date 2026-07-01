import { Component, ElementRef, ViewChild, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface PdfMetadata {
  fileName: string;
  fileSize: number;
  totalPages: number;
  portraitPages: number;
  landscapePages: number;
  dimensionsSummary: string;
}

export interface PageState {
  index: number;
  pageNumber: number;
  originalRotation: number;
  addedRotation: number; // Cumulative added rotation: 0, 90, 180, 270
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  thumbnailUrl: string | null;
  isRendering: boolean;
}

interface HistoryEntry {
  addedRotations: number[];
  selectedIndices: number[];
}

@Component({
  selector: 'app-pdf-rotate',
  imports: [CommonModule, MatIconModule],
  template: `
      <div class="mx-auto">
        <!-- Dropzone / Upload view -->
        @if (pages().length === 0) {
          <div (dragover)="onDragOver($event)"
            (dragenter)="onDragEnter($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDropped($event)"
            [class.border-[#007a55]]="isDragging()"
            [class.bg-emerald-50/10]="isDragging()"
            [class.dark:bg-emerald-950/5]="isDragging()"
            class="max-w-2xl mx-auto border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-2 bg-white dark:bg-zinc-900 text-center shadow-md transition-all duration-300 flex flex-col items-center justify-center gap-6 min-h-[300px]">
            <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-[#007a55] flex items-center justify-center shadow-inner animate-pulse">
              <mat-icon class="scale-150">picture_as_pdf</mat-icon>
            </div>
            <div>
              <h2 class="text-2xl font-bold tracking-tight font-sans text-zinc-800 dark:text-zinc-200">Upload your PDF</h2>
              <p class="text-zinc-500 dark:text-zinc-400 mt-2 text-sm max-w-sm mx-auto">
                Drag and drop your PDF file here, or click the button below to browse. Processing is fully local and secure.
              </p>
            </div>

            <label class="primary-btn px-6 py-3 font-medium rounded-2xl cursor-pointer shadow-md transition-all duration-150 flex items-center gap-2 text-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
              <mat-icon>file_upload</mat-icon>
              <span>Choose File</span>
              <input type="file" accept=".pdf" class="sr-only" (change)="onFileSelected($event)" />
            </label>

            <p class="text-xs text-zinc-400 dark:text-zinc-500">Supports documents up to 1,000+ pages</p>
          </div>
        } @else {

          <!-- PDF loaded: Toolbar + Workspace Grid -->
          <div class="flex flex-col gap-2">

            <!-- File Metadata & Summary Banner -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col lg:flex-row justify-between gap-6">
              <div class="flex items-start gap-4 flex-1">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-[#007a55] flex items-center justify-center shrink-0">
                  <mat-icon class="scale-110">insert_drive_file</mat-icon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="font-bold text-lg text-zinc-800 dark:text-zinc-200 truncate max-w-md" [title]="metadata()?.fileName">
                      {{ metadata()?.fileName }}
                    </h2>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {{ formatBytes(metadata()?.fileSize || 0) }}
                    </span>
                  </div>

                  <!-- Statistics list -->
                  <div class="flex flex-wrap gap-x-6 gap-y-1.5 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-zinc-400 text-sm">pages</mat-icon>
                      <span>Total Pages: <strong class="font-mono">{{ metadata()?.totalPages }}</strong></span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-zinc-400 text-sm">crop_portrait</mat-icon>
                      <span>Portrait: <strong class="font-mono text-[#007a55]">{{ metadata()?.portraitPages }}</strong></span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-zinc-400 text-sm">crop_landscape</mat-icon>
                      <span>Landscape: <strong class="font-mono text-[#007a55]">{{ metadata()?.landscapePages }}</strong></span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-zinc-400 text-sm">aspect_ratio</mat-icon>
                      <span>Dimensions: <strong class="font-mono text-zinc-700 dark:text-zinc-300">{{ metadata()?.dimensionsSummary }}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Top Controls / Reset -->
              <div class="flex items-center gap-3 shrink-0 self-end lg:self-center">
                <!-- Undo / Redo buttons -->
                <div class="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-1">
                  <button (click)="undo()" [disabled]="!canUndo()"
                    class="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    title="Undo (Ctrl+Z)">
                    <mat-icon>undo</mat-icon>
                  </button>
                  <button (click)="redo()" [disabled]="!canRedo()"
                    class="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    title="Redo (Ctrl+Shift+Z)">
                    <mat-icon>redo</mat-icon>
                  </button>
                </div>

                <button (click)="resetToUpload()" class="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm">
                  <mat-icon class="text-base">close</mat-icon>
                  <span>Choose Other PDF</span>
                </button>

                <div class="flex items-center gap-3 self-stretch md:self-auto justify-end">
                <button (click)="exportAndDownload()" [disabled]="isExporting()"
                  class="primary-btn px-6 py-3 font-semibold rounded-2xl shadow-md transition-all duration-150 flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isExporting()) {
                    <span class="animate-spin text-white"><mat-icon class="text-base">sync</mat-icon></span>
                    <span>Building PDF...</span>
                  } @else {
                    <mat-icon class="text-base">download</mat-icon>
                    <span>Save & Download</span>
                  }
                </button>
              </div>

              </div>
            </div>

            <!-- Main Interactive Toolbar -->
            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              <!-- Selection filters -->
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1">Select:</span>
                
                <button 
                  (click)="selectAllPages()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  All
                </button>
                <button 
                  (click)="clearSelection()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  None
                </button>
                <button 
                  (click)="invertSelection()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  Invert
                </button>
                <button 
                  (click)="selectOddPages()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  Odd Pages
                </button>
                <button 
                  (click)="selectEvenPages()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  Even Pages
                </button>
                <button 
                  (click)="selectPortraitPages()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  Portrait
                </button>
                <button 
                  (click)="selectLandscapePages()" 
                  class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  Landscape
                </button>
              </div>

              <!-- Selection Counter / Context Info -->
              <div class="flex items-center gap-3 self-stretch md:self-auto justify-between border-t border-zinc-100 dark:border-zinc-800 md:border-0 pt-3 md:pt-0">
                <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Selected: <strong class="font-mono text-[#007a55]">{{ selectedIndices().size }}</strong> of <strong class="font-mono">{{ pages().length }}</strong>
                </span>

                <!-- Quick Rotate Actions for Selection -->
                <div class="flex items-center gap-1.5">
                  <button 
                    (click)="rotateSelected(-90)" 
                    class="p-2 bg-[#007a55]/10 hover:bg-[#007a55]/20 text-[#007a55] rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    title="Rotate Left 90°"
                  >
                    <mat-icon class="text-lg">rotate_left</mat-icon>
                  </button>
                  <button 
                    (click)="rotateSelected(90)" 
                    class="p-2 bg-[#007a55]/10 hover:bg-[#007a55]/20 text-[#007a55] rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    title="Rotate Right 90°"
                  >
                    <mat-icon class="text-lg">rotate_right</mat-icon>
                  </button>
                  <button 
                    (click)="rotateSelected(180)" 
                    class="p-2 bg-[#007a55]/10 hover:bg-[#007a55]/20 text-[#007a55] rounded-lg transition-all cursor-pointer flex items-center justify-center text-xs font-semibold font-mono"
                    title="Rotate 180°"
                  >
                    180°
                  </button>
                  <button 
                    (click)="resetSelected()" 
                    class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    title="Reset Rotation"
                  >
                    <mat-icon class="text-lg">settings_backup_restore</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Thumbnail Grid Section -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm min-h-[400px]">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                
                @for (page of pages(); track page.index) {
                  <!-- Individual Page Thumbnail Card -->
                  <div 
                    [attr.data-page-index]="page.index"
                    class="page-thumbnail-card relative group rounded-2xl border bg-white dark:bg-zinc-900 p-3 flex flex-col gap-3 transition-all duration-200 cursor-pointer select-none"
                    [class.card-active]="selectedIndices().has(page.index)"
                    [class.border-zinc-200]="!selectedIndices().has(page.index) && focusedIndex() !== page.index"
                    [class.dark:border-zinc-800]="!selectedIndices().has(page.index) && focusedIndex() !== page.index"
                    [class.ring-2]="focusedIndex() === page.index"
                    [class.ring-emerald-500]="focusedIndex() === page.index"
                    (click)="togglePageSelection(page.index, $event)"
                    (keydown.enter)="togglePageSelection(page.index, $event)"
                    (keydown.space)="togglePageSelection(page.index, $event)"
                    role="button"
                    tabindex="0"
                  >
                    
                    <!-- Page Preview Box (Square Container to prevent grid shifting) -->
                    <div class="w-full aspect-square flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800/80 overflow-hidden relative">
                      
                      <!-- Canvas or Image representation -->
                      @if (page.thumbnailUrl) {
                        <img 
                          [src]="page.thumbnailUrl" 
                          [ngStyle]="getThumbnailStyle(page)"
                          alt="Page Thumbnail"
                          class="max-w-full max-h-full rounded shadow-sm transition-transform duration-300"
                        />
                      } @else if (page.isRendering) {
                        <div class="flex flex-col items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                          <span class="animate-spin text-[#007a55]"><mat-icon>sync</mat-icon></span>
                          <span class="text-[9px] font-mono">Rendering</span>
                        </div>
                      } @else {
                        <div class="text-zinc-400 dark:text-zinc-600 flex flex-col items-center gap-1">
                          <mat-icon class="scale-110">hourglass_empty</mat-icon>
                          <span class="text-[9px] font-mono">Lazy Queue</span>
                        </div>
                      }

                      <!-- Checked state overlay dot (Top Left) -->
                      <div 
                        class="absolute top-2.5 left-2.5 w-6 h-6 rounded-lg flex items-center justify-center shadow-sm border transition-all cursor-pointer"
                        [class.bg-[#007a55]]="selectedIndices().has(page.index)"
                        [class.text-white]="selectedIndices().has(page.index)"
                        [class.border-[#007a55]]="selectedIndices().has(page.index)"
                        [class.bg-white/80]="!selectedIndices().has(page.index)"
                        [class.dark:bg-zinc-800/80]="!selectedIndices().has(page.index)"
                        [class.border-zinc-300]="!selectedIndices().has(page.index)"
                        [class.dark:border-zinc-700]="!selectedIndices().has(page.index)"
                        (click)="stopPropAndToggleSelection(page.index, $event)"
                        (keydown.enter)="stopPropAndToggleSelection(page.index, $event)"
                        role="checkbox"
                        [attr.aria-checked]="selectedIndices().has(page.index)"
                        tabindex="0"
                      >
                        <mat-icon class="text-base select-none">{{ selectedIndices().has(page.index) ? 'check' : '' }}</mat-icon>
                      </div>

                      <!-- Current rotation Badge (Top Right) -->
                      <div class="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white/90 dark:bg-zinc-800/90 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                        <span [class.text-[#007a55]]="page.addedRotation !== 0" [class.dark:text-emerald-400]="page.addedRotation !== 0">
                          {{ (page.originalRotation + page.addedRotation) % 360 }}°
                        </span>
                      </div>

                      <!-- Floating Quick Action Bar (Only visible on hover) -->
                      <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-zinc-950/95 shadow-md rounded-xl p-1 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-10">
                        <button 
                          (click)="rotatePageIndividual(page.index, -90, $event)" 
                          class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer flex items-center justify-center"
                          title="Rotate Left"
                        >
                          <mat-icon class="text-sm">rotate_left</mat-icon>
                        </button>
                        <button 
                          (click)="rotatePageIndividual(page.index, 90, $event)" 
                          class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer flex items-center justify-center"
                          title="Rotate Right"
                        >
                          <mat-icon class="text-sm">rotate_right</mat-icon>
                        </button>
                        <div class="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-800"></div>
                        <button 
                          (click)="openPreview(page.index, $event)" 
                          class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer flex items-center justify-center"
                          title="Large Preview"
                        >
                          <mat-icon class="text-sm">visibility</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Footer Details -->
                    <div class="flex items-center justify-between text-xs font-medium px-0.5">
                      <span class="font-mono text-zinc-400 dark:text-zinc-500">Page {{ page.pageNumber }}</span>
                      
                      <!-- Orientation indicator -->
                      <span class="flex items-center gap-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                        <mat-icon class="text-xs">{{ page.orientation === 'portrait' ? 'crop_portrait' : 'crop_landscape' }}</mat-icon>
                        <span class="capitalize">{{ page.orientation }}</span>
                      </span>
                    </div>

                  </div>
                }

              </div>
            </div>

            <!-- Result Summary dialog/card (Shown after export finishes) -->
            @if (exportResultSummary(); as summary) {
              <div class="p-6 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/40 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-[#007a55] flex items-center justify-center">
                    <mat-icon class="scale-110">check_circle</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-zinc-800 dark:text-zinc-200">PDF Successfully Compiled & Saved</h4>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Summary of operations applied locally.</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 self-stretch md:self-auto text-xs font-mono">
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-medium uppercase tracking-wider">Orig Size</span>
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">{{ formatBytes(summary.originalSize) }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-medium uppercase tracking-wider">Output Size</span>
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">{{ formatBytes(summary.outputSize) }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-medium uppercase tracking-wider">Rotated</span>
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">{{ summary.pagesRotated }} Pages</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-medium uppercase tracking-wider">Saved In</span>
                    <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ summary.processingTime }} ms</span>
                  </div>
                </div>
              </div>
            }

          </div>
        }
      </div>

      <!-- Loading / Analyzing Progress Screen Backdrop Overlay -->
      @if (isLoading()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-4 flex flex-col items-center gap-6">
            <div class="relative w-16 h-16">
              <span class="absolute inset-0 border-4 border-zinc-100 dark:border-zinc-800 rounded-full"></span>
              <span class="absolute inset-0 border-4 border-t-[#007a55] border-r-[#007a55] rounded-full animate-spin"></span>
            </div>
            <div>
              <h3 class="font-bold text-lg text-zinc-800 dark:text-zinc-100">Processing PDF</h3>
              <p class="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">{{ progressMessage() }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Custom Error Message Toast -->
      @if (errorMessage()) {
        <div class="fixed bottom-6 right-6 z-50 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl shadow-xl flex items-start gap-3 max-w-md animate-slide-in">
          <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <mat-icon>error_outline</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm text-red-800 dark:text-red-200">An Error Occurred</h4>
            <p class="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">{{ errorMessage() }}</p>
          </div>
          <button (click)="errorMessage.set('')" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>
      }

      <!-- Large Preview Modal -->
      @if (previewPageIndex() !== null) {
        <div class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 bg-zinc-950/60 border-b border-zinc-800 flex justify-between items-center z-10">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 rounded-md text-xs font-mono bg-zinc-800 text-zinc-300 font-bold">
                Page {{ previewPageIndex()! + 1 }} / {{ pages().length }}
              </span>
              <span class="text-xs font-mono text-zinc-400">
                Rotation: <strong class="text-emerald-400">{{ (pages()[previewPageIndex()!].originalRotation + pages()[previewPageIndex()!].addedRotation) % 360 }}°</strong>
              </span>
            </div>

            <!-- Center Zoom Controls -->
            <div class="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
              <button 
                (click)="zoomOut()" 
                class="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
                title="Zoom Out"
              >
                <mat-icon class="text-sm">zoom_out</mat-icon>
              </button>
              <span class="px-3 text-xs font-mono text-zinc-300">{{ Math.round(previewZoom() * 100) }}%</span>
              <button 
                (click)="zoomIn()" 
                class="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
                title="Zoom In"
              >
                <mat-icon class="text-sm">zoom_in</mat-icon>
              </button>
              <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>
              <button 
                (click)="resetZoom()" 
                class="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-all cursor-pointer"
                title="Fit Width"
              >
                Fit
              </button>
            </div>

            <!-- Close and Individual rotate controls -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                <button 
                  (click)="rotatePageIndividual(previewPageIndex()!, -90, $event); drawLargePreview()" 
                  class="p-2 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Rotate Left"
                >
                  <mat-icon>rotate_left</mat-icon>
                </button>
                <button 
                  (click)="rotatePageIndividual(previewPageIndex()!, 90, $event); drawLargePreview()" 
                  class="p-2 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Rotate Right"
                >
                  <mat-icon>rotate_right</mat-icon>
                </button>
              </div>

              <button 
                (click)="closePreview()" 
                class="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Close Preview (Esc)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Modal Canvas Area -->
          <div class="flex-1 w-full flex items-center justify-center overflow-auto p-6 relative">
            
            <!-- Floating Navigation Left -->
            @if (previewPageIndex()! > 0) {
              <button 
                (click)="navigatePreview(-1)" 
                class="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer z-10"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>
            }

            <!-- Large rotated canvas/image container -->
            <div class="shadow-2xl bg-white max-w-full max-h-full rounded-md overflow-hidden relative" [ngStyle]="getLargePreviewStyle()">
              <canvas #previewCanvas class="block max-w-full max-h-full"></canvas>
            </div>

            <!-- Floating Navigation Right -->
            @if (previewPageIndex()! < pages().length - 1) {
              <button 
                (click)="navigatePreview(1)" 
                class="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer z-10"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>
            }
          </div>

          <!-- Modal Footer status -->
          <div class="px-6 py-3.5 bg-zinc-950/60 border-t border-zinc-800 text-center z-10">
            <span class="text-[11px] font-mono text-zinc-400">
              Navigation keys: Left / Right Arrows • Rotation: R (Right), Shift+R (Left) • Close: ESC
            </span>
          </div>

        </div>
      }
  `,
  host: {
    '(window:keydown)': 'onKeyDown($event)'
  }
})
export class PdfRotate {
  private readonly platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  Math = Math;

  // Global UI & Theme state
  isDragging = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  progressMessage = signal<string>('Ready');
  errorMessage = signal<string>('');

  // Data / PDF models
  metadata = signal<PdfMetadata | null>(null);
  pages = signal<PageState[]>([]);
  selectedIndices = signal<Set<number>>(new Set<number>());
  focusedIndex = signal<number | null>(null);

  // History State
  history = signal<HistoryEntry[]>([]);
  historyIndex = signal<number>(-1);

  // Preview Modal state
  previewPageIndex = signal<number | null>(null);
  previewZoom = signal<number>(1.0);

  @ViewChild('previewCanvas') previewCanvas!: ElementRef<HTMLCanvasElement>;

  private observer: IntersectionObserver | null = null;
  private pdfjsDoc: { numPages: number; getPage: (i: number) => Promise<unknown> } | null = null;
  private uploadedFileBytes: ArrayBuffer | null = null;

  // Export process state
  isExporting = signal<boolean>(false);
  exportResultSummary = signal<{
    originalSize: number;
    outputSize: number;
    pagesRotated: number;
    rotationApplied: string;
    processingTime: number;
  } | null>(null);

  // Undo/Redo computed states
  canUndo = computed(() => this.historyIndex() > 0);
  canRedo = computed(() => this.historyIndex() < this.history().length - 1);

  constructor() {
    // Large Preview effect: redraw canvas when preview index or zoom changes
    effect(() => {
      const idx = this.previewPageIndex();
      this.previewZoom(); // Touch signal to register dependency
      if (idx !== null) {
        setTimeout(() => this.drawLargePreview(), 50);
      }
    });
  }

  // File dropzone events
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  async onFileDropped(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      await this.processFile(event.dataTransfer.files[0]);
    }
  }

  async onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      await this.processFile(target.files[0]);
    }
  }

  // Dynamic Library loader to prevent SSR failures
  private async loadLibraries() {
    if (!this.isBrowser) throw new Error('Platform is not browser');
    
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsVersion = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

    const pdfLib = await import('pdf-lib');
    
    return { pdfjsLib, pdfLib };
  }

  async processFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.errorMessage.set('Only PDF files are supported.');
      return;
    }

    this.resetState();
    this.isLoading.set(true);
    this.progressMessage.set('Loading PDF...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.uploadedFileBytes = arrayBuffer;

      const libs = await this.loadLibraries();

      this.progressMessage.set('Analyzing Pages...');
      const loadingTask = libs.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise as { numPages: number; getPage: (i: number) => Promise<unknown> };
      this.pdfjsDoc = pdfDoc;

      const totalPages = pdfDoc.numPages;
      const pageStates: PageState[] = [];

      let portraitCount = 0;
      let landscapeCount = 0;
      const dimensionsSet = new Set<string>();

      for (let i = 1; i <= totalPages; i++) {
        const page = (await pdfDoc.getPage(i)) as {
          rotate?: number;
          getViewport: (params: { scale: number }) => { width: number; height: number };
          render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
        };
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate size in mm
        const widthMm = Math.round(viewport.width * 0.3528);
        const heightMm = Math.round(viewport.height * 0.3528);
        const sizeStr = `${widthMm} x ${heightMm} mm`;
        dimensionsSet.add(sizeStr);

        // Calculate aspect ratio and orientation
        const isPortrait = viewport.width < viewport.height;
        const orientation = isPortrait ? 'portrait' : 'landscape';

        if (isPortrait) portraitCount++;
        else landscapeCount++;

        pageStates.push({
          index: i - 1,
          pageNumber: i,
          originalRotation: page.rotate ?? 0,
          addedRotation: 0,
          width: viewport.width,
          height: viewport.height,
          aspectRatio: viewport.width / viewport.height,
          orientation: orientation,
          thumbnailUrl: null,
          isRendering: false
        });
      }

      let dimSummaryText = '';
      if (dimensionsSet.size === 1) {
        dimSummaryText = Array.from(dimensionsSet)[0];
      } else {
        dimSummaryText = `Mixed (${dimensionsSet.size} standard types)`;
      }

      this.metadata.set({
        fileName: file.name,
        fileSize: file.size,
        totalPages: totalPages,
        portraitPages: portraitCount,
        landscapePages: landscapeCount,
        dimensionsSummary: dimSummaryText
      });

      this.pages.set(pageStates);
      this.isLoading.set(false);

      // Initialize the history
      this.history.set([{
        addedRotations: pageStates.map(p => p.addedRotation),
        selectedIndices: []
      }]);
      this.historyIndex.set(0);

      // Lazy load thumbnails using intersection observer
      this.setupIntersectionObserver();

    } catch (err: unknown) {
      console.error('Error analyzing PDF:', err);
      this.isLoading.set(false);
      const errorObj = err as { name?: string };
      if (errorObj.name === 'PasswordException') {
        this.errorMessage.set('This PDF is password-protected. Rotating protected PDFs entirely in-browser is not supported.');
      } else {
        this.errorMessage.set('Failed to read PDF file. It might be corrupted or invalid.');
      }
    }
  }

  private setupIntersectionObserver() {
    if (!this.isBrowser) return;

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const indexAttr = entry.target.getAttribute('data-page-index');
          if (indexAttr !== null) {
            const index = parseInt(indexAttr, 10);
            this.triggerThumbnailRender(index);
            this.observer?.unobserve(entry.target);
          }
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // start rendering thumbnails before they are fully scrolled in
      threshold: 0.01
    });

    setTimeout(() => {
      const elements = document.querySelectorAll('.page-thumbnail-card');
      elements.forEach(el => this.observer?.observe(el));
    }, 100);
  }

  async triggerThumbnailRender(index: number) {
    if (this.pages()[index]?.thumbnailUrl || this.pages()[index]?.isRendering) return;

    // Set page to rendering
    this.pages.update(pages => {
      const updated = [...pages];
      if (updated[index]) {
        updated[index] = { ...updated[index], isRendering: true };
      }
      return updated;
    });

    try {
      await this.loadLibraries();
      if (!this.pdfjsDoc) return;
      const page = (await this.pdfjsDoc.getPage(index + 1)) as {
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
      };

      // Render at low scale for clean and fast thumbnails
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        this.pages.update(pages => {
          const updated = [...pages];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              thumbnailUrl: dataUrl,
              isRendering: false
            };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(`Failed rendering thumbnail ${index + 1}:`, err);
      this.pages.update(pages => {
        const updated = [...pages];
        if (updated[index]) {
          updated[index] = { ...updated[index], isRendering: false };
        }
        return updated;
      });
    }
  }

  // Selection managers
  togglePageSelection(index: number, event: Event) {
    const currentSelected = new Set(this.selectedIndices());
    const isShift = (event as MouseEvent | KeyboardEvent).shiftKey || false;

    if (isShift && this.lastSelectedIndex() !== null) {
      const start = Math.min(this.lastSelectedIndex()!, index);
      const end = Math.max(this.lastSelectedIndex()!, index);
      const isSelecting = !currentSelected.has(index);

      for (let i = start; i <= end; i++) {
        if (isSelecting) {
          currentSelected.add(i);
        } else {
          currentSelected.delete(i);
        }
      }
    } else {
      if (currentSelected.has(index)) {
        currentSelected.delete(index);
      } else {
        currentSelected.add(index);
      }
      this.lastSelectedIndex.set(index);
    }

    this.selectedIndices.set(currentSelected);
    this.focusedIndex.set(index);
    this.saveHistory();
  }

  lastSelectedIndex = signal<number | null>(null);

  stopPropAndToggleSelection(index: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const current = new Set(this.selectedIndices());
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    this.selectedIndices.set(current);
    this.focusedIndex.set(index);
    this.lastSelectedIndex.set(index);
    this.saveHistory();
  }

  selectAllPages() {
    const all = new Set<number>();
    for (let i = 0; i < this.pages().length; i++) {
      all.add(i);
    }
    this.selectedIndices.set(all);
    this.saveHistory();
  }

  clearSelection() {
    this.selectedIndices.set(new Set<number>());
    this.saveHistory();
  }

  invertSelection() {
    const inverted = new Set<number>();
    const current = this.selectedIndices();
    for (let i = 0; i < this.pages().length; i++) {
      if (!current.has(i)) {
        inverted.add(i);
      }
    }
    this.selectedIndices.set(inverted);
    this.saveHistory();
  }

  selectOddPages() {
    const odd = new Set<number>();
    this.pages().forEach(page => {
      if (page.pageNumber % 2 !== 0) {
        odd.add(page.index);
      }
    });
    this.selectedIndices.set(odd);
    this.saveHistory();
  }

  selectEvenPages() {
    const even = new Set<number>();
    this.pages().forEach(page => {
      if (page.pageNumber % 2 === 0) {
        even.add(page.index);
      }
    });
    this.selectedIndices.set(even);
    this.saveHistory();
  }

  selectPortraitPages() {
    const portrait = new Set<number>();
    this.pages().forEach(page => {
      if (page.orientation === 'portrait') {
        portrait.add(page.index);
      }
    });
    this.selectedIndices.set(portrait);
    this.saveHistory();
  }

  selectLandscapePages() {
    const landscape = new Set<number>();
    this.pages().forEach(page => {
      if (page.orientation === 'landscape') {
        landscape.add(page.index);
      }
    });
    this.selectedIndices.set(landscape);
    this.saveHistory();
  }

  // Rotation Operations
  applyRotationToSubset(angle: number, subsetType: 'selected' | 'all' | 'odd' | 'even' | 'portrait' | 'landscape') {
    this.pages.update(pages => {
      return pages.map((page) => {
        let match = false;
        switch (subsetType) {
          case 'selected':
            match = this.selectedIndices().has(page.index);
            break;
          case 'all':
            match = true;
            break;
          case 'odd':
            match = page.pageNumber % 2 !== 0;
            break;
          case 'even':
            match = page.pageNumber % 2 === 0;
            break;
          case 'portrait':
            match = page.orientation === 'portrait';
            break;
          case 'landscape':
            match = page.orientation === 'landscape';
            break;
        }

        if (match) {
          const newAdded = (page.addedRotation + angle + 360) % 360;
          return {
            ...page,
            addedRotation: newAdded
          };
        }
        return page;
      });
    });
    this.saveHistory();
  }

  rotateSelected(angle: number) {
    const hasSelection = this.selectedIndices().size > 0;
    this.applyRotationToSubset(angle, hasSelection ? 'selected' : 'all');
  }

  resetSelected() {
    const hasSelection = this.selectedIndices().size > 0;
    this.pages.update(pages => {
      return pages.map((p) => {
        const match = hasSelection ? this.selectedIndices().has(p.index) : true;
        if (match) {
          return { ...p, addedRotation: 0 };
        }
        return p;
      });
    });
    this.saveHistory();
  }

  rotatePageIndividual(index: number, angle: number, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.pages.update(pages => {
      const updated = [...pages];
      if (updated[index]) {
        const newAdded = (updated[index].addedRotation + angle + 360) % 360;
        updated[index] = { ...updated[index], addedRotation: newAdded };
      }
      return updated;
    });
    this.saveHistory();
  }

  // Dynamic Styles to center rotated landscape/portrait images inside square cards
  getThumbnailStyle(page: PageState): Record<string, string> {
    const isRotated90 = page.addedRotation === 90 || page.addedRotation === 270;
    const rotationStr = `rotate(${page.addedRotation}deg)`;

    if (isRotated90 && page.aspectRatio < 1) {
      return {
        transform: `${rotationStr} scale(${page.aspectRatio})`,
        'transform-origin': 'center center'
      };
    } else if (isRotated90 && page.aspectRatio > 1) {
      return {
        transform: `${rotationStr} scale(${1 / page.aspectRatio})`,
        'transform-origin': 'center center'
      };
    }

    return {
      transform: rotationStr,
      'transform-origin': 'center center'
    };
  }

  // Undo / Redo engine
  saveHistory() {
    const currentRotations = this.pages().map(p => p.addedRotation);
    const currentSelections = Array.from(this.selectedIndices());

    const updatedHistory = this.history().slice(0, this.historyIndex() + 1);
    updatedHistory.push({
      addedRotations: currentRotations,
      selectedIndices: currentSelections
    });

    this.history.set(updatedHistory);
    this.historyIndex.set(updatedHistory.length - 1);
  }

  undo() {
    const idx = this.historyIndex();
    if (idx > 0) {
      const prevIdx = idx - 1;
      this.historyIndex.set(prevIdx);
      const state = this.history()[prevIdx];
      this.restoreHistoryState(state);
    }
  }

  redo() {
    const idx = this.historyIndex();
    if (idx < this.history().length - 1) {
      const nextIdx = idx + 1;
      this.historyIndex.set(nextIdx);
      const state = this.history()[nextIdx];
      this.restoreHistoryState(state);
    }
  }

  private restoreHistoryState(state: HistoryEntry) {
    this.pages.update(pages => pages.map((p, i) => ({
      ...p,
      addedRotation: state.addedRotations[i] ?? 0
    })));

    this.selectedIndices.set(new Set(state.selectedIndices));
  }

  // Keyboard Navigation & Shortcuts
  onKeyDown(event: KeyboardEvent) {
    if (!this.isBrowser) return;

    // Ignore when typing inside any inputs
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    const isCtrl = event.ctrlKey || event.metaKey;

    // Handle Modal Preview Shortcuts
    const previewIdx = this.previewPageIndex();
    if (previewIdx !== null) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.navigatePreview(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.navigatePreview(-1);
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (event.shiftKey) {
          this.rotatePageIndividual(previewIdx, -90);
        } else {
          this.rotatePageIndividual(previewIdx, 90);
        }
        this.drawLargePreview();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closePreview();
      }
      return;
    }

    // Normal Workspace Shortcuts
    if (isCtrl && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectAllPages();
    } else if (isCtrl && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if (isCtrl && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (event.shiftKey) {
        this.rotateSelected(-90);
      } else {
        this.rotateSelected(90);
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.clearSelection();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const current = this.focusedIndex() ?? -1;
      const next = Math.min(this.pages().length - 1, current + 1);
      this.focusedIndex.set(next);
      this.lastSelectedIndex.set(next);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const current = this.focusedIndex() ?? 1;
      const prev = Math.max(0, current - 1);
      this.focusedIndex.set(prev);
      this.lastSelectedIndex.set(prev);
    } else if (event.key === ' ' || event.key === 'Enter') {
      const focusIdx = this.focusedIndex();
      if (focusIdx !== null) {
        event.preventDefault();
        // Toggle focus index selection
        const currentSelected = new Set(this.selectedIndices());
        if (currentSelected.has(focusIdx)) {
          currentSelected.delete(focusIdx);
        } else {
          currentSelected.add(focusIdx);
        }
        this.selectedIndices.set(currentSelected);
        this.saveHistory();
      }
    }
  }

  navigatePageSelection(offset: number) {
    const len = this.pages().length;
    if (len === 0) return;
    const focusIdx = this.focusedIndex();
    if (focusIdx === null) {
      this.focusedIndex.set(0);
    } else {
      const next = (focusIdx + offset + len) % len;
      this.focusedIndex.set(next);
    }
  }

  // Large Modal Preview Controls
  openPreview(index: number, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.previewPageIndex.set(index);
    this.previewZoom.set(1.0);
  }

  closePreview() {
    this.previewPageIndex.set(null);
  }

  navigatePreview(offset: number) {
    const idx = this.previewPageIndex();
    if (idx === null) return;
    const nextIdx = idx + offset;
    if (nextIdx >= 0 && nextIdx < this.pages().length) {
      this.previewPageIndex.set(nextIdx);
    }
  }

  zoomIn() {
    this.previewZoom.update(curr => Math.min(curr + 0.25, 3.0));
  }

  zoomOut() {
    this.previewZoom.update(curr => Math.max(curr - 0.25, 0.5));
  }

  resetZoom() {
    this.previewZoom.set(1.0);
  }

  async drawLargePreview() {
    const idx = this.previewPageIndex();
    if (idx === null || !this.isBrowser) return;

    const canvas = this.previewCanvas?.nativeElement;
    if (!canvas) return;

    try {
      await this.loadLibraries();
      if (!this.pdfjsDoc) return;
      const page = (await this.pdfjsDoc.getPage(idx + 1)) as {
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
      };

      // Render scale based on the preview zoom factor
      const viewport = page.getViewport({ scale: this.previewZoom() * 1.5 });
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
      }
    } catch (err) {
      console.error('Failed drawing large preview page:', err);
    }
  }

  getLargePreviewStyle(): Record<string, string> {
    const idx = this.previewPageIndex();
    if (idx === null) return {};

    const page = this.pages()[idx];
    if (!page) return {};

    const isRotated90 = page.addedRotation === 90 || page.addedRotation === 270;
    const rotationStr = `rotate(${page.addedRotation}deg)`;

    // Scale calculations to avoid viewport overflow in Large Preview Modal when rotated 90/270 degrees
    if (isRotated90 && page.aspectRatio < 1) {
      return {
        transform: `${rotationStr} scale(${page.aspectRatio})`,
        'transform-origin': 'center center'
      };
    } else if (isRotated90 && page.aspectRatio > 1) {
      return {
        transform: `${rotationStr} scale(${1 / page.aspectRatio})`,
        'transform-origin': 'center center'
      };
    }

    return {
      transform: rotationStr,
      'transform-origin': 'center center'
    };
  }

  // Export rotated PDF compilation (quality-preserving direct setRotation attribute update)
  async exportAndDownload() {
    if (!this.uploadedFileBytes || this.pages().length === 0) return;

    this.isExporting.set(true);
    this.errorMessage.set('');
    this.progressMessage.set('Applying Rotation...');

    const startTime = performance.now();

    try {
      const { pdfLib } = await this.loadLibraries();

      this.progressMessage.set('Building PDF...');
      const pdfDoc = await pdfLib.PDFDocument.load(this.uploadedFileBytes);
      const docPages = pdfDoc.getPages();

      let rotatedCount = 0;
      const currentPages = this.pages();

      for (let i = 0; i < currentPages.length; i++) {
        const pageState = currentPages[i];
        if (pageState.addedRotation !== 0) {
          const page = docPages[i];
          const currentRotation = page.getRotation().angle;
          
          // Add newly added rotations
          const finalRotation = (currentRotation + pageState.addedRotation) % 360;
          page.setRotation(pdfLib.degrees(finalRotation));
          rotatedCount++;
        }
      }

      this.progressMessage.set('Saving PDF...');
      const pdfBytes = await pdfDoc.save();
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      // Create download anchor trigger
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const originalName = this.metadata()?.fileName || 'document.pdf';
      const cleanName = originalName.toLowerCase().endsWith('.pdf')
        ? originalName.slice(0, -4)
        : originalName;
      a.download = `${cleanName}_rotated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const rotationSummary = rotatedCount === 0
        ? 'No orientation changes applied'
        : `Rotated ${rotatedCount} pages successfully`;

      this.exportResultSummary.set({
        originalSize: this.metadata()?.fileSize || 0,
        outputSize: pdfBytes.length,
        pagesRotated: rotatedCount,
        rotationApplied: rotationSummary,
        processingTime: durationMs
      });

      this.isExporting.set(false);

    } catch (err: unknown) {
      console.error('Failed to export PDF:', err);
      this.isExporting.set(false);
      this.errorMessage.set('Failed to save and export PDF. The file structure might have compatibility issues.');
    }
  }

  // Reset to initial file drop state
  resetState() {
    this.metadata.set(null);
    this.pages.set([]);
    this.selectedIndices.set(new Set<number>());
    this.focusedIndex.set(null);
    this.lastSelectedIndex.set(null);
    this.history.set([]);
    this.historyIndex.set(-1);
    this.previewPageIndex.set(null);
    this.exportResultSummary.set(null);
    this.errorMessage.set('');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.pdfjsDoc = null;
    this.uploadedFileBytes = null;
  }

  resetToUpload() {
    this.resetState();
  }

  // Standard bytes formatter
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
