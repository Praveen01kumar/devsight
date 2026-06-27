import { ChangeDetectionStrategy, Component, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SelectionController } from './services/selection-controller';
import { SvgColorInfo } from '../../data/svg.model';

@Component({
  selector: 'app-svg-palette',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 font-sans text-slate-100 select-none">
      
      <!-- Palette Category Header -->
      <div class="px-1 flex items-center justify-between">
        <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Color Palette</h5>
        <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
          {{ colors().length }} unique colors
        </span>
      </div>

      @if (colors().length > 0) {
        <!-- Palette Circle items grid -->
        <div class="grid grid-cols-4 gap-2.5 bg-slate-950/15 border border-slate-800 rounded-xl p-3.5">
          @for (info of colors().slice(0, 24); track info.color) {
            <div 
              [id]="'palette-swatch-' + info.color.replace('#', '')"
              (click)="onSwatchClick(info)"
              [title]="info.color + ': ' + info.count + ' occurrences (' + info.type + ')'"
              class="group relative flex flex-col items-center justify-center cursor-pointer rounded-lg hover:bg-slate-850/60 p-1.5 transition-all duration-200">
              
              <!-- Color Chip bubble -->
              <div 
                class="w-8 h-8 rounded-full shadow-inner border border-slate-800 relative transition-transform duration-150 group-hover:scale-110 flex items-center justify-center"
                [style.background-color]="info.color">
                
                <!-- Micro-indicator of Fill / Stroke -->
                <span class="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] font-mono select-none"
                      [style.color]="info.color">
                  @if (info.type === 'fill') { f }
                  @else if (info.type === 'stroke') { s }
                  @else { b }
                </span>
              </div>

              <!-- Color text label -->
              <span class="text-[9px] font-mono text-slate-400 mt-1.5 select-all text-center max-w-[42px] truncate">
                {{ info.color }}
              </span>

              <!-- Matching indicators on hover (tooltip lookalike) -->
              <span class="absolute hidden group-hover:flex bottom-full mb-1 bg-slate-900 border border-slate-700 text-slate-300 text-[9.5px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                Matches: {{ info.count }}
              </span>
            </div>
          }
        </div>
        <p class="text-[10px] text-slate-500 italic px-2 text-center">
          Click any color swatch to copy its Hex code to the clipboard and filter standard matches.
        </p>
      } @else {
        <!-- Empty palette state -->
        <p class="text-xs text-slate-500 italic p-4 text-center border border-white/5 rounded-xl bg-slate-950/10">
          No colors extracted. Upload an SVG containing colors.
        </p>
      }

      <!-- Quick Toast notifier for copies -->
      @if (showToast()) {
        <div class="absolute bottom-4 right-4 bg-emerald-500 text-white text-xs py-2 px-3 rounded-xl shadow-xl flex items-center space-x-2 select-none animate-bounce z-50">
          <mat-icon class="text-sm w-4 h-4">check_circle_outline</mat-icon>
          <span>Color CSS copied: {{ activeHex() }}</span>
        </div>
      }
    </div>
  `
})
export class SvgPalette {
  private readonly selection = inject(SelectionController);

  colors = input<SvgColorInfo[]>([]);
  showToast = signal<boolean>(false);
  activeHex = signal<string>('');

  onSwatchClick(info: SvgColorInfo) {
    this.activeHex.set(info.color);
    navigator.clipboard.writeText(info.color).then(() => {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 2000);
    });

    // Automatically trigger selection search filtering for elements matching this color!
    this.selection.search(info.color);
  }
}
