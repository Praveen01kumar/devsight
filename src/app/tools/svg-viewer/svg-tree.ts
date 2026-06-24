import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SvgElementNode } from '../../data/svg.model';

@Component({
  selector: 'app-svg-tree',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="select-none text-sm font-sans">
      <!-- Node item -->
      <div [id]="'tree-item-' + node().viewerId"
        class="flex items-center py-1.5 px-2 rounded-md transition-all duration-150 cursor-pointer group hover:bg-slate-800/50"
        [class.bg-sky-500/20]="isSelected()"
        [class.text-sky-400]="isSelected()"
        [class.font-medium]="isSelected()"
        [style.padding-left.px]="depth() * 12 + 8"
        (click)="selectNode($event)">
        <!-- Expand/Collapse arrow (only if node has children) -->
        <span class="w-5 h-5 flex items-center justify-center mr-1 text-slate-500 hover:text-slate-300"
              (click)="toggleExpand($event)">
          @if (node().hasChildren) {
            <mat-icon class="text-lg transition-transform duration-200"
                     [class.rotate-90]="isExpanded()">
              chevron_right
            </mat-icon>
          }
        </span>

        <!-- Node Icon based on type -->
        <mat-icon class="text-base mr-1.5" [style.color]="getIconColor()">
          {{ getIconName() }}
        </mat-icon>

        <!-- Tag Name & details -->
        <span class="flex items-baseline space-x-1 min-w-0 flex-1 truncate">
          <span class="text-slate-200 font-mono text-xs font-semibold">&lt;{{ node().tagName }}&gt;</span>
          @if (node().originalId) {
            <span class="text-amber-400/90 font-mono text-xs truncate">#{{ node().originalId }}</span>
          } @else if (node().classes.length > 0) {
            <span class="text-slate-400 font-mono text-[10px] truncate">.{{ node().classes[0] }}</span>
          }
        </span>

        <!-- Quick indicator of kids count -->
        @if (node().hasChildren && !isExpanded()) {
          <span class="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded-full font-mono ml-auto">
            {{ node().children.length }}
          </span>
        }
      </div>

      <!-- Recursive children rendering -->
      @if (node().hasChildren && isExpanded()) {
        <div class="overflow-hidden">
          @for (child of node().children; track child.viewerId) {
            <app-svg-tree 
              [node]="child" 
              [depth]="depth() + 1" 
              [selectedId]="selectedId()"
              [expandedIds]="expandedIds()"
              (toggleExpandEvent)="toggleExpandEvent.emit($event)"
              (nodeSelected)="nodeSelected.emit($event)">
            </app-svg-tree>
          }
        </div>
      }
    </div>
  `,
  host: {
    'class': 'block'
  },
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SvgTree {
  node = input.required<SvgElementNode>();
  depth = input<number>(0);
  selectedId = input<string | null>(null);
  expandedIds = input<Set<string>>(new Set<string>());

  nodeSelected = output<string>();
  toggleExpandEvent = output<string>();

  isSelected() {
    return this.selectedId() === this.node().viewerId;
  }

  isExpanded() {
    return this.expandedIds().has(this.node().viewerId);
  }

  toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    this.toggleExpandEvent.emit(this.node().viewerId);
  }

  selectNode(event: MouseEvent) {
    event.stopPropagation();
    this.nodeSelected.emit(this.node().viewerId);
  }

  getIconName(): string {
    const tagName = this.node().tagName.toLowerCase();
    switch (tagName) {
      case 'svg': return 'language';
      case 'g': return 'folder_open';
      case 'path': return 'timeline';
      case 'rect': return 'crop_square';
      case 'circle': return 'radio_button_unchecked';
      case 'ellipse': return 'lens';
      case 'line': return 'horizontal_rule';
      case 'polyline': return 'show_chart';
      case 'polygon': return 'category';
      case 'text':
      case 'tspan': return 'text_fields';
      case 'image': return 'image';
      case 'defs': return 'settings_applications';
      case 'use': return 'content_copy';
      case 'lineargradient':
      case 'radialgradient': return 'gradient';
      case 'clippath': return 'content_cut';
      case 'mask': return 'filter_b_and_w';
      case 'filter': return 'blur_on';
      default: return 'code';
    }
  }

  getIconColor(): string {
    const tagName = this.node().tagName.toLowerCase();
    switch (tagName) {
      case 'svg': return '#a78bfa'; // violet
      case 'g': return '#fbbf24'; // amber
      case 'path': return '#38bdf8'; // sky
      case 'rect':
      case 'circle':
      case 'ellipse':
      case 'polygon': return '#34d399'; // emerald
      case 'text': return '#f472b6'; // pink
      case 'image': return '#4ade80'; // helper green
      case 'defs': return '#94a3b8'; // slate
      case 'lineargradient':
      case 'radialgradient': return '#fb7185'; // rose
      default: return '#cbd5e1'; // light slate
    }
  }
}
