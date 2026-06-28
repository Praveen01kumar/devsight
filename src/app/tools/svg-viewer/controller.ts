import { computed, inject, Injectable, signal } from '@angular/core';
import { SvgColorInfo, SvgElementNode, SvgStatistics } from '../../data/svg.model';

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


@Injectable({
  providedIn: 'root',
})
export class ParserController {
  private analysis = inject(AnalysisController);

  /**
   * Parses the raw SVG XML string, injects unique tracking IDs (viewerId),
   * and builds both the enriched SVG string and the logical hierarchical element tree.
   */
  parse(rawSvg: string, fileName = 'image.svg', fileSizeByte = 0): {
    enrichedSvg: string;
    rootNode: SvgElementNode | null;
    stats: SvgStatistics;
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg, 'image/svg+xml');

    // Check for XML parsing error
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error(parserError.textContent || 'Failed to parse XML content. Ensure the file is a valid SVG.');
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      throw new Error('Not a valid SVG file: No <svg> root element found.');
    }

    // Reset viewer IDs and inject them recursively
    let counter = 0;
    const buildTree = (el: Element): SvgElementNode => {
      const viewerId = `v-${counter++}`;
      el.setAttribute('data-svg-viewer-id', viewerId);

      // Extract attributes
      const attributes: Record<string, string> = {};
      const attrNames = el.getAttributeNames();
      for (const name of attrNames) {
        attributes[name] = el.getAttribute(name) || '';
      }

      // Read classes
      const classes = el.classList ? Array.from(el.classList) : [];

      // Process children
      const children: SvgElementNode[] = [];
      for (const child of Array.from(el.children)) {
        children.push(buildTree(child));
      }

      return { viewerId, tagName: el.tagName, originalId: el.getAttribute('id') || '', classes, attributes, children, hasChildren: children.length > 0 };
    };

    const rootNode = buildTree(svgElement);

    // Calculate statistics
    const stats = this.analysis.calculateStatistics(svgElement, fileName, fileSizeByte);

    // Serialize enriched DOM back to string
    const serializer = new XMLSerializer();
    const enrichedSvg = serializer.serializeToString(svgElement);

    return { enrichedSvg, rootNode, stats };
  }
}


@Injectable({
  providedIn: 'root'
})
export class SelectionController {
  // Currently selected elements viewerId
  selectedId = signal<string | null>(null);

  // We can also keep a flat map of nodes or a reference to the root node to easily find a node by its viewerId.
  rootNode = signal<SvgElementNode | null>(null);

  // Bounding box of the selected element in the canvas client coordinate space
  selectedBBox = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  // Callback signature to hook and catch interactive styling modification events from the properties inspector
  onElementAttributeModified?: (viewerId: string, attrKey: string, attrValue: string) => void;

  // Computed signal to easily resolve the SvgElementNode for the currently selectedId
  selectedNode = computed<SvgElementNode | null>(() => {
    const id = this.selectedId();
    const root = this.rootNode();
    if (!id || !root) return null;
    return this.findNodeById(root, id);
  });

  // Flat list of search matches
  searchResults = signal<string[]>([]);
  searchIndex = signal<number>(-1);

  // Set the root node whenever an SVG is loaded
  setRoot(node: SvgElementNode | null) {
    this.rootNode.set(node);
    this.selectedId.set(null);
    this.selectedBBox.set(null);
    this.searchResults.set([]);
    this.searchIndex.set(-1);
  }

  // Select an element by its ID
  select(id: string | null) {
    this.selectedId.set(id);
    if (!id) {
      this.selectedBBox.set(null);
    } else {
      // Find bounding box in the rendered DOM
      this.updateBBox(id);
    }
  }

  // Find a node by ID in the tree
  findNodeById(node: SvgElementNode, id: string): SvgElementNode | null {
    if (node.viewerId === id) return node;
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }

  // Update selection bounding box from direct DOM query
  updateBBox(id: string) {
    setTimeout(() => {
      const realEl = document.querySelector(`[data-svg-viewer-id="${id}"]`);
      if (realEl) {
        if (realEl instanceof SVGGraphicsElement) {
          try {
            // Note: SVG's local coordinate getBBox can be very useful:
            const bbox = realEl.getBBox();
            this.selectedBBox.set({
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
            });
            return;
          } catch {
            // fallback if not yet measured or doesn't support getBBox
          }
        }
        // Fallback to bounding client rect
        const rect = realEl.getBoundingClientRect();
        this.selectedBBox.set({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        this.selectedBBox.set(null);
      }
    }, 10);
  }

  // Perform search of elements in node tree by tag, id, class, or text
  search(query: string) {
    const root = this.rootNode();
    if (!root || !query.trim()) {
      this.searchResults.set([]);
      this.searchIndex.set(-1);
      return;
    }

    const term = query.toLowerCase().trim();
    const matches: string[] = [];

    const traverse = (node: SvgElementNode) => {
      let isMatch = false;
      if (node.tagName.toLowerCase().includes(term)) {
        isMatch = true;
      } else if (node.originalId && node.originalId.toLowerCase().includes(term)) {
        isMatch = true;
      } else if (node.classes.some(c => c.toLowerCase().includes(term))) {
        isMatch = true;
      } else {
        // Check attributes values too
        for (const key in node.attributes) {
          if (node.attributes[key].toLowerCase().includes(term)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        matches.push(node.viewerId);
      }

      node.children.forEach(traverse);
    };

    traverse(root);
    this.searchResults.set(matches);
    this.searchIndex.set(matches.length > 0 ? 0 : -1);

    if (matches.length > 0) {
      this.select(matches[0]);
    }
  }

  // Navigate next search match
  nextSearchResult() {
    const matches = this.searchResults();
    if (matches.length === 0) return;
    const currentIndex = this.searchIndex();
    const nextIndex = (currentIndex + 1) % matches.length;
    this.searchIndex.set(nextIndex);
    this.select(matches[nextIndex]);
  }

  // Navigate previous search match
  prevSearchResult() {
    const matches = this.searchResults();
    if (matches.length === 0) return;
    const currentIndex = this.searchIndex();
    const prevIndex = (currentIndex - 1 + matches.length) % matches.length;
    this.searchIndex.set(prevIndex);
    this.select(matches[prevIndex]);
  }
}



@Injectable({
  providedIn: 'root',
})
export class ViewerController {
  zoom = signal<number>(1);
  panX = signal<number>(0);
  panY = signal<number>(0);
  isFullscreen = signal<boolean>(false);
  theme = signal<'dark' | 'light'>('dark');

  // Zoom control limits
  readonly minZoom = 0.05;
  readonly maxZoom = 40;

  zoomIn() {
    this.zoom.update((z:number) => Math.min(this.maxZoom, z * 1.25));
  }

  zoomOut() {
    this.zoom.update((z:number) => Math.max(this.minZoom, z * 0.8));
  }

  resetView() {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  setZoom(value: number) {
    this.zoom.set(Math.max(this.minZoom, Math.min(this.maxZoom, value)));
  }

  pan(dx: number, dy: number) {
    this.panX.update(x => x + dx);
    this.panY.update(y => y + dy);
  }

  setPan(x: number, y: number) {
    this.panX.set(x);
    this.panY.set(y);
  }

  toggleTheme() {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  toggleFullscreen(element?: HTMLElement) {
    if (!document.fullscreenElement) {
      const target = element || document.documentElement;
      target.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch((err) => {
        console.error('Error enabling fullscreen root element:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      }).catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }

  fitToScreen(containerWidth: number, containerHeight: number, svgWidth: number, svgHeight: number) {
    if (!svgWidth || !svgHeight || !containerWidth || !containerHeight) return;

    // Put a healthy margin (e.g. 5%)
    const padding = 40;
    const availWidth = containerWidth - padding;
    const availHeight = containerHeight - padding;

    const scaleX = availWidth / svgWidth;
    const scaleY = availHeight / svgHeight;
    const fitScale = Math.min(scaleX, scaleY, 4); // limit extreme upscale if tiny

    this.zoom.set(fitScale);
    // Center it
    const offsetLeft = (containerWidth - svgWidth * fitScale) / 2;
    const offsetTop = (containerHeight - svgHeight * fitScale) / 2;
    this.panX.set(offsetLeft);
    this.panY.set(offsetTop);
  }
}
