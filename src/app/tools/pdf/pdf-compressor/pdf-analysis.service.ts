import { Injectable } from '@angular/core';
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib';

export interface PdfAnalysisResult {
  fileSize: number;
  pageCount: number;
  imageCount: number;
  largestImages: { width: number; height: number; size: number; format: string }[];
  imageFormats: string[];
  estimatedImageSize: number;
  estimatedTextSize: number;
  estimatedFontSize: number;
  embeddedFonts: string[];
  metadataPresent: boolean;
  annotationsPresent: boolean;
  estimatedLosslessSize: number;
  estimatedSmartSize: number;
  estimatedHighSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfAnalysisService {
  async analyzePdf(arrayBuffer: ArrayBuffer): Promise<PdfAnalysisResult> {
    const fileSize = arrayBuffer.byteLength;
    let pageCount = 0;
    let imageCount = 0;
    const largestImages: { width: number; height: number; size: number; format: string }[] = [];
    const imageFormatsSet = new Set<string>();
    let estimatedImageSize = 0;
    let estimatedFontSize = 0;
    const embeddedFonts: string[] = [];
    let metadataPresent = false;
    let annotationsPresent = false;

    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();

      const context = pdfDoc.context;
      const indirectObjects = (context as unknown as { indirectObjects: Map<unknown, unknown> }).indirectObjects;

      for (const obj of indirectObjects.values()) {
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          if (!dict) continue;

          const subtype = dict.get(PDFName.of('Subtype'));
          const type = dict.get(PDFName.of('Type'));

          // Check for images
          if (subtype === PDFName.of('Image')) {
            imageCount++;
            const width = (dict.get(PDFName.of('Width')) as unknown as { value: number })?.value || 0;
            const height = (dict.get(PDFName.of('Height')) as unknown as { value: number })?.value || 0;
            const length = (dict.get(PDFName.of('Length')) as unknown as { value: number })?.value || obj.contents?.length || 0;
            const filter = dict.get(PDFName.of('Filter'));

            let format = 'Raw/Lossless';
            if (filter === PDFName.of('DCTDecode')) {
              format = 'JPEG';
            } else if (filter === PDFName.of('FlateDecode')) {
              format = 'PNG/Flate';
            } else if (filter === PDFName.of('JPXDecode')) {
              format = 'JPEG 2000';
            } else if (filter === PDFName.of('CCITTFaxDecode')) {
              format = 'CCITT Fax';
            } else if (Array.isArray(filter)) {
              const filters = filter.map(f => f.toString());
              if (filters.includes('/DCTDecode')) {
                format = 'JPEG';
              } else if (filters.includes('/FlateDecode')) {
                format = 'PNG/Flate';
              }
            }

            imageFormatsSet.add(format);
            estimatedImageSize += length;

            largestImages.push({ width, height, size: length, format });
          }

          // Check for fonts
          if (type === PDFName.of('Font')) {
            const baseFont = dict.get(PDFName.of('BaseFont'));
            if (baseFont) {
              const fontName = baseFont.toString().replace(/^\//, '');
              if (!embeddedFonts.includes(fontName)) {
                embeddedFonts.push(fontName);
              }
            }
          }

          // Check for font files (estimating font storage size)
          if (subtype === PDFName.of('FontDescriptor')) {
            const fontFile = dict.get(PDFName.of('FontFile')) || dict.get(PDFName.of('FontFile2')) || dict.get(PDFName.of('FontFile3'));
            if (fontFile) {
              const fontLength = (dict.get(PDFName.of('Length')) as unknown as { value: number })?.value || 0;
              estimatedFontSize += fontLength;
            }
          }

          // Check for metadata
          if (type === PDFName.of('Metadata')) {
            metadataPresent = true;
          }
        } else if (obj instanceof PDFDict) {
          const type = obj.get(PDFName.of('Type'));
          if (type === PDFName.of('Annot')) {
            annotationsPresent = true;
          }
        }
      }
    } catch {
      pageCount = 1;
    }

    largestImages.sort((a, b) => b.size - a.size);
    const topLargestImages = largestImages.slice(0, 5);

    const estimatedTextSize = Math.max(0, fileSize - estimatedImageSize - estimatedFontSize);

    const estimatedLosslessSize = Math.max(
      1024,
      Math.round(estimatedTextSize * 0.92 + estimatedFontSize * 0.95 + estimatedImageSize)
    );

    const estimatedSmartSize = Math.max(
      1024,
      Math.round(estimatedTextSize * 0.85 + estimatedFontSize * 0.90 + estimatedImageSize * 0.35)
    );

    const estimatedHighSize = Math.max(
      1024,
      Math.round(estimatedTextSize * 0.75 + estimatedFontSize * 0.80 + estimatedImageSize * 0.15)
    );

    return {
      fileSize,
      pageCount,
      imageCount,
      largestImages: topLargestImages,
      imageFormats: Array.from(imageFormatsSet),
      estimatedImageSize,
      estimatedTextSize,
      estimatedFontSize,
      embeddedFonts,
      metadataPresent,
      annotationsPresent,
      estimatedLosslessSize,
      estimatedSmartSize,
      estimatedHighSize
    };
  }
}
