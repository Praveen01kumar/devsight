import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SelectionController } from './services/selection-controller';
import { ExportController } from './services/export-controller';

@Component({
  selector: 'app-svg-inspector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="h-full flex flex-col bg-slate-900 border-l border-slate-800 font-sans text-slate-100 select-none">
      <!-- Panel Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <mat-icon class="text-sky-400">tune</mat-icon>
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-200">Properties Inspector</span>
        </div>
        <!-- Element Export buttons if selected -->
        @if (selectedNode()) {
          <div class="flex items-center space-x-1.5">
            <button id="export-el-svg-btn"
              title="Export element as Standalone SVG"
              (click)="exportElSvg()"
              class="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800">
              <span class="text-[10px] font-bold font-mono">SVG</span>
            </button>
            <button id="export-el-png-btn"
              title="Export element as PNG"
              (click)="exportElPng()"
              class="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800">
              <span class="text-[10px] font-bold font-mono">PNG</span>
            </button>
          </div>
        }
      </div>

      <!-- Content Scroller -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        @if (selectedNode()) {
          <!-- Selected Tag & ID Identity Card -->
          <div class="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-sky-500/10">
                Layer
              </div>
              <div class="min-w-0 flex-1">
                <span class="text-[8px] uppercase tracking-wider text-slate-500 font-bold font-sans">Element tag</span>
                <h4 class="text-xs font-bold font-mono text-slate-100">&lt;{{ selectedNode()!.tagName }}&gt;</h4>
              </div>
            </div>

            <!-- ID Edit Field -->
            <div class="flex flex-col space-y-1">
              <span class="text-[10px] font-sans font-semibold text-slate-400">Layer ID (#id)</span>
              <input type="text" [value]="selectedNode()!.originalId"
                (input)="updateAttribute('id', $any($event.target).value)"
                placeholder="No ID assigned"
                class="bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono" />
            </div>

            <!-- Class edit field -->
            <div class="flex flex-col space-y-1">
              <span class="text-[10px] font-sans font-semibold text-slate-400">CSS Classes (.classList)</span>
              <input type="text" [value]="classesString()"
                (input)="updateAttribute('class', $any($event.target).value)"
                placeholder="No classes assigned"
                class="bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono" />
            </div>
          </div>

          <!-- Fill & Stroke Styling Paint Rules -->
          <div class="space-y-3">
            <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 font-sans">Paint Styles</h5>
            <!-- Fill Color -->
            <div class="bg-slate-950/20 p-3 rounded-lg border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-sans font-semibold text-slate-400">Fill Color</span>
                <span class="text-[10px] font-mono text-slate-500">{{ getAttrValue('fill') || 'unset (default black)' }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <!-- Color Swatch Button with underlying native input -->
                <div class="relative w-8 h-8 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 cursor-pointer shadow-inner flex items-center justify-center shrink-0">
                  @if (getAttrValue('fill') === 'none') {
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 font-mono z-10">✕</span>
                  }
                  <div class="w-full h-full" [style.background-color]="isHexOrNamedColor(getAttrValue('fill')) ? getAttrValue('fill') : 'transparent'"></div>
                  <input
                    type="color"
                    [value]="getHexColorOnly(getAttrValue('fill'))"
                    (input)="onColorInput('fill', $any($event.target).value)"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                </div>
                <!-- Text editor -->
                <input
                  type="text"
                  [value]="getAttrValue('fill') || ''"
                  (input)="onTextInput('fill', $any($event.target).value)"
                  placeholder="e.g. #ff0000 or none"
                  class="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                <!-- None button -->
                <button
                  (click)="updateAttribute('fill', 'none')"
                  [class.text-sky-400]="getAttrValue('fill') === 'none'"
                  [class.border-slate-700]="getAttrValue('fill') === 'none'"
                  class="cursor-pointer px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-400 font-semibold rounded-lg transition-colors shrink-0">
                  None
                </button>
              </div>
            </div>

            <!-- Stroke Color -->
            <div class="bg-slate-950/20 p-3 rounded-lg border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-sans font-semibold text-slate-400">Stroke Color</span>
                <span class="text-[10px] font-mono text-slate-500">{{ getAttrValue('stroke') || 'unset' }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <!-- Color Swatch Button with underlying native input -->
                <div class="relative w-8 h-8 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 cursor-pointer shadow-inner flex items-center justify-center shrink-0">
                  @if (getAttrValue('stroke') === 'none') {
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 font-mono z-10">✕</span>
                  }
                  <div class="w-full h-full" [style.background-color]="isHexOrNamedColor(getAttrValue('stroke')) ? getAttrValue('stroke') : 'transparent'"></div>
                  <input type="color"
                    [value]="getHexColorOnly(getAttrValue('stroke'))"
                    (input)="onColorInput('stroke', $any($event.target).value)"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                </div>
                <!-- Text editor -->
                <input type="text" [value]="getAttrValue('stroke') || ''"
                  (input)="onTextInput('stroke', $any($event.target).value)"
                  placeholder="e.g. #000 or none"
                  class="flex-1 bg-slate-950 border border-slate-855 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                <!-- None button -->
                <button
                  (click)="updateAttribute('stroke', 'none')"
                  [class.text-sky-400]="getAttrValue('stroke') === 'none'"
                  [class.border-slate-700]="getAttrValue('stroke') === 'none'"
                  class="cursor-pointer px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-400 font-semibold rounded-lg transition-colors shrink-0">
                  None
                </button>
              </div>
            </div>

            <!-- Stroke Width -->
            <div class="bg-slate-950/20 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-400">
                <span>Stroke Thickness</span>
                <span class="font-mono text-sky-400">{{ getNumericValue('stroke-width', 0) }} px</span>
              </div>
              <div class="flex items-center space-x-3">
                <input type="range" min="0" max="50" step="0.5"
                  [value]="getNumericValue('stroke-width', 0)" 
                  (input)="onSliderInput('stroke-width', $any($event.target).value)"
                  class="flex-1 accent-sky-500 h-1 bg-slate-950 rounded-lg cursor-pointer" />
                <input type="number" min="0" max="200" step="0.1"
                  [value]="getNumericValue('stroke-width', 0)"
                  (input)="onSliderInput('stroke-width', $any($event.target).value)"
                  class="w-16 bg-slate-950 border border-slate-850 rounded-lg px-2 py-0.5 text-center text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
              </div>
            </div>

            <!-- Opacity -->
            <div class="bg-slate-950/20 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-400">
                <span>Opacity (Solidness)</span>
                <span class="font-mono text-emerald-400">{{ getOpacityDisplay() }}%</span>
              </div>
              <div class="flex items-center space-x-3">
                <input type="range" min="0" max="1" step="0.05"
                  [value]="getNumericValue('opacity', 1)"
                  (input)="onSliderInput('opacity', $any($event.target).value)"
                  class="flex-1 accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer" />
                <input type="number" min="0" max="1" step="0.1"
                  [value]="getNumericValue('opacity', 1)"
                  (input)="onSliderInput('opacity', $any($event.target).value)"
                  class="w-16 bg-slate-950 border border-slate-850 rounded-lg px-2 py-0.5 text-center text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono" />
              </div>
            </div>
          </div>

          <!-- Bounding Geometry coordinates section (Read-only reference) -->
          <div class="space-y-2">
            <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 font-sans">Rendered Boundary Boxes</h5>
            @if (selectedBBox()) {
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-950/20 p-2 rounded-lg border border-slate-800 flex flex-col">
                  <span class="text-[10px] text-slate-500 font-medium">Rendered X</span>
                  <span class="text-xs font-mono font-semibold text-sky-400">{{ selectedBBox()!.x.toFixed(1) }} px</span>
                </div>
                <div class="bg-slate-950/20 p-2 rounded-lg border border-slate-800 flex flex-col">
                  <span class="text-[10px] text-slate-500 font-medium">Rendered Y</span>
                  <span class="text-xs font-mono font-semibold text-sky-400">{{ selectedBBox()!.y.toFixed(1) }} px</span>
                </div>
                <div class="bg-slate-950/20 p-2 rounded-lg border border-slate-800 flex flex-col">
                  <span class="text-[10px] text-slate-500 font-medium">Calculated Width</span>
                  <span class="text-xs font-mono font-semibold text-emerald-400">{{ selectedBBox()!.width.toFixed(1) }} px</span>
                </div>
                <div class="bg-slate-950/20 p-2 rounded-lg border border-slate-800 flex flex-col">
                  <span class="text-[10px] text-slate-500 font-medium">Calculated Height</span>
                  <span class="text-xs font-mono font-semibold text-emerald-400">{{ selectedBBox()!.height.toFixed(1) }} px</span>
                </div>
              </div>
            } @else {
              <p class="text-xs text-slate-500 italic px-1">Measuring coordinates after render...</p>
            }
          </div>

          <!-- Geometry Specific Attribute Editors -->
          <div class="space-y-2">
            <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 font-sans">Geometry Params</h5>
            <div class="grid grid-cols-2 gap-2 bg-slate-950/20 p-3 rounded-xl border border-slate-800">
              @if (getAttrValue('x') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">x</span>
                  <input type="text" [value]="getAttrValue('x')" (input)="updateAttribute('x', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('y') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">y</span>
                  <input type="text" [value]="getAttrValue('y')" (input)="updateAttribute('y', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }

              @if (getAttrValue('width') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">width</span>
                  <input type="text" [value]="getAttrValue('width')" (input)="updateAttribute('width', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('height') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">height</span>
                  <input type="text" [value]="getAttrValue('height')" (input)="updateAttribute('height', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }

              @if (getAttrValue('cx') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">cx</span>
                  <input type="text" [value]="getAttrValue('cx')" (input)="updateAttribute('cx', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('cy') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">cy</span>
                  <input type="text" [value]="getAttrValue('cy')" (input)="updateAttribute('cy', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }

              @if (getAttrValue('r') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">r (radius)</span>
                  <input type="text" [value]="getAttrValue('r')" (input)="updateAttribute('r', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('rx') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">rx</span>
                  <input type="text" [value]="getAttrValue('rx')" (input)="updateAttribute('rx', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }

              @if (getAttrValue('x1') !== '') {
                <div class="flex flex-col space-y-1 mb-2">
                  <span class="text-[10px] text-slate-500 font-mono">x1</span>
                  <input type="text" [value]="getAttrValue('x1')" (input)="updateAttribute('x1', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('y1') !== '') {
                <div class="flex flex-col space-y-1 mb-2">
                  <span class="text-[10px] text-slate-500 font-mono">y1</span>
                  <input type="text" [value]="getAttrValue('y1')" (input)="updateAttribute('y1', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('x2') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">x2</span>
                  <input type="text" [value]="getAttrValue('x2')" (input)="updateAttribute('x2', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }
              @if (getAttrValue('y2') !== '') {
                <div class="flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">y2</span>
                  <input type="text" [value]="getAttrValue('y2')" (input)="updateAttribute('y2', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
                </div>
              }

              @if (getAttrValue('points') !== '') {
                <div class="col-span-2 flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">points</span>
                  <textarea rows="2" [value]="getAttrValue('points')" (input)="updateAttribute('points', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono custom-scrollbar resize-none"></textarea>
                </div>
              }

              @if (getAttrValue('d') !== '') {
                <div class="col-span-2 flex flex-col space-y-1">
                  <span class="text-[10px] text-slate-500 font-mono">d (path vertices)</span>
                  <textarea rows="3" [value]="getAttrValue('d')" (input)="updateAttribute('d', $any($event.target).value)" 
                    class="bg-slate-950 border border-slate-850 rounded p-2 text-[11px] text-slate-300 focus:outline-none focus:border-sky-500 font-mono custom-scrollbar resize-y"></textarea>
                </div>
              }
            </div>
          </div>

          <!-- Transforms Card -->
          <div class="space-y-2">
            <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 font-sans">Transforms</h5>
            <div class="bg-slate-950/20 p-3 rounded-xl border border-slate-800 space-y-3">
              <!-- Transform -->
              <div class="flex flex-col space-y-1">
                <span class="text-[10px] font-sans font-semibold text-slate-400">Transform Matrix</span>
                <input type="text" [value]="getAttrValue('transform')"
                  (input)="updateAttribute('transform', $any($event.target).value)"
                  placeholder="e.g. translate(20,30) rotate(45)"
                  class="bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono" />
              </div>
            </div>
          </div>

          <!-- Extended XML Attributes -->
          @if (customAttributes().length > 0) {
            <div class="space-y-2">
              <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 font-sans">Extended Attributes</h5>
              <div class="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/25 p-3 space-y-2.5">
                @for (attr of customAttributes(); track attr.key) {
                  <div class="flex flex-col space-y-1">
                    <span class="text-[10px] font-mono text-amber-500 font-semibold">{{ attr.key }}</span>
                    <div class="flex items-center space-x-1.5">
                      <input type="text" [value]="attr.value" (input)="updateAttribute(attr.key, $any($event.target).value)"
                        class="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono" />
                      <button (click)="copyText(attr.value)"
                        title="Copy attribute"
                        class="cursor-pointer w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors shrink-0 border border-slate-800">
                        <mat-icon class="text-xs">content_copy</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

        } @else {
          <!-- Empty visual guidance state -->
          <div class="h-64 flex flex-col items-center justify-center text-center p-5 select-none animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-slate-950/60 text-slate-600 flex items-center justify-center mb-4 border border-slate-800/40">
              <mat-icon class="text-2xl">mouse</mat-icon>
            </div>
            <p class="text-xs font-sans text-slate-400 font-medium mb-1">No Element Selected</p>
            <p class="text-[11px] font-sans text-slate-600 max-w-[180px]">
              Click on any graphic node in the viewer or select from the element tree to start editing.
            </p>
          </div>
        }
      </div>

      <!-- Quick Toast notifier for copies -->
      @if (showToast()) {
        <div class="absolute bottom-4 right-4 bg-sky-500/5 dark:bg-sky-500/10 text-white text-xs py-2 px-3 rounded-xl shadow-xl flex items-center space-x-2 select-none z-50 animate-bounce">
          <mat-icon class="text-sm w-4 h-4">task_alt</mat-icon>
          <span>Copied value to clipboard!</span>
        </div>
      }
    </div>
  `
})
export class SvgInspector {
  private readonly selection = inject(SelectionController);
  private readonly exportC = inject(ExportController);

  selectedNode = this.selection.selectedNode;
  selectedBBox = this.selection.selectedBBox;
  showToast = signal<boolean>(false);

  private readonly standardKeys = new Set([
    'id', 'className', 'fill', 'stroke', 'opacity', 
    'transform', 'width', 'height', 'x', 'y', 
    'viewBox', 'xmlns', 'cx', 'cy', 'r', 'rx', 'ry', 
    'x1', 'y1', 'x2', 'y2', 'd', 'points', 'stroke-width'
  ]);

  getAttrValue(key: string): string {
    const node = this.selectedNode();
    if (!node) return '';
    return node.attributes[key] !== undefined ? node.attributes[key] : '';
  }

  isHexOrNamedColor(val: string): boolean {
    if (!val || val === 'none') return false;
    if (val.startsWith('url(')) return false;
    return true; 
  }

  getHexColorOnly(val: string): string {
    if (!val || val === 'none' || val.startsWith('url(')) return '#000000';
    if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
    if (/^#[0-9a-fA-F]{3}$/.test(val)) {
      const r = val[1];
      const g = val[2];
      const b = val[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    const basicColors: Record<string, string> = {
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      gray: '#808080',
      silver: '#c0c0c0',
      gold: '#ffd700',
      orange: '#ffa500'
    };
    return basicColors[val.toLowerCase()] || '#000000';
  }

  getNumericValue(key: string, defaultValue: number): number {
    const val = this.getAttrValue(key);
    if (!val) return defaultValue;
    const num = Number.parseFloat(val);
    return Number.isNaN(num) ? defaultValue : num;
  }

  getOpacityDisplay(): number {
    const val = this.getNumericValue('opacity', 1);
    return Math.round(val * 100);
  }

  onColorInput(key: string, value: string) {
    this.updateAttribute(key, value);
  }

  onTextInput(key: string, value: string) {
    this.updateAttribute(key, value);
  }

  onSliderInput(key: string, value: string) {
    this.updateAttribute(key, value);
  }

  updateAttribute(key: string, value: string) {
    const node = this.selectedNode();
    if (!node) return;
    // Pass event back to our registered selection handler
    if (this.selection.onElementAttributeModified) {
      this.selection.onElementAttributeModified(node.viewerId, key, value);
    }
  }

  customAttributes = computed(() => {
    const node = this.selectedNode();
    if (!node) return [];

    const list: { key: string; value: string }[] = [];
    for (const key in node.attributes) {
      if (!this.standardKeys.has(key) && key !== 'data-svg-viewer-id') {
        list.push({ key, value: node.attributes[key] });
      }
    }
    return list;
  });

  classesString = computed(() => {
    const node = this.selectedNode();
    if (!node || node.classes.length === 0) return '';
    return node.classes.join(' ');
  });

  copyText(content: string) {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 2000);
    });
  }

  exportElSvg() {
    const node = this.selectedNode();
    if (node) {
      this.exportC.exportElementAsSvg(node.viewerId, node.originalId, node.tagName);
    }
  }

  exportElPng() {
    const node = this.selectedNode();
    if (node) {
      this.exportC.exportElementAsPng(node.viewerId, node.originalId, node.tagName);
    }
  }
}
