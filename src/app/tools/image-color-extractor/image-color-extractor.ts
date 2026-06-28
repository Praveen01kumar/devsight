import { ChangeDetectionStrategy, Component, signal, ElementRef, ViewChild, computed } from '@angular/core';
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
                <img [src]="currentImageUrl()" class="object-contain w-full h-full" referrerpolicy="no-referrer" alt="Current Image" />
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


@Component({
  selector: 'app-css-filter-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Controls Column Panel -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">CSS FILTER CONTROLLERS</span>

          <!-- Brightness -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>BRIGHTNESS</span><span>{{ brightness() }}%</span></div>
            <input type="range" min="0" max="200" [value]="brightness()" (input)="brightness.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Contrast -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>CONTRAST</span><span>{{ contrast() }}%</span></div>
            <input type="range" min="0" max="200" [value]="contrast()" (input)="contrast.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Saturation -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>SATURATE</span><span>{{ saturate() }}%</span></div>
            <input type="range" min="0" max="250" [value]="saturate()" (input)="saturate.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Blur -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>BLUR</span><span>{{ blur() }}px</span></div>
            <input type="range" min="0" max="20" [value]="blur()" (input)="blur.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Hue Rotate -->
          <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-400 font-bold"><span>HUE ROTATE</span><span>{{ hueRotate() }}&deg;</span></div>
            <input type="range" min="0" max="360" [value]="hueRotate()" (input)="hueRotate.set(getSliderVal($event))" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
          </div>

          <!-- Sepia / Grayscale / Inversion togglers in grid -->
          <div class="grid grid-cols-3 gap-2.5 pt-2 border-t dark:border-zinc-800">
            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="grayscale() > 0" (change)="toggleGrayscale()" class="accent-emerald-500 mb-1 cursor-pointer" />
              GRAYSCALE
            </label>

            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="sepia() > 0" (change)="toggleSepia()" class="accent-emerald-500 mb-1 cursor-pointer" />
              SEPIA
            </label>

            <label class="flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer select-none font-mono text-[9px] font-bold">
              <input type="checkbox" [checked]="invert() > 0" (change)="toggleInvert()" class="accent-emerald-500 mb-1 cursor-pointer" />
              INVERT
            </label>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="space-y-6">
          
          <!-- Live Preview Canvas -->
          <div 
            class="h-64 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-950 relative overflow-hidden shrink-0 select-none bg-cover bg-center"
            style="background-image: url('https://picsum.photos/seed/nature3/600/400');"
            [style.filter]="compiledFilterString()"
          >
            <span class="absolute top-3 right-3 px-2 py-0.5 bg-black/60 rounded text-[9px] text-white font-mono tracking-widest font-bold">
              IMAGE SURFACE OVERLAY
            </span>
          </div>

          <!-- Code Export Box -->
          <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
            <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <span class="text-[10px] text-zinc-500 font-bold uppercase">EXPORT CODES</span>
              <button (click)="copyValue(compiledFilterString())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY FILTER
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">CSS CODE CLASSIFICATION</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto whitespace-normal">filter: {{ compiledFilterString() }};</p>
              </div>

              <div>
                <span class="text-[9px] text-zinc-400 font-bold uppercase">TAILWIND DYNAMIC FILTER</span>
                <p class="bg-zinc-900 leading-relaxed text-[11px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all break-all overflow-x-auto whitespace-normal">backdrop-filter:[{{ compiledFilterString() }}]</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- SUCCESS Alert indicator popup -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED EXP DESIGN FILTER CODE!
        </div>
      }
    </div>
  `
})
export class CssFilterGeneratorComponent {
  public brightness = signal<number>(100);
  public contrast = signal<number>(100);
  public saturate = signal<number>(100);
  public blur = signal<number>(0);
  public hueRotate = signal<number>(0);
  public grayscale = signal<number>(0);
  public sepia = signal<number>(0);
  public invert = signal<number>(0);
  public copySuccess = signal<boolean>(false);

  public compiledFilterString = computed(() => {
    const parts = [
      this.brightness() !== 100 ? `brightness(${this.brightness()}%)` : '',
      this.contrast() !== 100 ? `contrast(${this.contrast()}%)` : '',
      this.saturate() !== 100 ? `saturate(${this.saturate()}%)` : '',
      this.blur() > 0 ? `blur(${this.blur()}px)` : '',
      this.hueRotate() > 0 ? `hue-rotate(${this.hueRotate()}deg)` : '',
      this.grayscale() > 0 ? `grayscale(${this.grayscale()}%)` : '',
      this.sepia() > 0 ? `sepia(${this.sepia()}%)` : '',
      this.invert() > 0 ? `invert(${this.invert()}%)` : ''
    ].filter(x => x !== '');

    return parts.length > 0 ? parts.join(' ') : 'none';
  });

  public getSliderVal(event: Event): number {
    const input = event.target as HTMLInputElement;
    return Number.parseInt(input.value, 10);
  }

  public toggleGrayscale(): void {
    this.grayscale.set(this.grayscale() === 0 ? 100 : 0);
  }

  public toggleSepia(): void {
    this.sepia.set(this.sepia() === 0 ? 100 : 0);
  }

  public toggleInvert(): void {
    this.invert.set(this.invert() === 0 ? 100 : 0);
  }

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }
}
