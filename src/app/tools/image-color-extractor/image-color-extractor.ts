import { ChangeDetectionStrategy, Component, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-color-extractor',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Upload & interactive Canvas side -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">IMAGE REPOSITORY SOURCE</span>

          <!-- File upload drag drop tracker frame -->
          <div 
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave()"
            (drop)="onFileDrop($event)"
            [class.border-emerald-500]="isDragging()"
            [class.bg-emerald-500/5]="isDragging()"
            class="border-2 border-dashed border-zinc-300 dark:border-zinc-850 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative"
          >
            <input type="file" accept="image/*" (change)="onFileSelected($event)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
            <mat-icon class="scale-130 text-zinc-400 dark:text-zinc-600 mb-2">cloud_upload</mat-icon>
            <p class="text-xs font-mono font-bold text-zinc-650 dark:text-zinc-350">DRAG AND DROP PICTURE OR CLICK TO BROWSE</p>
            <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 uppercase font-mono">ALL EXTRATIONS OCCUR 100% SECURE & LOCAL</p>
          </div>

          <!-- Hidden canvas for pixel extraction calculations -->
          <canvas #hiddenCanvas class="hidden"></canvas>

          <!-- Current Image preview frame container -->
          @if (currentImageUrl()) {
            <div class="pt-2">
              <span class="text-[10px] font-mono font-bold text-zinc-400 block mb-1">UPLOADED PREVIEW TARGET</span>
              <div class="rounded-xl overflow-hidden max-h-[180px] border border-zinc-200 dark:border-zinc-800 flex justify-center bg-zinc-950 shrink-0">
                <img [src]="currentImageUrl()" class="object-contain w-full h-full" referrerpolicy="no-referrer" />
              </div>
            </div>
          }
        </div>

        <!-- Extract Output Palette side -->
        <div class="space-y-6">
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
            <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">DOMINANT COLOURS DETECTED</span>

            <!-- Extracted palette indicators list -->
            <div class="grid grid-cols-2 gap-3 shrink-0">
              @for (color of extractedPalette(); track color) {
                <div class="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-850">
                  <div class="w-8 h-8 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 shrink-0" [style.background-color]="color"></div>
                  <div class="flex-1 min-w-0 font-mono text-left">
                    <p class="text-[9px] font-bold text-zinc-400">DETECTED</p>
                    <p class="text-xs font-extrabold uppercase text-zinc-800 dark:text-zinc-150 truncate select-all">{{ color }}</p>
                  </div>
                  <button (click)="copyValue(color)" class="p-1 text-emerald-500 hover:scale-105 active:scale-95 transition cursor-pointer pr-1">
                    <mat-icon style="font-size:16px;">content_copy</mat-icon>
                  </button>
                </div>
              }
            </div>

            @if (extractedPalette().length === 0) {
              <div class="text-center py-6 font-mono text-zinc-400 text-xs italic">
                Upload or drop an image above to extract dominant base shades!
              </div>
            }
          </div>
        </div>

      </div>

      <!-- SUCCESS copy indicators status -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED VALUE SUCCESSFULLY!
        </div>
      }
    </div>
  `
})
export class ImageColorExtractorComponent {
  @ViewChild('hiddenCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  public isDragging = signal<boolean>(false);
  public currentImageUrl = signal<string>('');
  public extractedPalette = signal<string[]>([]);
  public copySuccess = signal<boolean>(false);

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  public onDragLeave(): void {
    this.isDragging.set(false);
  }

  public onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }

  private processImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.currentImageUrl.set(dataUrl);
      this.extractPixels(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  private extractPixels(srcUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Shrink to fit standard grid extraction performance
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);

      const imgData = ctx.getImageData(0, 0, 100, 100).data;
      const step = 4 * 10; // sample pixels interval

      // Map color frequencies
      const colorCounts: { [color: string]: number } = {};
      for (let i = 0; i < imgData.length; i += step) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const alpha = imgData[i + 3];

        if (alpha > 128) { // omit transparent base pixels
          const hex = this.rgbToHexStr(r, g, b);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
      }

      // Sort and list dominant colors
      const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(entry => entry[0]);

      this.extractedPalette.set(sortedColors);
    };
    img.src = srcUrl;
  }

  private rgbToHexStr(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}
