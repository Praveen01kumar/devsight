import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, computed, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ViewerController } from './services/viewer-controller';
import { SelectionController } from './services/selection-controller';

@Component({
  selector: 'app-minimap',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #minimapContainer
      id="canvas-minimap-card"
      class="absolute bottom-4 right-4 w-44 h-28 bg-slate-900/90 border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col select-none overflow-hidden z-40 transition-all duration-300"
      [class.opacity-100]="isVisible() || isDragging()"
      [class.opacity-0]="!isVisible() && !isDragging()"
      [class.pointer-events-none]="!isVisible() && !isDragging()"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
      (mouseleave)="onMouseUp()">
      <!-- Top Header Title line of minimap -->
      <div class="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 font-bold font-sans shrink-0 pb-1 mb-1 border-b border-white/5">
        <span class="flex items-center space-x-1">
          <mat-icon class="text-xs w-3 h-3">map</mat-icon>
          <span>Navigator</span>
        </span>
        <span class="font-mono">{{ zoomLabel() }}%</span>
      </div>

      <!-- Live area wrapper -->
      <div #miniStage
        class="flex-1 relative bg-slate-950/80 rounded-md overflow-hidden border border-white/5 flex items-center justify-center">
        <!-- Center outline indicating raw canvas model representation size -->
        <div class="absolute border border-slate-700 bg-slate-800/40 opacity-70"
          [style.width.px]="mapWidth()"
          [style.height.px]="mapHeight()">
        </div>

        <!-- Draggable semi-flat highlighted viewfinder rectangle reflecting visible frame -->
        <div class="absolute border-2 border-sky-400 bg-sky-400/10 cursor-move shadow-inner"
          [style.left.px]="viewfinderX()"
          [style.top.px]="viewfinderY()"
          [style.width.px]="viewfinderW()"
          [style.height.px]="viewfinderH()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    #canvas-minimap-card {
      backdrop-filter: blur(8px);
    }
  `]
})
export class Minimap implements OnDestroy {
  private readonly viewer = inject(ViewerController);
  private readonly selection = inject(SelectionController);

  @ViewChild('minimapContainer') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('miniStage') stageRef!: ElementRef<HTMLDivElement>;

  zoom = this.viewer.zoom;
  panX = this.viewer.panX;
  panY = this.viewer.panY;
  rootNode = this.selection.rootNode;

  isDragging = signal<boolean>(false);
  isVisible = signal<boolean>(false);

  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitial = true;

  // Constants mapping minimap layout size bounds
  readonly maxWidth = 160;
  readonly maxHeight = 85;

  constructor() {
    // Watch zoom & pan signals to toggle visibility
    effect(() => {
      // access signals to register dependency
      this.zoom();
      this.panX();
      this.panY();

      // Skip the very first trigger upon component initialization so it starts hidden
      if (this.isInitial) {
        this.isInitial = false;
        return;
      }

      this.isVisible.set(true);

      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
      }

      this.hideTimeout = setTimeout(() => {
        if (!this.isDragging()) {
          this.isVisible.set(false);
        }
      }, 2000);
    });

    // Watch dragging to keep visible
    effect(() => {
      if (this.isDragging()) {
        this.isVisible.set(true);
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
      } else {
        // Drag ended, resume fadeout timer
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = setTimeout(() => {
          this.isVisible.set(false);
        }, 2000);
      }
    });
  }

  zoomLabel = computed(() => Math.round(this.zoom() * 100));

  // Calculate proportional miniature dimensions of SVG inside minimap
  mapWidth = computed(() => 100);

  mapHeight = computed(() => 60);

  // Proportional coordinate calculation for viewfinder overlay box representation
  viewfinderX = computed(() => {
    const px = this.panX();
    const zm = this.zoom();
    // Proportional panning placement calculations
    const zoomOffset = px / zm;
    const mapped = 30 - zoomOffset * 0.05;
    return Math.max(0, Math.min(130, mapped));
  });

  viewfinderY = computed(() => {
    const py = this.panY();
    const zm = this.zoom();
    const zoomOffset = py / zm;
    const mapped = 18 - zoomOffset * 0.05;
    return Math.max(0, Math.min(65, mapped));
  });

  viewfinderW = computed(() => {
    const zm = this.zoom();
    return Math.max(12, Math.min(120, 110 / zm));
  });

  viewfinderH = computed(() => {
    const zm = this.zoom();
    return Math.max(10, Math.min(75, 65 / zm));
  });

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging.set(true);
    this.panOnMinimapCoordinates(event);
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging()) {
      this.panOnMinimapCoordinates(event);
    }
  }

  onMouseUp() {
    this.isDragging.set(false);
  }

  private panOnMinimapCoordinates(event: MouseEvent) {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const normX = clickX / rect.width;
    const normY = clickY / rect.height;

    const targetPanX = (0.5 - normX) * 1200 * this.zoom();
    const targetPanY = (0.5 - normY) * 900 * this.zoom();

    this.viewer.setPan(targetPanX, targetPanY);
    // Trigger outline coordinates overlay mapping recheck
    const selId = this.selection.selectedId();
    if (selId) {
      this.selection.updateBBox(selId);
    }
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}
