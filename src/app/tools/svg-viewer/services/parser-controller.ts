import { Injectable, inject } from '@angular/core';
import { AnalysisController } from './analysis-controller';
import { SvgElementNode, SvgStatistics } from '../../../data/svg.model';

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
