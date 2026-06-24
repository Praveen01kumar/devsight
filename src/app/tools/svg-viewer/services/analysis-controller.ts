import { Injectable } from '@angular/core';
import { SvgColorInfo, SvgStatistics } from '../../../data/svg.model';

@Injectable({
  providedIn: 'root',
})
export class AnalysisController {
  /**
   * Traverse the SVG element and gather various structural statistics.
   */
  calculateStatistics(svgElement: SVGSVGElement, fileName: string, fileSizeByte: number): SvgStatistics {
    const totalElements = svgElement.querySelectorAll('*').length + 1; // self + children
    const pathsCount = svgElement.querySelectorAll('path').length;
    const groupsCount = svgElement.querySelectorAll('g').length;
    const textCount = svgElement.querySelectorAll('text, tspan').length;
    const imagesCount = svgElement.querySelectorAll('image').length;
    const gradientsCount = svgElement.querySelectorAll('linearGradient, radialGradient').length;
    const filtersCount = svgElement.querySelectorAll('filter').length;

    // Read attributes of svg itself
    const width = svgElement.getAttribute('width') || '100%';
    const height = svgElement.getAttribute('height') || '100%';
    const viewBox = svgElement.getAttribute('viewBox') || 'None';

    const fileSize = this.formatBytes(fileSizeByte);

    return { fileName, fileSize, width, height, viewBox, totalElements, pathsCount, groupsCount, textCount, imagesCount, gradientsCount, filtersCount, };
  }

  /**
   * Analyzes colors used under an SVG element and returns a list of unique colors.
   */
  extractColorPalette(svgContent: string): SvgColorInfo[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    if (!svgElement) return [];

    const elements = svgElement.querySelectorAll('*');
    const colorMap = new Map<string, { fillCount: number; strokeCount: number }>();

    const addColor = (color: string | null, type: 'fill' | 'stroke') => {
      if (!color) return;
      const cleanColor = color.trim().toLowerCase();

      // Skip non-color attributes
      if (
        cleanColor === 'none' ||
        cleanColor === 'transparent' ||
        cleanColor === 'inherit' ||
        cleanColor === 'initial' ||
        cleanColor === 'unset' ||
        cleanColor.startsWith('url(')
      ) {
        return;
      }

      // Standardize simple hex colors
      let normalizedColor = cleanColor;
      if (normalizedColor.startsWith('#') && normalizedColor.length === 4) {
        normalizedColor = '#' + normalizedColor[1] + normalizedColor[1] + normalizedColor[2] + normalizedColor[2] + normalizedColor[3] + normalizedColor[3];
      }

      const existing = colorMap.get(normalizedColor) || { fillCount: 0, strokeCount: 0 };
      if (type === 'fill') {
        existing.fillCount++;
      } else {
        existing.strokeCount++;
      }
      colorMap.set(normalizedColor, existing);
    };

    // Helper to extract properties from style attribute or stylesheet string
    const extractFromStyleString = (styleStr: string, element: Element) => {
      const fillMatch = styleStr.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
      const strokeMatch = styleStr.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i);
      if (fillMatch) {
        addColor(fillMatch[1], 'fill');
      } else if (element.getAttribute('fill')) {
        addColor(element.getAttribute('fill'), 'fill');
      }
      if (strokeMatch) {
        addColor(strokeMatch[1], 'stroke');
      } else if (element.getAttribute('stroke')) {
        addColor(element.getAttribute('stroke'), 'stroke');
      }
    };

    // Process root too
    const rootFill = svgElement.getAttribute('fill');
    const rootStroke = svgElement.getAttribute('stroke');
    const rootStyle = svgElement.getAttribute('style');
    if (rootStyle) {
      extractFromStyleString(rootStyle, svgElement);
    } else {
      if (rootFill) addColor(rootFill, 'fill');
      if (rootStroke) addColor(rootStroke, 'stroke');
    }

    elements.forEach((el) => {
      const style = el.getAttribute('style');
      if (style) {
        extractFromStyleString(style, el);
      } else {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill) addColor(fill, 'fill');
        if (stroke) addColor(stroke, 'stroke');
      }
    });

    const result: SvgColorInfo[] = [];
    colorMap.forEach((counts, color) => {
      let type: 'fill' | 'stroke' | 'both' | 'unknown' = 'unknown';
      if (counts.fillCount > 0 && counts.strokeCount > 0) {
        type = 'both';
      } else if (counts.fillCount > 0) {
        type = 'fill';
      } else if (counts.strokeCount > 0) {
        type = 'stroke';
      }
      result.push({
        color,
        count: counts.fillCount + counts.strokeCount,
        type,
      });
    });

    // Sort by count (frequency) descending
    return result.sort((a, b) => b.count - a.count);
  }

  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
