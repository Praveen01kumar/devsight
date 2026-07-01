import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';

interface ParseRangeResult {
    valid: boolean;
    error?: string;
    groups?: number[][];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pdf-split',
    imports: [CommonModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './pdf-split.html',
    host: {
        '(window:keydown)': 'handleKeyDown($event)'
    }
})
export class PdfSplit implements OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    // PDF Metadata & File State
    currentFile = signal<File | null>(null);
    fileName = signal<string>('');
    fileSizeStr = signal<string>('');
    totalPages = signal<number>(0);
    pdfBytes: ArrayBuffer | null = null;
    private pdfDocInstance: unknown = null;

    // Selected pages (1-indexed) for selection mode
    selectedPages = signal<Set<number>>(new Set());
    lastSelectedPage = signal<number | null>(null);

    // Split Modes: 'every' | 'range' | 'selected' | 'n_pages'
    splitMode = signal<'every' | 'range' | 'selected' | 'n_pages'>('every');

    // Reactive Form Controls
    prefixControl = new FormControl('Split', { nonNullable: true, validators: [Validators.required] });
    rangeControl = new FormControl('', { nonNullable: true });
    nPagesControl = new FormControl<number>(5, { nonNullable: true, validators: [Validators.required, Validators.min(1)] });

    // Reactive Signal Trackers for Form Controls to trigger computed signals correctly
    prefixValue = toSignal(this.prefixControl.valueChanges, { initialValue: 'Split' });
    rangeValue = toSignal(this.rangeControl.valueChanges, { initialValue: '' });
    nPagesValue = toSignal(this.nPagesControl.valueChanges, { initialValue: 5 });

    // UI States
    isDragging = signal<boolean>(false);
    isProcessing = signal<boolean>(false);
    processingProgress = signal<number>(0);
    errorMessage = signal<string>('');

    // Lazy-loaded Thumbnails Record (1-indexed page -> base64 string)
    renderedThumbnails = signal<Record<number, string>>({});
    private readonly renderingPages = new Set<number>();
    private observer?: IntersectionObserver;

    // Derived Statistics / Values using Signals
    pageNumbers = computed(() => {
        const total = this.totalPages();
        const arr: number[] = [];
        for (let i = 1; i <= total; i++) {
            arr.push(i);
        }
        return arr;
    });

    selectedPagesCount = computed(() => this.selectedPages().size);

    rangeValidation = computed(() => {
        const input = this.rangeValue() || '';
        const total = this.totalPages();
        if (this.splitMode() !== 'range' || !total) return { valid: true };
        return this.parseRanges(input, total);
    });

    isSplitDisabled = computed(() => {
        if (this.isProcessing()) return true;
        if (!this.currentFile()) return true;

        const mode = this.splitMode();
        if (mode === 'range') {
            return !this.rangeValidation().valid;
        }
        if (mode === 'selected') {
            return this.selectedPagesCount() === 0;
        }
        if (mode === 'n_pages') {
            const val = this.nPagesValue();
            return !val || val <= 0;
        }
        return false;
    });

    filesToGenerateCount = computed(() => {
        if (!this.currentFile()) return 0;
        const mode = this.splitMode();
        const total = this.totalPages();
        if (mode === 'every') {
            return total;
        }
        if (mode === 'range') {
            const validation = this.rangeValidation();
            return validation.valid && validation.groups ? validation.groups.length : 0;
        }
        if (mode === 'selected') {
            return this.selectedPagesCount() > 0 ? 1 : 0;
        }
        if (mode === 'n_pages') {
            const n = this.nPagesValue();
            if (!n || n <= 0) return 0;
            return Math.ceil(total / n);
        }
        return 0;
    });

    constructor() {
        afterNextRender(() => {
            // Setup keyboard listener indicators and ensure responsive startup
        });
    }

    ngOnDestroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    // --- Keyboard Shortcuts & Utilities ---
    handleKeyDown(event: KeyboardEvent) {
        if (!this.isBrowser) return;

        const activeElement = document.activeElement;
        // Don't intercept shortcuts when typing in inputs
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            // Still allow Escape to blur input or trigger actions
            if (event.key === 'Escape') {
                (activeElement as HTMLElement).blur();
                event.preventDefault();
            }
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === 'o') {
                event.preventDefault();
                this.triggerFileOpen();
            } else if (event.key.toLowerCase() === 'a') {
                if (this.currentFile()) {
                    event.preventDefault();
                    this.selectAllPages();
                }
            } else if (event.key === 'Enter') {
                if (!this.isSplitDisabled()) {
                    event.preventDefault();
                    this.splitPdf();
                }
            }
        } else if (event.key === 'Escape') {
            if (this.currentFile()) {
                event.preventDefault();
                this.clearSelection();
            }
        }
    }

    triggerFileOpen() {
        if (this.fileInput) {
            this.fileInput.nativeElement.click();
        }
    }

    getFileSizeString(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --- File Upload & Drag & Drop Handling ---
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.loadPdf(files[0]);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.loadPdf(input.files[0]);
        }
    }

    // --- PDF loading & Parsing ---
    async loadPdf(file: File) {
        this.errorMessage.set('');
        this.isProcessing.set(true);
        this.processingProgress.set(10);

        try {
            if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                throw new Error('Please upload a valid PDF file.');
            }

            const arrayBuffer = await file.arrayBuffer();
            this.pdfBytes = arrayBuffer;

            // Dynamically import PDF.js for 100% browser compatibility and to bypass Node SSR problems
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            // Pass a slice copy to avoid detaching/transferring the original ArrayBuffer in PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
            this.processingProgress.set(40);

            const doc = await loadingTask.promise;
            this.pdfDocInstance = doc;
            this.totalPages.set(doc.numPages);

            this.currentFile.set(file);
            this.fileName.set(file.name);
            this.fileSizeStr.set(this.getFileSizeString(file.size));

            // Clear previous inputs & selection
            this.selectedPages.set(new Set());
            this.renderedThumbnails.set({});
            this.lastSelectedPage.set(null);
            this.rangeControl.setValue('');
            this.nPagesControl.setValue(5);

            const fileNoExt = file.name.replace(/\.[^/.]+$/, "");
            this.prefixControl.setValue(`${fileNoExt}-Split`);

            this.processingProgress.set(100);

            // Trigger lazy thumbnail setup
            this.setupIntersectionObserver();
        } catch (error: unknown) {
            console.error('Error loading PDF:', error);
            const errMsg = error instanceof Error ? error.message : 'Failed to parse PDF document. It may be corrupted.';
            this.errorMessage.set(errMsg);
            this.resetState();
        } finally {
            this.isProcessing.set(false);
        }
    }

    // --- Lazy Loading Thumbnails Observer ---
    setupIntersectionObserver() {
        if (!this.isBrowser) return;

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
                            // Unobserve immediately after triggering load to optimize resources
                            this.observer?.unobserve(entry.target);
                        }
                    }
                });
            },
            {
                root: null, // use the browser viewport
                rootMargin: '300px', // start rendering pages 300px before they scroll into view
                threshold: 0.01,
            }
        );

        // Give the template a moment to render the empty card nodes
        setTimeout(() => {
            const cards = document.querySelectorAll('.page-thumbnail-card');
            cards.forEach((card) => this.observer?.observe(card));
        }, 150);
    }

    async renderThumbnail(pageNum: number) {
        if (this.renderedThumbnails()[pageNum]) return; // already rendered
        if (this.renderingPages.has(pageNum)) return; // already in-progress
        this.renderingPages.add(pageNum);

        try {
            const doc = this.pdfDocInstance as {
                getPage(pageNumber: number): Promise<unknown>;
            };
            if (!doc) return;

            const page = await doc.getPage(pageNum) as {
                getViewport(options: { scale: number }): { width: number; height: number };
                render(options: unknown): { promise: Promise<void> };
            };
            // Thumbnail resolution scale (0.5 - 0.7 gives perfect balance of size & crispness)
            const viewport = page.getViewport({ scale: 0.6 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                this.renderedThumbnails.update((prev) => ({
                    ...prev,
                    [pageNum]: dataUrl,
                }));
            }
        } catch (err) {
            console.error(`Error rendering page thumbnail ${pageNum}:`, err);
        } finally {
            this.renderingPages.delete(pageNum);
        }
    }

    // --- Page Selection Controls ---
    onPageClick(pageNum: number, event: MouseEvent | KeyboardEvent | Event) {
        const current = new Set(this.selectedPages());

        let isShiftPressed = false;
        if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
            isShiftPressed = event.shiftKey;
        }

        if (isShiftPressed && this.lastSelectedPage() !== null) {
            const start = Math.min(this.lastSelectedPage()!, pageNum);
            const end = Math.max(this.lastSelectedPage()!, pageNum);

            // Shift Click selects the whole range
            for (let i = start; i <= end; i++) {
                current.add(i);
            }
        } else {
            // Normal click: toggles page selection and acts as standard toggle
            if (current.has(pageNum)) {
                current.delete(pageNum);
            } else {
                current.add(pageNum);
            }
            this.lastSelectedPage.set(pageNum);
        }

        this.selectedPages.set(current);
    }

    selectAllPages() {
        const total = this.totalPages();
        const set = new Set<number>();
        for (let i = 1; i <= total; i++) {
            set.add(i);
        }
        this.selectedPages.set(set);
        this.lastSelectedPage.set(total);
    }

    clearSelection() {
        this.selectedPages.set(new Set());
        this.lastSelectedPage.set(null);
    }

    // --- Parse & Validate Page Ranges ---
    parseRanges(inputStr: string, total: number): ParseRangeResult {
        const trimmedInput = inputStr.trim();
        if (!trimmedInput) {
            return { valid: false, error: 'Page range input cannot be empty.' };
        }

        // Split on commas
        const parts = trimmedInput.split(',');
        const groups: number[][] = [];
        const seenPages = new Set<number>();

        for (const rawPart of parts) {
            const part = rawPart.trim();
            if (!part) continue;

            // Pattern 1: Single page (e.g. "10")
            if (/^\d+$/.test(part)) {
                const pageNum = parseInt(part, 10);
                if (pageNum < 1 || pageNum > total) {
                    return { valid: false, error: `Page ${pageNum} is out of bounds (1-${total}).` };
                }
                const zeroIndex = pageNum - 1;
                if (seenPages.has(zeroIndex)) {
                    return { valid: false, error: `Page ${pageNum} is duplicated across ranges.` };
                }
                seenPages.add(zeroIndex);
                groups.push([zeroIndex]);
            }
            // Pattern 2: Page Range (e.g. "1-4")
            else if (/^\d+\s*-\s*\d+$/.test(part)) {
                const [startStr, endStr] = part.split('-');
                const start = Number.parseInt(startStr.trim(), 10);
                const end = Number.parseInt(endStr.trim(), 10);

                if (start < 1 || start > total) {
                    return { valid: false, error: `Start page ${start} is out of bounds (1-${total}).` };
                }
                if (end < 1 || end > total) {
                    return { valid: false, error: `End page ${end} is out of bounds (1-${total}).` };
                }
                if (start > end) {
                    return { valid: false, error: `Invalid range "${part}": Start page must be less than or equal to end page.` };
                }

                const currentGroup: number[] = [];
                for (let p = start; p <= end; p++) {
                    const zeroIndex = p - 1;
                    if (seenPages.has(zeroIndex)) {
                        return { valid: false, error: `Page ${p} is duplicated across ranges.` };
                    }
                    seenPages.add(zeroIndex);
                    currentGroup.push(zeroIndex);
                }
                groups.push(currentGroup);
            } else {
                return { valid: false, error: `Invalid syntax near "${part}". Use formats like "1-4" or "10".` };
            }
        }

        if (groups.length === 0) {
            return { valid: false, error: 'No valid ranges parsed.' };
        }

        return { valid: true, groups };
    }

    // --- PDF Splitting & ZIP Generation Engine ---
    async splitPdf() {
        if (this.isSplitDisabled() || !this.pdfBytes) return;

        this.errorMessage.set('');
        this.isProcessing.set(true);
        this.processingProgress.set(10);

        try {
            const { PDFDocument } = await import('pdf-lib');
            const originalDoc = await PDFDocument.load(this.pdfBytes.slice(0));
            const total = this.totalPages();
            const mode = this.splitMode();
            const prefix = this.prefixControl.value.trim() || 'Split';

            let pageGroups: number[][] = [];

            if (mode === 'every') {
                for (let i = 0; i < total; i++) {
                    pageGroups.push([i]);
                }
            } else if (mode === 'range') {
                const validation = this.rangeValidation();
                if (!validation.valid || !validation.groups) {
                    throw new Error(validation.error || 'Invalid range specifications.');
                }
                pageGroups = validation.groups;
            } else if (mode === 'selected') {
                const selected = Array.from(this.selectedPages()).sort((a, b) => a - b);
                if (selected.length === 0) {
                    throw new Error('Please select at least one page to extract.');
                }
                // Extract selected pages together into ONE single PDF
                pageGroups = [selected.map((p) => p - 1)];
            } else if (mode === 'n_pages') {
                const n = this.nPagesControl.value;
                if (!n || n <= 0) {
                    throw new Error('Please enter a valid page interval greater than 0.');
                }
                for (let i = 0; i < total; i += n) {
                    const group: number[] = [];
                    for (let j = i; j < i + n && j < total; j++) {
                        group.push(j);
                    }
                    pageGroups.push(group);
                }
            }

            if (pageGroups.length === 0) {
                throw new Error('No pages were grouped for split.');
            }

            this.processingProgress.set(30);

            const generatedPdfs: { name: string; bytes: Uint8Array }[] = [];
            const totalGroups = pageGroups.length;

            for (let i = 0; i < totalGroups; i++) {
                const group = pageGroups[i];
                const newDoc = await PDFDocument.create();
                const copiedPages = await newDoc.copyPages(originalDoc, group);
                copiedPages.forEach((page) => newDoc.addPage(page));
                const pdfBytes = await newDoc.save();

                let fileName = '';
                if (mode === 'every') {
                    fileName = `${prefix}-Page-${group[0] + 1}.pdf`;
                } else if (mode === 'range' || mode === 'n_pages') {
                    const startPage = group[0] + 1;
                    const endPage = group[group.length - 1] + 1;
                    fileName = startPage === endPage ? `${prefix}-Page-${startPage}.pdf` : `${prefix}-Pages-${startPage}-${endPage}.pdf`;
                } else if (mode === 'selected') {
                    fileName = `${prefix}-Selected-Pages.pdf`;
                }

                generatedPdfs.push({ name: fileName, bytes: pdfBytes });

                // Progress tracking (from 30% to 85% of total task completion)
                const progressPct = Math.floor(30 + (i / totalGroups) * 55);
                this.processingProgress.set(progressPct);
            }

            this.processingProgress.set(90);

            // Trigger user download
            if (generatedPdfs.length === 1) {
                const single = generatedPdfs[0];
                const blob = new Blob([single.bytes as BlobPart], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = single.name;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();

                generatedPdfs.forEach((pdf) => {
                    zip.file(pdf.name, pdf.bytes);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${prefix}.zip`;
                a.click();
                URL.revokeObjectURL(url);
            }

            this.processingProgress.set(100);

            // Delay reset status indicator so user sees "100% Complete" briefly
            setTimeout(() => {
                this.isProcessing.set(false);
                this.processingProgress.set(0);
            }, 1000);

        } catch (err: unknown) {
            console.error('Split execution failed:', err);
            const errMsg = err instanceof Error ? err.message : 'An error occurred during splitting.';
            this.errorMessage.set(errMsg);
            this.isProcessing.set(false);
        }
    }

    // --- Reset Application Workspace State ---
    resetState() {
        this.currentFile.set(null);
        this.fileName.set('');
        this.fileSizeStr.set('');
        this.totalPages.set(0);
        this.pdfBytes = null;
        this.pdfDocInstance = null;
        this.selectedPages.set(new Set());
        this.lastSelectedPage.set(null);
        this.renderedThumbnails.set({});
        this.renderingPages.clear();
        this.rangeControl.setValue('');
        this.nPagesControl.setValue(5);
        this.prefixControl.setValue('Split');
        this.errorMessage.set('');

        if (this.observer) {
            this.observer.disconnect();
        }

        // Clear actual input tag value to let user re-upload same file if they want
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }
}
