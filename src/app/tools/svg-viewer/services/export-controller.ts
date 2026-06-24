import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ExportController {
  /**
   * Helper to trigger download of a string or blob url
   */
  private triggerDownload(url: string, filename: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports an SVG string directly as a downloadable .svg file
   */
  exportAsSvg(svgContent: string, fileName = 'image.svg') {
    // Standardize namespace definitions
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, fileName);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports an SVG content string as a high-resolution PNG image
   */
  exportAsPng(svgContent: string, width: number, height: number, fileName = 'image.png') {
    // If original width/height aren't available, default to reasonable dimensions
    const finalWidth = width || 800;
    const finalHeight = height || 600;

    const img = new Image();
    // Standardize namespace definitions
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth * 2; // Exporting 2x super-sampled for crispness
      canvas.height = finalHeight * 2;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Transparent or white background can be set. Let's make it transparent but clean
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        try {
          const pngUrl = canvas.toDataURL('image/png');
          this.triggerDownload(pngUrl, fileName);
        } catch {
          console.error('PNG conversion blocked due to security/unsecured external assets');
        }
      }
      URL.revokeObjectURL(url);
    };

    img.onerror = (err) => {
      console.error('Failed to load SVG into HTMLImageElement for PNG drawing:', err);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  /**
   * Extract a single selected element from SVG content and exports as a standalone SVG file.
   */
  exportElementAsSvg(viewerId: string, originalId: string, tagName: string) {
    const element = document.querySelector(`[data-svg-viewer-id="${viewerId}"]`);
    if (!element) {
      console.error(`Cannot find element for viewerId: ${viewerId}`);
      return;
    }

    // Clone element and place in a temporary SVG wrapper container
    const cloned = element.cloneNode(true) as SVGGraphicsElement;
    cloned.removeAttribute('data-svg-viewer-id'); // clean tracking id in export

    let bbox = { x: 0, y: 0, width: 100, height: 100 };
    if (element instanceof SVGGraphicsElement) {
      try {
        bbox = element.getBBox();
      } catch {
        const rect = element.getBoundingClientRect();
        bbox = { x: 0, y: 0, width: rect.width || 100, height: rect.height || 100 };
      }
    }

    const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgWrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgWrapper.setAttribute('width', bbox.width.toFixed(1));
    svgWrapper.setAttribute('height', bbox.height.toFixed(1));
    svgWrapper.setAttribute('viewBox', `${bbox.x.toFixed(1)} ${bbox.y.toFixed(1)} ${bbox.width.toFixed(1)} ${bbox.height.toFixed(1)}`);
    svgWrapper.appendChild(cloned);

    // Read defs from original root to transfer gradients or clipPaths if referenced
    const originalRoot = element.closest('svg');
    if (originalRoot) {
      const defs = originalRoot.querySelector('defs');
      if (defs) {
        svgWrapper.insertBefore(defs.cloneNode(true), cloned);
      }
    }

    const serializer = new XMLSerializer();
    const finalContent = serializer.serializeToString(svgWrapper);
    const downloadName = `${originalId || tagName.toLowerCase()}_element.svg`;

    this.exportAsSvg(finalContent, downloadName);
  }

  /**
   * Extract selected element and exports as PNG
   */
  exportElementAsPng(viewerId: string, originalId: string, tagName: string) {
    const element = document.querySelector(`[data-svg-viewer-id="${viewerId}"]`);
    if (!element) return;

    let bbox = { x: 0, y: 0, width: 200, height: 200 };
    if (element instanceof SVGGraphicsElement) {
      try {
        bbox = element.getBBox();
      } catch {
        const rect = element.getBoundingClientRect();
        bbox = { x: 0, y: 0, width: rect.width || 200, height: rect.height || 200 };
      }
    }

    const cloned = element.cloneNode(true) as SVGGraphicsElement;
    cloned.removeAttribute('data-svg-viewer-id');

    const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgWrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgWrapper.setAttribute('width', bbox.width.toFixed(1));
    svgWrapper.setAttribute('height', bbox.height.toFixed(1));
    svgWrapper.setAttribute('viewBox', `${bbox.x.toFixed(1)} ${bbox.y.toFixed(1)} ${bbox.width.toFixed(1)} ${bbox.height.toFixed(1)}`);
    svgWrapper.appendChild(cloned);

    const originalRoot = element.closest('svg');
    if (originalRoot) {
      const defs = originalRoot.querySelector('defs');
      if (defs) {
        svgWrapper.insertBefore(defs.cloneNode(true), cloned);
      }
    }

    const serializer = new XMLSerializer();
    const finalContent = serializer.serializeToString(svgWrapper);
    const downloadName = `${originalId || tagName.toLowerCase()}_element.png`;

    this.exportAsPng(finalContent, Math.max(50, bbox.width), Math.max(50, bbox.height), downloadName);
  }
}
