import { ChangeDetectionStrategy, Component, Input, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

// Interface for Diff outputs
interface DiffLine {
  text: string;
  type: 'added' | 'removed' | 'unmodified';
}

@Component({
  selector: 'app-text-toolkit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-left">
      <!-- Main Workspace Section (Two or Three Columns split based on diff/editor mode) -->
      <div class="grid grid-cols-1 lg:grid-cols-1 gap-4 items-start">
        <aside class="relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
              <!-- Toggle Button -->
              <button (click)="toggleSidebar()" type="button" tabindex="0"
                class="absolute top-2 cursor-pointer right-3 z-20 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg flex items-center justify-center transition"
                [title]="sidebarExpanded() ? 'Collapse tools' : 'Expand tools'">
                <mat-icon style="font-size:18px;width:18px;height:18px;">
                  {{ sidebarExpanded() ? 'expand_circle_up' : 'expand_circle_down' }}
                </mat-icon>
              </button>
              @if (sidebarExpanded()) {
                <!-- Expanded State -->
                 <div class="p-4">
                  <!-- Tool Configuration Drawer -->
                    <div class="md:col-span-3 bg-white dark:bg-zinc-900/60 shadow-sm text-left relative overflow-hidden block">
                      <!-- Tool 1: Text Formatter -->
                      @if (toolId() === 'text-formatter') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Formatting Options</span>
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                            <button (click)="formatNormalizeWhitespace()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-emerald-600 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 transition truncate-none">
                              Normalize Spaces
                            </button>
                            <button (click)="formatRemoveExtraSpaces()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-emerald-600 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 transition truncate-none">
                              Remove Extra Spaces
                            </button>
                            <button (click)="formatRemoveEmptyLines()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-emerald-600 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 transition truncate-none">
                              Remove Empty Lines
                            </button>
                            <button (click)="formatTrim()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-emerald-600 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 transition truncate-none">
                              Trim All Lines
                            </button>
                            <button (click)="formatBeautify()" class="text-left px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer transition truncate-none">
                              Beautify Whitespace
                            </button>
                            <button (click)="formatMinify()" class="text-left px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl font-bold text-orange-600 dark:text-orange-400 cursor-pointer transition truncate-none">
                              Minify Text
                            </button>
                          </div>

                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block pt-2 border-b border-zinc-150 dark:border-zinc-850 pb-2">Line Manipulation</span>
                          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
                            <button (click)="lineSortAsc()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              Sort Lines Asc
                            </button>
                            <button (click)="lineSortDesc()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              Sort Lines Desc
                            </button>
                            <button (click)="lineReverse()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              Reverse Lines
                            </button>
                            <button (click)="lineShuffle()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              Shuffle Lines
                            </button>
                          </div>

                          <div class="space-y-4 pt-2 border-t border-zinc-150 dark:border-zinc-850">
                            <span class="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Indent / Outdent Control</span>
                            <div class="flex items-center gap-2">
                              <button (click)="indentText(2)" class="flex-grow py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition">
                                + 2 Spaces
                              </button>
                              <button (click)="indentText(4)" class="flex-grow py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition">
                                + 4 Spaces
                              </button>
                              <button (click)="outdentText()" class="flex-grow py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-mono text-[11px] font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer transition">
                                Outdent
                              </button>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Tool 2: Diff Checker -->
                      @if (toolId() === 'text-diff-checker') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Diff Configuration</span>
                          <div class="space-y-3">
                            <label class="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none font-semibold">
                              <input type="checkbox" [checked]="diffIgnoreWhitespace()"
                                (change)="diffIgnoreWhitespace.set($any($event.target).checked); computeDiff()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Ignore line-padding whitespace
                            </label>

                            <div class="space-y-1.5">
                              <span class="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">View Arrangement</span>
                              <div class="grid grid-cols-2 gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-150 dark:border-zinc-850">
                                <button
                                  (click)="diffViewMode.set('split')"
                                  [class.bg-white]="diffViewMode() === 'split'"
                                  [class.dark:bg-zinc-900]="diffViewMode() === 'split'"
                                  [class.text-zinc-900]="diffViewMode() === 'split'"
                                  [class.dark:text-white]="diffViewMode() === 'split'"
                                  [class.text-zinc-500]="diffViewMode() !== 'split'"
                                  class="py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer font-mono"
                                >
                                  Split View
                                </button>
                                <button
                                  (click)="diffViewMode.set('inline')"
                                  [class.bg-white]="diffViewMode() === 'inline'"
                                  [class.dark:bg-zinc-900]="diffViewMode() === 'inline'"
                                  [class.text-zinc-900]="diffViewMode() === 'inline'"
                                  [class.dark:text-white]="diffViewMode() === 'inline'"
                                  [class.text-zinc-500]="diffViewMode() !== 'inline'"
                                  class="py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer font-mono"
                                >
                                  Inline View
                                </button>
                              </div>
                            </div>
                          </div>

                          <div class="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl text-[11px] leading-relaxed text-zinc-500 font-medium">
                            Add target baseline text into the <strong class="text-zinc-700 dark:text-zinc-300">A Panel</strong>, modified changes in <strong class="text-zinc-700 dark:text-zinc-300">B Panel</strong> on the right. Diffs are compiled in absolute real-time.
                          </div>
                        </div>
                      }

                      <!-- Tool 3: Case Converter -->
                      @if (toolId() === 'case-converter') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Standard Casings</span>
                          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
                            <button (click)="convertCase('camel')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              camelCase
                            </button>
                            <button (click)="convertCase('pascal')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              PascalCase
                            </button>
                            <button (click)="convertCase('snake')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              snake_case
                            </button>
                            <button (click)="convertCase('kebab')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              kebab-case
                            </button>
                            <button (click)="convertCase('constant')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              CONSTANT_CASE
                            </button>
                            <button (click)="convertCase('upper')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              UPPER CASE
                            </button>
                            <button (click)="convertCase('lower')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              lower case
                            </button>
                            <button (click)="convertCase('sentence')" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                              Sentence case
                            </button>
                          </div>

                          <div class="space-y-4 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Productivity Builders</span>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <button (click)="formatFilename()" class="w-full text-left px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-mono font-bold text-blue-600 dark:text-blue-400 text-xs cursor-pointer transition flex items-center justify-between">
                                <span>Clean Filename Formatter</span>
                                <mat-icon class="text-sm scale-95">insert_drive_file</mat-icon>
                              </button>
                              <button (click)="generateVariable()" class="w-full text-left px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs cursor-pointer transition flex items-center justify-between">
                                <span>Variable Name Generator</span>
                                <mat-icon class="text-sm scale-95">terminal</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Tool 4: Slug Generator -->
                      @if (toolId() === 'slug-generator') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Slug Modifiers</span>
                          <div class="space-y-3">
                            <div class="space-y-1.5">
                              <span class="block text-xs text-zinc-500 dark:text-zinc-400 font-semibold select-none">Separator Character</span>
                              <select [ngModel]="slugSeparator()" (ngModelChange)="slugSeparator.set($event); triggerSlugGeneration()"
                                class="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-700 dark:text-zinc-300"
                              >
                                <option value="-">Hyphen (-)</option>
                                <option value="_">Underscore (_)</option>
                                <option value="/">Forward Slash (/)</option>
                                <option value="">None (Concatenated)</option>
                              </select>
                            </div>

                            <label class="flex items-center gap-2.5 text-xs text-zinc-650 dark:text-zinc-300 cursor-pointer select-none py-1 font-semibold">
                              <input 
                                type="checkbox" 
                                [checked]="slugRemoveStopwords()" 
                                (change)="slugRemoveStopwords.set($any($event.target).checked); triggerSlugGeneration()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip English Stop Words (the, and, a)
                            </label>

                            <label class="flex items-center gap-2.5 text-xs text-zinc-650 dark:text-zinc-300 cursor-pointer select-none py-1 font-semibold">
                              <input 
                                type="checkbox" 
                                [checked]="slugStripNumbers()" 
                                (change)="slugStripNumbers.set($any($event.target).checked); triggerSlugGeneration()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip numeric digits
                            </label>

                            <label class="flex items-center gap-2.5 text-xs text-zinc-650 dark:text-zinc-300 cursor-pointer select-none py-1 font-semibold">
                              <input 
                                type="checkbox" 
                                [checked]="slugKeepUppercase()" 
                                (change)="slugKeepUppercase.set($any($event.target).checked); triggerSlugGeneration()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Keep upper casing structure
                            </label>
                          </div>
                        </div>
                      }

                      <!-- Tool 5: Markdown Preview -->
                      @if (toolId() === 'markdown-preview' || toolId() === 'markdown-tools') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Markdown Utilities</span>
                          @if (toolId() === 'markdown-tools') {
                            <div class="space-y-4 text-xs">
                              <span class="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wide block">Insert elements</span>
                              <div class="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                                <button (click)="markdownInsert('bold')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Bold (**)
                                </button>
                                <button (click)="markdownInsert('italic')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Italic (*)
                                </button>
                                <button (click)="markdownInsert('link')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Link ([])
                                </button>
                                <button (click)="markdownInsert('quote')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Quote (>)
                                </button>
                                <button (click)="markdownInsert('table')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Checklist
                                </button>
                                <button (click)="markdownInsert('code')" class="py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg hover:border-zinc-300 font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                                  Code (\`\`)
                                </button>
                              </div>

                              <!-- Visual table generator module -->
                              <div class="space-y-2 border-t border-zinc-150 dark:border-zinc-850 pt-3">
                                <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Visual Table Creator</span>
                                <div class="flex items-center gap-2 text-xs font-mono">
                                  <div class="flex-1">
                                    <span class="block text-[9px] text-zinc-500 font-semibold mb-0.5">ROWS</span>
                                    <input type="number" [(ngModel)]="mdTableRows" class="w-full text-center p-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-700 dark:text-zinc-300 outline-none" min="1" max="15"/>
                                  </div>
                                  <div class="flex-1">
                                    <span class="block text-[9px] text-zinc-500 font-semibold mb-0.5">COLUMNS</span>
                                    <input type="number" [(ngModel)]="mdTableCols" class="w-full text-center p-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-700 dark:text-zinc-300 outline-none" min="1" max="15"/>
                                  </div>
                                  <div class="flex-1">
                                    <span class="block text-[9px] text-zinc-500 font-semibold mb-0.5">INSERT</span>
                                    <button (click)="markdownInsertTable()" class="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 font-bold rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-[10px] cursor-pointer text-center block">
                                      INSERT TABLE SYNTX
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          }

                          <div class="space-y-2 pt-2 border-t border-zinc-150 dark:border-zinc-850 font-semibold">
                            <span class="block text-xs text-zinc-500">Live Preview Output View</span>
                            <div class="grid grid-cols-2 gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-150 dark:border-zinc-850 text-xs">
                              <button
                                (click)="mdPreviewMode.set('rendered')"
                                [class.bg-white]="mdPreviewMode() === 'rendered'"
                                [class.dark:bg-zinc-900]="mdPreviewMode() === 'rendered'"
                                [class.text-zinc-900]="mdPreviewMode() === 'rendered'"
                                [class.dark:text-white]="mdPreviewMode() === 'rendered'"
                                [class.text-zinc-500]="mdPreviewMode() !== 'rendered'"
                                class="py-1 font-bold rounded-lg transition-all cursor-pointer font-mono text-[10px]"
                              >
                                RENDERED HTML
                              </button>
                              <button
                                (click)="mdPreviewMode.set('raw')"
                                [class.bg-white]="mdPreviewMode() === 'raw'"
                                [class.dark:bg-zinc-900]="mdPreviewMode() === 'raw'"
                                [class.text-zinc-900]="mdPreviewMode() === 'raw'"
                                [class.dark:text-white]="mdPreviewMode() === 'raw'"
                                [class.text-zinc-500]="mdPreviewMode() !== 'raw'"
                                class="py-1 font-bold rounded-lg transition-all cursor-pointer font-mono text-[10px]"
                              >
                                RAW HTML CODE
                              </button>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Tool 6: Character Counter -->
                      @if (toolId() === 'character-counter') {
                        <div class="space-y-4 select-all text-xs font-mono">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Readability Metrics</span>
                          <div class="space-y-2 text-zinc-600 dark:text-zinc-400">
                            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850/50">
                              <span class="font-bold">Reading Speed:</span>
                              <span class="text-zinc-900 dark:text-zinc-200 font-semibold">{{ readabilityReadingTime() }}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850/50">
                              <span class="font-bold">Speaking Speed:</span>
                              <span class="text-zinc-900 dark:text-zinc-200 font-semibold">{{ readabilitySpeakingTime() }}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850/50">
                              <span class="font-bold">Sentences count:</span>
                              <span class="text-zinc-900 dark:text-zinc-200 font-bold">{{ readabilitySentences() }}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850/50">
                              <span class="font-bold">Paragraphs count:</span>
                              <span class="text-zinc-900 dark:text-zinc-200 font-bold">{{ readabilityParagraphs() }}</span>
                            </div>
                            <div class="flex justify-between py-1">
                              <span class="font-bold">Avg Word Length:</span>
                              <span class="text-zinc-900 dark:text-zinc-200 font-bold">{{ readabilityAvgWordLen() }} chars</span>
                            </div>
                          </div>

                          <div class="pt-4 border-t border-zinc-150 dark:border-zinc-850 space-y-3">
                            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Keyword Density (Top 5)</span>
                            <div class="space-y-1">
                              @for (item of keywordDensityList(); track item.word) {
                                <div class="flex items-center justify-between text-[11px] py-1 border-b border-zinc-50 dark:border-zinc-900/60 font-mono">
                                  <span class="text-zinc-700 dark:text-zinc-300 font-bold select-text">"{{ item.word }}"</span>
                                  <span class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-950 text-zinc-550 border border-zinc-200 dark:border-zinc-900 rounded font-semibold">{{ item.count }}x ({{ item.percent }}%)</span>
                                </div>
                              } @empty {
                                <span class="text-zinc-500 block italic leading-relaxed">Awaiting input content to run analytics index...</span>
                              }
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Tool 7: Remove Duplicate Lines -->
                      @if (toolId() === 'remove-duplicate-lines') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Deduplication Rules</span>
                          <div class="space-y-3">
                            <label class="flex items-center gap-2.5 text-xs text-zinc-650 dark:text-zinc-300 cursor-pointer select-none font-semibold">
                              <input type="checkbox" [checked]="dupCaseInsensitive()"
                                (change)="dupCaseInsensitive.set($any($event.target).checked); dedupLines()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Case-Insensitive Deduplication
                            </label>

                            <label class="flex items-center gap-2.5 text-xs text-zinc-650 dark:text-zinc-300 cursor-pointer select-none font-semibold">
                              <input type="checkbox" [checked]="dupStripWhitespace()" (change)="dupStripWhitespace.set($any($event.target).checked); dedupLines()" 
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip spacing before checks
                            </label>

                            <div class="space-y-1.5">
                              <span class="block text-xs text-zinc-500 dark:text-zinc-400 font-semibold select-none">Preservation Strategy</span>
                              <select [ngModel]="dupPreserveMode()" (ngModelChange)="dupPreserveMode.set($event); dedupLines()"
                                class="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-700 dark:text-zinc-300"
                              >
                                <option value="first">Preserve FIRST instance</option>
                                <option value="last">Preserve LAST instance</option>
                                <option value="unique-only">Extract ONLY unique items</option>
                              </select>
                            </div>

                            <div class="space-y-2 border-t border-zinc-150 dark:border-zinc-850 pt-4">
                              <button (click)="dedupWordsInline()" class="w-full text-left px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs cursor-pointer transition flex items-center justify-between">
                                <span>Deduplicate Words Inline</span>
                                <mat-icon class="text-sm scale-95">text_fields</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Tool 8: Text Cleaner -->
                      @if (toolId() === 'text-cleaner') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Cleaning Sub-functions</span>
                          <div class="space-y-3 font-semibold text-xs text-zinc-650 dark:text-zinc-300">
                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" [(ngModel)]="cleanHTML" (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip HTML & XML Tags
                            </label>

                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                [(ngModel)]="cleanSpecialChars"
                                (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip Special Characters
                            </label>

                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" [(ngModel)]="cleanEmojis" (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip Graphic Emojis
                            </label>

                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" [(ngModel)]="cleanUnicode" (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip Non-ASCII Unicode Symbols
                            </label>

                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" [(ngModel)]="cleanSpaces"
                                (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Strip Redundant Multi-spaces
                            </label>

                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" [(ngModel)]="cleanSpacesAll"
                                (change)="executeCleaning()"
                                class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-850 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              Stirp absolutely all spacebars
                            </label>
                          </div>
                        </div>
                      }

                      <!-- Tool 9: HTML Escape / String Tools -->
                      @if (toolId() === 'html-escape') {
                        <div class="space-y-4">
                          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">Encoding Matrices</span>
                          <div class="grid grid-cols-1 gap-1.5 text-xs font-mono">
                            <div class="flex items-center gap-1">
                              <button (click)="escapeHtml(true)" class="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold transition">
                                HTML Escape
                              </button>
                              <button (click)="escapeHtml(false)" class="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold transition">
                                HTML Unescape
                              </button>
                            </div>

                            <div class="flex items-center gap-1">
                              <button (click)="escapeJson(true)" class="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold transition">
                                JSON Escape
                              </button>
                              <button (click)="escapeJson(false)" class="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold transition">
                                JSON Unescape
                              </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                              <button (click)="escapeJS()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                                JavaScript String Escaper
                              </button>
                              <button (click)="escapeSql()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                                SQL String Sanitize Escape
                              </button>
                              <button (click)="escapeRegex()" class="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-100 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition">
                                RegExp Safe Escaper
                              </button>
                            </div>
                            <div class="flex items-center gap-1 border-t border-zinc-150 dark:border-zinc-850 pt-3 flex-wrap">
                              <button (click)="convertBinary('to')" class="flex-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer font-bold transition">
                                ASCII &rarr; BIN
                              </button>
                              <button (click)="convertBinary('from')" class="flex-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer font-bold transition">
                                BIN &rarr; ASCII
                              </button>
                            </div>

                            <div class="flex items-center gap-1 flex-wrap">
                              <button (click)="convertHex('to')" class="flex-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 cursor-pointer font-bold transition">
                                ASCII &rarr; HEX
                              </button>
                              <button (click)="convertHex('from')" class="flex-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 cursor-pointer font-bold transition">
                                HEX &rarr; ASCII
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                </div>
              } @else {
                <!-- Collapsed State -->
                <div class="flex items-center gap-2 p-2 pr-12 overflow-x-auto scrollbar-thin">
                  <span class="text-xs font-mono px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-150 dark:border-emerald-500/30 rounded-lg">
                    {{ toolName() | uppercase }}
                  </span>
                  <span class="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></span>
                  <span class="text-xs font-mono px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-150 dark:border-emerald-500/30 rounded-lg">WIDGET PARAMETERS</span>
                </div>
              }
        </aside>
        <aside class="relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
          <!-- Toggle Button -->
            <button (click)="toggleMatrix()" type="button" tabindex="0"
              class="absolute top-2 cursor-pointer right-3 z-20 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg flex items-center justify-center transition"
              [title]="matrixExpanded() ? 'Collapse tools' : 'Expand tools'">
              <mat-icon style="font-size:18px;width:18px;height:18px;">
                {{ matrixExpanded() ? 'expand_circle_up' : 'expand_circle_down' }}
              </mat-icon>
            </button>
            @if (matrixExpanded()) {
              <!-- Expanded State -->
              <div class="p-4">
                <!-- Workbench Controls Panel Left column -->
                <div class="grid grid-cols-1 md:grid-cols-1 gap-4 items-start">
                  <span class="text-xs font-bold text-zinc-400 uppercase tracking-wide block border-b border-zinc-150 dark:border-zinc-850 pb-2">METRIC INDEX STATS</span>
                  <!-- Live Input Inline Counters Widgets -->
                  <div class="md:col-span-2 bg-zinc-950 p-5 rounded-2xl block space-y-3 text-left border border-zinc-850 shadow-md">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5">
                        <span class="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Characters</span>
                        <span class="block text-lg font-bold text-white font-mono">{{ charCount() }}</span>
                      </div>
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5">
                        <span class="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Words</span>
                        <span class="block text-lg font-bold text-white font-mono">{{ wordCount() }}</span>
                      </div>
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5">
                        <span class="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Lines</span>
                        <span class="block text-lg font-bold text-white font-mono">{{ lineCount() }}</span>
                      </div>
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5">
                        <span class="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Paragraphs</span>
                        <span class="block text-lg font-bold text-white font-mono">{{ paragraphCount() }}</span>
                      </div>
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5">
                        <span class="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Sentences</span>
                        <span class="block text-lg font-bold text-white font-mono">{{ sentenceCount() }}</span>
                      </div>
                      <div class="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-0.5 col-span-full">
                      <span class="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest block select-none">Quick Generators</span>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-1.5 text-[10px] font-mono">
                        <button (click)="generateLorem()" class="px-2.5 py-1.5 text-left bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 rounded-lg text-zinc-650 dark:text-zinc-400 font-bold transition cursor-pointer flex items-center justify-between border border-zinc-150 dark:border-zinc-850">
                          <span>Lorem Ipsum Standard</span>
                          <mat-icon class="text-xs scale-75 text-zinc-400">text_snippet</mat-icon>
                        </button>
                        <button (click)="generateRandomName()" class="px-2.5 py-1.5 text-left bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 rounded-lg text-zinc-650 dark:text-zinc-400 font-bold transition cursor-pointer flex items-center justify-between border border-zinc-150 dark:border-zinc-850">
                          <span>Random Name Generator</span>
                          <mat-icon class="text-xs scale-75 text-zinc-400">person</mat-icon>
                        </button>
                        <button (click)="generateUsername()" class="px-2.5 py-1.5 text-left bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 rounded-lg text-zinc-650 dark:text-zinc-400 font-bold transition cursor-pointer flex items-center justify-between border border-zinc-150 dark:border-zinc-850">
                          <span>Random Username/ID</span>
                          <mat-icon class="text-xs scale-75 text-zinc-400">badge</mat-icon>
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Collapsed State -->
              <div class="flex items-center gap-2 p-2 pr-12 overflow-x-auto scrollbar-thin">
                <span class="text-xs font-mono px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-150 dark:border-emerald-500/30 rounded-lg">METRIC INDEX STATS</span>
              </div>
            }
        </aside>
        <!-- Workbench Code Editors Section Right columns -->
        <div class="lg:col-span-1 space-y-1">
          <!-- Master Grid for Inputs and Outputs -->
          <div class="flex w-full h-[520px] resize-container">
            <!-- Panel Left (A: Raw Source Input) -->
            <div [style.width.%]="leftWidth"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              [class.border-emerald-500]="isDragging()"
              [class.bg-emerald-50/5]="isDragging()"
              class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden block flex flex-col h-[520px] transition-all relative"
            >
              <!-- Panel Header -->
              <div class="p-3 bg-zinc-950 border-b border-zinc-850/80 flex items-center justify-between gap-2 text-xs font-mono shrink-0 select-none">
                <span class="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                  <mat-icon class="text-xs scale-90 text-[#10b981]">input</mat-icon> INPUT PANEL (TEXT A)
                </span>

                <div class="flex items-center gap-2">
                  <!-- File Import button -->
                  <button (click)="fileInputA.click()" class="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-xl transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center scale-95"
                    title="Load Local Text File">
                    <mat-icon class="text-sm">upload_file</mat-icon>
                  </button>
                  <input #fileInputA type="file" (change)="onFileSelectedA($event)" class="hidden" accept=".txt,.json,.md,.html,.xml,.csv,.js,.ts"/>

                  <!-- Paste of Clipboard shortcut -->
                  <button (click)="pasteTextA()" class="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-xl transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center scale-95"
                    title="Paste from System Clipboard">
                    <mat-icon class="text-sm">content_paste</mat-icon>
                  </button>

                  <!-- Divider -->
                  <span class="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></span>

                  <!-- Undo Redo Controllers -->
                  <button (click)="undo()" [disabled]="!canUndo()"
                    class="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-xl transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center scale-95"
                    title="Undo Changes (Ctrl+Z)">
                    <mat-icon class="text-sm">undo</mat-icon>
                  </button>
                  <button (click)="redo()" [disabled]="!canRedo()"
                    class="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-xl transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center scale-95"
                    title="Redo Changes (Ctrl+Y)">
                    <mat-icon class="text-sm">redo</mat-icon>
                  </button>
                  <!-- Clear Button -->
                  <button (click)="clearAll()"
                    class="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                    title="Clear All">
                    <mat-icon class="text-xs scale-75">delete_sweep</mat-icon>
                  </button>

                </div>
              </div>

              <!-- Search/Replace Overlay embedded into Header -->
              <div class="bg-zinc-950/80 px-3 py-1.5 border-b border-zinc-850/60 flex items-center gap-2 text-xs font-mono select-none">
                <div class="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 flex-grow">
                  <input type="text" [(ngModel)]="searchVal" placeholder="Find term..." 
                    class="bg-transparent border-none outline-none text-[11px] text-zinc-200 placeholder-zinc-650 w-full focus:ring-0 p-0"
                  />
                </div>
                <div class="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 flex-grow">
                  <input type="text" [(ngModel)]="replaceVal" placeholder="Replace..." 
                    class="bg-transparent border-none outline-none text-[11px] text-zinc-200 placeholder-zinc-650 w-full focus:ring-0 p-0"
                  />
                </div>
                <button (click)="executeReplace()" class="px-2 py-0.5 bg-zinc-800 border border-zinc-700 hover:border-zinc-550 rounded font-bold text-[10px] text-zinc-300 hover:text-white transition cursor-pointer select-none">
                  REPLACE ALL
                </button>
              </div>

              <!-- Content Area with Line Numbers -->
              <div class="flex-grow flex overflow-hidden">
                <div class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden" #gutterAreaA>
                  @for (num of getLineNumbers(rawInput()); track num) {
                    <div>{{ num }}</div>
                  }
                </div>
                <textarea
                  #textareaA
                  [value]="rawInput()"
                  (input)="onTextInputChange($any($event.target).value)"
                  (scroll)="gutterAreaA.scrollTop = textareaA.scrollTop"
                  placeholder="Paste or drag-and-drop system text logs here..."
                  class="flex-grow p-4 text-xs font-mono bg-transparent text-zinc-100 placeholder-zinc-650 border-none outline-none resize-none focus:ring-0 overflow-y-auto leading-relaxed select-text"
                ></textarea>
              </div>

              @if (isDragging()) {
                <div class="absolute inset-0 bg-[#10b981]/5 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 font-mono text-center cursor-copy select-none border border-emerald-500/20 rounded-2xl">
                  <mat-icon class="text-4xl">cloud_upload</mat-icon>
                  <p class="text-xs font-bold font-mono">Drop file to load content immediately</p>
                </div>
              }
            </div>

            <div (mousedown)="startResize($event)"
              class="w-4 shrink-0 cursor-col-resize bg-zinc-900 border border-zinc-900 rounded-2xl">
            </div>

            <!-- Panel Right (B: Diff modified Target OR Procured Output preview) -->
            <div [style.width.%]="100 - leftWidth" class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden block flex flex-col h-[520px] transition-all relative">
              <!-- Content Header switches on Diff tool -->
              @if (toolId() === 'text-diff-checker') {
                <div class="p-3 bg-zinc-950 border-b border-zinc-850/80 flex items-center justify-between gap-2 text-xs font-mono shrink-0 select-none">
                  <span class="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                    <mat-icon class="text-xs scale-90 text-[#3b82f6]">edit_note</mat-icon> MODIFIED PANEL (TEXT B)
                  </span>

                  <div class="flex items-center gap-2">
                    <button (click)="fileInputB.click()" 
                      class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition flex items-center justify-center cursor-pointer border-none bg-transparent" 
                      title="Load Local Text File B"
                    >
                      <mat-icon class="text-sm">upload_file</mat-icon>
                    </button>
                    <input #fileInputB type="file" (change)="onFileSelectedB($event)" class="hidden" accept=".txt,.json,.md,.html,.xml,.csv,.js,.ts"/>

                    <button (click)="pasteTextB()" 
                      class="p-1 hover:bg-zinc-800 text-zinc-405 hover:text-white rounded transition flex items-center justify-center cursor-pointer border-none bg-transparent" 
                      title="Paste Clipboard B"
                    >
                      <mat-icon class="text-sm">content_paste</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="flex-grow flex overflow-hidden">
                  <div class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden" #gutterAreaB>
                    @for (num of getLineNumbers(diffRightText()); track num) {
                      <div>{{ num }}</div>
                    }
                  </div>
                  <textarea
                    #textareaB
                    [value]="diffRightText()"
                    (input)="onTextBInputChange($any($event.target).value)"
                    (scroll)="gutterAreaB.scrollTop = textareaB.scrollTop"
                    placeholder="Paste modified version for side-by-side or inline highlight comparison..."
                    class="flex-grow p-4 text-xs font-mono bg-transparent text-zinc-100 placeholder-zinc-650 border-none outline-none resize-none focus:ring-0 overflow-y-auto leading-relaxed select-text"
                  ></textarea>
                </div>
              } @else {
                <!-- Standard Procured output preview panel -->
                <div class="p-3 bg-zinc-950 border-b border-zinc-850/80 flex items-center justify-between gap-4 text-xs font-mono shrink-0 select-none">
                  <span class="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase">
                    <mat-icon class="text-xs scale-90 text-[#10b981]">visibility</mat-icon> OUTPUT PREVIEW
                  </span>

                  <div class="flex items-center gap-1.5">
                    <!-- Copy success prompt -->
                    <button (click)="copyOutput()"
                      [disabled]="!processedOutput()"
                      class="px-2.5 py-1 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-950 text-emerald-400 font-mono text-[10px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition disabled:opacity-35 disabled:cursor-not-allowed border-none hover:text-emerald-300">
                      <mat-icon class="text-xs scale-75">{{ copySuccess() ? 'check_circle' : 'content_copy' }}</mat-icon>
                      {{ copySuccess() ? 'COPIED!' : 'COPY' }}
                    </button>

                    <button (click)="downloadOutput()"
                      [disabled]="!processedOutput()"
                      class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition flex items-center justify-center cursor-pointer border-none bg-transparent" 
                      title="Download Compiled File Output">
                      <mat-icon class="text-sm">download</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Custom View Renderers for Markdown visual cards or standard pre blocks -->
                <div class="flex-grow flex overflow-hidden bg-zinc-950/25">
                  @if (toolId() === 'markdown-preview' || toolId() === 'markdown-tools') {
                    @if (mdPreviewMode() === 'rendered') {
                      <!-- RENDERED HTML MARKDOWN VIEWER -->
                      <div class="flex-grow p-6 overflow-y-auto max-h-full leading-relaxed select-text text-zinc-100 select-all prose dark:prose-invert prose-emerald text-sm max-w-none text-left" [innerHTML]="compiledMarkdownHtml()"></div>
                    } @else {
                      <!-- RAW HTML CODE OUTPUT -->
                      <div class="flex-grow flex overflow-hidden font-mono">
                        <div class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden" #gutterAreaMarkdown>
                          @for (num of getLineNumbers(compiledMarkdownHtml()); track num) {
                            <div>{{ num }}</div>
                          }
                        </div>
                        <pre 
                          class="flex-grow p-4 overflow-y-auto overflow-x-auto text-xs text-amber-100 select-text bg-zinc-900 leading-relaxed font-mono select-all text-left"
                          (scroll)="gutterAreaMarkdown.scrollTop = $any($event.target).scrollTop"
                        >{{ compiledMarkdownHtml() }}</pre>
                      </div>
                    }
                  } @else {
                    <!-- STANDARD TEXT DECORATOR OUTPUT PREVIEW -->
                    <div class="w-12 bg-zinc-950 text-right pr-3 pl-1 py-4 text-[11px] font-mono select-none text-zinc-650 flex flex-col border-r border-zinc-850/80 leading-relaxed font-semibold overflow-y-hidden" #gutterAreaOutput>
                      @for (num of getLineNumbers(processedOutput()); track num) {
                        <div>{{ num }}</div>
                      }
                    </div>
                    <textarea
                      #textareaOutput
                      [value]="processedOutput()"
                      (scroll)="gutterAreaOutput.scrollTop = textareaOutput.scrollTop"
                      readonly
                      placeholder="Processed format outputs will appear here..."
                      class="flex-grow p-4 text-xs font-mono bg-transparent text-emerald-400 placeholder-zinc-700 border-none outline-none resize-none focus:ring-0 overflow-y-auto leading-relaxed select-all text-left"
                    ></textarea>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Diff Results Render Panel (Visible if active tool is Diff-Compare) -->
          @if (toolId() === 'text-diff-checker') {
            <div class="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden flex flex-col text-left">
              <div class="p-4 bg-zinc-900/80 border-b border-zinc-85">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono font-bold text-zinc-455 tracking-widest uppercase">REAL-TIME COMPARISON TRACE</span>
                  <div class="flex items-center gap-3 font-mono text-[9px] font-bold">
                    <span class="flex items-center gap-1 text-emerald-400">
                      <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> ADDITIONS
                    </span>
                    <span class="flex items-center gap-1 text-rose-455">
                      <span class="w-2 h-2 bg-rose-500 rounded-full"></span> DELETIONS
                    </span>
                  </div>
                </div>
              </div>

              <div class="p-4 max-h-[360px] overflow-y-auto space-y-1 font-mono text-xs select-text">
                @if (diffViewMode() === 'split') {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Left side list (Removed lines and unmodified) -->
                    <div class="space-y-0.5 border-r border-zinc-900 pr-2">
                      <div class="text-[9px] text-zinc-550 font-bold mb-1 tracking-wider">A PANEL SLATE</div>
                      @for (line of getDiffLeftLines(); track $index) {
                        <div 
                          [class.bg-rose-950/20]="line.type === 'removed'"
                          [class.border-l-2]="line.type === 'removed'"
                          [class.border-rose-455]="line.type === 'removed'"
                          class="py-0.5 px-2 select-text font-mono truncate-none"
                        >
                          <span class="text-zinc-600 select-none mr-2 text-[10px]">{{ line.type === 'removed' ? '-' : ' ' }}</span>
                          <span [class.text-rose-400]="line.type === 'removed'" [class.text-zinc-400]="line.type === 'unmodified'" class="break-all whitespace-pre-wrap">{{ line.text || ' ' }}</span>
                        </div>
                      }
                    </div>

                    <!-- Right side list (Added lines and unmodified) -->
                    <div>
                      <div class="text-[9px] text-zinc-550 font-bold mb-1 tracking-wider">B PANEL SLATE</div>
                      @for (line of getDiffRightLines(); track $index) {
                        <div 
                          [class.bg-emerald-950/20]="line.type === 'added'"
                          [class.border-l-2]="line.type === 'added'"
                          [class.border-emerald-500]="line.type === 'added'"
                          class="py-0.5 px-2 select-text font-mono truncate-none"
                        >
                          <span class="text-zinc-650 select-none mr-2 text-[10px]">{{ line.type === 'added' ? '+' : ' ' }}</span>
                          <span [class.text-emerald-400]="line.type === 'added'" [class.text-zinc-300]="line.type === 'unmodified'" class="break-all whitespace-pre-wrap">{{ line.text || ' ' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <!-- Unified Inline Diff Viewer -->
                  <div class="space-y-0.5">
                    @for (line of diffResult(); track $index) {
                      <div 
                        [class.bg-emerald-950/25]="line.type === 'added'"
                        [class.text-emerald-400]="line.type === 'added'"
                        [class.border-l-2]="line.type === 'added'"
                        [class.border-emerald-500]="line.type === 'added'"
                        [class.bg-rose-950/25]="line.type === 'removed'"
                        [class.text-rose-400]="line.type === 'removed'"
                        [class.border-l-2]="line.type === 'removed'"
                        [class.border-rose-400]="line.type === 'removed'"
                        [class.text-zinc-400]="line.type === 'unmodified'"
                        class="py-0.5 px-2.5 flex items-baseline select-text font-mono transition-colors duration-100"
                      >
                        <span class="w-6 select-none font-bold text-[10px] text-right pr-2">
                          {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                        </span>
                        <span class="break-all whitespace-pre-wrap flex-grow">{{ line.text }}</span>
                      </div>
                    } @empty {
                      <div class="text-center py-6 text-zinc-600 font-medium">Awaiting baseline text changes compare...</div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    textarea {
      box-shadow: none !important;
    }
  `]
})
export class TextToolkitComponent {
  leftWidth = 50;
  private resizing = false;
  startResize(event: MouseEvent) {
    event.preventDefault();
    this.resizing = true;
  }
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizing) return;
    const container = document.querySelector('.resize-container') as HTMLElement;
    const rect = container.getBoundingClientRect();
    this.leftWidth = ((event.clientX - rect.left) / rect.width) * 100;
    this.leftWidth = Math.max(20, Math.min(80, this.leftWidth));
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.resizing = false;
  }
  public toolId = signal<string>('text-formatter');
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('toolId') set toolIdSetter(val: string) {
    this.toolId.set(val);
    this.refreshOnToolSwitch();
  }

  // Active inputs raw state management
  public rawInput = signal<string>('');
  public processedOutput = signal<string>('');
  public diffRightText = signal<string>('');
  public isDragging = signal<boolean>(false);

  // Search/Replace tracking values
  public searchVal = '';
  public replaceVal = '';

  // Options states
  public diffIgnoreWhitespace = signal<boolean>(false);
  public diffViewMode = signal<string>('split'); // inline vs split
  public diffResult = signal<DiffLine[]>([]);

  public slugSeparator = signal<string>('-');
  public slugRemoveStopwords = signal<boolean>(true);
  public slugStripNumbers = signal<boolean>(false);
  public slugKeepUppercase = signal<boolean>(false);

  public mdPreviewMode = signal<string>('rendered'); // rendered vs raw
  public mdTableRows = 3;
  public mdTableCols = 3;

  public dupPreserveMode = signal<string>('first');
  public dupCaseInsensitive = signal<boolean>(false);
  public dupStripWhitespace = signal<boolean>(true);

  public cleanHTML = true;
  public cleanSpecialChars = false;
  public cleanEmojis = false;
  public cleanUnicode = false;
  public cleanSpaces = true;
  public cleanSpacesAll = false;

  // Undo and Redo states log
  private history: string[] = [''];
  private historyIndex = 0;

  // Clipboard copy feedback success indicator
  public copySuccess = signal<boolean>(false);

  constructor() {
    // Recompute results when input changes or when dependencies mutate
    effect(() => {
      const tool = this.toolId();

      // Skip triggering calculation if diff tool is active
      if (tool === 'text-diff-checker') return;

      this.processActiveToolLogic();
    });
  }

  // Auto trigger calculations on options changing
  private processActiveToolLogic(): void {
    const input = this.rawInput();
    const tool = this.toolId();

    if (tool === 'text-formatter' || tool === 'character-counter') {
      this.processedOutput.set(input);
    } else if (tool === 'slug-generator') {
      this.triggerSlugGeneration();
    } else if (tool === 'text-cleaner') {
      this.executeCleaning();
    }
  }

  private refreshOnToolSwitch(): void {
    // Reset secondary input elements
    this.processedOutput.set(this.rawInput());
    if (this.toolId() === 'text-diff-checker') {
      this.computeDiff();
    }
  }

  // Line Number computations
  public getLineNumbers(text: string): number[] {
    if (!text) return [1];
    const realLines = text.split('\n').length;
    return Array.from({ length: Math.max(1, realLines) }, (_, i) => i + 1);
  }

  // Dynamic Tool name label mapping
  public toolName(): string {
    const mappings: Record<string, string> = {
      'text-formatter': 'Text Formatter & Line Utility workspace',
      'text-diff-checker': 'Text Diff Checker & Comparer',
      'case-converter': 'Case Case & Variable Naming Converter',
      'slug-generator': 'SEO Friendly URL Slug Generator',
      'markdown-preview': 'Markdown Live Compiler & Render Preview',
      'character-counter': 'Full Density Readability & Chars Counter',
      'remove-duplicate-lines': 'Duplicate Line & Word Deduplication Remover',
      'text-cleaner': 'Sensitive Content & Code HTML Scrubber',
      'html-escape': 'Secure Entity Escaping & Binary/HEX Encoder',
      'markdown-tools': 'Universal markdown composition workbench'
    };
    return mappings[this.toolId()] || 'Standard Text Processor Suite';
  }

  public sidebarExpanded = signal<boolean>(false);
  public toggleSidebar(): void {
    this.sidebarExpanded.update(v => !v);
  }

  public matrixExpanded = signal<boolean>(true);
  public toggleMatrix(): void {
    this.matrixExpanded.update(v => !v);
  }

  // Active textual stats derivations
  public charCount = computed(() => this.rawInput().length);
  public wordCount = computed(() => {
    return this.rawInput().trim().match(/\b[\w'-]+\b/g)?.length ?? 0;
  });
  public lineCount = computed(() => {
    const txt = this.rawInput();
    if (!txt) return 0;
    return txt.split(/\r?\n/).length;
  });

  public paragraphCount = computed(() => {
    const txt = this.rawInput();
    if (!txt.trim()) return 0;
    return txt.replace(/\r\n/g, '\n').trim().split(/\n\s*\n+/).filter(Boolean).length;
  });

  public sentenceCount = computed(() => {
    const txt = this.rawInput().trim();
    if (!txt) return 0;
    const sentences = txt.replace(/\r\n/g, '\n').match(/[^.!?]+[.!?]+/g);
    return sentences?.length ?? 0;
  });

  // Undo-Redo Operations
  private addToHistory(text: string): void {
    if (this.history[this.historyIndex] === text) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(text);
    if (this.history.length > 50) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  public undo(): void {
    if (this.canUndo()) {
      this.historyIndex--;
      this.rawInput.set(this.history[this.historyIndex]);
    }
  }

  public redo(): void {
    if (this.canRedo()) {
      this.historyIndex++;
      this.rawInput.set(this.history[this.historyIndex]);
    }
  }

  public canUndo(): boolean {
    return this.historyIndex > 0;
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  public onTextInputChange(val: string): void {
    this.rawInput.set(val);
    this.addToHistory(val);
  }

  public onTextBInputChange(val: string): void {
    this.diffRightText.set(val);
    if (this.toolId() === 'text-diff-checker') {
      this.computeDiff();
    }
  }

  public clearAll(): void {
    this.rawInput.set('');
    this.processedOutput.set('');
    this.diffRightText.set('');
    this.diffResult.set([]);
    this.addToHistory('');
  }

  // TEXT FORMATTING FUNCTIONS
  public formatNormalizeWhitespace(): void {
    const formatted = this.rawInput().replace(/\\s+/g, ' ').trim();
    this.rawInput.set(formatted);
    this.processedOutput.set(formatted);
    this.addToHistory(formatted);
  }

  public formatRemoveExtraSpaces(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    const cleaned = lines.map(line => line.trim().replace(/\\s+/g, ' ')).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  public formatRemoveEmptyLines(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    const cleaned = lines.filter(line => line.trim().length > 0).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  public formatTrim(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    const cleaned = lines.map(line => line.trim()).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  public formatBeautify(): void {
    const text = this.rawInput().replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n');
    const cleaned = text.split('\n')
      .map(line => line.trim())
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  public formatMinify(): void {
    const cleaned = this.rawInput().replace(/\\s+/g, ' ').trim();
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  // LINE SORTING AND ORDERINGS
  public lineSortAsc(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    lines.sort((a, b) => a.localeCompare(b));
    const processed = lines.join('\n');
    this.rawInput.set(processed);
    this.processedOutput.set(processed);
    this.addToHistory(processed);
  }

  public lineSortDesc(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    lines.sort((a, b) => b.localeCompare(a));
    const processed = lines.join('\n');
    this.rawInput.set(processed);
    this.processedOutput.set(processed);
    this.addToHistory(processed);
  }

  public lineReverse(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    lines.reverse();
    const processed = lines.join('\n');
    this.rawInput.set(processed);
    this.processedOutput.set(processed);
    this.addToHistory(processed);
  }

  public lineShuffle(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    const processed = lines.join('\n');
    this.rawInput.set(processed);
    this.processedOutput.set(processed);
    this.addToHistory(processed);
  }

  public indentText(spaces: number): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    const pad = ' '.repeat(spaces);
    const cleaned = lines.map(line => pad + line).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  public outdentText(): void {
    const lines = this.rawInput().split('\\n').join('\n').split('\n');
    const cleaned = lines.map(line => {
      if (line.startsWith('    ')) return line.substring(4);
      if (line.startsWith('  ')) return line.substring(2);
      if (line.startsWith('\\t') || line.startsWith('\t')) return line.substring(1);
      return line;
    }).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  // CASE & NAMING CONVERTER
  public convertCase(mode: string): void {
    const input = this.rawInput();
    if (!input) return;

    const toCamel = (s: string) => {
      const cleaned = s.replace(/[^a-zA-Z0-9\s_-]/g, '');
      return cleaned.toLowerCase()
        .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, c => c.toLowerCase());
    };

    const toPascal = (s: string) => {
      const cleaned = s.replace(/[^a-zA-Z0-9\s_-]/g, '');
      return cleaned.toLowerCase()
        .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, c => c.toUpperCase());
    };

    const toSnake = (s: string) => {
      return s.replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/[\s_-]+/g, '_')
        .toLowerCase();
    };

    const toKebab = (s: string) => {
      return s.replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .toLowerCase();
    };

    const toConst = (s: string) => {
      return s.replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/[\s_-]+/g, '_')
        .toUpperCase();
    };

    const toSentence = (s: string) => {
      return s.toLowerCase().replace(/(^\\s*|\\.\\s+)([a-z])/g, (_, boundary, c) => boundary + c.toUpperCase());
    };

    let result = '';
    const items = input.split('\\n').join('\n').split('\n');

    const mapped = items.map(line => {
      if (!line.trim()) return '';
      switch (mode) {
        case 'camel': return toCamel(line);
        case 'pascal': return toPascal(line);
        case 'snake': return toSnake(line);
        case 'kebab': return toKebab(line);
        case 'constant': return toConst(line);
        case 'sentence': return toSentence(line);
        case 'upper': return line.toUpperCase();
        case 'lower': return line.toLowerCase();
        default: return line;
      }
    });

    result = mapped.join('\n');
    this.processedOutput.set(result);
  }

  public formatFilename(): void {
    const input = this.rawInput();
    if (!input) return;
    const lines = input.split('\n');
    const cleaned = lines.map(line => {
      if (!line.trim()) return '';
      return line.toLowerCase()
        .replace(/[^a-z0-9.\s_-]/g, '')
        .trim()
        .replace(/[\s_-]+/g, '-')
        .substring(0, 100);
    }).join('\n');
    this.processedOutput.set(cleaned);
  }

  public generateVariable(): void {
    const input = this.rawInput().trim();
    if (!input) {
      this.processedOutput.set('const clientRegistrationCounter = 0;');
      return;
    }
    const cleanPhrase = input.toLowerCase().replace(/[^a-z0-9\\s]/g, '');
    const camel = cleanPhrase.replace(/\\s+(.)/g, (_, c) => c.toUpperCase());
    this.processedOutput.set(`const ${camel} = null;\\nlet get${camel.charAt(0).toUpperCase() + camel.slice(1)} = () => {};`);
  }

  // SEO SLUG GENERATOR
  public triggerSlugGeneration(): void {
    const input = this.rawInput();
    if (!input) {
      this.processedOutput.set('');
      return;
    }

    const separator = this.slugSeparator();
    const removeStopwords = this.slugRemoveStopwords();
    const stripNumbers = this.slugStripNumbers();
    const keepCasing = this.slugKeepUppercase();

    const stopWords = new Set(['the', 'and', 'a', 'of', 'in', 'is', 'it', 'for', 'to', 'on', 'with', 'at', 'by', 'an', 'as']);

    const lines = input.split('\\n').join('\n').split('\n');
    const slugs = lines.map(line => {
      let cleaned = line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // strip unicode accent marks

      if (!keepCasing) {
        cleaned = cleaned.toLowerCase();
      }

      // Keep alphanumeric spaces
      cleaned = cleaned.replace(/[^a-zA-Z0-9\s_-]/g, '');

      if (stripNumbers) {
        cleaned = cleaned.replace(/[0-9]/g, '');
      }

      let words = cleaned.split(/\\s+/).filter(w => w.length > 0);

      if (removeStopwords) {
        words = words.filter(word => !stopWords.has(word.toLowerCase()));
      }

      return words.join(separator);
    });

    this.processedOutput.set(slugs.join('\n'));
  }

  // TEXT SCRUBBER CLEANER
  public executeCleaning(): void {
    const input = this.rawInput();
    if (!input) {
      this.processedOutput.set('');
      return;
    }

    let cleaned = input;

    if (this.cleanHTML) {
      cleaned = cleaned.replace(/<[^>]*>/g, '');
    }
    if (this.cleanSpecialChars) {
      cleaned = cleaned.replace(/[^a-zA-Z0-9\\s\\n]/g, '');
    }
    if (this.cleanEmojis) {
      // standard unicode emoji ranges regexes
      cleaned = cleaned.replace(/[\\u1F600-\\u1F64F]|[\\u1F300-\\u1F5FF]|[\\u1F680-\\u1F6FF]|[\\u2600-\\u26FF]|[\\u2700-\\u27BF]|[\\u1F900-\\u1F9FF]|[\\u1F1E0-\\u1F1FF]/g, '');
    }
    if (this.cleanUnicode) {
      cleaned = cleaned.replace(/[^\\x00-\\x7F]/g, '');
    }
    if (this.cleanSpaces) {
      cleaned = cleaned.split('\\n').join('\n')
        .split('\n')
        .map(line => line.trim().replace(/\\s+/g, ' '))
        .join('\n');
    }
    if (this.cleanSpacesAll) {
      cleaned = cleaned.replace(/\\s+/g, '');
    }

    this.processedOutput.set(cleaned);
  }

  // ENCAPSULATION ESCAPE METHODS
  public escapeHtml(esc: boolean): void {
    const input = this.rawInput();
    if (!input) return;
    if (esc) {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      const clean = input.replace(/[&<>"']/g, m => map[m]);
      this.processedOutput.set(clean);
    } else {
      const map: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
      };
      const clean = input.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => map[m]);
      this.processedOutput.set(clean);
    }
  }

  public escapeJson(esc: boolean): void {
    const input = this.rawInput();
    if (!input) return;
    try {
      if (esc) {
        this.processedOutput.set(JSON.stringify(input));
      } else {
        this.processedOutput.set(JSON.parse(input));
      }
    } catch {
      this.processedOutput.set('Error: Failed to escape/unescape. Make sure payload matches JSON expectations.');
    }
  }

  public escapeJS(): void {
    const input = this.rawInput();
    if (!input) return;
    const escaped = input.replace(/[\\\\'"\\x08\\f\\n\\r\\t]/g, character => {
      switch (character) {
        case '\b': return '\\b';
        case '\f': return '\\f';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '\t': return '\\t';
        case "'": return "\\'";
        case '"': return '\\"';
        case '\\': return '\\\\';
        default: return character;
      }
    });
    this.processedOutput.set(`"${escaped}"`);
  }

  public escapeSql(): void {
    const input = this.rawInput();
    if (!input) return;
    const escaped = input.replace(/['"\\\\\\x00\\x1a\\n\\r\\t]/g, char => {
      switch (char) {
        case "\0": return "\\0";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\t": return "\\t";
        case "\x1a": return "\\Z";
        case "'": return "''"; // standard sql escape single quotes
        case '"': return '""';
        case "\\": return "\\\\";
        default: return "\\" + char;
      }
    });
    this.processedOutput.set(escaped);
  }

  public escapeRegex(): void {
    const input = this.rawInput();
    if (!input) return;
    const escaped = input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    this.processedOutput.set(escaped);
  }

  public convertBinary(mode: 'to' | 'from'): void {
    const input = this.rawInput().trim();
    if (!input) return;

    if (mode === 'to') {
      const bin = Array.from(input)
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');
      this.processedOutput.set(bin);
    } else {
      const parts = input.split(/\\s+/);
      try {
        const decoded = parts
          .map(bin => String.fromCharCode(Number.parseInt(bin, 2)))
          .join('');
        this.processedOutput.set(decoded);
      } catch {
        this.processedOutput.set('Error: Could not parse binary string. Ensure space separated 8-bit block input.');
      }
    }
  }

  public convertHex(mode: 'to' | 'from'): void {
    const input = this.rawInput().trim();
    if (!input) return;

    if (mode === 'to') {
      const hex = Array.from(input)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ');
      this.processedOutput.set(hex.toUpperCase());
    } else {
      const parts = input.split(/\\s+/);
      try {
        const decoded = parts
          .map(h => String.fromCharCode(Number.parseInt(h, 16)))
          .join('');
        this.processedOutput.set(decoded);
      } catch {
        this.processedOutput.set('Error: Could not compute hex. Provide valid hex space indicators.');
      }
    }
  }

  // MARKDOWN CUSTOM COMPILER REGEX PARSER
  public compiledMarkdownHtml = computed(() => {
    const source = this.rawInput();
    if (!source) return '<p class="text-zinc-500 italic block">Markdown rendered preview will appear dynamically...</p>';

    let html = source
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n');

    // Parse Headers
    html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3 class="font-extrabold text-[#10b981] text-base">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold border-b border-zinc-800 pb-1 mt-3 text-white">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-extrabold pb-2 border-b-2 border-zinc-800 text-emerald-400">$1</h1>');

    // Code Blocks
    html = html.replace(/\\`\\`\\`([\\s\\S]*?)\\`\\`\\`/gm, '<pre class="bg-zinc-950 p-3 rounded-lg border border-zinc-850 font-mono text-xs select-all text-emerald-305 leading-relaxed my-2 inline-block w-full overflow-x-auto">$1</pre>');

    // Inline Code
    html = html.replace(/\\`([^\\`]+)\\`/g, '<code class="bg-[#242427] text-orange-400 font-mono p-0.5 rounded font-bold text-[11px]">$1</code>');

    // Blockquotes
    html = html.replace(/^> (.*?)$/gm, '<blockquote class="border-l-4 border-emerald-500 bg-zinc-900/35 p-3 rounded-r-lg italic text-zinc-400 my-2 block">$1</blockquote>');

    // Lists (unordered)
    html = html.replace(/^\\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');

    // Task list support
    html = html.replace(/\[x\] (.*?)$/gm, '<span class="flex items-center gap-1.5 font-bold text-emerald-400"><mat-icon class="text-xs scale-90">check_box</mat-icon> $1</span>');
    html = html.replace(/\[ \] (.*?)$/gm, '<span class="flex items-center gap-1.5 font-medium text-zinc-500"><mat-icon class="text-xs scale-90">check_box_outline_blank</mat-icon> $1</span>');

    // Multi-line spacing
    html = html.split('\n\n').map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<pre') || p.trim().startsWith('<block') || p.trim().startsWith('<li') || p.trim().startsWith('<span')) {
        return p;
      }
      return `<p class="leading-relaxed text-zinc-300 text-xs my-2">${p}</p>`;
    }).join('\n');

    // bold / italics
    html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
    html = html.replace(/~~(.*?)~~/g, '<span class="line-through text-zinc-650">$1</span>');

    // Links/Images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;" class="rounded border border-zinc-850 p-1"/>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-emerald-400 font-bold hover:underline">$1</a>');

    return html;
  });

public markdownInsert(type: string): void {
    const mapping: Record<string, string> = {
      'bold': '**highlighted text**',
      'italic': '*italic text*',
      'quote': '> This is a blockquote line',
      'table': '\n- [ ] Task checkbox item',
      'code': '`const dev = true;`'
    };
    const chunk = mapping[type] || '';
    const updated = this.rawInput() + chunk;
    this.rawInput.set(updated);
    this.addToHistory(updated);
  }

  public markdownInsertTable(): void {
    const rows = Math.min(10, Math.max(1, this.mdTableRows));
    const cols = Math.min(10, Math.max(1, this.mdTableCols));

    let md = '\n\n|';
    for (let c = 1; c <= cols; c++) {
      md += ` Header ${c} |`;
    }
    md += '\n|';
    for (let c = 1; c <= cols; c++) {
      md += ' --- |';
    }
    for (let r = 1; r <= rows; r++) {
      md += '\n|';
      for (let c = 1; c <= cols; c++) {
        md += ` Cell ${r}-${c} |`;
      }
    }
    md += '\n\n';

    const updated = this.rawInput() + md;
    this.rawInput.set(updated);
    this.addToHistory(updated);
  }

  // CHARACTER AND READABILITY LEVEL CALCULATIONS
  public readabilityReadingTime(): string {
    const count = this.wordCount();
    if (count === 0) return '0m 0s';
    const totalSecs = Math.round((count / 200) * 60);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s}s`;
  }

  public readabilitySpeakingTime(): string {
    const count = this.wordCount();
    if (count === 0) return '0m 0s';
    const totalSecs = Math.round((count / 130) * 60);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s}s`;
  }

  public readabilitySentences(): number {
    const txt = this.rawInput().trim();
    if (!txt) return 0;
    return txt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  public readabilityParagraphs(): number {
    const txt = this.rawInput().trim();
    if (!txt) return 0;
    return txt.split('\\n').join('\n').split('\n\n').filter(p => p.trim().length > 0).length;
  }

  public readabilityAvgWordLen(): string {
    const chars = this.rawInput().replace(/\\s+/g, '').length;
    const words = this.wordCount();
    if (words === 0) return '0.0';
    return (chars / words).toFixed(1);
  }

  public keywordDensityList = computed(() => {
    const text = this.rawInput().trim().toLowerCase();
    if (!text) return [];

    const matchedWords = text.match(/[a-zA-Z]+/g);
    if (!matchedWords) return [];

    const ignoreWords = new Set(['the', 'and', 'a', 'of', 'in', 'is', 'it', 'to', 'for', 'on', 'with', 'at', 'by', 'an', 'as', 'this', 'that', 'with']);
    const freqs: Record<string, number> = {};

    let trackedCount = 0;
    matchedWords.forEach(word => {
      if (word.length < 3 || ignoreWords.has(word)) return;
      freqs[word] = (freqs[word] || 0) + 1;
      trackedCount++;
    });

    if (trackedCount === 0) return [];

    return Object.keys(freqs)
      .map(word => ({
        word,
        count: freqs[word],
        percent: ((freqs[word] / matchedWords.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  // REMOVE DUPLICATE LINES UTILITY
  public dedupLines(): void {
    const input = this.rawInput();
    if (!input) return;

    const caseInsensitive = this.dupCaseInsensitive();
    const stripSpaces = this.dupStripWhitespace();
    const preserveMode = this.dupPreserveMode();

    const lines = input.split('\\n').join('\n').split('\n');
    const seen = new Set<string>();
    const indicesToKeep = new Set<number>();

    const cleanStr = (s: string) => {
      const v = stripSpaces ? s.trim() : s;
      return caseInsensitive ? v.toLowerCase() : v;
    };

    if (preserveMode === 'first') {
      for (let i = 0; i < lines.length; i++) {
        const hash = cleanStr(lines[i]);
        if (!seen.has(hash)) {
          seen.add(hash);
          indicesToKeep.add(i);
        }
      }
    } else if (preserveMode === 'last') {
      for (let i = lines.length - 1; i >= 0; i--) {
        const hash = cleanStr(lines[i]);
        if (!seen.has(hash)) {
          seen.add(hash);
          indicesToKeep.add(i);
        }
      }
    } else {
      // Extract unique only (items that occur EXACTLY once in the text)
      const counts: Record<string, number> = {};
      lines.forEach(line => {
        const h = cleanStr(line);
        counts[h] = (counts[h] || 0) + 1;
      });
      lines.forEach((line, i) => {
        const h = cleanStr(line);
        if (counts[h] === 1) {
          indicesToKeep.add(i);
        }
      });
    }

    const compiled: string[] = [];
    if (preserveMode === 'last') {
      // sort index to keep order intact
      const sorted = Array.from(indicesToKeep).sort((a, b) => a - b);
      sorted.forEach(idx => compiled.push(lines[idx]));
    } else {
      lines.forEach((line, i) => {
        if (indicesToKeep.has(i)) {
          compiled.push(line);
        }
      });
    }

    const processed = compiled.join('\n');
    this.rawInput.set(processed);
    this.processedOutput.set(processed);
    this.addToHistory(processed);
  }

  public dedupWordsInline(): void {
    const input = this.rawInput();
    if (!input) return;
    const lines = input.split('\\n').join('\n').split('\n');
    const cleaned = lines.map(line => {
      const words = line.split(/\\s+/);
      const seen = new Set<string>();
      const uniqueWords = words.filter(word => {
        const w = word.trim().toLowerCase();
        if (!w) return true;
        if (seen.has(w)) return false;
        seen.add(w);
        return true;
      });
      return uniqueWords.join(' ');
    }).join('\n');
    this.rawInput.set(cleaned);
    this.processedOutput.set(cleaned);
    this.addToHistory(cleaned);
  }

  // SEARCH AND REPLACE UTILITIES
  public executeReplace(): void {
    const sTerm = this.searchVal;
    if (!sTerm) return;
    const rTerm = this.replaceVal || '';
    const source = this.rawInput();
    const updated = source.split(sTerm).join(rTerm);
    this.rawInput.set(updated);
    this.processedOutput.set(updated);
    this.addToHistory(updated);
  }

  // SHORT WORD AND USERNAME GENERATION
  public generateLorem(): void {
    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    this.rawInput.set(lorem);
    this.addToHistory(lorem);
  }

  public generateRandomName(): void {
    const names = ['Emma Watson', 'Liam Neeson', 'Olivia Rodrigo', 'Noah Centineo', 'Sophia Loren', 'Jackson Pollock', 'Ava Gardner', 'Lucas Cranach', 'Isabella Rossellini', 'Oliver Stone'];
    const selected = names[Math.floor(Math.random() * names.length)];
    this.rawInput.set(selected);
    this.addToHistory(selected);
  }

  public generateUsername(): void {
    const pre = ['sky', 'dev', 'cloud', 'cyber', 'tech', 'delta', 'alpha', 'pixel', 'code', 'iron', 'quantum', 'byte'];
    const post = ['Runner', 'Coder', 'Force', 'Breaker', 'Scribe', 'Matrix', 'Flow', 'Craft', 'Shield', 'Forge', 'Mind'];
    const num = Math.floor(100 + Math.random() * 900);
    const p1 = pre[Math.floor(Math.random() * pre.length)];
    const p2 = post[Math.floor(Math.random() * post.length)];
    const user = `${p1}${p2}${num}`;
    this.rawInput.set(user);
    this.addToHistory(user);
  }

  // PARALLEL FILE SYSTEM IMPORTS
  public onFileSelectedA(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = (e) => {
        const text = e.target?.result as string;
        this.rawInput.set(text);
        this.addToHistory(text);
      };
      r.readAsText(file);
    }
  }

  public onFileSelectedB(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = (e) => {
        const text = e.target?.result as string;
        this.diffRightText.set(text);
        this.computeDiff();
      };
      r.readAsText(file);
    }
  }

  public pasteTextA(): void {
    navigator.clipboard.readText().then(text => {
      this.rawInput.set(text);
      this.addToHistory(text);
    }).catch(err => console.debug('Clipboard paste failed:', err));
  }

  public pasteTextB(): void {
    navigator.clipboard.readText().then(text => {
      this.diffRightText.set(text);
      this.computeDiff();
    }).catch(err => console.debug('Clipboard paste B failed:', err));
  }

  // CLIPBOARD COPIERS AND DOWN-LOADERS
  public copyOutput(): void {
    const text = this.processedOutput();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 1500);
    }).catch(err => console.debug('Clipboard copy failed:', err));
  }

  public downloadOutput(): void {
    const blob = new Blob([this.processedOutput()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.toolId()}-compiled.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // LCS ALGORITHM FOR TEXT DIFF UTILITIES
  public computeDiff(): void {
    const leftText = this.rawInput();
    const rightText = this.diffRightText();
    const ignoreWhitespace = this.diffIgnoreWhitespace();

    const leftLines = leftText.split('\\n').join('\n').split('\n');
    const rightLines = rightText.split('\\n').join('\n').split('\n');

    const cleanStr = (s: string) => ignoreWhitespace ? s.trim().replace(/\\s+/g, ' ') : s;

    const m = leftLines.length;
    const n = rightLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let u = 1; u <= m; u++) {
      for (let v = 1; v <= n; v++) {
        if (cleanStr(leftLines[u - 1]) === cleanStr(rightLines[v - 1])) {
          dp[u][v] = dp[u - 1][v - 1] + 1;
        } else {
          dp[u][v] = Math.max(dp[u - 1][v], dp[u][v - 1]);
        }
      }
    }

    const diff: DiffLine[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && cleanStr(leftLines[i - 1]) === cleanStr(rightLines[j - 1])) {
        diff.unshift({ text: rightLines[j - 1], type: 'unmodified' });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ text: rightLines[j - 1], type: 'added' });
        j--;
      } else {
        diff.unshift({ text: leftLines[i - 1], type: 'removed' });
        i--;
      }
    }

    this.diffResult.set(diff);
  }

  public getDiffLeftLines(): DiffLine[] {
    return this.diffResult().filter(line => line.type !== 'added');
  }

  public getDiffRightLines(): DiffLine[] {
    return this.diffResult().filter(line => line.type !== 'removed');
  }

  // DRAG AND DROP HANDLERS
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text !== undefined) {
          this.rawInput.set(text);
          this.processedOutput.set(text);
          this.addToHistory(text);
        }
      };
      reader.readAsText(file);
    }
  }
}
