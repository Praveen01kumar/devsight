import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, signal, computed, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { CompressionJob, CompressionPreset, CompressionSettings, compressImageFile, formatBytes, generateThumbnailWithPica, getImageDimensions, getOptimizedQuality, compressToTargetSize } from './compression.utils';
import { isPlatformBrowser } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-image-compressor',
    imports: [MatIconModule],
    templateUrl: './image-compressor.html'
})
export class ImageCompressoerComponent implements AfterViewInit {
    activeTab = signal<'single' | 'bulk'>('single');
    validationError = signal<string | null>(null);

    maxFileSizeMB = 10;
    maxFilesLimit = 20;

    singleSettings = signal<CompressionSettings>({
        quality: 80,
        preset: 'balanced',
        preserveExif: true,
        useWebWorker: true,
        autoOptimize: true,
        useTargetSize: true,
        targetSizeKB: 200
    });
    singleJob = signal<CompressionJob | null>(null);
    isCompressingSingle = signal<boolean>(false);

    bulkSettings = signal<CompressionSettings>({
        quality: 80,
        preset: 'balanced',
        preserveExif: true,
        useWebWorker: true,
        autoOptimize: true,
        useTargetSize: false,
        targetSizeKB: 200
    });
    bulkJobs = signal<CompressionJob[]>([]);
    bulkQueueStatus = signal<'idle' | 'processing' | 'cancelled'>('idle');

    sliderPosition = signal<number>(50);
    containerWidth = signal<number>(600);

    @ViewChild('sliderContainer') sliderContainer!: ElementRef<HTMLDivElement>;

    isBulkQueueEmpty = computed(() => this.bulkJobs().length === 0);

    bulkJobsSummary = computed(() => {
        const jobs = this.bulkJobs();
        let totalOriginal = 0;
        let totalCompressed = 0;
        let completedCount = 0;
        let failedCount = 0;
        let compressingCount = 0;
        let waitingCount = 0;

        for (const job of jobs) {
            totalOriginal += job.originalSize;
            if (job.status === 'Completed' && job.compressedSize) {
                totalCompressed += job.compressedSize;
                completedCount++;
            } else {
                totalCompressed += job.originalSize;
            }
            if (job.status === 'Failed') failedCount++;
            if (job.status === 'Compressing') compressingCount++;
            if (job.status === 'Waiting') waitingCount++;
        }

        const savedBytes = totalOriginal - totalCompressed;
        const reductionPercent = totalOriginal > 0 ? (savedBytes / totalOriginal) * 100 : 0;
        const compressionRatio = totalCompressed > 0 ? (totalOriginal / totalCompressed).toFixed(2) + ':1' : '1:1';

        return {
            totalOriginalBytes: totalOriginal,
            totalCompressedBytes: totalCompressed,
            totalOriginalFormatted: formatBytes(totalOriginal),
            totalCompressedFormatted: formatBytes(totalCompressed),
            savedFormatted: formatBytes(Math.max(0, savedBytes)),
            reductionPercent: reductionPercent.toFixed(1),
            ratio: compressionRatio,
            completedCount,
            failedCount,
            compressingCount,
            waitingCount,
            totalCount: jobs.length
        };
    });
    private readonly platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);

    ngAfterViewInit() {
        if (this.isBrowser) {
            this.setupResizeObserver();
        }
    }

    setupResizeObserver() {
        if (this.sliderContainer) {
            this.containerWidth.set(this.sliderContainer.nativeElement.clientWidth);
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    this.containerWidth.set(entry.contentRect.width);
                }
            });
            observer.observe(this.sliderContainer.nativeElement);
        }
    }

    formatSize(bytes: number): string {
        return formatBytes(bytes);
    }

    getPresetQuality(preset: CompressionPreset): number {
        switch (preset) {
            case 'maximum': return 15;
            case 'high': return 40;
            case 'balanced': return 70;
            case 'quality': return 85;
            case 'lossless': return 98;
        }
    }

    setTab(tab: 'single' | 'bulk') {
        this.activeTab.set(tab);
        this.validationError.set(null);
    }

    setSinglePreset(preset: CompressionPreset) {
        this.singleSettings.update(s => ({
            ...s,
            preset,
            quality: this.getPresetQuality(preset)
        }));
    }

    updateSingleQuality(event: Event) {
        const val = Number.parseInt((event.target as HTMLInputElement).value);
        this.singleSettings.update(s => ({ ...s, quality: val }));
        const job = this.singleJob();
        if (job?.status === 'Completed') {
            this.singleJob.update(j => j ? {
                ...j,
                status: 'Waiting',
                compressedBlob: undefined,
                compressedSize: undefined,
                compressedPreviewUrl: undefined,
                reductionPercentage: undefined,
                bytesSaved: undefined,
                ratio: undefined
            } : null);
        }
    }

    toggleTargetSize() {
        this.singleSettings.update(s => ({
            ...s,
            useTargetSize: !s.useTargetSize
        }));

        this.markSingleForRecompression();
    }
    private markSingleForRecompression() {
        const job = this.singleJob();

        if (!job) return;

        if (job.compressedPreviewUrl) {
            URL.revokeObjectURL(job.compressedPreviewUrl);
        }

        this.singleJob.update(current => {
            if (!current) return null;

            return {
                ...current,
                status: 'Waiting',
                compressedSize: undefined,
                compressedBlob: undefined,
                compressedPreviewUrl: undefined,
                reductionPercentage: undefined,
                bytesSaved: undefined,
                ratio: undefined,
                error: undefined
            };
        });
    }
    updateTargetSize(event: Event) {
        const value = Number(
            (event.target as HTMLInputElement).value
        );

        const job = this.singleJob();

        if (job) {
            const originalKB = Math.ceil(job.originalSize / 1024);

            if (value >= originalKB) {
                this.validationError.set(
                    `Target size cannot exceed ${originalKB - 1} KB`
                );

                this.singleSettings.update(s => ({
                    ...s,
                    targetSizeKB: originalKB - 1
                }));

                return;
            }
        }

        this.validationError.set(null);

        this.singleSettings.update(s => ({
            ...s,
            targetSizeKB: value
        }));

        this.markSingleForRecompression();
    }
    private validateTargetSize(): boolean {
        const job = this.singleJob();

        if (
            !job ||
            !this.singleSettings().useTargetSize ||
            !this.singleSettings().targetSizeKB
        ) {
            return true;
        }

        const originalKB = Math.ceil(job.originalSize / 1024);
        const targetKB = this.singleSettings().targetSizeKB;

        if (targetKB && targetKB >= originalKB) {
            this.validationError.set(
                `Target size must be smaller than original image size (${originalKB} KB).`
            );
            return false;
        }

        this.validationError.set(null);
        return true;
    }
    setBulkPreset(preset: CompressionPreset) {
        this.bulkSettings.update(s => ({
            ...s,
            preset,
            quality: this.getPresetQuality(preset)
        }));
    }

    updateBulkQuality(event: Event) {
        const val = Number.parseInt((event.target as HTMLInputElement).value);
        this.bulkSettings.update(s => ({ ...s, quality: val }));
    }

    toggleSingleExif() {
        this.singleSettings.update(s => ({ ...s, preserveExif: !s.preserveExif }));
    }

    toggleSingleWebWorker() {
        this.singleSettings.update(s => ({ ...s, useWebWorker: !s.useWebWorker }));
    }

    toggleSingleAutoOptimize() {
        this.singleSettings.update(s => ({ ...s, autoOptimize: !s.autoOptimize }));
    }

    toggleBulkExif() {
        this.bulkSettings.update(s => ({ ...s, preserveExif: !s.preserveExif }));
    }

    toggleBulkWebWorker() {
        this.bulkSettings.update(s => ({ ...s, useWebWorker: !s.useWebWorker }));
    }

    toggleBulkAutoOptimize() {
        this.bulkSettings.update(s => ({ ...s, autoOptimize: !s.autoOptimize }));
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    validateFile(file: File): string | null {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
        if (!allowedTypes.includes(file.type)) {
            return `"${file.name}" is not a supported format. Please upload JPG, JPEG, PNG, WEBP, or AVIF.`;
        }
        if (file.size > this.maxFileSizeMB * 1024 * 1024) {
            return `"${file.name}" exceeds the ${this.maxFileSizeMB} MB limit (${formatBytes(file.size)}).`;
        }
        return null;
    }

    async onSingleFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            await this.handleSingleFile(input.files[0]);
        }
    }

    async onSingleFileDropped(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            await this.handleSingleFile(event.dataTransfer.files[0]);
        }
    }

    async handleSingleFile(file: File) {
        this.resetSingle();
        const error = this.validateFile(file);
        if (error) {
            this.validationError.set(error);
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const dims = await getImageDimensions(file);

        const randomId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

        this.singleJob.set({
            id: randomId,
            file,
            name: file.name,
            originalSize: file.size,
            format: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN',
            dimensions: dims,
            previewUrl,
            status: 'Waiting'
        });

        this.sliderPosition.set(50);
        setTimeout(() => this.setupResizeObserver(), 100);
    }

    async compressSingle() {
        const job = this.singleJob();
        if (!job) return;

        if (!this.validateTargetSize()) {
            return;
        }
        this.isCompressingSingle.set(true);
        this.validationError.set(null);

        this.singleJob.update(current => current ? { ...current, status: 'Compressing' } : null);

        try {
            let finalQuality = this.singleSettings().quality;
            if (this.singleSettings().autoOptimize) {
                finalQuality = getOptimizedQuality(job.originalSize, finalQuality);
            }
            let compressedBlob: Blob;

            if (
                this.singleSettings().useTargetSize &&
                this.singleSettings().targetSizeKB
            ) {
                compressedBlob =
                    await compressToTargetSize(
                        job.file,
                        this.singleSettings().targetSizeKB!,
                        this.singleSettings().useWebWorker,
                        this.singleSettings().preserveExif
                    );
            } else {
                compressedBlob =
                    await compressImageFile(
                        job.file,
                        finalQuality,
                        this.singleSettings().useWebWorker,
                        this.singleSettings().preserveExif
                    );
            }
            // const compressedBlob = await compressImageFile(
            //     job.file,
            //     finalQuality,
            //     this.singleSettings().useWebWorker,
            //     this.singleSettings().preserveExif
            // );

            const compressedSize = compressedBlob.size;
            const bytesSaved = job.originalSize - compressedSize;
            const reductionPercentage = bytesSaved > 0 ? (bytesSaved / job.originalSize) * 100 : 0;
            const ratio = (job.originalSize / compressedSize).toFixed(2) + ':1';
            const compressedPreviewUrl = URL.createObjectURL(compressedBlob);

            this.singleJob.update(current => {
                if (!current) return null;
                return {
                    ...current,
                    status: 'Completed',
                    compressedSize,
                    compressedBlob,
                    compressedPreviewUrl,
                    reductionPercentage,
                    bytesSaved,
                    ratio
                };
            });
        } catch (err) {
            console.error(err);
            const errMsg = err instanceof Error ? err.message : 'Compression failed.';
            this.singleJob.update(current => current ? {
                ...current,
                status: 'Failed',
                error: errMsg
            } : null);
        } finally {
            this.isCompressingSingle.set(false);
        }
    }

    downloadSingle() {
        const job = this.singleJob();
        if (job && job.status === 'Completed' && job.compressedBlob) {
            saveAs(job.compressedBlob, job.name);
        }
    }

    resetSingle() {
        const job = this.singleJob();
        if (job) {
            this.revokeJobUrls(job);
        }
        this.singleJob.set(null);
        this.validationError.set(null);
    }

    async onBulkFilesSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            await this.handleBulkFiles(Array.from(input.files));
        }
    }

    async onBulkFilesDropped(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer?.files) {
            await this.handleBulkFiles(Array.from(event.dataTransfer.files));
        }
    }

    async handleBulkFiles(files: File[]) {
        this.validationError.set(null);

        const validFiles: File[] = [];
        let fileLimitExceeded = false;

        const currentJobsCount = this.bulkJobs().length;

        for (const file of files) {
            const error = this.validateFile(file);
            if (error) {
                this.validationError.set(error);
                continue;
            }

            if (validFiles.length + currentJobsCount >= this.maxFilesLimit) {
                fileLimitExceeded = true;
                break;
            }

            validFiles.push(file);
        }

        if (fileLimitExceeded) {
            this.validationError.set(`Queue limit reached. Maximum ${this.maxFilesLimit} files can be processed at once.`);
        }

        for (const file of validFiles) {
            const previewUrl = URL.createObjectURL(file);
            const randomId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

            const newJob: CompressionJob = {
                id: randomId,
                file,
                name: file.name,
                originalSize: file.size,
                format: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN',
                previewUrl,
                status: 'Waiting'
            };

            this.bulkJobs.update(jobs => [...jobs, newJob]);

            getImageDimensions(file).then(dims => {
                this.bulkJobs.update(jobs =>
                    jobs.map(j => j.id === randomId ? { ...j, dimensions: dims } : j)
                );
            });

            generateThumbnailWithPica(file, 80, 80).then(thumbUrl => {
                this.bulkJobs.update(jobs =>
                    jobs.map(j => j.id === randomId ? { ...j, picaThumbnailUrl: thumbUrl } : j)
                );
            });
        }
    }

    async compressBulk() {
        if (this.bulkJobs().length === 0 || this.bulkQueueStatus() === 'processing') return;
        if (
            this.singleSettings().useTargetSize &&
            !this.validateTargetSize()
        ) {
            return;
        }

        this.bulkQueueStatus.set('processing');
        this.validationError.set(null);

        const jobsToProcess = this.bulkJobs().filter(j => j.status !== 'Completed');

        const batchSize = 3;

        for (let i = 0; i < jobsToProcess.length; i += batchSize) {
            if (this.bulkQueueStatus() !== 'processing') break;

            const batch = jobsToProcess.slice(i, i + batchSize);
            const promises = batch.map(async (job) => {
                this.updateBulkJobStatus(job.id, 'Compressing');

                try {
                    let finalQuality = this.bulkSettings().quality;
                    if (this.bulkSettings().autoOptimize) {
                        finalQuality = getOptimizedQuality(job.originalSize, finalQuality);
                    }
                    let compressedBlob: Blob;

                    if (
                        this.singleSettings().useTargetSize &&
                        this.singleSettings().targetSizeKB
                    ) {
                        compressedBlob =
                            await compressToTargetSize(
                                job.file,
                                this.singleSettings().targetSizeKB!,
                                this.singleSettings().useWebWorker,
                                this.singleSettings().preserveExif
                            );
                    } else {
                        compressedBlob =
                            await compressImageFile(
                                job.file,
                                finalQuality,
                                this.singleSettings().useWebWorker,
                                this.singleSettings().preserveExif
                            );
                    }
                    // const compressedBlob = await compressImageFile(
                    //     job.file,
                    //     finalQuality,
                    //     this.bulkSettings().useWebWorker,
                    //     this.bulkSettings().preserveExif
                    // );

                    const compressedSize = compressedBlob.size;
                    const bytesSaved = job.originalSize - compressedSize;
                    const reductionPercentage = bytesSaved > 0 ? (bytesSaved / job.originalSize) * 100 : 0;
                    const ratio = (job.originalSize / compressedSize).toFixed(2) + ':1';
                    const compressedPreviewUrl = URL.createObjectURL(compressedBlob);

                    this.bulkJobs.update(jobs =>
                        jobs.map(j => j.id === job.id ? {
                            ...j,
                            status: 'Completed',
                            compressedSize,
                            compressedBlob,
                            compressedPreviewUrl,
                            reductionPercentage,
                            bytesSaved,
                            ratio
                        } as CompressionJob : j)
                    );
                } catch (err) {
                    console.error(`Compression failed for ${job.name}:`, err);
                    const errMsg = err instanceof Error ? err.message : 'Compression failed.';
                    this.bulkJobs.update(jobs =>
                        jobs.map(j => j.id === job.id ? {
                            ...j,
                            status: 'Failed',
                            error: errMsg
                        } as CompressionJob : j)
                    );
                }
            });

            await Promise.all(promises);
        }

        if (this.bulkQueueStatus() === 'processing') {
            this.bulkQueueStatus.set('idle');
        }
    }

    cancelQueue() {
        this.bulkQueueStatus.set('cancelled');
        this.bulkJobs.update(jobs =>
            jobs.map(j => j.status === 'Compressing' || j.status === 'Waiting' ? {
                ...j,
                status: 'Failed',
                error: 'Cancelled by user.'
            } as CompressionJob : j)
        );
        setTimeout(() => this.bulkQueueStatus.set('idle'), 1000);
    }

    removeBulkJob(jobId: string) {
        const job = this.bulkJobs().find(j => j.id === jobId);
        if (job) {
            this.revokeJobUrls(job);
        }
        this.bulkJobs.update(jobs => jobs.filter(j => j.id !== jobId));
    }

    clearBulkQueue() {
        this.cancelQueue();
        for (const job of this.bulkJobs()) {
            this.revokeJobUrls(job);
        }
        this.bulkJobs.set([]);
        this.validationError.set(null);
    }

    downloadSingleBulk(job: CompressionJob) {
        if (job.status === 'Completed' && job.compressedBlob) {
            saveAs(job.compressedBlob, job.name);
        }
    }

    async downloadAllBulkZIP() {
        const completedJobs = this.bulkJobs().filter(j => j.status === 'Completed' && j.compressedBlob);
        if (completedJobs.length === 0) return;

        const zip = new JSZip();
        for (const job of completedJobs) {
            if (job.compressedBlob) {
                zip.file(job.name, job.compressedBlob);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'compressed-images-batch.zip');
    }

    private updateBulkJobStatus(jobId: string, status: 'Waiting' | 'Compressing' | 'Completed' | 'Failed') {
        this.bulkJobs.update(jobs =>
            jobs.map(j => j.id === jobId ? { ...j, status } : j)
        );
    }

    private revokeJobUrls(job: CompressionJob) {
        if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
        if (job.compressedPreviewUrl) URL.revokeObjectURL(job.compressedPreviewUrl);
    }

    onSliderChange(event: Event) {
        const val = Number.parseInt((event.target as HTMLInputElement).value);
        this.sliderPosition.set(val);
    }
}
