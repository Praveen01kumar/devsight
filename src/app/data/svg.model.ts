export interface SvgElementNode {
  viewerId: string; // generated client-side id for tree tracking and 2-way binding
  tagName: string;
  originalId: string; // id attribute in the SVG
  classes: string[];
  attributes: Record<string, string>;
  children: SvgElementNode[];
  hasChildren: boolean;
}

export interface SvgSelection {
  viewerId: string;
  tagName: string;
  originalId: string;
  classes: string[];
  attributes: Record<string, string>;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SvgStatistics {
  fileName: string;
  fileSize: string;
  width: string;
  height: string;
  viewBox: string;
  totalElements: number;
  pathsCount: number;
  groupsCount: number;
  textCount: number;
  imagesCount: number;
  gradientsCount: number;
  filtersCount: number;
}

export interface SvgColorInfo {
  color: string;
  count: number;
  type: 'fill' | 'stroke' | 'both' | 'unknown';
}

export interface SvgViewState {
  zoom: number;
  panX: number;
  panY: number;
  isFullscreen: boolean;
  theme: 'light' | 'dark';
}

export interface LoadedSvgItem {
  id: string;
  name: string;
  size: number;
  rawSource: string;
  enrichedSvg: string;
  rootNode: SvgElementNode | null;
  stats: SvgStatistics | null;
  colorPalette: SvgColorInfo[];
  expandedIds: Set<string>;
  selectedId: string | null;
}

