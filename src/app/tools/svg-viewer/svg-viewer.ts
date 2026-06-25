import { ChangeDetectionStrategy, Component, HostListener, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// Subcomponents imports
import { SvgToolbar } from './svg-toolbar';
import { SvgCanvas } from './svg-canvas';
import { SvgTree } from './svg-tree';
import { SvgSearch } from './svg-search';
import { SvgInspector } from './svg-inspector';
import { SvgStatistics } from './svg-statistics';
import { SvgPalette } from './svg-palette';
import { SvgSource } from './svg-source';
import { Minimap } from './minimap';

// Services/Controllers imports

// Models
import { SvgElementNode, SvgStatistics as StatsModel, SvgColorInfo, LoadedSvgItem } from '../../data/svg.model';
import { ParserController } from './services/parser-controller';
import { SelectionController } from './services/selection-controller';
import { ViewerController } from './services/viewer-controller';
import { AnalysisController } from './services/analysis-controller';
import { DEMO_SVGS } from '../../data/demo-templates';


@Component({
  selector: 'app-svg-viewer-root',
  standalone: true,
  imports: [CommonModule, MatIconModule, SvgToolbar, SvgCanvas, SvgTree, SvgSearch, SvgInspector, SvgStatistics, SvgPalette, SvgSource, Minimap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bg-white dark:bg-emerald-900 w-full h-full min-h-[600px] max-h-[600px] flex flex-col text-slate-100 overflow-hidden font-sans select-none rounded-2xl"
      [class.light-mode]="theme() === 'light'">
      <!-- Top Toolbar section -->
      <app-svg-toolbar (svg-file-load-payload)="onFileLoadedViaToolbar($event)"></app-svg-toolbar>
      <!-- Main Three-Pane Layout Workspace -->
      <div class="flex-1 flex min-h-0 relative">
        <!-- Left Toggle -->
        <button
            (click)="toggleLeftSidebar()"
            class="cursor-pointer flex absolute cursor-pointer left-0 top-2 z-50 bg-white/10 border border-slate-700 rounded-r-md p-0 text-white shadow-lg">
            <mat-icon>
            {{ isLeftSidebarOpen() ? 'chevron_left' : 'chevron_right' }}
            </mat-icon>
        </button>

        <!-- Right Toggle -->
        <button
            (click)="toggleRightSidebar()"
            class="cursor-pointer flex absolute cursor-pointer right-0 top-2 z-50 bg-white/10 border border-slate-700 rounded-l-md p-0 text-white shadow-lg">
            <mat-icon>
            {{ isRightSidebarOpen() ? 'chevron_right' : 'chevron_left' }}
            </mat-icon>
        </button>
        <!-- ================= LEFT SIDEBAR ================= -->
        <!-- Collapsible Tree navigation Panel / Multiple SVG Files Pane -->
        @if (isLeftSidebarOpen()) {
          <div class="w-80 border-r border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden shrink-0">
            <!-- Left Side Dual Tab Selector -->
            <div class="flex border-b border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/40 p-1 shrink-0">
              <button 
                id="tab-layers-btn"
                (click)="leftTab.set('layers')"
                [class.bg-emerald-100]="leftTab() === 'layers'"
                [class.dark\:bg-emerald-900\/40]="leftTab() === 'layers'"
                [class.text-emerald-700]="leftTab() === 'layers'"
                [class.dark\:text-emerald-400]="leftTab() === 'layers'"
                [class.text-slate-400]="leftTab() !== 'layers'"
                class="cursor-pointer flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 focus:outline-none select-none">
                <mat-icon class="text-base w-4 h-4">auto_awesome_motion</mat-icon>
                <span>Layers</span>
              </button>
              <button 
                id="tab-files-btn"
                (click)="leftTab.set('files')"
                [class.bg-emerald-100]="leftTab() === 'files'"
                [class.dark\:bg-emerald-900\/40]="leftTab() === 'files'"
                [class.text-emerald-700]="leftTab() === 'files'"
                [class.dark\:text-emerald-400]="leftTab() === 'files'"
                [class.text-slate-400]="leftTab() !== 'files'"
                class="cursor-pointer flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 focus:outline-none select-none">
                <mat-icon class="text-base w-4 h-4">folder_open</mat-icon>
                <span>Files ({{ loadedSvgs().length }})</span>
              </button>
            </div>

            @if (leftTab() === 'layers') {
              <!-- Search field -->
              <app-svg-search #searchBar></app-svg-search>

              <!-- Tree Hierarchy container -->
              <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 px-1 bg-zinc-50 dark:bg-zinc-950/20">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">SVG Element Nodes</span>
                  <button 
                    id="tree-collapse-all-btn"
                    title="Collapse All Nodes"
                    (click)="collapseAllNodes()"
                    class="cursor-pointer p-1 hover:bg-zinc-800 text-slate-500 hover:text-slate-300 rounded transition-colors">
                    <mat-icon class="text-base w-4 h-4">compress</mat-icon>
                  </button>
                </div>

                @if (rootNode()) {
                  <div class="py-2">
                    <app-svg-tree 
                      [node]="rootNode()!" 
                      [selectedId]="selectedId()"
                      [expandedIds]="expandedIds()"
                      (toggleExpandEvent)="toggleNodeExpand($event)"
                      (nodeSelected)="selectNodeFromTree($event)">
                    </app-svg-tree>
                  </div>
                } @else {
                  <!-- Empty Tree state -->
                  <div class="h-44 flex flex-col items-center justify-center text-center p-3 select-none text-slate-600">
                    <mat-icon class="text-2xl mb-1 text-slate-700">account_tree</mat-icon>
                    <p class="text-[11px]">No nodes to display. Open an SVG.</p>
                  </div>
                }
              </div>
            } @else {
              <!-- Files Listing Manager View -->
              <div class="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden">
                <div class="p-3 border-b border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">My SVG Workspace</span>
                  <button 
                    id="add-sidebar-svg-btn"
                    (click)="sidebarFileInput.click()"
                    class="cursor-pointer px-2.5 py-1 text-[10px] font-semibold bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-600/5 active:bg-sky-700 text-white rounded-lg flex items-center space-x-1 transition-colors">
                    <mat-icon class="text-xs w-3 h-3">add</mat-icon>
                    <span>Add SVG</span>
                  </button>
                  <input #sidebarFileInput id="sidebarFileInput" type="file" accept=".svg" class="hidden" (change)="onSidebarFileLoaded($event)">
                </div>

                <!-- Scrollable Files List -->
                <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                  @if (loadedSvgs().length === 0) {
                    <div class="text-center p-8 text-slate-500 text-xs">
                      <mat-icon class="text-2xl mb-2 text-slate-600 block mx-auto">folder_off</mat-icon>
                      No SVGs loaded. Click "Add SVG" or choose an example below.
                    </div>
                  } @else {
                    @for (svg of loadedSvgs(); track svg.id) {
                      <div [class.bg-emerald-100]="svg.id === activeSvgId()"
                        [class.dark\:bg-emerald-900\/40]="svg.id === activeSvgId()"
                        [class.border-l-2]="svg.id === activeSvgId()"
                        [class.border-sky-500]="svg.id === activeSvgId()"
                        [class.dark\:bg-zinc-950\/20]="svg.id !== activeSvgId()"
                        class="p-2 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 hover:bg-zinc-800/40 cursor-pointer flex items-center justify-between group rounded transition-all"
                        (click)="switchSvg(svg.id)">
                        <div class="flex items-center space-x-2 truncate min-w-0 pr-1">
                          <mat-icon
                            [class.text-sky-500]="svg.id === activeSvgId()"
                            [class.text-slate-400]="svg.id !== activeSvgId()"
                            class="text-base h-4 w-4">
                            insert_drive_file
                          </mat-icon>
                          <div class="truncate flex flex-col">
                            <span class="text-[11px] font-semibold text-slate-100 truncate">{{ svg.name }}</span>
                            <span class="text-[9px] font-mono text-slate-500">{{ formatSize(svg.size) }}</span>
                          </div>
                        </div>

                        <!-- Action buttons on hover -->
                        <div class="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <!-- Delete file -->
                          <button 
                            class="cursor-pointer p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                            title="Remove file"
                            (click)="removeSvg($event, svg.id)">
                            <mat-icon class="text-xs h-3.5 w-3.5 flex items-center justify-center">delete</mat-icon>
                          </button>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- ================= CENTER WORKSPACE ================= -->
        <div class="flex-1 flex flex-col relative bg-zinc-50 dark:bg-zinc-950 min-w-0">
          <div class="flex-1 relative min-h-0">
            <!-- Active Canvas Board -->
            <app-svg-canvas #svgCanvas [svgHtml]="enrichedSvg()" (uploadFile)="onLocalFileUploaded($event)">
            </app-svg-canvas>
            <!-- Draggable Floating Minimap Navigator -->
            @if (rootNode() && isMinimapVisible()) {
              <app-minimap></app-minimap>
            }
          </div>

          <!-- ================= COLLAPSIBLE BOTTOM panel ================= -->
          <!-- Source Code code editor -->
          @if (isSourceOpen()) {
            <div class="h-72 border-t border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 relative">
              <app-svg-source [rawSource]="rawSource()" [fileName]="fileName()" (reloadSource)="onSourceReloaded($event)">
              </app-svg-source>
              <!-- Close Source drawer button -->
              <button 
                id="close-source-drawer-btn"
                title="Collapse Source Viewer"
                (click)="toggleSourceDrawer()"
                class="cursor-pointer absolute right-4 top-2 px-2.5 py-1 text-[10px] font-semibold bg-zinc-800 hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 transition-colors flex items-center space-x-1 z-50">
                <mat-icon class="text-sm w-4 h-4">keyboard_arrow_down</mat-icon>
              </button>
            </div>
          } @else {
            <!-- Mini handle bar to offer easy swipe up drawer action -->
            <div class="h-10 bg-white dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 px-4 py-1 flex items-center justify-between select-none font-sans shrink-0">
              <div class="flex items-center space-x-2 text-slate-400">
                <mat-icon class="text-sm">code</mat-icon>
                <span class="text-[10px] font-semibold uppercase tracking-wider">Source code viewer closed</span>
              </div>
              <button
                id="expand-source-drawer-btn"
                title="Expand Source Pane"
                (click)="toggleSourceDrawer()"
                class="cursor-pointer px-2 py-0.5 bg-zinc-800 text-[10px] hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 transition-colors flex items-center space-x-1 font-bold">
                <mat-icon class="text-xs">keyboard_arrow_up</mat-icon>
                <span>Show XML Source</span>
              </button>
            </div>
          }

        </div>

        <!-- ================= RIGHT SIDEBAR ================= -->
        <!-- Properties Inspector sidebar split tabs -->
        @if (isRightSidebarOpen()) {
          <div class="w-80 border-l border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden shrink-0 select-none">
            <!-- Dual Tab Switcher -->
            <div class="flex border-b border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 font-sans p-1">
              <button id="tab-inspector-btn"
                (click)="rightTab.set('inspector')"
                [class.bg-emerald-100]="rightTab() === 'inspector'"
                [class.dark\:bg-emerald-900\/40]="rightTab() === 'inspector'"
                [class.text-emerald-700]="rightTab() === 'inspector'"
                [class.dark\:text-emerald-400]="rightTab() === 'inspector'"
                [class.text-slate-400]="rightTab() !== 'inspector'"
                class="cursor-pointer flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 focus:outline-none">
                <mat-icon class="text-base">tune</mat-icon>
                <span>Inspector</span>
              </button>
              <button id="tab-analytics-btn"
                (click)="rightTab.set('analytics')"
                [class.bg-emerald-100]="rightTab() === 'analytics'"
                [class.dark\:bg-emerald-900\/40]="rightTab() === 'analytics'"
                [class.text-emerald-700]="rightTab() === 'analytics'"
                [class.dark\:text-emerald-400]="rightTab() === 'analytics'"
                [class.text-slate-400]="rightTab() !== 'analytics'"
                class="cursor-pointer flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 focus:outline-none">
                <mat-icon class="text-base">bar_chart</mat-icon>
                <span>Analytics</span>
              </button>
            </div>

            <!-- Scrollable Side Tab Views -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-zinc-900 select-none">
              @if (rightTab() === 'inspector') {
                <app-svg-inspector></app-svg-inspector>
              } @else {
                <div class="space-y-6">
                  <!-- File analytics spec metrics card -->
                  <app-svg-statistics [stats]="stats()"></app-svg-statistics>

                  <div class="h-px bg-zinc-800"></div>

                  <!-- Extracted color swatches map -->
                  <app-svg-palette [colors]="colorPalette()"></app-svg-palette>
                </div>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `,
  host: {
    '(window:svg-file-load-payload)': 'onFileLoadedViaToolbar($event)'
  },
  styles: [`
    /* Scrollbar Styling customized */
    ::ng-deep .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::ng-deep .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
    }
    ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class SvgViewer {
  private readonly parser = inject(ParserController);
  private readonly selection = inject(SelectionController);
  private readonly viewer = inject(ViewerController);
  private readonly analysis = inject(AnalysisController);

  @ViewChild('searchBar') searchBarRef!: SvgSearch;
  @ViewChild('svgCanvas') canvasRef!: SvgCanvas;

  // Global theme signal linked from service
  theme = this.viewer.theme;

  // View states
  isLeftSidebarOpen = signal<boolean>(true);
  isRightSidebarOpen = signal<boolean>(false);
  isSourceOpen = signal<boolean>(false);
  isMinimapVisible = signal<boolean>(true);
  rightTab = signal<'inspector' | 'analytics'>('inspector');
  leftTab = signal<'layers' | 'files'>('files');

  // Multi-SVG Data store
  loadedSvgs = signal<LoadedSvgItem[]>([]);
  activeSvgId = signal<string | null>(null);

  // SVG Data signals
  fileName = signal<string>('image.svg');
  rawSource = signal<string>('');
  enrichedSvg = signal<string>('');
  rootNode = signal<SvgElementNode | null>(null);
  stats = signal<StatsModel | null>(null);
  colorPalette = signal<SvgColorInfo[]>([]);

  // Selection states mapped from selection controller
  selectedId = this.selection.selectedId;
  expandedIds = signal<Set<string>>(new Set<string>());

  constructor() {
    // Intercept active element property updates from inspector
    this.selection.onElementAttributeModified = (viewerId, attrKey, attrValue) => {
      this.updateAttributeInActiveSvg(viewerId, attrKey, attrValue);
    };

    // Automatically pre-load demo files into workspace on init
    this.initDemoFiles();

    // Automatically expand the root node of the SVG when loaded
    effect(() => {
      const root = this.rootNode();
      if (root) {
        this.expandedIds.update((set) => {
          const fresh = new Set(set);
          fresh.add(root.viewerId);
          // expand second level children groups as well for convenience
          root.children.forEach((c: SvgElementNode) => {
            if (c.tagName.toLowerCase() === 'g') {
              fresh.add(c.viewerId);
            }
          });
          return fresh;
        });
      }
    });

    // Make sure we select inspector sheet when selecting nodes
    effect(() => {
      const selected = this.selectedId();
      if (selected) {
        this.rightTab.set('inspector');
        this.autoExpandAncestorsOfSelected(selected);
      }
    });
  }

  // Keyboard Shortcuts Listening
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;

    if (isCtrl && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      // Click hidden input insidetoolbar upload
      const btn = document.querySelector('label[id="toolbar-upload-btn"] input[type="file"]') as HTMLInputElement;
      if (btn) btn.click();
    } else if (isCtrl && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      this.viewer.zoomIn();
    } else if (isCtrl && event.key === '-') {
      event.preventDefault();
      this.viewer.zoomOut();
    } else if (isCtrl && event.key === '0') {
      event.preventDefault();
      this.viewer.resetView();
    } else if (isCtrl && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.isLeftSidebarOpen.set(true);
      setTimeout(() => {
        if (this.searchBarRef) {
          this.searchBarRef.focusInput();
        }
      }, 100);
    }
  }

  // Recurse parents of selected node to auto expand them in the tree view
  private autoExpandAncestorsOfSelected(selectedId: string) {
    const root = this.rootNode();
    if (!root) return;

    const path: string[] = [];
    const findPath = (node: SvgElementNode, targetId: string): boolean => {
      if (node.viewerId === targetId) return true;
      for (const child of node.children) {
        if (findPath(child, targetId)) {
          path.push(node.viewerId);
          return true;
        }
      }
      return false;
    };

    findPath(root, selectedId);
    if (path.length > 0) {
      this.expandedIds.update((set) => {
        const fresh = new Set(set);
        path.forEach((p) => fresh.add(p));
        return fresh;
      });

      // Scroll into view in element list panel
      setTimeout(() => {
        const item = document.getElementById(`tree-item-${selectedId}`);
        if (item) {
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }

  // Tree action handlers
  toggleNodeExpand(id: string) {
    this.expandedIds.update((set) => {
      const fresh = new Set(set);
      if (fresh.has(id)) {
        fresh.delete(id);
      } else {
        fresh.add(id);
      }
      return fresh;
    });
  }

  collapseAllNodes() {
    this.expandedIds.set(new Set<string>());
    const r = this.rootNode();
    if (r) {
      this.expandedIds.update((s) => {
        const f = new Set(s);
        f.add(r.viewerId);
        return f;
      });
    }
  }

  selectNodeFromTree(id: string) {
    this.selection.select(id);
  }

  // File loading/workspace methods
  initDemoFiles() {
    this.addDemoToWorkspace('rocket');
    this.addDemoToWorkspace('gear');
    this.leftTab.set('files');
  }

  addDemoToWorkspace(type: 'rocket' | 'sunset' | 'gear' | 'tree') {
    const asset = DEMO_SVGS[type];
    if (asset) {
      try {
        const { enrichedSvg, rootNode, stats } = this.parser.parse(asset.content, asset.name, asset.content.length);
        const colors = this.analysis.extractColorPalette(asset.content);
        const newId = 'svg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const newItem: LoadedSvgItem = {
          id: newId,
          name: asset.name,
          size: asset.content.length,
          rawSource: asset.content,
          enrichedSvg: enrichedSvg,
          rootNode: rootNode,
          stats: stats,
          colorPalette: colors,
          expandedIds: new Set<string>(rootNode ? [rootNode.viewerId] : []),
          selectedId: null
        };
        this.loadedSvgs.update((list) => [...list, newItem]);
        // If no active SVG, set this one active
        if (!this.activeSvgId()) {
          this.activeSvgId.set(newId);
          this.applySvgToView(newItem);
        }
      } catch (e) {
        console.error('Failed to pre-load demo SVG asset:', e);
      }
    }
  }

  onSidebarFileLoaded(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.loadSVGContent(content, file.name, file.size);
      };
      reader.readAsText(file);
    }
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private saveCurrentSvgState(id: string) {
    const currentSelectedId = this.selectedId();
    const currentExpandedIds = new Set(this.expandedIds());

    this.loadedSvgs.update((list) =>
      list.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            selectedId: currentSelectedId,
            expandedIds: currentExpandedIds
          };
        }
        return item;
      })
    );
  }

  private applySvgToView(item: LoadedSvgItem) {
    this.fileName.set(item.name);
    this.rawSource.set(item.rawSource);
    this.enrichedSvg.set(item.enrichedSvg);
    this.rootNode.set(item.rootNode);
    this.stats.set(item.stats);
    this.colorPalette.set(item.colorPalette);
    this.selection.setRoot(item.rootNode);
    this.selection.select(item.selectedId);
    this.expandedIds.set(new Set(item.expandedIds));

    // Refit layout to fit active canvas dimensions
    setTimeout(() => {
      if (this.canvasRef) {
        this.canvasRef.fitViewToViewport();
      }
    }, 150);
  }

  switchSvg(targetId: string) {
    const currentActiveId = this.activeSvgId();
    if (currentActiveId === targetId) return;

    if (currentActiveId) {
      this.saveCurrentSvgState(currentActiveId);
    }

    const targetItem = this.loadedSvgs().find((item) => item.id === targetId);
    if (targetItem) {
      this.activeSvgId.set(targetId);
      this.applySvgToView(targetItem);
      // Auto switch Left Tab to Layers to explore element layers easily
      this.leftTab.set('layers');
    }
  }

  removeSvg(event: Event, id: string) {
    event.stopPropagation();
    const isActive = this.activeSvgId() === id;
    this.loadedSvgs.update((list) => list.filter((item) => item.id !== id));

    if (isActive) {
      const remaining = this.loadedSvgs();
      if (remaining.length > 0) {
        const first = remaining[0];
        this.activeSvgId.set(first.id);
        this.applySvgToView(first);
      } else {
        // Clear active stats and views
        this.activeSvgId.set(null);
        this.fileName.set('');
        this.rawSource.set('');
        this.enrichedSvg.set('');
        this.rootNode.set(null);
        this.stats.set(null);
        this.colorPalette.set([]);
        this.selection.setRoot(null);
        this.selection.select(null);
        this.expandedIds.set(new Set());
      }
    }
  }

  onSourceReloaded(newCode: string) {
    this.updateActiveSVGContent(newCode);
  }

  onLocalFileUploaded(file: { content: string; name: string; size: number }) {
    this.loadSVGContent(file.content, file.name, file.size);
  }

  onFileLoadedViaToolbar(event: Event) {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      const payload = customEvent.detail;
      this.loadSVGContent(payload.content, payload.name, payload.size);
    }
  }

  private loadSVGContent(rawXml: string, name: string, sizeByte: number) {
    try {
      // Prior to switching, save state of current active
      const currentActiveId = this.activeSvgId();
      if (currentActiveId) {
        this.saveCurrentSvgState(currentActiveId);
      }

      const { enrichedSvg, rootNode, stats } = this.parser.parse(rawXml, name, sizeByte);
      const colors = this.analysis.extractColorPalette(rawXml);

      const newId = 'svg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const newItem: LoadedSvgItem = {
        id: newId,
        name: name || 'untitled.svg',
        size: sizeByte,
        rawSource: rawXml,
        enrichedSvg: enrichedSvg,
        rootNode: rootNode,
        stats: stats,
        colorPalette: colors,
        expandedIds: new Set<string>(rootNode ? [rootNode.viewerId] : []),
        selectedId: null
      };

      this.loadedSvgs.update((list) => [...list, newItem]);
      this.activeSvgId.set(newId);
      this.applySvgToView(newItem);
      // Focus element list
      this.rightTab.set('inspector');
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : 'An error occurred while loading this SVG file.';
      alert(`Parsing error: ${errMessage}`);
    }
  }

  private updateActiveSVGContent(newCode: string) {
    const activeId = this.activeSvgId();
    if (!activeId) return;

    try {
      const name = this.fileName();
      const sizeByte = new Blob([newCode]).size;
      const { enrichedSvg, rootNode, stats } = this.parser.parse(newCode, name, sizeByte);
      const colors = this.analysis.extractColorPalette(newCode);

      // Save selection before parsing back
      const savedSelectedId = this.selection.selectedId();

      this.loadedSvgs.update((list) => list.map((item) => {
        if (item.id === activeId) {
          return {
            ...item,
            size: sizeByte,
            rawSource: newCode,
            enrichedSvg: enrichedSvg,
            rootNode: rootNode,
            stats: stats,
            colorPalette: colors
          };
        }
        return item;
      })
      );

      this.fileName.set(name);
      this.rawSource.set(newCode);
      this.enrichedSvg.set(enrichedSvg);
      this.rootNode.set(rootNode);
      this.stats.set(stats);
      this.colorPalette.set(colors);
      // Update Selection structure but preserve selected ID if it was set
      this.selection.rootNode.set(rootNode);
      if (savedSelectedId) {
        this.selection.select(savedSelectedId);
      } else {
        this.selection.setRoot(rootNode);
      }
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : 'An error occurred while updating the SVG source.';
      alert(`Parsing error: ${errMessage}`);
    }
  }

  updateAttributeInActiveSvg(viewerId: string, attrKey: string, attrValue: string) {
    const rawVal = this.rawSource();
    if (!rawVal) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawVal, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      if (!svgElement) return;

      const targetIndex = parseInt(viewerId.replace('v-', ''), 10);
      let elementCounter = 0;

      const findNode = (el: Element): Element | null => {
        const currentIndex = elementCounter;
        elementCounter++;
        if (currentIndex === targetIndex) {
          return el;
        }
        for (const child of Array.from(el.children)) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };

      const targetEl = findNode(svgElement);
      if (targetEl) {
        if (attrValue === null || attrValue === undefined || attrValue.trim() === '') {
          targetEl.removeAttribute(attrKey);
        } else {
          targetEl.setAttribute(attrKey, attrValue);
        }

        const serializer = new XMLSerializer();
        const updatedSource = serializer.serializeToString(svgElement);
        this.updateActiveSVGContent(updatedSource);
      }
    } catch (e) {
      console.error('Error applying interactive attribute update:', e);
    }
  }

  // Sidebars and collapse managers
  toggleLeftSidebar() {
    this.isLeftSidebarOpen.update(v => !v);
  }

  toggleRightSidebar() {
    this.isRightSidebarOpen.update(v => !v);
  }

  toggleSourceDrawer() {
    this.isSourceOpen.update(v => !v);
  }
}
