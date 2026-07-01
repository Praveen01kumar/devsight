import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PdfEngine {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pdfjsLib: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pdfLib: any = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.isBrowser) return;
    if (this.pdfjsLib && this.pdfLib) return;
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Import dynamically
        this.pdfjsLib = await import('pdfjs-dist');
        // Set worker source using exact matching unpkg url
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        this.pdfLib = await import('pdf-lib');
      } catch (err) {
        console.error('Failed to dynamically load PDF libraries:', err);
        throw new Error('Could not initialize the client-side PDF engine.');
      }
    })();

    return this.initPromise;
  }

  async getPageCountAndThumbnail(file: File): Promise<{ pageCount: number; thumbnailUrl: string }> {
    await this.init();
    if (!this.pdfjsLib) {
      throw new Error('PDF Engine is not loaded or not supported in this environment.');
    }

    const arrayBuffer = await file.arrayBuffer();
    // Load document using pdfjs
    const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    // Load first page for thumbnail
    const page = await pdf.getPage(1);
    // We want a thumbnail size around 160px width for elegant display
    const desiredWidth = 160;
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = desiredWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    if (!context) {
      throw new Error('Failed to create canvas 2D context');
    }

    // Render page into canvas
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport
    };

    await page.render(renderContext).promise;
    // Get high-quality JPEG base64 URL
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
    // Clean up canvas memory
    canvas.width = 0;
    canvas.height = 0;
    return {
      pageCount,
      thumbnailUrl
    };
  }

  async mergeFiles(files: File[], onProgress: (progress: number) => void): Promise<Uint8Array> {
    await this.init();
    if (!this.pdfLib) {
      throw new Error('PDF Engine is not loaded or not supported in this environment.');
    }

    const { PDFDocument } = this.pdfLib;
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.forEach((page: any) => mergedPdf.addPage(page));
        onProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (err) {
        console.error(`Error merging file ${file.name}:`, err);
        throw new Error(`Failed to process and merge "${file.name}". The file might be corrupted or password-protected.`);
      }
    }

    const mergedBytes = await mergedPdf.save();
    return mergedBytes;
  }
}
