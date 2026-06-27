import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SelectionController } from './services/selection-controller';

@Component({
  selector: 'app-svg-search',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-3 border-b border-slate-800 bg-slate-900/40">
      <div class="relative flex items-center bg-slate-950/80 rounded-lg border border-slate-800 focus-within:border-sky-500/50 transition-all duration-200">
        <!-- Search icon -->
        <mat-icon class="text-slate-400 text-lg ml-2.5 mr-1.5 select-none">search</mat-icon>

        <!-- Search input field -->
        <input 
          #searchInput
          id="search-input-field"
          type="text"
          placeholder="Search tags, classes, IDs, attributes..."
          [value]="query()"
          (input)="onInputChange(searchInput.value)"
          (keydown.enter)="nextMatch()"
          class="w-full py-2 bg-transparent text-slate-100 text-xs placeholder-slate-500 border-none outline-none focus:ring-0" />

        <!-- Matches count indicators -->
        @if (matchesCount().length > 0) {
          <span class="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0 mr-1.5 select-none">
            {{ activeIndex() + 1 }}/{{ matchesCount().length }}
          </span>
        }

        <!-- Next/Prev buttons -->
        @if (matchesCount().length > 0) {
          <div class="flex items-center space-x-0.5 shrink-0 pr-1 border-l border-slate-800 ml-1">
            <button 
              id="search-prev-node-btn"
              title="Previous Match"
              (click)="prevMatch()"
              class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors">
              <mat-icon class="text-base">keyboard_arrow_up</mat-icon>
            </button>
            <button 
              id="search-next-node-btn"
              title="Next Match"
              (click)="nextMatch()"
              class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors">
              <mat-icon class="text-base">keyboard_arrow_down</mat-icon>
            </button>
          </div>
        }

        <!-- Clear Search button -->
        @if (query().length > 0) {
          <button 
            id="search-clear-query-btn"
            title="Clear Search"
            (click)="clearSearch(searchInput)"
            class="cursor-pointer w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors mr-1">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        }
      </div>

      <!-- Quick helper text under search -->
      @if (query().length > 0 && matchesCount().length === 0) {
        <div class="text-[11px] text-rose-400 font-sans mt-2 px-1 select-none flex items-center space-x-1">
          <mat-icon class="text-sm w-4 h-4">error_outline</mat-icon>
          <span>No matches found. Try another query.</span>
        </div>
      } @else if (query().length > 0) {
        <div class="text-[10px] text-slate-400 font-sans mt-1.5 px-1 select-none flex justify-between">
          <span>Press <kbd class="font-mono bg-slate-800 px-1 rounded text-slate-300">Enter</kbd> for next match</span>
          <span>{{ matchesCount().length }} tags found</span>
        </div>
      }
    </div>
  `
})
export class SvgSearch {
  private readonly selection = inject(SelectionController);

  query = signal<string>('');
  matchesCount = this.selection.searchResults.asReadonly();
  activeIndex = this.selection.searchIndex.asReadonly();

  onInputChange(val: string) {
    this.query.set(val);
    this.selection.search(val);
  }

  nextMatch() {
    this.selection.nextSearchResult();
  }

  prevMatch() {
    this.selection.prevSearchResult();
  }

  clearSearch(inputEl: HTMLInputElement) {
    this.query.set('');
    inputEl.value = '';
    this.selection.search('');
  }

  // Allow external triggering (e.g. from container keyboard shortcut)
  focusInput() {
    const el = document.getElementById('search-input-field');
    if (el) el.focus();
  }
}
