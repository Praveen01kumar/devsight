import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, ElementRef, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
declare const pdfjsLib: any;
@Component({
  selector: 'app-pdf-viewer',
  imports: [CommonModule, MatIconModule],
  templateUrl: './pdf-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewer {
  // Elements Ref mapping
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  private readonly scrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  // Signals for state
  readonly fileName = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(0);
  readonly zoom = signal<number>(1.25);
  readonly rotation = signal<number>(0); // 0, 90, 180, 270
  readonly sidebarOpen = signal<boolean>(false);
  readonly sidebarTab = signal<'thumbnails' | 'properties'>('thumbnails');
  readonly isDragging = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly searchActive = signal<boolean>(false);
  readonly searchResultsCount = signal<number>(0);
  readonly currentMatchIndex = signal<number>(0);
  readonly thumbnailUrls = signal<string[]>([]);
  readonly searchResults = signal<any[]>([]);
  readonly searchQuery = signal<string>('');
  readonly highlights = signal<any[]>([]);
  readonly textItems = signal<any[]>([]);
  readonly isDocumentLoaded = signal<boolean>(false);
  readonly pdfDoc = signal<any>(null);

  // Document Metadata Signals
  readonly docTitle = signal<string>('');
  readonly docAuthor = signal<string>('');
  readonly docPagesCount = signal<string>('');
  readonly docFileSize = signal<string>('');

  // Local non-reactive properties
  private currentRenderTask: any = null;
  private currentRawBuffer: ArrayBuffer | null = null;

  constructor() {
    // Re-render effect when critical states update
    effect(() => {
      const page = this.currentPage();
      const zoomVal = this.zoom();
      const rot = this.rotation();
      const doc = this.pdfDoc(); // Track PDF document changes!
      const canvasVal = this.canvasRef(); // Track canvas viewChild resolver!
      this.renderCurrentPage();
    });
  }

  // Common loader from ArrayBuffer
  private loadPdfBuffer(buffer: ArrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      console.error('PDF.js library is not available in window scope.');
      this.isLoading.set(false);
      return;
    }

    pdfjsLib.getDocument({ data: buffer }).promise.then((pdf: any) => {
      this.pdfDoc.set(pdf);
      this.totalPages.set(pdf.numPages);
      this.docPagesCount.set(`${pdf.numPages} pages`);
      this.currentPage.set(1);
      this.isDocumentLoaded.set(true);
      this.isLoading.set(false);
      this.generateThumbnails();
    }).catch((err: any) => {
      
      console.error('Error loading PDF buffer:', err);
      this.isDocumentLoaded.set(false);
      this.isLoading.set(false);
    });
  }

  // Handle local file upload
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
      input.value = ''; // Reset input value so it triggers change again if the same file is selected!
    }
  }

  private processFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }

    this.isLoading.set(true);
    this.fileName.set(file.name);
    this.docTitle.set(file.name.replace('.pdf', ''));
    this.docAuthor.set('Local Upload');
    this.docFileSize.set(this.formatBytes(file.size));

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      this.currentRawBuffer = buffer;
      this.loadPdfBuffer(buffer);
    };
    reader.readAsArrayBuffer(file);
  }

  // Main canvas page renderer
  private renderCurrentPage() {
    const doc = this.pdfDoc();
    if (!doc) {
      this.textItems.set([]);
      return;
    }

    doc.getPage(this.currentPage()).then((page: any) => {
      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      // If a rendering task is in progress, cancel it
      if (this.currentRenderTask) {
        this.currentRenderTask.cancel();
      }

      const viewport = page.getViewport({
        scale: this.zoom(),
        rotation: this.rotation()
      });

      // Maintain high device-pixel ratio crispness
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(dpr, dpr);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      this.currentRenderTask = page.render(renderContext);
      this.currentRenderTask.promise.then(() => {
        this.currentRenderTask = null;
        this.updateHighlightsForPage(page, viewport);
        this.updateTextLayerForPage(page, viewport);
      }).catch((err: any) => {
        // Render cancellation is expected during rapid switching
        if (err.name !== 'RenderingCancelledException') {
          console.error('Render page error:', err);
        }
      });
    });
  }

  // Update selectable transparent text layer for current page
  private updateTextLayerForPage(page: any, viewport: any) {
    page.getTextContent().then((content: any) => {
      if (!content || !content.items) {
        this.textItems.set([]);
        return;
      }

      const items = content.items.map((item: any) => {
        const transform = item.transform;
        const x = transform[4];
        const y = transform[5];
        const width = item.width || 100;
        const height = item.height || Math.abs(transform[3]) || 12;

        const pt1 = viewport.convertToViewportPoint(x, y);
        const pt2 = viewport.convertToViewportPoint(x + width, y + height);

        const left = Math.min(pt1[0], pt2[0]);
        const top = Math.min(pt1[1], pt2[1]);
        const widthVal = Math.abs(pt2[0] - pt1[0]);
        const heightVal = Math.abs(pt2[1] - pt1[1]);

        // Approximate visual font size using viewport scale
        const fontSize = Math.abs(transform[0]) * viewport.scale;

        return {
          text: item.str || '',
          left: left,
          top: top,
          width: widthVal,
          height: heightVal,
          fontSize: fontSize
        };
      });
      this.textItems.set(items);
    }).catch((err: any) => {
      console.error('Error loading text layer:', err);
      this.textItems.set([]);
    });
  }

  // Thumbnail generator
  private generateThumbnails() {
    const doc = this.pdfDoc();
    if (!doc) return;
    this.thumbnailUrls.set([]); // Clear old thumbnails!
    const urls: string[] = [];
    const total = this.totalPages();

    const renderNextThumbnail = (pageNum: number) => {
      if (pageNum > total) {
        this.thumbnailUrls.set(urls);
        return;
      }

      doc.getPage(pageNum).then((page: any) => {
        const offscreenCanvas = document.createElement('canvas');
        const context = offscreenCanvas.getContext('2d');
        if (!context) {
          renderNextThumbnail(pageNum + 1);
          return;
        }

        const viewport = page.getViewport({ scale: 0.15 });
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        page.render(renderContext).promise.then(() => {
          urls.push(offscreenCanvas.toDataURL());
          renderNextThumbnail(pageNum + 1);
        }).catch(() => {
          // If page render fails, push empty string placeholder
          urls.push('');
          renderNextThumbnail(pageNum + 1);
        });
      });
    };

    renderNextThumbnail(1);
  }

  // Navigation handlers
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  goToPage(pageNum: number) {
    const page = Math.max(1, Math.min(pageNum, this.totalPages()));
    this.currentPage.set(page);
  }

  // Zoom controls
  zoomOut() {
    this.zoom.update(z => Math.max(0.5, z - 0.15));
  }

  zoomIn() {
    this.zoom.update(z => Math.min(3.0, z + 0.15));
  }

  zoomToFit() {
    const doc = this.pdfDoc();
    if (!doc) return;
    doc.getPage(this.currentPage()).then((page: any) => {
      const container = this.scrollContainerRef()?.nativeElement;
      if (!container) return;

      const viewport = page.getViewport({ scale: 1, rotation: this.rotation() });
      const padding = 48; // Sidebar/Margins padding
      const scaleX = (container.clientWidth - padding) / viewport.width;
      const scaleY = (container.clientHeight - padding) / viewport.height;
      const optimalScale = Math.min(scaleX, scaleY);

      this.zoom.set(Math.max(0.5, Math.min(optimalScale, 2.0)));
    });
  }

  zoomToActual() {
    this.zoom.set(1.0);
  }

  // Rotate document clockwise
  rotateClockwise() {
    this.rotation.update(r => (r + 90) % 360);
  }

  // Drag and Drop handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  // Trigger download of active document buffer
  downloadFile() {
    if (!this.currentRawBuffer) return;
    const blob = new Blob([this.currentRawBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.fileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  // Trigger high-fidelity print using hidden canvas rendering to avoid iframe blockages
  printFile() {
    const doc = this.pdfDoc();
    if (!doc) return;
    this.isLoading.set(true);

    // Create a temporary container for printing
    const printContainer = document.createElement('div');
    printContainer.id = 'print-section';
    printContainer.className = 'absolute top-0 left-0 w-full bg-white z-50';
    document.body.appendChild(printContainer);

    const total = this.totalPages();
    const renderPromises: Promise<void>[] = [];

    for (let i = 1; i <= total; i++) {
      const pageNum = i;
      const promise = doc.getPage(pageNum).then((page: any) => {
        const viewport = page.getViewport({ scale: 1.5 }); // High-fidelity printing scale
        const canvas = document.createElement('canvas');
        canvas.className = 'my-4 mx-auto block max-w-full';
        canvas.style.pageBreakAfter = 'always';
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          printContainer.appendChild(canvas);
          return page.render(renderContext).promise;
        }
        return Promise.resolve();
      });
      renderPromises.push(promise);
    }

    Promise.all(renderPromises).then(() => {
      this.isLoading.set(false);
      window.focus();
      window.print();
      // Cleanup after printing
      setTimeout(() => {
        printContainer.remove();
      }, 500);
    }).catch(err => {
      console.error('Error preparing print:', err);
      this.isLoading.set(false);
      if (printContainer.parentNode) {
        printContainer.remove();
      }
    });
  }

  // Handle Search queries and perform real text extraction and highlighting
  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value.trim();
    this.searchQuery.set(query);
    this.searchAllPages(query);
  }

  private searchAllPages(query: string) {
    const doc = this.pdfDoc();
    if (!doc || !query) {
      this.searchActive.set(false);
      this.searchResults.set([]);
      this.searchResultsCount.set(0);
      this.currentMatchIndex.set(0);
      this.highlights.set([]);
      return;
    }

    this.searchActive.set(true);
    const total = this.totalPages();
    const promises: Promise<any>[] = [];

    for (let i = 1; i <= total; i++) {
      const pageNum = i;
      promises.push(
        doc.getPage(pageNum).then((page: any) => {
          return page.getTextContent().then((content: any) => {
            return { pageNum, items: content.items, page };
          });
        })
      );
    }

    const lowerQuery = query.toLowerCase();

    Promise.all(promises).then((pagesData) => {
      const allMatches: any[] = [];
      pagesData.forEach(({ pageNum, items }) => {
        items.forEach((item: any, itemIndex: number) => {
          const str = item.str || '';
          const lowerStr = str.toLowerCase();
          let index = -1;
          while ((index = lowerStr.indexOf(lowerQuery, index + 1)) !== -1) {
            allMatches.push({
              pageNum,
              item,
              itemIndex,
              matchStr: str.substring(index, index + query.length),
              charIndex: index,
              charLength: query.length
            });
          }
        });
      });

      this.searchResults.set(allMatches);
      this.searchResultsCount.set(allMatches.length);
      this.currentMatchIndex.set(allMatches.length > 0 ? 1 : 0);

      if (allMatches.length > 0) {
        this.goToMatch(0);
      } else {
        this.highlights.set([]);
      }
    }).catch(err => {
      console.error('Error searching pages:', err);
    });
  }

  private goToMatch(index: number) {
    const matches = this.searchResults();
    if (index >= 0 && index < matches.length) {
      const match = matches[index];
      if (this.currentPage() !== match.pageNum) {
        this.currentPage.set(match.pageNum);
      } else {
        const doc = this.pdfDoc();
        if (doc) {
          doc.getPage(this.currentPage()).then((page: any) => {
            const viewport = page.getViewport({
              scale: this.zoom(),
              rotation: this.rotation()
            });
            this.updateHighlightsForPage(page, viewport);
            this.scrollToActiveHighlight();
          });
        }
      }
    }
  }

  nextMatch() {
    const total = this.searchResultsCount();
    if (total > 0) {
      this.currentMatchIndex.update(i => (i % total) + 1);
      this.goToMatch(this.currentMatchIndex() - 1);
    }
  }

  prevMatch() {
    const total = this.searchResultsCount();
    if (total > 0) {
      this.currentMatchIndex.update(i => (i === 1 ? total : i - 1));
      this.goToMatch(this.currentMatchIndex() - 1);
    }
  }

  private updateHighlightsForPage(page: any, viewport: any) {
    const query = this.searchQuery();
    if (!query) {
      this.highlights.set([]);
      return;
    }

    const matches = this.searchResults();
    const currentPageNum = this.currentPage();
    const pageMatches = matches.filter(m => m.pageNum === currentPageNum);

    if (pageMatches.length === 0) {
      this.highlights.set([]);
      return;
    }

    const list = pageMatches.map((match) => {
      const coords = this.getHighlightCoords(page, viewport, match);
      const globalIndex = matches.indexOf(match);
      const isActive = globalIndex === (this.currentMatchIndex() - 1);
      return {
        ...coords,
        isActive,
        id: `hl-${globalIndex}`
      };
    });

    this.highlights.set(list);
    this.scrollToActiveHighlight();
  }

  private getHighlightCoords(page: any, viewport: any, match: any): any {
    const item = match.item;
    const transform = item.transform;
    const x = transform[4];
    const y = transform[5];
    const width = item.width || 100;
    const height = item.height || Math.abs(transform[3]) || 12;

    const pt1 = viewport.convertToViewportPoint(x, y);
    const pt2 = viewport.convertToViewportPoint(x + width, y + height);

    const totalChars = item.str.length;
    let matchX = pt1[0];
    let matchWidth = pt2[0] - pt1[0];

    if (totalChars > 0 && match.charIndex !== undefined && match.charLength !== undefined) {
      const charWidth = matchWidth / totalChars;
      matchX = pt1[0] + (match.charIndex * charWidth);
      matchWidth = match.charLength * charWidth;
    }

    const left = Math.min(pt1[0], pt2[0]);
    const top = Math.min(pt1[1], pt2[1]);
    const widthVal = Math.abs(pt2[0] - pt1[0]);
    const heightVal = Math.abs(pt2[1] - pt1[1]);

    return {
      left: match.charIndex !== undefined ? matchX : left,
      top: top,
      width: match.charIndex !== undefined ? matchWidth : widthVal,
      height: heightVal
    };
  }

  private scrollToActiveHighlight() {
    setTimeout(() => {
      const activeEl = document.querySelector('.search-highlight-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Utility to format file bytes
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
