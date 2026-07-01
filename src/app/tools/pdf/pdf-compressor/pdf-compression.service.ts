import { Injectable } from '@angular/core';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';

export interface CompressionOptions {
  mode: 'lossless' | 'smart' | 'high' | 'custom';
  imageQuality?: number;
  maxDpi?: number;
  optimizeImages?: boolean;
  optimizeFonts?: boolean;
  optimizeStreams?: boolean;
  removeMetadata?: boolean;
  removeThumbnails?: boolean;
  removeAnnotations?: boolean;
  targetSizeEnabled?: boolean;
  targetSizeMb?: number;
}

export interface CompressionProgress {
  message: string;
  percent?: number;
  iteration?: number;
  currentQuality?: number;
  currentSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfCompressionService {

  async compressPdf(
    arrayBuffer: ArrayBuffer,
    options: CompressionOptions,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ pdfBytes: Uint8Array; actualSize: number; timeTaken: number; targetUnachievable?: boolean; minPossibleSize?: number; reason?: string; qualityUsed?: number }> {
    const startTime = Date.now();
    onProgress({ message: 'Initializing PDF Optimizer...', percent: 5 });

    const pdfBytes = new Uint8Array(arrayBuffer.slice(0));
    const originalSize = arrayBuffer.byteLength;

    let imageQuality = 0.75;
    let maxDpi = 300;
    let removeMetadata = true;
    let removeThumbnails = true;
    let removeAnnotations = false;
    let optimizeStreams = true;

    if (options.mode === 'lossless') {
      imageQuality = 1.0;
      maxDpi = 600;
      removeMetadata = true;
      removeThumbnails = true;
      removeAnnotations = false;
      optimizeStreams = true;
    } else if (options.mode === 'smart') {
      imageQuality = 0.75;
      maxDpi = 200;
      removeMetadata = true;
      removeThumbnails = true;
      removeAnnotations = false;
      optimizeStreams = true;
    } else if (options.mode === 'high') {
      imageQuality = 0.45;
      maxDpi = 150;
      removeMetadata = true;
      removeThumbnails = true;
      removeAnnotations = true;
      optimizeStreams = true;
    } else if (options.mode === 'custom') {
      imageQuality = (options.imageQuality ?? 75) / 100;
      maxDpi = options.maxDpi ?? 300;
      removeMetadata = options.removeMetadata ?? true;
      removeThumbnails = options.removeThumbnails ?? true;
      removeAnnotations = options.removeAnnotations ?? false;
      optimizeStreams = options.optimizeStreams ?? true;
    }

    if (options.targetSizeEnabled && options.targetSizeMb) {
      const targetSize = options.targetSizeMb * 1024 * 1024;
      if (originalSize <= targetSize) {
        onProgress({ message: 'File is already smaller than target size! Running Lossless cleanup.', percent: 15 });
        const result = await this.runSingleCompression(pdfBytes, 0.95, 300, removeMetadata, removeThumbnails, removeAnnotations, optimizeStreams, onProgress);
        const elapsed = (Date.now() - startTime) / 1000;
        return {
          pdfBytes: result,
          actualSize: result.length,
          timeTaken: elapsed,
          targetUnachievable: true,
          minPossibleSize: result.length,
          reason: 'Document is already smaller than the requested target size.',
          qualityUsed: 95
        };
      }

      onProgress({ message: 'Target Size Engine activated. Starting iterative optimization...', percent: 10 });
      let low = 0.3;
      let high = 0.9;
      let bestBytes: Uint8Array = pdfBytes as unknown as Uint8Array;
      let bestSize = originalSize;
      let bestQuality = 0.7;
      let iterationsRun = 0;
      const maxIterations = 6;
      const tolerance = 0.03;

      let finalTargetUnachievable = false;
      let reason = '';
      let minPossibleSize = 0;

      while (iterationsRun < maxIterations) {
        iterationsRun++;
        const currentQuality = (low + high) / 2;
        let currentDpi = 200;
        if (currentQuality < 0.45) currentDpi = 120;
        else if (currentQuality < 0.6) currentDpi = 150;
        else if (currentQuality < 0.75) currentDpi = 200;
        else currentDpi = 300;

        onProgress({
          message: `Target Search: Iteration ${iterationsRun}/${maxIterations} (Testing quality: ${Math.round(currentQuality * 100)}%, DPI: ${currentDpi})...`,
          percent: 10 + Math.round((iterationsRun / maxIterations) * 80),
          iteration: iterationsRun,
          currentQuality: Math.round(currentQuality * 100)
        });

        const testBytes = await this.runSingleCompression(
          pdfBytes,
          currentQuality,
          currentDpi,
          removeMetadata,
          removeThumbnails,
          removeAnnotations,
          optimizeStreams
        );

        const currentSize = testBytes.length;
        onProgress({
          message: `Iteration ${iterationsRun} Result Size: ${(currentSize / (1024 * 1024)).toFixed(2)} MB`,
          currentSize
        });

        if (Math.abs(currentSize - targetSize) < Math.abs(bestSize - targetSize)) {
          bestBytes = testBytes as unknown as Uint8Array;
          bestSize = currentSize;
          bestQuality = currentQuality;
        }

        const diffPercent = Math.abs(currentSize - targetSize) / targetSize;
        if (diffPercent <= tolerance) {
          break;
        }

        if (currentSize > targetSize) {
          high = currentQuality - 0.02;
        } else {
          low = currentQuality + 0.02;
        }

        if (Math.abs(high - low) < 0.02) {
          break;
        }
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const finalDiffPercent = (bestSize - targetSize) / targetSize;
      if (finalDiffPercent > 0.1) {
        finalTargetUnachievable = true;
        minPossibleSize = bestSize;

        try {
          const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          let hasImages = false;
          const indirectObjects = (doc.context as unknown as { indirectObjects: Map<unknown, unknown> }).indirectObjects;
          for (const obj of indirectObjects.values()) {
            if (obj instanceof PDFRawStream) {
              if (obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
                hasImages = true;
                break;
              }
            }
          }
          if (!hasImages) {
            reason = 'Document contains mostly vector graphics and text with no compressible raster images.';
          } else {
            reason = 'Embedded images are already highly optimized or text/font structures constitute the majority of the file size.';
          }
        } catch {
          reason = 'The document contains large uncompressible components like embedded fonts or vectors.';
        }
      }

      return {
        pdfBytes: bestBytes,
        actualSize: bestSize,
        timeTaken: elapsed,
        targetUnachievable: finalTargetUnachievable,
        minPossibleSize,
        reason,
        qualityUsed: Math.round(bestQuality * 100)
      };
    } else {
      onProgress({ message: 'Parsing PDF structure and locating resource dictionaries...', percent: 15 });
      const finalBytes = await this.runSingleCompression(
        pdfBytes,
        imageQuality,
        maxDpi,
        removeMetadata,
        removeThumbnails,
        removeAnnotations,
        optimizeStreams,
        onProgress
      );

      const elapsed = (Date.now() - startTime) / 1000;
      return {
        pdfBytes: finalBytes,
        actualSize: finalBytes.length,
        timeTaken: elapsed,
        qualityUsed: options.mode === 'lossless' ? undefined : Math.round(imageQuality * 100)
      };
    }
  }

  private async runSingleCompression(
    pdfBytes: Uint8Array,
    quality: number,
    maxDpi: number,
    removeMetadata: boolean,
    removeThumbnails: boolean,
    removeAnnotations: boolean,
    optimizeStreams: boolean,
    onProgress?: (p: CompressionProgress) => void
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const context = pdfDoc.context;

    if (quality < 1.0) {
      const imageObjects: { ref: unknown, stream: PDFRawStream }[] = [];
      const indirectObjectsMap = (context as unknown as { indirectObjects: Map<unknown, unknown> }).indirectObjects;

      for (const [ref, obj] of indirectObjectsMap.entries()) {
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          if (dict) {
            const subtype = dict.get(PDFName.of('Subtype'));
            if (subtype === PDFName.of('Image')) {
              imageObjects.push({ ref, stream: obj });
            }
          }
        }
      }

      if (imageObjects.length > 0) {
        if (onProgress) {
          onProgress({ message: `Compressing ${imageObjects.length} image resources...`, percent: 30 });
        }
        let count = 0;
        for (const { ref, stream } of imageObjects) {
          count++;
          if (onProgress) {
            onProgress({ 
              message: `Optimizing image ${count}/${imageObjects.length}...`, 
              percent: 30 + Math.round((count / imageObjects.length) * 40) 
            });
          }

          try {
            const dict = stream.dict;
            const width = (dict.get(PDFName.of('Width')) as unknown as { value: number })?.value || 0;
            const height = (dict.get(PDFName.of('Height')) as unknown as { value: number })?.value || 0;
            const contents = stream.getContents();
            if (contents && contents.length > 5000) {
              const compressedBytes = await this.compressImageBytesInBrowser(contents, quality, maxDpi, width, height);
              if (compressedBytes && compressedBytes.length < contents.length) {
                const newImageRef = await pdfDoc.embedJpg(compressedBytes);
                indirectObjectsMap.set(ref, context.lookup(newImageRef.ref));
              }
            }
          } catch {
            // Gracefully fallback
          }
        }
      }
    }

    if (removeMetadata) {
      if (onProgress) {
        onProgress({ message: 'Purging metadata schemas & creator footprints...', percent: 75 });
      }
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      pdfDoc.setCreationDate(new Date(0));
      pdfDoc.setModificationDate(new Date(0));
      const catalogObj = pdfDoc.catalog as unknown as { dict: { delete(name: PDFName): void } };
      catalogObj.dict.delete(PDFName.of('Metadata'));
    }

    if (removeThumbnails) {
      if (onProgress) {
        onProgress({ message: 'Removing embedded page thumbnails...', percent: 80 });
      }
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        page.node.delete(PDFName.of('Thumb'));
      }
    }

    if (removeAnnotations) {
      if (onProgress) {
        onProgress({ message: 'Stripping interactive annotations & markups...', percent: 85 });
      }
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        page.node.delete(PDFName.of('Annots'));
      }
    }

    if (onProgress) {
      onProgress({ message: 'Optimizing PDF structural tree and finalizing binary streams...', percent: 90 });
    }
    const savedBytes = await pdfDoc.save({
      useObjectStreams: optimizeStreams,
      addDefaultPage: false
    });

    if (onProgress) {
      onProgress({ message: 'PDF rebuild complete!', percent: 100 });
    }
    return savedBytes;
  }

  private async compressImageBytesInBrowser(bytes: Uint8Array, quality: number, maxDpi: number, origWidth: number, origHeight: number): Promise<Uint8Array | null> {
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    try {
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load fail'));
      });

      let targetWidth = img.width || origWidth || 800;
      let targetHeight = img.height || origHeight || 600;

      let maxDim = 999999;
      if (maxDpi <= 96) maxDim = 800;
      else if (maxDpi <= 150) maxDim = 1200;
      else if (maxDpi <= 200) maxDim = 1600;
      else if (maxDpi <= 300) maxDim = 2400;
      else if (maxDpi <= 600) maxDim = 3600;

      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
          const ratio = maxDim / targetWidth;
          targetWidth = maxDim;
          targetHeight = Math.round(targetHeight * ratio);
        } else {
          const ratio = maxDim / targetHeight;
          targetHeight = maxDim;
          targetWidth = Math.round(targetWidth * ratio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const parts = compressedDataUrl.split(',');
      if (parts.length < 2) return null;
      const binaryStr = atob(parts[1]);
      const len = binaryStr.length;
      const compressedBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        compressedBytes[i] = binaryStr.charCodeAt(i);
      }

      return compressedBytes;
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
