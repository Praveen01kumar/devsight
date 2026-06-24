import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SvgStatistics as StatsModel } from '../../data/svg.model';

@Component({
  selector: 'app-svg-statistics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="space-y-4 font-sans text-slate-100 select-none">
      <!-- Statistics Category Tag -->
      <div class="px-1 flex items-center justify-between">
        <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-500">File & DOM Statistics</h5>
        <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
          {{ stats()?.totalElements || 0 }} elements
        </span>
      </div>

      @if (stats()) {
        <!-- Primary File Info list -->
        <div class="bg-slate-950/25 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <!-- File Name -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Filename</span>
            <span class="text-xs font-semibold text-slate-200 truncate max-w-[155px]" [title]="stats()!.fileName">
              {{ stats()!.fileName }}
            </span>
          </div>
          <!-- File Size -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">File Size</span>
            <span class="text-xs font-mono font-semibold text-amber-400">{{ stats()!.fileSize }}</span>
          </div>
          <div class="h-px bg-slate-800"></div>
          <!-- View Box -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">viewBox</span>
            <span class="text-xs font-mono text-slate-300">{{ stats()!.viewBox }}</span>
          </div>
          <!-- Original sizing dimensions -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Dimensions</span>
            <span class="text-xs font-mono text-slate-300">{{ stats()!.width }} x {{ stats()!.height }}</span>
          </div>
        </div>

        <!-- Density item grid cards -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Paths -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">timeline</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Paths</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.pathsCount }}</span>
            </div>
          </div>

          <!-- Groups -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">folder_open</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Groups</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.groupsCount }}</span>
            </div>
          </div>

          <!-- Text -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">font_download</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Texts</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.textCount }}</span>
            </div>
          </div>

          <!-- Images -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">image</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Images</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.imagesCount }}</span>
            </div>
          </div>

          <!-- Gradients -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">gradient</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Gradients</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.gradientsCount }}</span>
            </div>
          </div>

          <!-- Filters -->
          <div class="p-3 bg-slate-950/10 border border-slate-800 rounded-lg flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base w-4 h-4">blur_on</mat-icon>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">Filters</span>
              <span class="text-xs font-mono font-bold text-slate-100">{{ stats()!.filtersCount }}</span>
            </div>
          </div>
        </div>
      } @else {
        <!-- Empty prompt state -->
        <p class="text-xs text-slate-500 italic p-4 text-center border border-slate-800 rounded-xl bg-slate-950/10">
          No statistics available. Load an SVG.
        </p>
      }
    </div>
  `
})
export class SvgStatistics {
  stats = input<StatsModel | null>(null);
}
