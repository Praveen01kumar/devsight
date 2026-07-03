import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, PLATFORM_ID, ViewChild, computed, signal, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';


interface PdfMetadata {
    name: string;
    size: number;
    totalPages: number;
    dimensions: { width: number; height: number; unit: string; label: string }[];
    portraitCount: number;
    landscapeCount: number;
}

interface PageItem {
    pageIndex: number;
    pageNumber: number;
    width: number;
    height: number;
    isLandscape: boolean;
    aspectRatio: number;
    dataUrl?: string;
}

interface ExtractorState {
    selectedIndexes: number[];
    customOrder: number[];
}

interface ResultStats {
    originalPages: number;
    extractedPages: number;
    originalSize: number;
    outputSize: number;
    processingTime: number;
}

interface PdfJsPage {
    getViewport(options: { scale: number }): { width: number; height: number };
    render(options: { canvasContext: CanvasRenderingContext2D | null; viewport: unknown }): { promise: Promise<void> };
}

interface PdfJsDoc {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfJsPage>;
}

interface PdfJsLibInterface {
    GlobalWorkerOptions: {
        workerSrc: string;
    };
    version: string;
    getDocument(options: { data: Uint8Array }): { promise: PdfJsDoc };
}

class HistoryTracker {
    private undoStack: ExtractorState[] = [];
    private redoStack: ExtractorState[] = [];

    constructor(private readonly onStateRestore: (state: ExtractorState) => void) { }

    pushState(state: ExtractorState) {
        const top = this.undoStack[this.undoStack.length - 1];
        if (top && this.areStatesEqual(top, state)) {
            return;
        }
        this.undoStack.push(this.cloneState(state));
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        const current = this.undoStack.pop()!;
        this.redoStack.push(current);
        const prev = this.undoStack[this.undoStack.length - 1];
        this.onStateRestore(this.cloneState(prev));
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const next = this.redoStack.pop()!;
        this.undoStack.push(next);
        this.onStateRestore(this.cloneState(next));
    }

    canUndo(): boolean {
        return this.undoStack.length > 1;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(initialState: ExtractorState) {
        this.undoStack = [this.cloneState(initialState)];
        this.redoStack = [];
    }

    private cloneState(state: ExtractorState): ExtractorState {
        return {
            selectedIndexes: [...state.selectedIndexes],
            customOrder: [...state.customOrder]
        };
    }

    private areStatesEqual(a: ExtractorState, b: ExtractorState): boolean {
        if (a.selectedIndexes.length !== b.selectedIndexes.length) return false;
        if (a.customOrder.length !== b.customOrder.length) return false;
        for (let i = 0; i < a.selectedIndexes.length; i++) {
            if (a.selectedIndexes[i] !== b.selectedIndexes[i]) return false;
        }
        for (let i = 0; i < a.customOrder.length; i++) {
            if (a.customOrder[i] !== b.customOrder[i]) return false;
        }
        return true;
    }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pdf-extractor',
    imports: [MatIconModule],
    templateUrl: './pdf-extractor.html'
})
export class PdfExtractor implements OnInit {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    private readonly platformId = inject(PLATFORM_ID);

    pdfFile = signal<File | null>(null);
    pdfMetadata = signal<PdfMetadata | null>(null);
    isAnalyzing = signal<boolean>(false);
    isGeneratingThumbs = signal<boolean>(false);
    isProcessing = signal<boolean>(false);
    processingProgress = signal<number>(0);
    processingStateText = signal<string>('');

    pages = signal<PageItem[]>([]);
    selectedIndexes = signal<number[]>([]);
    selectionOrder = signal<number[]>([]);
    customOrder = signal<number[]>([]);
    sortMode = signal<'original' | 'selection' | 'custom'>('original');

    pageRangeInput = signal<string>('');
    pageRangeInvalid = signal<boolean>(false);
    activeThumbIndex = signal<number>(0);

    showResultSummary = signal<boolean>(false);
    resultSummary = signal<ResultStats | null>(null);

    exportMode = signal<'single' | 'individual'>('single');
    customFilename = signal<string>('');
    currentDownloadUrl = signal<string | null>(null);
    currentDownloadFilename = signal<string>('');
    errorMessage = signal<string | null>(null);

    draggedIndex: number | null = null;
    dragOverIndex: number | null = null;
    isDragOverUpload = signal<boolean>(false);
    toast = signal<{ message: string; submessage?: string; type: 'success' | 'error' } | null>(null);

    private pdfjsDoc: unknown = null;
    private observer: IntersectionObserver | null = null;

    private readonly history = new HistoryTracker((state) => {
        this.selectedIndexes.set(state.selectedIndexes);
        this.customOrder.set(state.customOrder);
        this.selectionOrder.set([...state.selectedIndexes]);
        const pageNumbers = state.selectedIndexes.map(idx => idx + 1);
        this.pageRangeInput.set(this.formatPageRange(pageNumbers));
        this.pageRangeInvalid.set(false);
        this.updateHistoryStatus();
    });

    private originalPdfBytes: Uint8Array | null = null;

    estimatedOutputSize = computed(() => {
        const meta = this.pdfMetadata();
        const selected = this.selectedIndexes();
        if (!meta || selected.length === 0) return 0;
        return (selected.length / meta.totalPages) * meta.size;
    });

    canUndo = signal<boolean>(false);
    canRedo = signal<boolean>(false);

    ngOnInit() {
        this.updateHistoryStatus();
    }

    showToast(message: string, submessage?: string, type: 'success' | 'error' = 'success') {
        this.toast.set({ message, submessage, type });
        setTimeout(() => {
            const current = this.toast();
            if (current && current.message === message) {
                this.toast.set(null);
            }
        }, 6000);
    }

    updateHistoryStatus() {
        this.canUndo.set(this.history.canUndo());
        this.canRedo.set(this.history.canRedo());
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (isInput && event.key !== 'Escape') {
            if (event.ctrlKey || event.metaKey) {
                if (event.key.toLowerCase() === 'z') {
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                } else if (event.key.toLowerCase() === 'y') {
                    event.preventDefault();
                    this.redo();
                }
            }
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === 'a') {
                event.preventDefault();
                this.selectAll();
            } else if (event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (event.key.toLowerCase() === 'y') {
                event.preventDefault();
                this.redo();
            }
        } else {
            switch (event.key) {
                case 'Delete':
                case 'Backspace':
                    event.preventDefault();
                    this.clearSelection();
                    break;
                case ' ':
                    event.preventDefault();
                    this.toggleActiveSelection();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateThumb(1);
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigateThumb(-1);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateThumb(4);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateThumb(-4);
                    break;
            }
        }
    }

    triggerUpload() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            this.loadPdf(target.files[0]);
        }
    }

    onDragOverUpload(event: DragEvent) {
        event.preventDefault();
        this.isDragOverUpload.set(true);
    }

    onDragLeaveUpload(event: DragEvent) {
        event.preventDefault();
        this.isDragOverUpload.set(false);
    }

    onDropUpload(event: DragEvent) {
        event.preventDefault();
        this.isDragOverUpload.set(false);
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.loadPdf(event.dataTransfer.files[0]);
        }
    }

    async loadPdf(file: File) {
        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            this.errorMessage.set('Please select a valid PDF document.');
            return;
        }

        this.errorMessage.set(null);
        this.isAnalyzing.set(true);
        this.pdfFile.set(file);
        this.customFilename.set(file.name.replace('.pdf', '-extracted.pdf'));

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.originalPdfBytes = new Uint8Array(arrayBuffer);

            let srcDoc: PDFDocument;
            try {
                srcDoc = await PDFDocument.load(this.originalPdfBytes);
            } catch (e: unknown) {
                const err = e as Error;
                if (err.message?.includes('encrypted') || err.message?.includes('password')) {
                    throw new Error('This PDF is password-protected or encrypted. Please remove password protection and try again.');
                }
                throw new Error('Failed to load PDF. The file might be corrupted.');
            }

            const totalPages = srcDoc.getPageCount();
            const pageItems: PageItem[] = [];
            let portraitCount = 0;
            let landscapeCount = 0;
            const dimensions: { width: number; height: number; unit: string; label: string }[] = [];

            for (let i = 0; i < totalPages; i++) {
                const page = srcDoc.getPage(i);
                const { width, height } = page.getSize();
                const isLandscape = width > height;
                if (isLandscape) {
                    landscapeCount++;
                } else {
                    portraitCount++;
                }

                const label = this.getPageSizeLabel(width, height);
                const dimLabel = `${label} (${isLandscape ? 'Landscape' : 'Portrait'})`;

                pageItems.push({
                    pageIndex: i,
                    pageNumber: i + 1,
                    width,
                    height,
                    isLandscape,
                    aspectRatio: width / height
                });

                if (!dimensions.some(d => d.label === dimLabel)) {
                    dimensions.push({
                        width: Math.round((width / 72) * 10) / 10,
                        height: Math.round((height / 72) * 10) / 10,
                        unit: 'in',
                        label: dimLabel
                    });
                }
            }

            this.pdfMetadata.set({
                name: file.name,
                size: file.size,
                totalPages,
                dimensions,
                portraitCount,
                landscapeCount,
            });

            this.pages.set(pageItems);
            this.selectedIndexes.set([]);
            this.selectionOrder.set([]);
            this.customOrder.set([]);
            this.pageRangeInput.set('');
            this.pageRangeInvalid.set(false);
            this.activeThumbIndex.set(0);
            this.showResultSummary.set(false);

            // Clean up previous download URL
            const prevUrl = this.currentDownloadUrl();
            if (prevUrl) {
                URL.revokeObjectURL(prevUrl);
                this.currentDownloadUrl.set(null);
            }

            this.history.clear({ selectedIndexes: [], customOrder: [] });
            this.updateHistoryStatus();

            if (isPlatformBrowser(this.platformId)) {
                const pdfjsLib = (await import('pdfjs-dist')) as unknown as PdfJsLibInterface;
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
                this.pdfjsDoc = await pdfjsLib.getDocument({ data: this.originalPdfBytes.slice() }).promise;
                this.setupIntersectionObserver();
            }
        } catch (error: unknown) {
            const err = error as Error;
            this.errorMessage.set(err.message || 'An error occurred while loading the PDF document.');
            this.pdfFile.set(null);
            this.pdfMetadata.set(null);
        } finally {
            this.isAnalyzing.set(false);
        }
    }

    setupIntersectionObserver() {
        if (!isPlatformBrowser(this.platformId) || !this.pdfjsDoc) return;

        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNumAttr = entry.target.getAttribute('data-page-num');
                        if (pageNumAttr) {
                            const pageNum = parseInt(pageNumAttr, 10);
                            this.renderThumbnail(pageNum);
                            this.observer?.unobserve(entry.target);
                        }
                    }
                });
            },
            {
                root: null,
                rootMargin: '200px',
                threshold: 0.1
            }
        );

        setTimeout(() => {
            const elements = document.querySelectorAll('.page-thumbnail-observer');
            elements.forEach(el => this.observer?.observe(el));
        }, 100);
    }

    async renderThumbnail(pageNumber: number) {
        if (!this.pdfjsDoc) return;

        const pageIndex = pageNumber - 1;
        const pageItem = this.pages()[pageIndex];
        if (!pageItem || pageItem.dataUrl) return;

        try {
            const doc = this.pdfjsDoc as PdfJsDoc;
            const page = await doc.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = 180 / baseViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: context, viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                this.pages.update((current) => {
                    const updated = [...current];
                    if (updated[pageIndex]) {
                        updated[pageIndex] = {
                            ...updated[pageIndex],
                            dataUrl
                        };
                    }
                    return updated;
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    updateSelectionState(newSelectedIndexes: number[], source: 'manual' | 'input' | 'quick' | 'undo_redo') {
        this.selectedIndexes.set(newSelectedIndexes);

        let currentSelectionOrder = [...this.selectionOrder()];
        currentSelectionOrder = currentSelectionOrder.filter(idx => newSelectedIndexes.includes(idx));
        newSelectedIndexes.forEach(idx => {
            if (!currentSelectionOrder.includes(idx)) {
                currentSelectionOrder.push(idx);
            }
        });
        this.selectionOrder.set(currentSelectionOrder);

        let nextCustomOrder: number[] = [];
        const mode = this.sortMode();
        if (mode === 'original') {
            nextCustomOrder = [...newSelectedIndexes].sort((a, b) => a - b);
        } else if (mode === 'selection') {
            nextCustomOrder = [...currentSelectionOrder];
        } else {
            nextCustomOrder = this.customOrder().filter(idx => newSelectedIndexes.includes(idx));
            newSelectedIndexes.forEach(idx => {
                if (!nextCustomOrder.includes(idx)) {
                    nextCustomOrder.push(idx);
                }
            });
        }
        this.customOrder.set(nextCustomOrder);

        if (source !== 'input') {
            const pageNumbers = newSelectedIndexes.map(idx => idx + 1);
            this.pageRangeInput.set(this.formatPageRange(pageNumbers));
            this.pageRangeInvalid.set(false);
        }

        if (source !== 'undo_redo') {
            this.history.pushState({
                selectedIndexes: newSelectedIndexes,
                customOrder: nextCustomOrder,
            });
            this.updateHistoryStatus();
        }
    }

    onPageClick(index: number, event: MouseEvent) {
        this.activeThumbIndex.set(index);
        const current = this.selectedIndexes();

        if (event.shiftKey) {
            const lastActive = this.activeThumbIndex();
            const start = Math.min(lastActive, index);
            const end = Math.max(lastActive, index);
            const range: number[] = [];
            for (let i = start; i <= end; i++) {
                range.push(i);
            }
            const next = Array.from(new Set([...current, ...range]));
            this.updateSelectionState(next, 'manual');
        } else {
            const next = current.includes(index)
                ? current.filter(idx => idx !== index)
                : [...current, index];
            this.updateSelectionState(next, 'manual');
        }
    }

    onPageKeydown(index: number, event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.activeThumbIndex.set(index);
            const current = this.selectedIndexes();
            const next = current.includes(index)
                ? current.filter((idx) => idx !== index)
                : [...current, index];
            this.updateSelectionState(next, 'manual');
        }
    }

    onPageRangeChange(value: string) {
        this.pageRangeInput.set(value);
        const total = this.pages().length;
        if (total === 0) return;

        const result = this.parsePageRange(value, total);
        if (result.valid) {
            this.pageRangeInvalid.set(false);
            const indexes = result.pages.map(p => p - 1);
            this.updateSelectionState(indexes, 'input');
        } else {
            this.pageRangeInvalid.set(true);
        }
    }

    onFilenameInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.customFilename.set(target.value);
    }

    setSortMode(mode: 'original' | 'selection' | 'custom') {
        this.sortMode.set(mode);
        let nextCustomOrder: number[] = [];
        const idxes = this.selectedIndexes();

        if (mode === 'original') {
            nextCustomOrder = [...idxes].sort((a, b) => a - b);
        } else if (mode === 'selection') {
            nextCustomOrder = [...this.selectionOrder()];
        } else {
            nextCustomOrder = [...this.customOrder()];
        }

        this.customOrder.set(nextCustomOrder);
        this.history.pushState({
            selectedIndexes: idxes,
            customOrder: nextCustomOrder
        });
        this.updateHistoryStatus();
    }

    selectAll() {
        const all = this.pages().map(p => p.pageIndex);
        this.updateSelectionState(all, 'quick');
    }

    clearSelection() {
        this.updateSelectionState([], 'quick');
    }

    selectOdd() {
        const odd = this.pages()
            .filter(p => p.pageNumber % 2 !== 0)
            .map(p => p.pageIndex);
        this.updateSelectionState(odd, 'quick');
    }

    selectEven() {
        const even = this.pages()
            .filter(p => p.pageNumber % 2 === 0)
            .map(p => p.pageIndex);
        this.updateSelectionState(even, 'quick');
    }

    selectFirst() {
        if (this.pages().length > 0) {
            this.updateSelectionState([0], 'quick');
        }
    }

    selectLast() {
        const total = this.pages().length;
        if (total > 0) {
            this.updateSelectionState([total - 1], 'quick');
        }
    }

    selectLandscape() {
        const landscape = this.pages()
            .filter(p => p.isLandscape)
            .map(p => p.pageIndex);
        this.updateSelectionState(landscape, 'quick');
    }

    selectPortrait() {
        const portrait = this.pages()
            .filter(p => !p.isLandscape)
            .map(p => p.pageIndex);
        this.updateSelectionState(portrait, 'quick');
    }

    reverseSelection() {
        const current = this.selectedIndexes();
        const reversed = this.pages()
            .filter(p => !current.includes(p.pageIndex))
            .map(p => p.pageIndex);
        this.updateSelectionState(reversed, 'quick');
    }

    toggleActiveSelection() {
        const activeIdx = this.activeThumbIndex();
        const current = this.selectedIndexes();
        const next = current.includes(activeIdx)
            ? current.filter(idx => idx !== activeIdx)
            : [...current, activeIdx];
        this.updateSelectionState(next, 'manual');
    }

    navigateThumb(offset: number) {
        const total = this.pages().length;
        if (total === 0) return;
        const current = this.activeThumbIndex();
        let next = current + offset;
        if (next < 0) {
            next = 0;
        }
        if (next >= total) {
            next = total - 1;
        }
        this.activeThumbIndex.set(next);

        const activeEl = document.getElementById(`page-thumb-container-${next}`);
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    undo() {
        this.history.undo();
    }

    redo() {
        this.history.redo();
    }

    onDragStart(event: DragEvent, index: number) {
        this.draggedIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index.toString());
        }
    }

    onDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        this.dragOverIndex = index;
    }

    onDragLeave() {
        this.dragOverIndex = null;
    }

    onDrop(event: DragEvent, index: number) {
        event.preventDefault();
        this.dragOverIndex = null;
        const sourceStr = event.dataTransfer?.getData('text/plain');
        if (sourceStr !== undefined) {
            const sourceIndex = Number.parseInt(sourceStr, 10);
            if (sourceIndex !== index) {
                this.moveSelectedPage(sourceIndex, index);
            }
        }
        this.draggedIndex = null;
    }

    moveSelectedPage(sourceIndex: number, targetIndex: number) {
        const current = [...this.customOrder()];
        const [item] = current.splice(sourceIndex, 1);
        current.splice(targetIndex, 0, item);

        this.customOrder.set(current);
        this.sortMode.set('custom');

        this.history.pushState({
            selectedIndexes: this.selectedIndexes(),
            customOrder: current,
        });
        this.updateHistoryStatus();
    }

    removeSelectedPage(index: number) {
        const pageIndexToRemove = this.customOrder()[index];
        const next = this.selectedIndexes().filter(idx => idx !== pageIndexToRemove);
        this.updateSelectionState(next, 'manual');
    }

    async extractPages() {
        const targetOrder = this.customOrder();
        if (targetOrder.length === 0 || !this.originalPdfBytes) return;

        this.isProcessing.set(true);
        this.processingProgress.set(10);
        this.processingStateText.set('Loading source document...');

        const startTime = performance.now();

        try {
            const srcDoc = await PDFDocument.load(this.originalPdfBytes.slice());
            this.processingProgress.set(30);
            this.processingStateText.set('Extracting pages...');

            let finalBlob: Blob;
            let finalSize = 0;

            if (this.exportMode() === 'single') {
                const outDoc = await PDFDocument.create();
                const copiedPages = await outDoc.copyPages(srcDoc, targetOrder);
                copiedPages.forEach((page) => outDoc.addPage(page));

                this.processingProgress.set(70);
                this.processingStateText.set('Assembling PDF document...');

                const outBytes = await outDoc.save();
                finalBlob = new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
                finalSize = finalBlob.size;
            } else {
                const zip = new JSZip();
                const originalName = this.pdfMetadata()?.name || 'document';
                const baseName = originalName.replace(/\.[^/.]+$/, '');

                for (let i = 0; i < targetOrder.length; i++) {
                    const pageIndex = targetOrder[i];
                    const pageNum = pageIndex + 1;

                    this.processingProgress.set(Math.round(30 + (i / targetOrder.length) * 40));
                    this.processingStateText.set(`Processing page ${pageNum}...`);

                    const singleDoc = await PDFDocument.create();
                    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndex]);
                    singleDoc.addPage(copiedPage);

                    const pageBytes = await singleDoc.save();
                    zip.file(`${baseName}-page-${pageNum}.pdf`, pageBytes);
                }

                this.processingProgress.set(85);
                this.processingStateText.set('Creating ZIP archive...');

                finalBlob = await zip.generateAsync({ type: 'blob' });
                finalSize = finalBlob.size;
            }

            this.processingProgress.set(100);
            this.processingStateText.set('Extraction complete!');

            const processingTime = (performance.now() - startTime) / 1000;

            this.resultSummary.set({
                originalPages: this.pdfMetadata()?.totalPages || 0,
                extractedPages: targetOrder.length,
                originalSize: this.pdfMetadata()?.size || 0,
                outputSize: finalSize,
                processingTime
            });

            this.showResultSummary.set(false);

            const downloadUrl = URL.createObjectURL(finalBlob);
            const fileExt = this.exportMode() === 'single' ? '.pdf' : '.zip';
            const fallbackBaseName = (this.customFilename() || 'extracted-pages').trim().replace(/\.[^/.]+$/, '') || 'extracted-pages';
            const cleanName = fallbackBaseName + fileExt;

            // Revoke the old download URL if exists
            const prevUrl = this.currentDownloadUrl();
            if (prevUrl) {
                URL.revokeObjectURL(prevUrl);
            }

            this.currentDownloadUrl.set(downloadUrl);
            this.currentDownloadFilename.set(cleanName);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = cleanName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.showToast(
                'Extraction Successful!',
                `Saved as "${cleanName}" (${this.formatBytes(finalSize)})`,
                'success'
            );
        } catch (err: unknown) {
            const error = err as Error;
            this.errorMessage.set(error.message || 'An error occurred during extraction.');
        } finally {
            this.isProcessing.set(false);
        }
    }

    resetWorkspace() {
        this.pdfFile.set(null);
        this.pdfMetadata.set(null);
        this.pages.set([]);
        this.selectedIndexes.set([]);
        this.selectionOrder.set([]);
        this.customOrder.set([]);
        this.pageRangeInput.set('');
        this.pageRangeInvalid.set(false);
        this.showResultSummary.set(false);
        this.resultSummary.set(null);
        this.originalPdfBytes = null;
        this.pdfjsDoc = null;
        if (this.observer) {
            this.observer.disconnect();
        }

        // Revoke and clear any pending download URL
        const url = this.currentDownloadUrl();
        if (url) {
            URL.revokeObjectURL(url);
            this.currentDownloadUrl.set(null);
        }
    }

    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getPageSizeLabel(width: number, height: number): string {
        const w = Math.round((width / 72) * 10) / 10;
        const h = Math.round((height / 72) * 10) / 10;

        const isClose = (x1: number, y1: number, x2: number, y2: number) =>
            Math.abs(x1 - x2) < 0.2 && Math.abs(y1 - y2) < 0.2;

        if (isClose(w, h, 8.5, 11) || isClose(h, w, 8.5, 11)) return 'Letter';
        if (isClose(w, h, 8.3, 11.7) || isClose(h, w, 8.3, 11.7)) return 'A4';
        if (isClose(w, h, 8.5, 14) || isClose(h, w, 8.5, 14)) return 'Legal';
        if (isClose(w, h, 11, 17) || isClose(h, w, 11, 17)) return 'Ledger';
        if (isClose(w, h, 5.8, 8.3) || isClose(h, w, 5.8, 8.3)) return 'A5';
        if (isClose(w, h, 11.7, 16.5) || isClose(h, w, 11.7, 16.5)) return 'A3';
        return `${w}" × ${h}"`;
    }

    private formatPageRange(pages: number[]): string {
        if (pages.length === 0) return '';
        const sorted = [...pages].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0];
        let prev = sorted[0];

        for (let i = 1; i <= sorted.length; i++) {
            const current = sorted[i];
            if (current === prev + 1) {
                prev = current;
            } else {
                if (start === prev) {
                    ranges.push(`${start}`);
                } else {
                    ranges.push(`${start}-${prev}`);
                }
                start = current;
                prev = current;
            }
        }
        return ranges.join(', ');
    }

    private parsePageRange(input: string, totalPages: number): { valid: boolean; pages: number[] } {
        const trimmed = input.replace(/\s+/g, '');
        if (!trimmed) {
            return { valid: true, pages: [] };
        }

        if (!/^[0-9,-]+$/.test(trimmed)) {
            return { valid: false, pages: [] };
        }

        const parts = trimmed.split(',');
        const pages: number[] = [];

        for (const part of parts) {
            if (!part) return { valid: false, pages: [] };

            if (/^\d+$/.test(part)) {
                const pageNum = parseInt(part, 10);
                if (pageNum < 1 || pageNum > totalPages) {
                    return { valid: false, pages: [] };
                }
                pages.push(pageNum);
            } else if (/^\d+-\d+$/.test(part)) {
                const [startStr, endStr] = part.split('-');
                const start = parseInt(startStr, 10);
                const end = parseInt(endStr, 10);
                if (start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
                    return { valid: false, pages: [] };
                }
                for (let i = start; i <= end; i++) {
                    pages.push(i);
                }
            } else {
                return { valid: false, pages: [] };
            }
        }

        return { valid: true, pages: Array.from(new Set(pages)) };
    }
}
