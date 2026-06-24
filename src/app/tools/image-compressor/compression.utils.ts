import imageCompression from 'browser-image-compression';
import Compressor from 'compressorjs';
import pica from 'pica';

const picaInstance = pica();

export type CompressionPreset = 'maximum' | 'high' | 'balanced' | 'quality' | 'lossless';

export interface CompressionSettings {
  quality: number;
  preset: CompressionPreset;
  preserveExif: boolean;
  useWebWorker: boolean;
  autoOptimize: boolean;
}

export type CompressionStatus = 'Waiting' | 'Compressing' | 'Completed' | 'Failed';

export interface CompressionJob {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  format: string;
  dimensions?: { width: number; height: number };
  previewUrl?: string;
  compressedPreviewUrl?: string;
  status: CompressionStatus;
  error?: string;
  compressedSize?: number;
  compressedBlob?: Blob;
  reductionPercentage?: number;
  bytesSaved?: number;
  ratio?: string;
  picaThumbnailUrl?: string;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
  });
}

export async function generateThumbnailWithPica(file: File, width = 120, height = 120): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      try {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.naturalWidth;
        srcCanvas.height = img.naturalHeight;
        const ctx = srcCanvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const srcRatio = img.naturalWidth / img.naturalHeight;
        let destWidth = width;
        let destHeight = height;
        if (srcRatio > 1) {
          destHeight = Math.round(width / srcRatio);
        } else {
          destWidth = Math.round(height * srcRatio);
        }

        const destCanvas = document.createElement('canvas');
        destCanvas.width = destWidth;
        destCanvas.height = destHeight;

        await picaInstance.resize(srcCanvas, destCanvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        });

        const thumbnailDataUrl = destCanvas.toDataURL(file.type || 'image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve(thumbnailDataUrl);
      } catch (e) {
        console.error('Pica thumbnail generation failed:', e);
        resolve(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}

export function compressWithCompressorJS(file: File, quality: number, preserveExif: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: quality / 100,
      strict: true,
      checkOrientation: preserveExif,
      success(result) {
        resolve(result);
      },
      error(err) {
        reject(err);
      }
    });
  });
}

export async function compressWithBrowserImageCompression(
  file: File,
  quality: number,
  useWebWorker: boolean,
  preserveExif: boolean
): Promise<File> {
  const options = {
    maxSizeMB: 10,
    initialQuality: quality / 100,
    useWebWorker: useWebWorker,
    preserveExif: preserveExif,
    alwaysKeepResolution: true,
    fileType: file.type
  };
  return await imageCompression(file, options);
}

export function getOptimizedQuality(sizeBytes: number, baseQuality: number): number {
  if (sizeBytes > 5 * 1024 * 1024) {
    return Math.max(10, baseQuality - 8);
  } else if (sizeBytes < 1 * 1024 * 1024) {
    return Math.min(99, baseQuality + 5);
  }
  return baseQuality;
}

export async function compressImageFile(
  file: File,
  quality: number,
  useWebWorker: boolean,
  preserveExif: boolean
): Promise<Blob> {
  try {
    const compressed = await compressWithBrowserImageCompression(file, quality, useWebWorker, preserveExif);
    return compressed;
  } catch (err) {
    console.warn('Primary browser-image-compression failed, falling back to CompressorJS', err);
    return await compressWithCompressorJS(file, quality, preserveExif);
  }
}

