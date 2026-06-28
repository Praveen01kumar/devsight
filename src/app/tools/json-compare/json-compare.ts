import { ChangeDetectionStrategy, Component, signal, computed, effect, PLATFORM_ID, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import loader from '@monaco-editor/loader';
import * as monaco from 'monaco-editor';

// Interfaces for Diff Structures
export interface DiffTreeNode {
  key: string;
  path: string;
  status: 'added' | 'removed' | 'modified' | 'unmodified' | 'type-mismatch';
  leftType?: string;
  rightType?: string;
  leftValue?: unknown;
  rightValue?: unknown;
  children?: DiffTreeNode[];
  isExpanded?: boolean;
}

export interface LineDiff {
  type: 'unmodified' | 'added' | 'removed' | 'modified';
  leftLineNum?: number;
  rightLineNum?: number;
  content: string;
}

export interface DiffReportSummary {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  typeMismatchCount: number;
  totalDifferences: number;
  compatibilityScore: number; // 0 to 100 percentage
}

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

@Component({
  selector: 'app-json-compare',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="isCompareFullScreen() ? 'fixed inset-0 z-[9999] bg-zinc-950 p-6 md:p-8 flex flex-col overflow-y-auto space-y-4 select-text text-left animate-fade-in h-screen w-screen' : 'space-y-4 text-left select-text'">
      <!-- Controls Panel / Main Settings Toolbar -->
      <div class="p-2 bg-zinc-950 border border-zinc-900 rounded-2xl block space-y-2">
        <!-- Matching Parameter Guards (Ignore rules) -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap gap-4 text-xs">
            <label class="flex items-center gap-2 cursor-pointer text-zinc-350 hover:text-white select-none">
              <input type="checkbox" [checked]="ignoreWhitespace()" (change)="toggleIgnoreWhitespace()"
                class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"/>
              <span class="font-mono text-[10.5px] font-bold">IGNORE WHITESPACE</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer text-zinc-350 hover:text-white select-none">
              <input type="checkbox" [checked]="ignoreKeyOrder()" (change)="toggleIgnoreKeyOrder()"
                class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"/>
              <span class="font-mono text-[10.5px] font-bold">IGNORE KEY ORDER</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer text-zinc-350 hover:text-white select-none">
              <input type="checkbox" [checked]="ignoreCase()" (change)="toggleIgnoreCase()"
                class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"/>
              <span class="font-mono text-[10.5px] font-bold">IGNORE CASE</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer text-zinc-350 hover:text-white select-none">
              <input type="checkbox" [checked]="showOnlyDifferences()" (change)="toggleShowOnlyDifferences()"
                class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"/>
              <span class="font-mono text-[10.5px] font-bold text-amber-450">DIFFERENCES ONLY</span>
            </label>
          </div>

          <!-- Utility features (import preset / file templates) -->
          <div class="flex items-center gap-2">
            <button (click)="loadDemoData()" class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-[10.5px] font-mono font-bold text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
              LOAD DEMO SCHEMAS
            </button>
            <button (click)="clearInputs()" class="px-3 py-1.5 border border-rose-950 hover:bg-rose-955/20 text-[10.5px] font-mono font-bold text-rose-400 rounded-lg transition cursor-pointer">
              RESET ALL
            </button>
            <!-- Comparison Mode / View Choices -->
            <button
              (click)="isCompareFullScreen.set(!isCompareFullScreen())"
              class="gap-2 px-2 py-0.5 flex items-center border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-[10.5px] font-mono font-bold text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              [title]="isCompareFullScreen() ? 'Exit Full Screen' : 'Full Screen View'">
              <mat-icon class="text-xs scale-75">{{ isCompareFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
              {{ isCompareFullScreen() ? 'EXIT' : 'FULL' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Left / Right Quick Handlers (Input Panel when not rendering merged results) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Input Left Node -->
        <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-2 relative">
          <span class="text-[10px] font-mono tracking-wider font-bold text-zinc-500">SOURCE JSON A (LEFT / ORIGINAL)</span>
              <!-- Formatting & Expansion Controls -->
            <div class="flex flex-wrap justify-between items-center bg-zinc-950 px-1.5 py-0.5 my-2 rounded-lg border border-zinc-800 select-none">
              <div class="flex flex-wrap">
                <button (click)="foldUnfoldAllLeft(true, 'unfold')"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                  title="Expand All Differences Nodes">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_more</mat-icon> EXPAND
                </button>
                <button (click)="foldUnfoldAllLeft(true, 'fold')"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                  title="Collapse All Differences Nodes">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_less</mat-icon> COLLAPSE
                </button>
                <div class="w-px h-3 bg-zinc-805 mx-0.5"></div>
                <button (click)="formatLeft()" [disabled]="!leftParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-emerald-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Format JSON A with proper indentation and new lines">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">format_align_left</mat-icon> FORMAT
                </button>
                <button (click)="smartFormatLeft()" [disabled]="!leftParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-blue-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Smart Format JSON A (inline simple arrays/objects)">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">auto_awesome</mat-icon> SMART
                </button>
                <button (click)="compactLeft()" [disabled]="!leftParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-amber-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Compact JSON A (minify)">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">compress</mat-icon> COMPACT
                </button>
              </div>
              <div class="flex flex-wrap">
                <button (click)="leftFileInput.click()" class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer bg-transparent border-none outline-none cursor-pointer" title="Upload JSON A">
                  <mat-icon class="text-sm">upload_file</mat-icon>
                </button>
                <input #leftFileInput type="file" (change)="onLeftFileSelected($event)" accept=".json" class="hidden" />
                <button (click)="copyText(leftText())" class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer bg-transparent border-none outline-none cursor-pointer" title="Copy Text">
                  <mat-icon class="text-sm">content_copy</mat-icon>
                </button>
              </div>
            </div>
          <div (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDropped($event, 'left')"
            class="relative border border-zinc-850 bg-zinc-950/30 rounded-xl overflow-hidden flex">
            <!-- Left gutter indexing -->
            <div #monacoEditorLeft class="w-full h-full min-h-[400px]"></div>
            @if (leftError()) {
              <div class="absolute bottom-1 right-1 px-2.5 py-1 bg-rose-955/80 text-rose-300 font-mono text-[9px] font-semibold border border-rose-900/50 rounded-lg select-none">
                Syntax Error!
              </div>
            }
          </div>
        </div>

        <!-- Input Right Node -->
        <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-2 relative animate-fade-in">
          <span class="text-[10px] font-mono tracking-wider font-bold text-zinc-500">TARGET JSON B (RIGHT / MODIFIED)</span>
            <!-- Formatting & Expansion Controls -->
            <div class="flex flex-wrap justify-between items-center bg-zinc-950 px-1.5 py-0.5 my-2 rounded-lg border border-zinc-800 select-none">
              <div class="flex flex-wrap">
                <button (click)="foldUnfoldAllLeft(false, 'unfold')"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                  title="Expand All Differences Nodes">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_more</mat-icon> EXPAND
                </button>
                <button (click)="foldUnfoldAllLeft(false, 'fold')"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none cursor-pointer"
                  title="Collapse All Differences Nodes">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">unfold_less</mat-icon> COLLAPSE
                </button>
                <div class="w-px h-3 bg-zinc-805 mx-0.5"></div>
                <button (click)="formatRight()"
                  [disabled]="!rightParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-emerald-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Format JSON B with proper indentation and new lines">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">format_align_left</mat-icon> FORMAT
                </button>
                <button (click)="smartFormatRight()" [disabled]="!rightParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-blue-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Smart Format JSON B (inline simple arrays/objects)">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">auto_awesome</mat-icon> SMART
                </button>
                <button (click)="compactRight()" [disabled]="!rightParsed()"
                  class="px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-amber-400 hover:disabled:text-zinc-400 transition flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none outline-none cursor-pointer"
                  title="Compact JSON B (minify)">
                  <mat-icon class="text-[13px] w-3 h-3 flex items-center justify-center">compress</mat-icon> COMPACT
                </button>
              </div>
              <div class="flex flex-wrap">
                <button (click)="rightFileInput.click()" class="p-1 hover:bg-zinc-800 text-zinc-450 hover:text-white rounded-lg transition cursor-pointer bg-transparent border-none outline-none cursor-pointer" title="Upload JSON B">
                  <mat-icon class="text-sm">upload_file</mat-icon>
                </button>
                <input #rightFileInput type="file" (change)="onRightFileSelected($event)" accept=".json" class="hidden" />
                <button (click)="copyText(rightText())" class="p-1 hover:bg-zinc-800 text-zinc-455 hover:text-white rounded-lg transition cursor-pointer bg-transparent border-none outline-none cursor-pointer" title="Copy Text">
                  <mat-icon class="text-sm">content_copy</mat-icon>
                </button>
              </div>
            </div>
          <div (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDropped($event, 'right')"
            class="relative border border-zinc-850 bg-zinc-950/30 rounded-xl overflow-hidden flex">
            <!-- Right gutter indexing -->
            <div #monacoEditorRight class="w-full h-full min-h-[400px]"></div>
            @if (rightError()) {
              <div class="absolute bottom-1 right-1 px-2.5 py-1 bg-rose-955/80 text-rose-300 font-mono text-[9px] font-semibold border border-rose-900/50 rounded-lg select-none">
                Syntax Error!
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Quick Analysis & Navigation Bar -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-950 p-4 border border-zinc-900 rounded-2xl">
        <div class="col-span-1 md:col-span-2 flex flex-wrap items-center gap-3">
          <!-- Diff Indicators -->
          <div class="flex items-center gap-2 font-mono text-[10.5px]">
            <span class="text-zinc-500 font-bold uppercase select-none mr-1">Summary:</span>
            <span class="px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 rounded-md font-bold flex items-center gap-0.5" title="Added keys">
              <span class="font-extrabold">+</span>{{ summary().addedCount }} Add
            </span>
            <span class="px-2 py-0.5 bg-rose-950/30 text-rose-450 border border-rose-900/40 rounded-md font-bold flex items-center gap-0.5" title="Removed keys">
              <span class="font-extrabold">-</span>{{ summary().removedCount }} Del
            </span>
            <span class="px-2 py-0.5 bg-amber-955/30 text-amber-400 border border-amber-900/40 rounded-md font-bold flex items-center gap-0.5" title="Modified values">
              <span class="font-extrabold">~</span>{{ summary().modifiedCount }} Mod
            </span>
            <span class="px-2 py-0.5 bg-purple-955/30 text-purple-400 border border-purple-900/40 rounded-md font-bold flex items-center gap-0.5" title="Type mismatches">
              <span class="font-extrabold">#</span>{{ summary().typeMismatchCount }} Type
            </span>
          </div>

          <div class="h-4 w-px bg-zinc-800 hidden sm:block"></div>

          <!-- Compatibility Indicator -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-zinc-500 uppercase font-bold select-none">Similarity:</span>
            <div class="flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-emerald-400">
              <div class="w-16 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-805">
                <div class="h-full bg-emerald-500 transition-all duration-300" [style.width.%]="summary().compatibilityScore"></div>
              </div>
              <span>{{ summary().compatibilityScore }}%</span>
            </div>
          </div>
          <div class="flex flex-wrap bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 animate-fade-in">
              @for (mode of ['split', 'unified', 'tree', 'text']; track mode) {
                <button
                  (click)="activeView.set(mode)"
                  [class.bg-zinc-800]="activeView() === mode"
                  [class.text-white]="activeView() === mode"
                  [class.text-zinc-500]="activeView() !== mode"
                  class="px-3 py-1.5 text-[11px] font-mono font-bold uppercase rounded-lg transition cursor-pointer"
                >
                  {{ mode === 'text' ? 'Raw Text Diff' : mode + ' View' }}
                </button>
              }
          </div>
        </div>

        <div class="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-3 flex-wrap">
          <!-- Navigation across differences -->
          @if (changedPaths().length > 0) {
            <div class="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-850">
              <span class="text-[10px] text-zinc-500 font-bold font-mono">CHANGE RESOLVER:</span>
              <div class="flex items-center gap-1">
                <button (click)="prevDiff()" class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer" title="Prev Difference">
                  <mat-icon class="text-sm">arrow_upward</mat-icon>
                </button>
                <span class="text-[10.5px] font-mono text-white font-bold select-none min-w-[50px] text-center">
                  {{ activeDiffIndex() + 1 }} / {{ changedPaths().length }}
                </span>
                <button (click)="nextDiff()" class="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer" title="Next Difference">
                  <mat-icon class="text-sm">arrow_downward</mat-icon>
                </button>
              </div>
            </div>
          } @else {
            <span class="text-[10px] font-mono text-zinc-500 italic">No structural variations matching.</span>
          }

          <input 
            #searchDiffEl
            type="text" 
            [value]="searchQuery()"
            (input)="searchQuery.set(searchDiffEl.value)"
            placeholder="Search difference keys..." 
            class="px-2.5 py-1 text-[11px] max-w-[150px] bg-zinc-900 border border-zinc-850 rounded-xl outline-none font-mono text-zinc-200 focus:border-zinc-700 placeholder:text-zinc-600" 
          />
        </div>
      </div>

      <!-- MAIN DIFF DISPLAYS -->
      <div class="border border-zinc-800 bg-zinc-900/10 rounded-2xl overflow-hidden min-h-[350px] flex flex-col relative select-text text-left">
        <!-- View Case 1: Split Compare View (Raw line aligned) -->
        @if (activeView() === 'split') {
          <div class="flex-grow flex flex-col md:flex-row min-h-[350px]">
            <!-- Side A -->
            <div class="flex-1 border-r border-zinc-850 flex flex-col">
              <div class="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 text-[10px] font-mono font-bold text-zinc-505 select-none flex items-center justify-between">
                <span>BASAL TEXTS A</span>
                @if (leftError()) { <span class="text-[9px] font-bold text-rose-450 uppercase">SYNTAX FAULT</span> }
              </div>
              <div 
                [class.max-h-[500px]]="!isCompareFullScreen()"
                [class.h-[60vh]]="isCompareFullScreen()"
                class="p-4 overflow-auto font-mono text-xs space-y-0.5 leading-relaxed flex-grow"
              >
                @for (line of computedDiffLines().left; track $index) {
                  <div 
                    [id]="'left-diff-line-' + $index"
                    [class.bg-rose-955/20]="line.type === 'removed'"
                    [class.text-rose-400]="line.type === 'removed'"
                    [class.bg-amber-955/20]="line.type === 'modified'"
                    [class.text-amber-400]="line.type === 'modified'"
                    [class.border-l-2]="isActiveLine($index)"
                    [class.border-emerald-500]="isActiveLine($index)"
                    class="flex items-baseline border-l-2 border-transparent transition-colors hover:bg-zinc-850/10"
                  >
                    <span class="w-8 shrink-0 text-right pr-2 text-[10px] text-zinc-605 select-none font-bold">{{ line.leftLineNum || ' ' }}</span>
                    <span class="whitespace-pre-wrap flex-1 pl-1 select-all select-text">{{ line.content || ' ' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Side B -->
            <div class="flex-1 flex flex-col">
              <div class="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 text-[10px] font-mono font-bold text-zinc-505 select-none flex items-center justify-between">
                <span>REVISED TEXTS B</span>
                @if (rightError()) { <span class="text-[9px] font-bold text-rose-455 uppercase">SYNTAX FAULT</span> }
              </div>
              <div 
                [class.max-h-[500px]]="!isCompareFullScreen()"
                [class.h-[60vh]]="isCompareFullScreen()"
                class="p-4 overflow-auto font-mono text-xs space-y-0.5 leading-relaxed flex-grow"
              >
                @for (line of computedDiffLines().right; track $index) {
                  <div 
                    [id]="'right-diff-line-' + $index"
                    [class.bg-emerald-955/20]="line.type === 'added'"
                    [class.text-emerald-400]="line.type === 'added'"
                    [class.bg-amber-955/20]="line.type === 'modified'"
                    [class.text-amber-400]="line.type === 'modified'"
                    [class.border-l-2]="isActiveLine($index)"
                    [class.border-emerald-500]="isActiveLine($index)"
                    class="flex items-baseline border-l-2 border-transparent transition-colors hover:bg-zinc-850/10"
                  >
                    <span class="w-8 shrink-0 text-right pr-2 text-[10px] text-zinc-605 select-none font-bold">{{ line.rightLineNum || ' ' }}</span>
                    <span class="whitespace-pre-wrap flex-1 pl-1 select-all select-text">{{ line.content || ' ' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- View Case 2: Unified Diff View (Seq row format) -->
        @if (activeView() === 'unified') {
          <div class="flex flex-col flex-grow">
            <div class="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 text-[10px] font-mono font-bold text-zinc-505 select-none flex items-center justify-between">
              <span>UNIFIED CHRONOLOGICAL DIFFERENCES</span>
              <span class="text-[9px] text-zinc-550 italic uppercase">Changes stacked chronologically</span>
            </div>
            <div 
              [class.max-h-[500px]]="!isCompareFullScreen()"
              [class.h-[60vh]]="isCompareFullScreen()"
              class="p-4 overflow-auto font-mono text-xs space-y-0.5 leading-relaxed bg-zinc-950/10 flex-grow"
            >
              @for (line of unifiedDiffLines(); track $index) {
                <div 
                  [class.bg-rose-955/20]="line.type === 'removed'"
                  [class.text-rose-400]="line.type === 'removed'"
                  [class.bg-emerald-955/20]="line.type === 'added'"
                  [class.text-emerald-400]="line.type === 'added'"
                  [class.bg-amber-955/20]="line.type === 'modified'"
                  [class.text-amber-400]="line.type === 'modified'"
                  class="flex items-baseline hover:bg-zinc-950/40 px-1 py-0.5 rounded transition"
                >
                  <span class="w-10 text-right text-[10px] text-rose-500 select-none pr-1.5 border-r border-zinc-850 shrink-0 font-semibold">{{ line.leftLineNum || '' }}</span>
                  <span class="w-10 text-right text-[10px] text-emerald-500 select-none pr-2 shrink-0 font-semibold">{{ line.rightLineNum || '' }}</span>
                  <span class="mr-2 font-black select-none opacity-60 text-[10px]">
                    {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' ' }}
                  </span>
                  <span class="whitespace-pre-wrap select-all select-text">{{ line.content }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- View Case 3: Interactive Tree Diff View with Conflicts Resolution Checks -->
        @if (activeView() === 'tree') {
          <div class="flex flex-col flex-grow min-h-[350px]">
            <div class="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 text-[10px] font-mono font-bold text-zinc-505 select-none flex items-center justify-between">
              <span>INTERACTIVE HIERARCHICAL DIFF GRAPH</span>
              <span class="text-[9px] text-amber-450 italic font-bold uppercase">Apply changes inline to merge schemas</span>
            </div>
            <div 
              [class.max-h-[500px]]="!isCompareFullScreen()"
              [class.h-[60vh]]="isCompareFullScreen()"
              class="p-6 overflow-auto flex-grow space-y-4"
            >
              @if (!leftError() && !rightError() && diffTreeRoot()) {
                <div class="space-y-2">
                  <div class="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono font-bold select-none border-b border-zinc-850/45 pb-1 mb-2 uppercase">
                    <mat-icon class="text-xs">folder_open</mat-icon> Schema Tree Node Graph
                  </div>
                  <!-- Root Node and recursives -->
                  <div class="pl-1">
                    <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: diffTreeRoot(), isFirst: true }"></ng-container>
                  </div>
                </div>
              } @else {
                <div class="h-64 flex flex-col items-center justify-center text-center text-zinc-600 space-y-2 select-none">
                  <mat-icon class="text-4xl text-zinc-700">warning</mat-icon>
                  <p class="text-xs font-bold font-mono">Tree Parser Disconnected</p>
                  <p class="text-[11px] text-zinc-505 font-sans max-w-sm leading-relaxed">
                    Tree Compare requires two fully validated JSON structures. Avoid trailing commas and unquoted property elements.
                  </p>
                </div>
              }
            </div>
          </div>
        }

        <!-- View Case 4: Raw Text Word-by-Word HTML Diff Explorer -->
        @if (activeView() === 'text') {
          <div class="flex flex-col flex-grow">
            <div class="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 text-[10px] font-mono font-bold text-zinc-505 select-none flex items-center justify-between">
              <span>GIT-LIKE COMPREHENSIVE DIFF CODE</span>
              <span class="text-[9px] text-emerald-450 font-bold uppercase">Clean HTML Highlight lines</span>
            </div>
            <div 
              [class.max-h-[500px]]="!isCompareFullScreen()"
              [class.h-[60vh]]="isCompareFullScreen()"
              class="p-4 overflow-auto font-mono text-xs leading-relaxed flex-grow select-all bg-zinc-950 select-text"
            >
              @for (line of computedDiffLines().left; track $index) {
                @if (line.type !== 'unmodified' || computedDiffLines().right[$index].type !== 'unmodified') {
                  <div class="border-b border-zinc-900 py-1 space-y-1 block">
                    <!-- Left Removed block -->
                    @if (line.type === 'removed' || line.type === 'modified') {
                      <div class="bg-rose-955/15 px-2 py-0.5 text-rose-450 rounded flex items-start">
                        <span class="w-12 text-rose-800 text-[10px] select-none font-bold mr-2 text-right">L: {{ line.leftLineNum }}</span>
                        <span class="w-4 select-none mr-2 font-bold">-</span>
                        <span class="whitespace-pre-wrap text-left select-all flex-1">{{ line.content }}</span>
                      </div>
                    }
                    <!-- Right Added block -->
                    @if (computedDiffLines().right[$index].type === 'added' || computedDiffLines().right[$index].type === 'modified') {
                      <div class="bg-emerald-955/15 px-2 py-0.5 text-emerald-400 rounded flex items-start">
                        <span class="w-12 text-emerald-800 text-[10px] select-none font-bold mr-2 text-right">R: {{ computedDiffLines().right[$index].rightLineNum }}</span>
                        <span class="w-4 select-none mr-2 font-bold">+</span>
                        <span class="whitespace-pre-wrap text-left select-all flex-1">{{ computedDiffLines().right[$index].content }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  @if (!showOnlyDifferences()) {
                    <div class="px-2 py-0.5 text-zinc-600 hover:text-zinc-400 flex items-start transition-colors">
                      <span class="w-12 text-[10px] select-none text-zinc-705 font-bold mr-2 text-right">L: {{ line.leftLineNum }}</span>
                      <span class="w-12 text-[10px] select-none text-zinc-705 font-bold mr-4 text-right">R: {{ line.rightLineNum }}</span>
                      <span class="whitespace-pre-wrap text-left select-text flex-1">{{ line.content }}</span>
                    </div>
                  }
                }
              }
            </div>
          </div>
        }
      </div>

      <!-- MERGE OUTPUT & EXPORTS PLATFORM (Only displays when there are actual conflicts/modifications) -->
      <div class="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <!-- Interactive Code Compiler / Merge pane -->
        <div class="lg:col-span-1 p-5 border border-zinc-800 bg-zinc-900 rounded-2xl flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center justify-between">
              <div class="flex items-center gap-1.5 text-white font-bold text-sm">
                <mat-icon class="text-emerald-400">call_merge</mat-icon>
                LIVE MERGE CONSOLE RESULTS
              </div>
              <div class="flex items-center gap-1">
                <button (click)="autoMergeCompatible()" class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 transition text-[9px] font-mono font-bold rounded-lg text-amber-400 cursor-pointer">
                  AUTO-MERGE CLEAN MATCHES
                </button>
                <span class="text-[9px] text-zinc-500 font-mono">CHOICES DEFINED: {{ getChoicesCount() }}</span>
              </div>
            </div>
            <div 
              [class.h-48]="!isCompareFullScreen()"
              [class.h-80]="isCompareFullScreen()"
              class="bg-zinc-950 p-3 rounded-xl border border-zinc-850 font-mono text-xs overflow-auto text-zinc-150"
            >
              @if (mergedOutcome()) {
                <pre class="leading-relaxed whitespace-pre select-all text-zinc-150" [innerHTML]="highlightedMergedOutcome()"></pre>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-zinc-655 italic select-none space-y-1">
                  <mat-icon class="text-2xl text-zinc-800 animate-pulse">sync</mat-icon>
                  <span>Awaiting parameters matching or resolve triggers...</span>
                </div>
              }
            </div>
          </div>

          <div class="flex gap-2 mt-4 flex-wrap">
            <button [disabled]="!mergedOutcome()" (click)="saveMergedToFile()" 
              class="px-3.5 py-1.5 disabled:opacity-40 bg-emerald-900 hover:bg-emerald-800 transition text-xs font-mono font-bold rounded-xl text-emerald-100 flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="text-xs scale-75">download</mat-icon> DOWNLOAD MERGED JSON
            </button>
            <button [disabled]="!mergedOutcome()" (click)="copyText(mergedOutcome() || '')"
              class="px-3.5 py-1.5 disabled:opacity-40 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-xs font-mono font-bold rounded-xl text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY MERGED RESULT
            </button>
          </div>
        </div>

        <!-- System Developer report utilities (JSON Patch RFC 6902 generator) -->
        <div class="lg:col-span-1 p-5 border border-zinc-800 bg-zinc-900 rounded-2xl block space-y-3">
          <div>
            <h3 class="text-sm font-semibold text-white font-sans flex items-center gap-1">
              <mat-icon class="text-emerald-450 scale-90">terminal</mat-icon>
              RFC 6902 JSON PATCH
            </h3>
            <p class="text-[10px] text-zinc-455">Standard operations array to sync JSON A to JSON B.</p>
          </div>

          <div 
            [class.h-44]="!isCompareFullScreen()"
            [class.h-72]="isCompareFullScreen()"
            class="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 font-mono text-[10.5px] overflow-auto text-zinc-350 select-all select-text font-semibold"
          >
            @if (jsonPatches().length > 0) {
              <pre class="leading-snug select-all text-zinc-200 font-mono" [innerHTML]="highlightedJsonPatches()"></pre>
            } @else {
              <div class="h-full flex items-center justify-center text-zinc-655 italic text-center select-none leading-normal p-3">
                No patches needed. Base structures perfectly equal.
              </div>
            }
          </div>

          @if (jsonPatches().length > 0) {
            <button (click)="copyText(JSONPatchString())" class="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 transition text-[10px] font-mono font-bold text-zinc-300 hover:text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer">
              <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY PATCH CODE
            </button>
          }
        </div>
      </div>

      <!-- Recursive tree node template defined locally inside elements -->
      <ng-template #nodeTemplate let-node="node" let-isFirst="isFirst">
        <div class="font-mono text-xs select-text text-left">
          <span class="hidden">{{ refreshTreeTrigger() }}</span>
          <div 
            [class.hover:bg-zinc-950/20]="true"
            [class.bg-rose-955/15]="node.status === 'removed'"
            [class.text-rose-455]="node.status === 'removed'"
            [class.bg-emerald-955/15]="node.status === 'added'"
            [class.text-emerald-400]="node.status === 'added'"
            [class.bg-amber-955/10]="node.status === 'modified'"
            [class.text-amber-450]="node.status === 'modified'"
            [class.bg-purple-955/15]="node.status === 'type-mismatch'"
            [class.text-purple-400]="node.status === 'type-mismatch'"
            [class.border-l-2]="isActivePath(node.path)"
            [class.border-emerald-500]="isActivePath(node.path)"
            class="group py-1.5 px-3 rounded-lg flex flex-wrap items-center justify-between gap-2 border-l-2 border-transparent transition-all"
          >
            <!-- Key descriptor and toggle indicators -->
            <div class="flex items-center gap-1.5 min-w-[200px]">
              @if (node.children && node.children.length > 0) {
                <button (click)="toggleExpanded(node)" 
                  class="p-0.5 hover:bg-zinc-800/40 rounded transition text-zinc-505 select-none bg-transparent border-none cursor-pointer"
                >
                  <mat-icon class="text-xs align-middle transition-transform duration-200" [style.transform]="node.isExpanded ? 'rotate(90deg)' : 'none'">
                    chevron_right
                  </mat-icon>
                </button>
              } @else {
                <span class="w-4"></span>
              }

              <!-- Element Key (click to collapse if children present) -->
              @if (node.children && node.children.length > 0) {
                <span (click)="toggleExpanded(node)"
                  (keydown.enter)="toggleExpanded(node)"
                  tabindex="0"
                  role="button"
                  class="font-bold text-zinc-300 hover:text-emerald-400 cursor-pointer outline-none select-none" 
                  [class.line-through]="node.status === 'removed'"
                >
                  {{ node.key || 'root' }}
                </span>
              } @else {
                <span 
                  class="font-bold text-zinc-300 select-all" 
                  [class.line-through]="node.status === 'removed'"
                >
                  {{ node.key || 'root' }}
                </span>
              }
              <!-- Value indicators -->
              @if (!node.children || node.children.length === 0) {
                <span class="text-zinc-505 select-none">:</span>
                <!-- Left Base Value (baseline A) -->
                @if (node.status === 'removed' || node.status === 'modified' || node.status === 'type-mismatch') {
                  <span class="px-1.5 py-0.5 bg-rose-950/20 text-rose-400 text-[10px] rounded border border-rose-900/30 select-all font-medium leading-none">
                    {{ stringifyValue(node.leftValue) }}
                  </span>
                }
                <!-- Direction arrows spacer -->
                @if (node.status === 'modified' || node.status === 'type-mismatch') {
                  <span class="text-zinc-550 select-none text-[10px] font-extrabold">&rarr;</span>
                }

                <!-- Right Target Value (revised B) -->
                @if (node.status === 'added' || node.status === 'modified' || node.status === 'type-mismatch') {
                  <span class="px-1.5 py-0.5 bg-emerald-950/20 text-emerald-400 text-[10px] rounded border border-emerald-900/30 select-all font-medium leading-none">
                    {{ stringifyValue(node.rightValue) }}
                  </span>
                }

                @if (node.status === 'type-mismatch') {
                  <span class="px-1 py-0.5 bg-purple-950/40 text-purple-300 border border-purple-900/40 rounded text-[8px] font-black uppercase">
                    TYPE MISM: {{ node.leftType }} != {{ node.rightType }}
                  </span>
                }
              } @else {
                <!-- Object / array keys label -->
                <span class="text-[10px] text-zinc-650 select-none leading-none font-bold italic">
                  ({{ node.leftType || node.rightType }} node)
                </span>
              }
            </div>

            <!-- Path copy button visible on hover alignment -->
            <div class="hidden group-hover:flex items-center gap-1.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity select-none md:mr-3">
              <button (click)="copyText(node.path)" title="Copy JSON Path Index"
                class="p-0.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-805 rounded transition-all flex items-center justify-center scale-90 border-none bg-transparent cursor-pointer"
              >
                <mat-icon class="text-xs scale-90">assignment</mat-icon>
                <span class="text-[9px] font-mono lowercase text-zinc-550 ml-0.5">path</span>
              </button>
            </div>

            <!-- Choice triggers / accept modification targets -->
            @if (node.status !== 'unmodified') {
              <div class="flex items-center gap-1">
                <!-- Apply Choice A (Original) -->
                @if (node.status === 'modified' || node.status === 'removed' || node.status === 'type-mismatch') {
                  <button
                    (click)="chooseMergeSource(node.path, 'left')" 
                    [class.bg-rose-950]="mergeChoices[node.path] === 'left'"
                    [class.border-rose-800]="mergeChoices[node.path] === 'left'"
                    [class.text-rose-200]="mergeChoices[node.path] === 'left'"
                    [class.bg-zinc-950]="mergeChoices[node.path] !== 'left'"
                    [class.border-zinc-800]="mergeChoices[node.path] !== 'left'"
                    [class.text-zinc-500]="mergeChoices[node.path] !== 'left'"
                    class="px-2 py-0.5 border text-[9px] font-mono leading-none rounded-md font-bold transition flex items-center gap-0.5 hover:text-white cursor-pointer"
                    title="Accept Left value"
                  >
                    <span>USE A (LEFT)</span>
                  </button>
                }

                <!-- Apply Choice B (Target) -->
                @if (node.status === 'added' || node.status === 'modified' || node.status === 'type-mismatch') {
                  <button
                    (click)="chooseMergeSource(node.path, 'right')" 
                    [class.bg-emerald-950]="mergeChoices[node.path] === 'right'"
                    [class.border-emerald-800]="mergeChoices[node.path] === 'right'"
                    [class.text-emerald-200]="mergeChoices[node.path] === 'right'"
                    [class.bg-zinc-950]="mergeChoices[node.path] !== 'right'"
                    [class.border-zinc-800]="mergeChoices[node.path] !== 'right'"
                    [class.text-zinc-500]="mergeChoices[node.path] !== 'right'"
                    class="px-2 py-0.5 border text-[9px] font-mono leading-none rounded-md font-bold transition flex items-center gap-0.5 hover:text-white cursor-pointer"
                    title="Accept Right value"
                  >
                    <span>USE B (RIGHT)</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Recurse children -->
          @if (node.children && node.children.length > 0 && node.isExpanded) {
            <div class="pl-4 ml-2 border-l border-zinc-850/60 mt-1 space-y-1">
              @for (child of node.children; track child.path) {
                @if (!showOnlyDifferences() || child.status !== 'unmodified' || hasChangedChild(child)) {
                  <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: child, isFirst: false }"></ng-container>
                }
              }
            </div>
          }
        </div>
      </ng-template>
    </div>
  `,
  styles: `
    textarea {
      box-shadow: none !important;
    }
    textarea:focus {
      border-color: rgba(16, 185, 129, 0.4) !important;
    }
  `
})
export class JsonCompareComponent implements AfterViewInit, OnDestroy {
  @ViewChild('monacoEditorLeft') private readonly monacoEditorLeftRef!: ElementRef<HTMLDivElement>;
  @ViewChild('monacoEditorRight') private readonly monacoEditorRightRef!: ElementRef<HTMLDivElement>;
  private monacoEditorLeft!: monaco.editor.IStandaloneCodeEditor;
  private monacoEditorRight!: monaco.editor.IStandaloneCodeEditor;
  // Input states
  public leftRawText = signal<string>('{\n  "name": "devsight API Payload",\n  "version": "1.0.0",\n status": "production",\n  "active": true,\n  "supportedPorts": [80, 443],\n  "endpoints": {\n    "login": "/api/v1/auth/login",\n    "users": "/api/v1/users",\n    "logs": "/api/v1/system/logs"\n  },\n  "featuresFlag": {\n    "enableCache": true,\n    "betaTesterOnly": false\n  }\n}');
  public rightRawText = signal<string>('{\n  "name": "devsight API Payload v2",\n  "version": "1.1.0",\n  "status": "testing",\n  "active": true,\n  "supportedPorts": [80, 443, 3000],\n  "endpoints": {\n    "login": "/api/v2/auth/login",\n    "users": "/api/v2/users",\n    "metrics": "/api/v2/metrics"\n  },\n  "featuresFlag": {\n    "enableCache": true,\n    "betaTesterOnly": true\n  }\n}');

  // GUI view selections
  public activeView = signal<string>('split');

  public isCompareFullScreen = signal<boolean>(false);

  // Custom comparison configurations
  public ignoreWhitespace = signal<boolean>(false);
  public ignoreKeyOrder = signal<boolean>(true);
  public ignoreCase = signal<boolean>(false);
  public showOnlyDifferences = signal<boolean>(false);

  // Search filter
  public searchQuery = signal<string>('');

  // Active highlighted difference navigation index
  public activeDiffIndex = signal<number>(-1);
  public refreshTreeTrigger = signal<number>(0);

  // Active merging choices record path -> 'left' | 'right'
  public mergeChoices: Record<string, 'left' | 'right'> = {};

  constructor() {
    // Automatically construct default merge options when items differ
    effect(() => {
      const data = this.diffTreeRoot();
      if (data) {
        this.fillMergeDefaultChoices(data);
      }
    });

    effect(() => {
      queueMicrotask(() => {
        this.monacoEditorLeft?.layout();
        this.monacoEditorRight?.layout();
      });
    });

    effect(() => {
      const text = this.rightText();
      if (this.monacoEditorRight && text !== this.monacoEditorRight.getValue()) {
        this.monacoEditorRight.setValue(text);
      }
    });

    effect(() => {
      const text = this.leftText();
      if (this.monacoEditorLeft && text !== this.monacoEditorLeft.getValue()) {
        this.monacoEditorLeft.setValue(text);
      }
    });

  }
  private readonly platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  async ngAfterViewInit(): Promise<void> {
    if (this.isBrowser) {
      const monacoInstance = await loader.init();
      this.monacoEditorLeft = monacoInstance.editor.create(
        this.monacoEditorLeftRef.nativeElement,
        {
          value: this.leftText(),
          language: 'json',
          theme: 'dark',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false
        }
      );

      this.monacoEditorRight = monacoInstance.editor.create(
        this.monacoEditorRightRef.nativeElement,
        {
          value: this.rightText(),
          language: 'json',
         theme: 'dark',
          automaticLayout: true,
          folding: true,
          showFoldingControls: 'always',
          minimap: {
            enabled: false
          },
          scrollBeyondLastLine: false
        }
      );

      setTimeout(() => {
        this.monacoEditorLeft.layout();
        this.monacoEditorRight.layout();
      });
    }
  }
  ngOnDestroy(): void {
    this.monacoEditorLeft?.dispose();
    this.monacoEditorRight?.dispose();
  }
  // Raw value getters
  public leftText(): string {
    return this.leftRawText();
  }

  public rightText(): string {
    return this.rightRawText();
  }

  // Text mutations
  public onLeftTextChange(val: string): void {
    this.leftRawText.set(val);
    this.resetActiveDiffPointer();
  }

  public onRightTextChange(val: string): void {
    this.rightRawText.set(val);
    this.resetActiveDiffPointer();
  }

  // Toggles settings
  public toggleIgnoreWhitespace(): void {
    this.ignoreWhitespace.update(v => !v);
  }

  public toggleIgnoreKeyOrder(): void {
    this.ignoreKeyOrder.update(v => !v);
  }

  public toggleIgnoreCase(): void {
    this.ignoreCase.update(v => !v);
  }

  public toggleShowOnlyDifferences(): void {
    this.showOnlyDifferences.update(v => !v);
  }

  private resetActiveDiffPointer(): void {
    this.activeDiffIndex.set(-1);
  }

  // Raw syntax errors signals check
  public leftError = computed<string | null>(() => {
    const txt = this.leftRawText().trim();
    if (!txt) return null;
    try {
      JSON.parse(txt);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Invalid JSON format';
    }
  });

  public rightError = computed<string | null>(() => {
    const txt = this.rightRawText().trim();
    if (!txt) return null;
    try {
      JSON.parse(txt);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Invalid JSON format';
    }
  });

  // Parsed baseline data models
  public leftParsed = computed<unknown>(() => {
    if (this.leftError()) return null;
    const txt = this.leftRawText().trim();
    return txt ? JSON.parse(txt) : null;
  });

  public rightParsed = computed<unknown>(() => {
    if (this.rightError()) return null;
    const txt = this.rightRawText().trim();
    return txt ? JSON.parse(txt) : null;
  });

  // Flat diff text lines (Split View, Raw Text, etc.)
  public computedDiffLines = computed<{ left: LineDiff[], right: LineDiff[] }>(() => {
    // Generate aligned comparison lines via LCS dynamic alignment
    const textA = this.getFormattedString(this.leftParsed());
    const textB = this.getFormattedString(this.rightParsed());

    const linesA = textA.split('\n');
    const linesB = textB.split('\n');

    return this.alignDiffLines(linesA, linesB);
  });

  // Unified chrono diff sequence list
  public unifiedDiffLines = computed<LineDiff[]>(() => {
    const aligned = this.computedDiffLines();
    const result: LineDiff[] = [];
    const maxLen = aligned.left.length;

    for (let i = 0; i < maxLen; i++) {
      const l = aligned.left[i];
      const r = aligned.right[i];

      if (l.type === 'unmodified' && r.type === 'unmodified') {
        if (!this.showOnlyDifferences()) {
          result.push({
            type: 'unmodified',
            leftLineNum: l.leftLineNum,
            rightLineNum: r.rightLineNum,
            content: l.content
          });
        }
      } else {
        if (l.type === 'removed') {
          result.push({
            type: 'removed',
            leftLineNum: l.leftLineNum,
            content: l.content
          });
        }
        if (r.type === 'added') {
          result.push({
            type: 'added',
            rightLineNum: r.rightLineNum,
            content: r.content
          });
        }
        if (l.type === 'modified' || r.type === 'modified') {
          result.push({
            type: 'modified',
            leftLineNum: l.leftLineNum,
            rightLineNum: r.rightLineNum,
            content: `${l.content} -> ${r.content}`
          });
        }
      }
    }
    return result;
  });

  // Construct hierarchic recursive schema diff tree signal model
  public diffTreeRoot = computed<DiffTreeNode | null>(() => {
    const left = this.leftParsed();
    const right = this.rightParsed();
    if (left === null || right === null) return null;

    const opts = {
      ignoreWhitespace: this.ignoreWhitespace(),
      ignoreKeyOrder: this.ignoreKeyOrder(),
      ignoreCase: this.ignoreCase()
    };

    return this.calculateTreeComparison(left, right, opts);
  });

  // Flat list of difference paths matched to searchQuery and active Navigation triggers
  public changedPaths = computed<string[]>(() => {
    const root = this.diffTreeRoot();
    if (!root) return [];

    const pathsList: string[] = [];
    this.collectChangedPaths(root, pathsList);

    // Filter matching search query criteria
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      return pathsList.filter(p => p.toLowerCase().includes(q));
    }
    return pathsList;
  });

  // System general reports computations
  public summary = computed<DiffReportSummary>(() => {
    const root = this.diffTreeRoot();
    if (!root) {
      return { addedCount: 0, removedCount: 0, modifiedCount: 0, typeMismatchCount: 0, totalDifferences: 0, compatibilityScore: 100 };
    }

    const report = { addedCount: 0, removedCount: 0, modifiedCount: 0, typeMismatchCount: 0 };
    this.accumulateReportDetails(root, report);

    const totalDiffs = report.addedCount + report.removedCount + report.modifiedCount + report.typeMismatchCount;

    // Count total structural keys in both systems
    const totalKeys = this.countKeys(this.leftParsed()) + this.countKeys(this.rightParsed());
    const matched = Math.max(0, totalKeys - totalDiffs);
    const score = totalKeys > 0 ? Math.round((matched / totalKeys) * 100) : 100;

    return {
      addedCount: report.addedCount,
      removedCount: report.removedCount,
      modifiedCount: report.modifiedCount,
      typeMismatchCount: report.typeMismatchCount,
      totalDifferences: totalDiffs,
      compatibilityScore: score
    };
  });

  // RFC 6902 json patch signals list
  public jsonPatches = computed<JsonPatchOp[]>(() => {
    const root = this.diffTreeRoot();
    if (!root) return [];
    const patches: JsonPatchOp[] = [];
    this.generateJSONPatchOps(root, patches);
    return patches;
  });

  public JSONPatchString = computed<string>(() => {
    return JSON.stringify(this.jsonPatches(), null, 2);
  });

  public highlightedJsonPatches = computed(() => {
    return this.highlightJson(this.JSONPatchString());
  });

  // Flat live merging outcome signals model
  public mergedOutcome = computed<string | null>(() => {
    const left = this.leftParsed();
    const right = this.rightParsed();
    if (left === null && right === null) return null;

    try {
      const compiled = this.runCompiledMerge(left, right, this.mergeChoices);
      return JSON.stringify(compiled, null, 2);
    } catch {
      return null;
    }
  });

  public highlightedMergedOutcome = computed(() => {
    return this.highlightJson(this.mergedOutcome() || '');
  });

  public highlightJson(json: string): string {
    if (!json) return '';
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-400 font-semibold';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-purple-400 font-semibold';
          } else {
            cls = 'text-emerald-400 font-medium';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-blue-400 font-bold';
        } else if (/null/.test(match)) {
          cls = 'text-rose-450 font-bold';
        }

        if (/:$/.test(match)) {
          const key = match.substring(0, match.length - 1);
          return `<span class="${cls}">${key}</span>:`;
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  // Recurse helper: verify if node has a modified/added/removed child
  public hasChangedChild(node: DiffTreeNode): boolean {
    if (!node.children || node.children.length === 0) return false;
    return node.children.some(c => c.status !== 'unmodified' || this.hasChangedChild(c));
  }

  // Active scrolling/highlight checking
  public isActiveLine(idx: number): boolean {
    const currentPaths = this.changedPaths();
    const activeIdx = this.activeDiffIndex();
    if (activeIdx < 0 || activeIdx >= currentPaths.length) return false;

    const activePath = currentPaths[activeIdx];
    const leftLine = this.computedDiffLines().left[idx];
    const rightLine = this.computedDiffLines().right[idx];

    // Check if line contains properties representing the active path
    const pathKeys = activePath.split('.');
    const lastKey = pathKeys[pathKeys.length - 1];

    if (lastKey) {
      const term = `"${lastKey}"`;
      return (leftLine && leftLine.content.includes(term)) || (rightLine && rightLine.content.includes(term));
    }
    return false;
  }

  public isActivePath(path: string): boolean {
    const currentPaths = this.changedPaths();
    const activeIdx = this.activeDiffIndex();
    if (activeIdx >= 0 && activeIdx < currentPaths.length) {
      return currentPaths[activeIdx] === path;
    }
    return false;
  }

  // Merge choice handler
  public chooseMergeSource(path: string, val: 'left' | 'right'): void {
    this.mergeChoices = { ...this.mergeChoices, [path]: val };
    // Trigger Angular Change Detection manually via signals updating
    const curVal = this.leftRawText();
    this.leftRawText.set(curVal);
  }

  public getChoicesCount(): number {
    return Object.keys(this.mergeChoices).length;
  }

  public autoMergeCompatible(): void {
    // Automatically accept Right (revised target) for items that are added or modified, and Left for removed!
    const elements = this.changedPaths();
    elements.forEach((p) => {
      const node = this.findNodeByPath(this.diffTreeRoot(), p);
      if (node) {
        if (node.status === 'added') {
          this.mergeChoices[p] = 'right';
        } else if (node.status === 'removed') {
          this.mergeChoices[p] = 'left';
        } else {
          this.mergeChoices[p] = 'right';
        }
      }
    });

    // Sync state
    const curVal = this.leftRawText();
    this.leftRawText.set(curVal);
  }

  private findNodeByPath(node: DiffTreeNode | null, path: string): DiffTreeNode | null {
    if (!node) return null;
    if (node.path === path) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeByPath(child, path);
        if (found) return found;
      }
    }
    return null;
  }

  // Toggle tree expands
  public toggleExpanded(node: DiffTreeNode): void {
    node.isExpanded = !node.isExpanded;
    this.refreshTreeTrigger.update(v => v + 1);
  }

  // Navigation diff steps triggers
  public nextDiff(): void {
    const count = this.changedPaths().length;
    if (count > 0) {
      this.activeDiffIndex.update(idx => (idx + 1) % count);
      this.scrollToActiveDiff();
    }
  }

  public prevDiff(): void {
    const count = this.changedPaths().length;
    if (count > 0) {
      this.activeDiffIndex.update(idx => (idx - 1 + count) % count);
      this.scrollToActiveDiff();
    }
  }

  private scrollToActiveDiff(): void {
    setTimeout(() => {
      const idx = this.activeDiffIndex();
      if (this.activeView() === 'split') {
        const el = document.getElementById(`left-diff-line-${idx}`) || document.getElementById(`right-diff-line-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  }

  // Value formatting tools
  public stringifyValue(val: unknown): string {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'object') {
      return Array.isArray(val) ? '[...]' : '{...}';
    }
    if (typeof val === 'string') {
      return `"${val}"`;
    }
    return String(val);
  }

  // DND triggers
  public onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  public onDragLeave(e: DragEvent): void {
    e.preventDefault();
  }

  public onFileDropped(e: DragEvent, pane: 'left' | 'right'): void {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.loadInputFileNode(files[0], pane);
    }
  }

  public onLeftFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.loadInputFileNode(target.files[0], 'left');
    }
  }

  public onRightFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.loadInputFileNode(target.files[0], 'right');
    }
  }

  private loadInputFileNode(file: File, pane: 'left' | 'right'): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        if (pane === 'left') {
          this.leftRawText.set(text);
        } else {
          this.rightRawText.set(text);
        }
        this.resetActiveDiffPointer();
      }
    };
    reader.readAsText(file);
  }

  // Pre-load mock elements schemas
  public loadDemoData(): void {
    this.leftRawText.set(JSON.stringify({
      id: 'usr_99218',
      name: 'Marcus Aurelius',
      email: 'marcus@rome.org',
      metadata: {
        role: 'Emperor',
        permissions: ['write_logs', 'read_reports'],
        activePortals: {
          adminGateway: true,
          supportAccess: false
        }
      },
      tags: ['philosophical', 'stoicism'],
      sessionTimeoutSecs: 3600
    }, null, 2));

    this.rightRawText.set(JSON.stringify({
      id: 'usr_99218',
      name: 'Marcus Aurelius Antoninus',
      email: 'marcus.aurelius@rome.org',
      metadata: {
        role: 'Philosopher King',
        permissions: ['write_logs', 'read_reports', 'revoke_tokens'],
        activePortals: {
          adminGateway: true,
          supportAccess: true
        }
      },
      tags: ['stoicism', 'contemplation', 'emperor'],
      status: 'active',
      sessionTimeoutSecs: 7200
    }, null, 2));

    this.resetActiveDiffPointer();
  }

  public clearInputs(): void {
    this.leftRawText.set('{}');
    this.rightRawText.set('{}');
    this.mergeChoices = {};
    this.resetActiveDiffPointer();
  }

  public copyText(text: string): void {
    navigator.clipboard.writeText(text);
  }

  public foldUnfoldAllLeft(isleft: boolean, state: 'fold' | 'unfold'): void {
    if (isleft) {
      if (state === 'fold') {
        this.monacoEditorLeft?.getAction('editor.foldAll')?.run();
      } else if (state === 'unfold') {
        this.monacoEditorLeft?.getAction('editor.unfoldAll')?.run();
      }
    }
    if (!isleft) {
      if (state === 'fold') {
        this.monacoEditorRight?.getAction('editor.foldAll')?.run();
      } else if (state === 'unfold') {
        this.monacoEditorRight?.getAction('editor.unfoldAll')?.run();
      }
    }
  }

  private recursiveSetExpansion(node: DiffTreeNode, state: boolean): void {
    node.isExpanded = state;
    if (node.children) {
      for (const child of node.children) {
        this.recursiveSetExpansion(child, state);
      }
    }
  }

  public formatLeft(): void {
    const parsed = this.leftParsed();
    if (parsed) {
      this.leftRawText.set(JSON.stringify(parsed, null, 2));
    }
  }

  public smartFormatLeft(): void {
    const parsed = this.leftParsed();
    if (parsed) {
      this.leftRawText.set(this.smartStringify(parsed, 2));
    }
  }

  public compactLeft(): void {
    const parsed = this.leftParsed();
    if (parsed) {
      this.leftRawText.set(JSON.stringify(parsed));
    }
  }

  public formatRight(): void {
    const parsed = this.rightParsed();
    if (parsed) {
      this.rightRawText.set(JSON.stringify(parsed, null, 2));
    }
  }

  public smartFormatRight(): void {
    const parsed = this.rightParsed();
    if (parsed) {
      this.rightRawText.set(this.smartStringify(parsed, 2));
    }
  }

  public compactRight(): void {
    const parsed = this.rightParsed();
    if (parsed) {
      this.rightRawText.set(JSON.stringify(parsed));
    }
  }

  public smartStringify(obj: unknown, indent = 2, currentIndent = ''): string {
    if (obj === null) return 'null';
    if (obj === undefined) return 'null';
    if (typeof obj === 'string') return JSON.stringify(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

    const nextIndent = currentIndent + ' '.repeat(indent);

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const isSimple = obj.every(x => typeof x !== 'object' || x === null);
      const inline = '[' + obj.map(x => this.smartStringify(x, indent, '')).join(', ') + ']';
      if (isSimple && inline.length < 80) {
        return inline;
      }
      const entries = obj.map(x => nextIndent + this.smartStringify(x, indent, nextIndent));
      return '[\n' + entries.join(',\n') + '\n' + currentIndent + ']';
    }

    if (typeof obj === 'object') {
      const casted = obj as Record<string, unknown>;
      const keys = Object.keys(casted);
      if (keys.length === 0) return '{}';

      const isSimple = keys.every(k => typeof casted[k] !== 'object' || casted[k] === null);
      const inlineParts = keys.map(k => `"${k}": ${this.smartStringify(casted[k], indent, '')}`);
      const inline = '{ ' + inlineParts.join(', ') + ' }';
      if (isSimple && inline.length < 80) {
        return inline;
      }

      const entries = keys.map(k => {
        const formattedVal = this.smartStringify(casted[k], indent, nextIndent);
        return `${nextIndent}"${k}": ${formattedVal}`;
      });
      return '{\n' + entries.join(',\n') + '\n' + currentIndent + '}';
    }

    return JSON.stringify(obj);
  }

  public saveMergedToFile(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(this.mergedOutcome() || '{}');
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'devsight_merged.json');
    dlAnchorElem.click();
  }

  // Recursive Diff algorithms implementations
  private calculateTreeComparison(
    left: unknown,
    right: unknown,
    opts: { ignoreWhitespace: boolean, ignoreKeyOrder: boolean, ignoreCase: boolean },
    path = ''
  ): DiffTreeNode {
    const leftType = this.getType(left);
    const rightType = this.getType(right);

    // Baseline definitions
    if (left === undefined) {
      return { key: '', path, status: 'added', rightType, rightValue: right, isExpanded: true };
    }
    if (right === undefined) {
      return { key: '', path, status: 'removed', leftType, leftValue: left, isExpanded: true };
    }
    if (leftType !== rightType) {
      return { key: '', path, status: 'type-mismatch', leftType, rightType, leftValue: left, rightValue: right, isExpanded: true };
    }

    if (leftType === 'object') {
      const lObj = left as Record<string, unknown>;
      const rObj = right as Record<string, unknown>;

      const keysA = Object.keys(lObj);
      const keysB = Object.keys(rObj);

      const allKeys = new Set([...keysA, ...keysB]);
      const sortedKeys = Array.from(allKeys);

      if (opts.ignoreKeyOrder) {
        sortedKeys.sort((a, b) => a.localeCompare(b));
      }

      const children: DiffTreeNode[] = [];
      sortedKeys.forEach((key) => {
        let childLeftKey = key;
        let childRightKey = key;

        if (opts.ignoreCase) {
          childLeftKey = keysA.find(k => k.toLowerCase() === key.toLowerCase()) || key;
          childRightKey = keysB.find(k => k.toLowerCase() === key.toLowerCase()) || key;
        }

        const lVal = lObj[childLeftKey];
        const rVal = rObj[childRightKey];

        const nodePath = path ? `${path}.${key}` : key;
        const childNode = this.calculateTreeComparison(lVal, rVal, opts, nodePath);
        childNode.key = key;
        children.push(childNode);
      });

      const hasChange = children.some(c => c.status !== 'unmodified');
      return {
        key: '',
        path,
        status: hasChange ? 'modified' : 'unmodified',
        leftType,
        rightType,
        children,
        isExpanded: true
      };
    }

    if (leftType === 'array') {
      const lArr = left as unknown[];
      const rArr = right as unknown[];
      const children: DiffTreeNode[] = [];

      const maxLen = Math.max(lArr.length, rArr.length);
      for (let i = 0; i < maxLen; i++) {
        const nodePath = path ? `${path}[${i}]` : `[${i}]`;
        const childNode = this.calculateTreeComparison(lArr[i], rArr[i], opts, nodePath);
        childNode.key = `[${i}]`;
        children.push(childNode);
      }

      const hasChange = children.some(c => c.status !== 'unmodified');
      return {
        key: '',
        path,
        status: hasChange ? 'modified' : 'unmodified',
        leftType,
        rightType,
        children,
        isExpanded: true
      };
    }

    const equal = this.arePrimitivesEqual(left, right, opts);
    return {
      key: '',
      path,
      status: equal ? 'unmodified' : 'modified',
      leftType,
      rightType,
      leftValue: left,
      rightValue: right
    };
  }

  private getType(v: unknown): string {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  private arePrimitivesEqual(
    a: unknown,
    b: unknown,
    opts: { ignoreWhitespace: boolean, ignoreCase: boolean }
  ): boolean {
    if (typeof a !== typeof b) return false;
    if (typeof a === 'string' && typeof b === 'string') {
      let valA = a;
      let valB = b;
      if (opts.ignoreWhitespace) {
        valA = valA.replace(/\s+/g, '');
        valB = valB.replace(/\s+/g, '');
      }
      if (opts.ignoreCase) {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      return valA === valB;
    }
    return a === b;
  }

  private fillMergeDefaultChoices(node: DiffTreeNode): void {
    if (node.status !== 'unmodified' && node.status !== 'modified') {
      // By default: added nodes choose 'right' values, removed choose 'left'
      if (!this.mergeChoices[node.path]) {
        this.mergeChoices[node.path] = node.status === 'added' ? 'right' : 'left';
      }
    }
    if (node.children) {
      node.children.forEach(c => this.fillMergeDefaultChoices(c));
    }
  }

  // Recursive merge solver
  private runCompiledMerge(left: unknown, right: unknown, choices: Record<string, 'left' | 'right'>, path = ''): unknown {
    if (choices[path] === 'left') return left;
    if (choices[path] === 'right') return right;

    const leftType = this.getType(left);
    const rightType = this.getType(right);

    if (leftType === 'object' && rightType === 'object') {
      const lObj = left as Record<string, unknown>;
      const rObj = right as Record<string, unknown>;
      const merged: Record<string, unknown> = {};

      const allKeys = new Set([...Object.keys(lObj), ...Object.keys(rObj)]);
      allKeys.forEach((key) => {
        const childPath = path ? `${path}.${key}` : key;
        const val = this.runCompiledMerge(lObj[key], rObj[key], choices, childPath);
        if (val !== undefined) {
          merged[key] = val;
        }
      });
      return merged;
    }

    if (leftType === 'array' && rightType === 'array') {
      const lArr = left as unknown[];
      const rArr = right as unknown[];
      const merged: unknown[] = [];

      const maxLength = Math.max(lArr.length, rArr.length);
      for (let i = 0; i < maxLength; i++) {
        const childPath = path ? `${path}[${i}]` : `[${i}]`;
        const val = this.runCompiledMerge(lArr[i], rArr[i], choices, childPath);
        if (val !== undefined) {
          merged.push(val);
        }
      }
      return merged;
    }

    if (left === undefined) return right;
    return left;
  }

  private collectChangedPaths(node: DiffTreeNode, paths: string[]): void {
    if (node.status !== 'unmodified' && node.path) {
      paths.push(node.path);
    }
    if (node.children) {
      node.children.forEach(c => this.collectChangedPaths(c, paths));
    }
  }

  private accumulateReportDetails(node: DiffTreeNode, report: { addedCount: number, removedCount: number, modifiedCount: number, typeMismatchCount: number }): void {
    if (node.status === 'added') report.addedCount++;
    else if (node.status === 'removed') report.removedCount++;
    else if (node.status === 'type-mismatch') report.typeMismatchCount++;
    else if (node.status === 'modified' && (!node.children || node.children.length === 0)) {
      report.modifiedCount++;
    }
    if (node.children) {
      node.children.forEach(c => this.accumulateReportDetails(c, report));
    }
  }

  private generateJSONPatchOps(node: DiffTreeNode, ops: JsonPatchOp[]): void {
    // RFC 6902 expects slash sequences
    const rfcPath = '/' + node.path.replace(/\./g, '/').replace(/\[(\d+)\]/g, '/$1');

    if (node.status === 'added') {
      ops.push({ op: 'add', path: rfcPath, value: node.rightValue });
    } else if (node.status === 'removed') {
      ops.push({ op: 'remove', path: rfcPath });
    } else if (node.status === 'type-mismatch' || (node.status === 'modified' && (!node.children || node.children.length === 0))) {
      ops.push({ op: 'replace', path: rfcPath, value: node.rightValue });
    }

    if (node.children) {
      node.children.forEach(c => this.generateJSONPatchOps(c, ops));
    }
  }

  private countKeys(obj: unknown): number {
    if (obj === null || obj === undefined) return 0;
    if (Array.isArray(obj)) {
      let count = 0;
      obj.forEach((i: unknown) => count += this.countKeys(i));
      return count + obj.length;
    }
    if (typeof obj === 'object') {
      let count = 0;
      Object.keys(obj).forEach((k) => count += 1 + this.countKeys((obj as Record<string, unknown>)[k]));
      return count;
    }
    return 1;
  }

  // Output strings formatting
  private getFormattedString(obj: unknown): string {
    if (obj === null || obj === undefined) return '';
    return JSON.stringify(obj, null, 2);
  }

  private alignDiffLines(linesA: string[], linesB: string[]): { left: LineDiff[], right: LineDiff[] } {
    const m = linesA.length;
    const n = linesB.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let indexI = 1; indexI <= m; indexI++) {
      for (let indexJ = 1; indexJ <= n; indexJ++) {
        if (linesA[indexI - 1].trim() === linesB[indexJ - 1].trim()) {
          dp[indexI][indexJ] = dp[indexI - 1][indexJ - 1] + 1;
        } else {
          dp[indexI][indexJ] = Math.max(dp[indexI - 1][indexJ], dp[indexI][indexJ - 1]);
        }
      }
    }

    const left: LineDiff[] = [];
    const right: LineDiff[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1].trim() === linesB[j - 1].trim()) {
        left.unshift({ type: 'unmodified', leftLineNum: i, rightLineNum: j, content: linesA[i - 1] });
        right.unshift({ type: 'unmodified', leftLineNum: i, rightLineNum: j, content: linesB[j - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        left.unshift({ type: 'added', content: '' });
        right.unshift({ type: 'added', rightLineNum: j, content: linesB[j - 1] });
        j--;
      } else {
        left.unshift({ type: 'removed', leftLineNum: i, content: linesA[i - 1] });
        right.unshift({ type: 'removed', content: '' });
        i--;
      }
    }

    return { left, right };
  }
}
