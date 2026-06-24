import { Injectable, signal, computed } from '@angular/core';
import { SvgElementNode } from '../../../data/svg.model';

@Injectable({
  providedIn: 'root',
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
      } else if (node.classes.some((c:any) => c.toLowerCase().includes(term))) {
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
