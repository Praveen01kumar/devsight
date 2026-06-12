import { ChangeDetectionStrategy, Component, signal, computed, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface Base64File {
  name: string;
  size: number;
  type: string;
  base64: string;
  dataUri: string;
  previewUrl: string;
}

interface BatchRow {
  input: string;
  output: string;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

@Component({
  selector: 'app-base64-encoder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in select-text">
      <!-- High Privacy Safeguard Notice -->
      <div class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <mat-icon class="text-emerald-600 dark:text-emerald-400">shield</mat-icon>
          <div class="text-left">
            <h4 class="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono">100% SECURE CLIENT-SIDE SANDBOX</h4>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400">All string and file conversions occur entirely within your web browser. No telemetry logs or payload structures are ever uploaded to any servers.</p>
          </div>
        </div>
        <span class="text-[10px] font-mono font-extrabold text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 hidden sm:inline">LOCAL ONLY</span>
      </div>

      <!-- Navigation tabs for the Base64 Suite -->
      <div class="flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-800 gap-2 pb-px select-none">
        <div class="flex flex-wrap gap-1">
          <button (click)="setActiveTab('text')"
            [class.border-emerald-500]="activeTab() === 'text'"
            [class.text-emerald-600]="activeTab() === 'text'"
            [class.dark:text-emerald-400]="activeTab() === 'text'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-text"
          >
            <mat-icon class="scale-75">edit_note</mat-icon> TEXT WORKSPACE
          </button>
          <button (click)="setActiveTab('file')"
            [class.border-emerald-500]="activeTab() === 'file'"
            [class.text-emerald-600]="activeTab() === 'file'"
            [class.dark:text-emerald-400]="activeTab() === 'file'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-file"
          >
            <mat-icon class="scale-75">file_present</mat-icon> FILE WORKBENCH
          </button>

          <button (click)="setActiveTab('validator')"
            [class.border-emerald-500]="activeTab() === 'validator'"
            [class.text-emerald-600]="activeTab() === 'validator'"
            [class.dark:text-emerald-400]="activeTab() === 'validator'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-validator"
          >
            <mat-icon class="scale-75">health_and_safety</mat-icon> VALIDATOR & REPAIR
          </button>

          <button (click)="setActiveTab('templates')"
            [class.border-emerald-500]="activeTab() === 'templates'"
            [class.text-emerald-600]="activeTab() === 'templates'"
            [class.dark:text-emerald-400]="activeTab() === 'templates'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-templates"
          >
            <mat-icon class="scale-75">html</mat-icon> DEV SNIPPETS
          </button>

          <button (click)="setActiveTab('jwt')"
            [class.border-emerald-500]="activeTab() === 'jwt'"
            [class.text-emerald-600]="activeTab() === 'jwt'"
            [class.dark:text-emerald-400]="activeTab() === 'jwt'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-jwt"
          >
            <mat-icon class="scale-75">gavel</mat-icon> JWT DECODER
          </button>

          <button (click)="setActiveTab('batch')"
            [class.border-emerald-500]="activeTab() === 'batch'"
            [class.text-emerald-600]="activeTab() === 'batch'"
            [class.dark:text-emerald-400]="activeTab() === 'batch'"
            class="px-4 py-2.5 text-xs font-mono font-bold border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            id="tab-batch"
          >
            <mat-icon class="scale-75">dynamic_feed</mat-icon> BATCH BULK ENGINE
          </button>
        </div>

        <!-- Inline Keyboard Shortcut Info -->
        <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono hidden lg:inline select-none">
          Shortcuts: <kbd class="bg-zinc-150 dark:bg-zinc-850 px-1 py-0.5 rounded">Alt+E</kbd>/<kbd class="bg-zinc-150 dark:bg-zinc-850 px-1 py-0.5 rounded">D</kbd> Toggle | <kbd class="bg-zinc-150 dark:bg-zinc-850 px-1 py-0.5 rounded">Ctrl+Sh+C</kbd> Copy
        </span>
      </div>

      <!-- ==============================================
           TAB 1: TEXT WORKSPACE (ENCODE & DECODE)
           ============================================== -->
      @if (activeTab() === 'text') {
        <div class="space-y-6">
          <!-- Workspace Options Toolbar Menu -->
          <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl select-none">
            <div class="flex flex-wrap items-center gap-4">
              <!-- Mode Selection Segment -->
              <div class="flex items-center bg-zinc-200/50 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-250 dark:border-zinc-800">
                <button 
                  (click)="textMode.set('encode')" 
                  [class.bg-white]="textMode() === 'encode'"
                  [class.dark:bg-zinc-800]="textMode() === 'encode'"
                  [class.text-emerald-600]="textMode() === 'encode'"
                  [class.dark:text-emerald-400]="textMode() === 'encode'"
                  [class.shadow-xs]="textMode() === 'encode'"
                  class="px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded-lg transition font-mono font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <mat-icon class="scale-75">lock</mat-icon> ENCODE
                </button>
                <button 
                  (click)="textMode.set('decode')" 
                  [class.bg-white]="textMode() === 'decode'"
                  [class.dark:bg-zinc-800]="textMode() === 'decode'"
                  [class.text-amber-600]="textMode() === 'decode'"
                  [class.dark:text-amber-400]="textMode() === 'decode'"
                  [class.shadow-xs]="textMode() === 'decode'"
                  class="px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded-lg transition font-mono font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <mat-icon class="scale-75">lock_open</mat-icon> DECODE
                </button>
              </div>

              <!-- Character Set Selector -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-tight">Alphabet:</span>
                <select 
                  [value]="textFormat()"
                  (change)="setTextFormat($any($event.target))"
                  class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="standard">Base64 Standard</option>
                  <option value="url">Base64 URL Safe</option>
                  <option value="hex">Hexadecimal Source</option>
                  <option value="binary">Binary Bits Sequence</option>
                </select>
              </div>

              <!-- Charset Type Selector (Only on encoding UTF8/ASCII etc) -->
              @if (textMode() === 'encode') {
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-tight">Source:</span>
                  <select 
                    [value]="textCharset()"
                    (change)="setTextCharset($any($event.target))"
                    class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="utf8">UTF-8 Encoding</option>
                    <option value="ascii">ASCII Encoding</option>
                  </select>
                </div>
              }
            </div>

            <!-- Global Action Checkboxes -->
            <div class="flex flex-wrap items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  [checked]="chunkedLines()"
                  (change)="chunkedLines.set(!chunkedLines())"
                  class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span class="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">CHUNK LINES (64 char wrap)</span>
              </label>

              <button 
                (click)="toggleSearchBar()"
                [class.bg-emerald-500/10]="showSearch()"
                [class.text-emerald-600]="showSearch()"
                class="px-2 py-1 text-[11px] font-mono font-bold rounded-lg border border-zinc-250 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <mat-icon class="scale-50">search</mat-icon> FIND/REPLACE
              </button>
            </div>
          </div>

          <!-- Dynamic Search & Replace Bar -->
          @if (showSearch()) {
            <div class="p-3 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-wrap items-center gap-3 animate-fade-in select-none">
              <input #findRef type="text" placeholder="Find text..." [value]="searchQuery()" (input)="searchQuery.set(findRef.value)"
                class="bg-white dark:bg-zinc-900 text-xs font-mono px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 outline-none w-48 focus:ring-1 focus:ring-emerald-500"
              />
              <input #replaceRef type="text" placeholder="Replace with..." [value]="replaceQuery()" (input)="replaceQuery.set(replaceRef.value)"
                class="bg-white dark:bg-zinc-900 text-xs font-mono px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 outline-none w-48 focus:ring-1 focus:ring-emerald-500"
              />
              <button (click)="executeReplace()"
                class="px-3 py-1.5 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                REPLACE ALL
              </button>
            </div>
          }

          <!-- Smart Suggested Detection Alert -->
          @if (detectedTypeBanner(); as alert) {
            <div class="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs font-mono text-amber-800 dark:text-amber-400 flex items-center justify-between gap-3 animate-fade-in">
              <span class="flex items-center gap-2">
                <mat-icon class="text-sm scale-90 text-amber-500">info</mat-icon>
                {{ alert.text }}
              </span>
              <button (click)="applySmartDetector(alert.action)"
                class="px-2.5 py-1 text-[10px] font-bold bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded-md transition cursor-pointer"
              >
                {{ alert.buttonText }}
              </button>
            </div>
          }

          <!-- Sensitive Content Warning (Optional UI on detect passwords etc) -->
          @if (isSensitiveDetected()) {
            <div class="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/35 rounded-xl text-xs font-mono text-rose-700 dark:text-rose-450 flex items-center gap-2 animate-fade-in">
              <mat-icon class="text-xs scale-90">warning</mat-icon>
              <span><strong>Warning:</strong> Sensitive credential structure detected (keys/passphrase). Handled safely in-memory offline.</span>
            </div>
          }

          <!-- Split Workspace Layout Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- INPUT TEXT FRAME -->
            <div class="flex flex-col h-[520px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div class="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 select-none">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-zinc-500 font-mono tracking-tight uppercase">
                    INPUT ({{ textMode() === 'encode' ? 'PLAIN TEXT' : 'BASE64' }})
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <!-- Undo/Redo Buttons -->
                  <button [disabled]="!canUndo()" (click)="triggerUndo()"
                    class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
                    title="Undo"
                  >
                    <mat-icon class="scale-75">undo</mat-icon>
                  </button>
                  <button [disabled]="!canRedo()" (click)="triggerRedo()"
                    class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
                    title="Redo"
                  >
                    <mat-icon class="scale-75">redo</mat-icon>
                  </button>
                  <span class="text-zinc-300 dark:text-zinc-800 px-1">|</span>
                  <button (click)="pasteInput()"
                    class="px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    PASTE
                  </button>
                  <button (click)="clearInput()"
                    class="px-2.5 py-1 text-[10px] font-mono font-bold text-rose-600 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              <!-- High Custom Text Editor Canvas -->
              <div class="flex-1 flex flex-row relative min-h-0 bg-white dark:bg-zinc-900">
                <!-- Line Numbers Column Gutter -->
                <div #leftGutter
                  class="select-none text-right pr-2.5 pl-3.5 py-4 text-zinc-400 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-950/50 border-r border-zinc-200 dark:border-zinc-850 flex flex-col overflow-hidden text-[10px] leading-[20px] font-mono font-semibold"
                  style="min-width: 2.75rem;"
                >
                  @for (ln of lineNumbers(); track $index) {
                    <div>{{ ln }}</div>
                  }
                </div>

                <!-- Textarea -->
                <textarea
                  #textInputArea
                  [value]="inputText()"
                  (input)="onTextInput(textInputArea.value)"
                  (scroll)="leftGutter.scrollTop = textInputArea.scrollTop"
                  placeholder="Type, drag file or paste string arrays here..."
                  class="flex-1 w-full h-full p-4 text-xs font-mono bg-transparent text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 border-none outline-none resize-none focus:ring-0 leading-[20px] overflow-y-auto select-text scrollbar-thin"
                ></textarea>
              </div>

              <div class="px-4 py-2 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-850/60 flex justify-between text-[11px] font-mono text-zinc-500 select-none">
                <span>Lines: {{ lineNumbers().length }}</span>
                <span>Length: {{ inputText().length }} characters</span>
              </div>
            </div>

            <!-- OUTPUT RESULT FRAME -->
            <div class="flex flex-col h-[520px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div class="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 select-none">
                <span class="text-xs font-bold text-zinc-500 font-mono tracking-tight uppercase">
                  OUTPUT ({{ textMode() === 'encode' ? 'BASE64' : 'PLAIN TEXT' }})
                </span>
                @if (outputText()) {
                  <div class="flex items-center gap-1.5">
                    @if (textMode() === 'decode' && isOutputJson()) {
                      <button (click)="prettyPrintJsonOutput()"
                        class="px-2 py-1 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-850 transition flex items-center gap-1 cursor-pointer"
                      >
                        <mat-icon class="scale-50">format_align_left</mat-icon> PRETTY PRINT JSON
                      </button>
                    }
                    <button (click)="copyOutput()"
                      class="px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-150 dark:border-emerald-950 rounded transition font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-xs scale-75">{{ copySuccess() ? 'check' : 'content_copy' }}</mat-icon> 
                      {{ copySuccess() ? 'COPIED!' : 'COPY' }}
                    </button>
                  </div>
                }
              </div>
              <div class="flex-1 w-full p-4 overflow-auto text-xs font-mono select-text bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
                @if (!inputText()) {
                  <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650 text-center space-y-3 p-6 select-none">
                    <div class="w-12 h-12 bg-zinc-100 dark:bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-850">
                      <mat-icon class="text-zinc-500 dark:text-zinc-400 scale-110">alt_route</mat-icon>
                    </div>
                    <div class="space-y-1">
                      <p class="font-bold text-xs text-zinc-700 dark:text-zinc-400">Conversion Sandbox Ready</p>
                      <p class="text-[11px] leading-normal max-w-xs text-zinc-500">Provide characters in the input column to see real-time base64 calculations.</p>
                    </div>
                  </div>
                } @else {
                  @if (errorMsg()) {
                    <div class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-450 text-left select-text">
                      <div class="flex items-center gap-2 mb-1.5 font-bold text-xs uppercase">
                        <mat-icon class="text-sm scale-90">error_outline</mat-icon> Decrypt Validation Failed
                      </div>
                      <p class="text-[11px] leading-relaxed">{{ errorMsg() }}</p>
                      <div class="mt-3 flex gap-2">
                        <button (click)="switchToValidatorTab()"
                          class="px-2.5 py-1 bg-rose-200 dark:bg-rose-900 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 text-[10px] font-bold rounded-md transition cursor-pointer"
                        >
                          Diagnose & Repair Code
                        </button>
                      </div>
                    </div>
                  } @else {
                    <pre class="whitespace-pre-wrap word-break overflow-x-auto leading-relaxed select-all">{{ outputText() }}</pre>
                  }
                }
              </div>
              <div class="px-4 py-2 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-850/60 flex justify-between text-[11px] font-mono text-zinc-500 select-none">
                <span>Output Length: {{ outputText().length }} characters</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ==============================================
           TAB 2: SAFE FILE WORKBENCH (ENCODE & DECODE)
           ============================================== -->
      @if (activeTab() === 'file') {
        <div class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left inputs / upload zone -->
            <div class="lg:col-span-1 space-y-6 text-left">
              <!-- Upload Area -->
              <div 
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave()"
                (drop)="onFileDrop($event)"
                [class.border-emerald-500]="isDragging()"
                [class.bg-emerald-50/20]="isDragging()"
                class="border-2 border-dashed border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900/40 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-750 transition shadow-xs relative overflow-hidden group select-none"
              >
                <input #fileInputEl type="file" class="absolute inset-0 opacity-0 cursor-pointer" multiple (change)="onFileSelected($event)"/>
                <div class="w-12 h-12 bg-zinc-100 dark:bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-850 group-hover:scale-105 transition-all">
                  <mat-icon class="text-zinc-600 dark:text-zinc-400">upload_file</mat-icon>
                </div>

                <div class="space-y-1">
                  <p class="text-xs font-bold text-zinc-800 dark:text-zinc-300">Drag & Drop Local Files here</p>
                  <p class="text-[11px] text-zinc-500">Supports PNG, JPG, SVG, PDF, JSON, Audio up to 25MB.</p>
                </div>

                <button class="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-xs font-mono font-bold rounded-xl text-zinc-700 dark:text-zinc-300 transition select-none cursor-pointer">
                  BROWSE FILE
                </button>
              </div>

              <!-- List of Active Uploaded Files -->
              @if (uploadedFiles().length > 0) {
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm select-none">
                  <div class="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                    <span class="text-xs font-bold font-mono text-zinc-500 uppercase">Uploaded Files ({{ uploadedFiles().length }})</span>
                    <button (click)="clearFiles()"
                      class="text-[10px] font-mono font-extrabold text-rose-600 hover:text-rose-500 cursor-pointer"
                    >
                      CLEAR ALL
                    </button>
                  </div>

                  <div class="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                    @for (f of uploadedFiles(); track f.name; let idx = $index) {
                      <div (click)="selectFileIndex(idx)"
                        (keydown.enter)="selectFileIndex(idx)"
                        tabindex="0"
                        [class.border-emerald-500]="activeFileIndex() === idx"
                        [class.bg-emerald-500/5]="activeFileIndex() === idx"
                        class="p-3 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 rounded-xl flex items-center justify-between cursor-pointer transition select-none"
                      >
                        <div class="flex items-center gap-2.5 min-w-0">
                          <mat-icon class="text-zinc-500 dark:text-zinc-400 shrink-0">
                            {{ getFileIcon(f.type) }}
                          </mat-icon>
                          <div class="text-left font-mono min-w-0">
                            <p class="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate leading-tight">{{ f.name }}</p>
                            <p class="text-[10px] text-zinc-500 leading-tight">{{ formatBytes(f.size) }} &bull; {{ f.type.split('/')[1] || 'binary' | uppercase }}</p>
                          </div>
                        </div>
                        <button (click)="removeFileIndex(idx, $event)"
                          class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 rounded transition cursor-pointer"
                        >
                          <mat-icon class="scale-75">close</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Previews & Dynamic output panels -->
            <div class="lg:col-span-2 text-left space-y-6">
              @if (activeFile(); as file) {
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
                  <!-- File Metadata Header Banner -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 select-none">
                    <div class="space-y-0.5">
                      <span class="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">COMPLETED CONVERSION</span>
                      <h3 class="text-sm font-bold text-zinc-900 dark:text-white font-mono mt-1 break-all">{{ file.name }}</h3>
                      <p class="text-xs text-zinc-500 font-mono">Format: {{ file.type }} &bull; Size: {{ formatBytes(file.size) }}</p>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      <button (click)="copyRawBase64(file.base64)"
                        class="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-150 dark:hover:bg-zinc-750 border border-zinc-250 dark:border-zinc-800 text-xs font-mono font-bold rounded-xl text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                      >
                        COPY BASE64
                      </button>
                      <button (click)="copyDataUri(file.dataUri)"
                        class="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-150 dark:hover:bg-zinc-750 border border-zinc-250 dark:border-zinc-800 text-xs font-mono font-bold rounded-xl text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                      >
                        COPY DATA URI
                      </button>
                      <button (click)="downloadDecodedFile(file)"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl shadow-xs transition cursor-pointer"
                      >
                        DOWNLOAD FILE
                      </button>
                    </div>
                  </div>

                  <!-- Accordion Tabs For Previews / Code blocks -->
                  <div class="space-y-4">
                    <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block select-none">ACTIVE CONVERTER OUTPUT PREVIEWS</span>

                    <!-- Conditional Preview Screens based on file typings -->
                    <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]">
                      <!-- Images Previews -->
                      @if (file.type.startsWith('image/')) {
                        <div class="space-y-3 max-w-md w-full text-center">
                          <img 
                            [src]="file.dataUri" 
                            alt="Base64 Preview" 
                            class="max-h-[260px] mx-auto rounded-xl object-contain border border-zinc-200 dark:border-zinc-850 bg-checkered p-1 shadow-md"
                            referrerpolicy="no-referrer"
                          />
                          <p class="text-[11px] text-zinc-500 font-mono">Pixel-accurate client-rendered image preview.</p>
                        </div>
                      }
                      <!-- Audio Previews -->
                      @else if (file.type.startsWith('audio/')) {
                        <div class="space-y-4 max-w-sm w-full text-center select-none">
                          <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                            <mat-icon class="scale-125">audiotrack</mat-icon>
                          </div>
                          <audio controls [src]="file.dataUri" class="w-full mx-auto"></audio>
                          <p class="text-[11px] text-zinc-500 font-mono">Web Audio component linked to Base64 byte array.</p>
                        </div>
                      }

                      <!-- PDF Previews (Visual download panel for PDF) -->
                      @else if (file.type === 'application/pdf') {
                        <div class="space-y-3 text-center max-w-md select-none">
                          <div class="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
                            <mat-icon class="scale-125">picture_as_pdf</mat-icon>
                          </div>
                          <div>
                            <p class="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">PDF Binary Payload Decoded</p>
                            <p class="text-[11px] text-zinc-500 mt-0.5">We found valid PDF stream indices. In compliance with browser frame constraints, download the PDF block locally to read it fully.</p>
                          </div>
                          <button (click)="downloadDecodedFile(file)"
                            class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                          >
                            DOWNLOAD DECODED PDF
                          </button>
                        </div>
                      }

                      <!-- Text/HTML/JSON Previews -->
                      @else if (file.type === 'application/json' || file.type.startsWith('text/')) {
                        <div class="w-full text-left">
                          <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                            <span class="text-[10px] font-mono text-zinc-500 uppercase font-bold">Raw Decoded File Text (Preview)</span>
                          </div>
                          <div class="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 font-mono text-xs max-h-[300px] overflow-y-auto leading-relaxed select-text select-all">
                            <pre class="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{{ getFileTextPreview(file) }}</pre>
                          </div>
                        </div>
                      }
                      <!-- Default Fallback binary visualizers -->
                      @else {
                        <div class="text-center space-y-2 select-none">
                          <mat-icon class="text-zinc-400 dark:text-zinc-650 text-4xl">folder_zip</mat-icon>
                          <p class="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">Generic Binary Bytes Layout</p>
                          <p class="text-[11px] text-zinc-500 max-w-xs">Auto-detected mime-type is generic. It was converted from Base64 successfully and is fully ready to be downloaded.</p>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Generated Raw Base64 string characters output drawer -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between select-none">
                      <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Base64 output string characters (first 500 chars)</span>
                      <button (click)="copyRawBase64(file.base64)"
                        class="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                      >
                        <mat-icon class="scale-50">content_copy</mat-icon> COPY FULL CHARACTER STREAM
                      </button>
                    </div>
                    <div class="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-850 text-[11px] font-mono break-all text-zinc-600 dark:text-zinc-500 leading-normal select-all">
                      <code>{{ file.base64.slice(0, 500) }} @if (file.base64.length > 500) { ... [{{ file.base64.length - 500 }} more characters] }</code>
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Empty State -->
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm select-none">
                  <div class="w-16 h-16 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-150 dark:border-zinc-850 rounded-full flex items-center justify-center text-zinc-400 mb-4 shadow-2xs">
                    <mat-icon class="scale-125">file_download</mat-icon>
                  </div>
                  <h3 class="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">File conversion queue is empty</h3>
                  <p class="text-xs text-zinc-500 max-w-sm leading-relaxed mt-1">Drag and drop any binary image, PDF, audio track, or stylesheet onto the left side panels. Your browser compiles and processes assets instantly and offline.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ==============================================
           TAB 3: DIAGNOSTIC VALIDATOR & REPAIR
           ============================================== -->
      @if (activeTab() === 'validator') {
        <div class="space-y-6">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left space-y-6 shadow-sm">
            <div class="border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 class="text-[13px] font-bold font-mono text-zinc-500 uppercase tracking-wider block">Base64 Syntax Analysis & Reparation Engine</h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">Paste any compiled string to evaluate strict syntactical compliance, identify corrupted offset anomalies, measure pad bits, and repair trailing equations.</p>
            </div>

            <!-- Input area for check -->
            <div class="space-y-2">
              <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block select-none">Paste string to analyze:</span>
              <textarea
                #valInput
                [value]="valText()"
                (input)="valText.set(valInput.value)"
                placeholder="Pasted base64 sequence..."
                class="w-full h-32 p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent select-text"
              ></textarea>
            </div>

            @if (valText()) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Health Report card -->
                <div class="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 space-y-4">
                  <div class="flex items-center gap-2">
                    @if (valReport().isValid) {
                      <mat-icon class="text-emerald-500">check_circle</mat-icon>
                      <h4 class="text-xs font-bold text-emerald-800 dark:text-emerald-400 font-mono">SYNTAX IS FULLY COMPLIANT</h4>
                    } @else {
                      <mat-icon class="text-rose-500">cancel</mat-icon>
                      <h4 class="text-xs font-bold text-rose-800 dark:text-rose-450 font-mono">SYNTACTICAL FAULTS DETECTED</h4>
                    }
                  </div>

                  <!-- Detailed Audit Checklist -->
                  <div class="space-y-3 font-mono text-xs select-none">
                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500">Standard Alphabet Compliance:</span>
                      <span [class.text-emerald-500]="valReport().cleanFormat" [class.text-rose-500]="!valReport().cleanFormat" class="font-bold">
                        {{ valReport().cleanFormat ? 'PASS' : 'FAIL (Non-Alphanumeric found)' }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500">Character Modulo Multiplier of 4:</span>
                      <span [class.text-emerald-500]="valText().length % 4 === 0" [class.text-amber-500]="valText().length % 4 !== 0" class="font-bold">
                        {{ valText().length % 4 === 0 ? 'PASS' : 'WARN (Length is ' + valText().length + ', modular ' + (valText().length % 4) + ' remains)' }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500">Trailing Padding Integrity:</span>
                      <span [class.text-emerald-500]="valReport().paddingOk" [class.text-rose-500]="!valReport().paddingOk" class="font-bold">
                        {{ valReport().paddingOk ? 'PASS' : 'FAIL (Bad pad blocks)' }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500">Estimated Raw Contents Byte Size:</span>
                      <span class="text-zinc-800 dark:text-zinc-350 font-bold">{{ formatBytes(valReport().estimatedSize) }}</span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500">Auto-Detected MIME Group:</span>
                      <span class="text-sky-600 dark:text-sky-400 font-bold uppercase">{{ valReport().mimeType }}</span>
                    </div>
                  </div>
                </div>

                <!-- Fix controls panel -->
                <div class="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 flex flex-col justify-between space-y-4">
                  <div class="space-y-1.5">
                    <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-300 font-mono">AUTOMATED REPARATION CHECKS</h4>
                    <p class="text-[11px] text-zinc-550 leading-relaxed">Our static routines analyze trailing characters, strip non-base64 spaces/carriage returns, and correct padded lengths instantly.</p>
                  </div>

                  <div class="flex flex-col gap-2">
                    @if (valReport().invalidCharacters.length > 0) {
                      <button (click)="repairCleanWhitespace()"
                        class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <mat-icon class="scale-75">cleaning_services</mat-icon> STRIP INVALID & SPACES
                      </button>
                    }
                    @if (valText().length % 4 !== 0) {
                      <button (click)="repairTrailingPadding()"
                        class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <mat-icon class="scale-75">build</mat-icon> FIX TRAILING EQUATION PAD
                      </button>
                    }
                    <button (click)="normalizeUrlSafeToStandardVal()"
                      class="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-350 text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <mat-icon class="scale-75">swap_calls</mat-icon> CONVERT URL-SAFE TO STANDARD
                    </button>
                  </div>
                </div>
              </div>
            @} @else {
              <!-- Empty state validator -->
              <div class="text-center p-8 bg-zinc-50 dark:bg-zinc-950/25 border border-zinc-200 dark:border-zinc-850 rounded-2xl select-none">
                <mat-icon class="text-zinc-400 text-3xl">scanner</mat-icon>
                <p class="text-xs text-zinc-500 font-mono mt-1">Provide sequence characters above to start diagnostic scanning.</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- ==============================================
           TAB 4: DEVELOPER TEMPLATES & GENERATORS
           ============================================== -->
      @if (activeTab() === 'templates') {
        <div class="space-y-6">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left space-y-6 shadow-sm">
            <div class="border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 class="text-[13px] font-bold font-mono text-zinc-500 uppercase tracking-wider block">Developer Code Snippet Generators</h3>
              <p class="text-xs text-zinc-650 dark:text-zinc-400 mt-0.5">Integrate Base64 assets directly into stylesheets, markup source files, Markdown folders, or backend requests with auto-formatted templates.</p>
            </div>

            <!-- Content preview input checker -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-4 select-none">
              <div class="space-y-1 md:col-span-2">
                <span class="text-xs font-bold text-zinc-800 dark:text-zinc-300 font-mono">Current Base64 Data Target</span>
                <p class="text-[11px] text-zinc-550 leading-tight">Templates will compute using this text, which can be custom-defined or selected from file components.</p>
              </div>
              <div class="flex items-end justify-start md:justify-end">
                <button (click)="importFromActiveWorkspace()"
                  class="px-3.5 py-2 border border-emerald-250 dark:border-emerald-800 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded-xl hover:bg-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="scale-75">get_app</mat-icon> LINK TEXT WORKSPACE
                </button>
              </div>
            </div>

            @if (templateContent()) {
              <!-- Snippet Cards Layout list -->
              <div class="space-y-6">
                <!-- Snippet 1: CSS background-image -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between select-none">
                    <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1">
                      <span class="w-2 h-2 bg-pink-500 rounded-full"></span> 1. CSS Background Inline
                    </span>
                    <button (click)="copyToClipboard(cssBgCode())"
                      class="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="scale-50">content_copy</mat-icon> COPY CODE
                    </button>
                  </div>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 text-[10px] font-mono break-all text-zinc-800 dark:text-zinc-300 select-all leading-normal max-h-[140px] overflow-y-auto"><code>{{ cssBgCode() }}</code></pre>
                </div>

                <!-- Snippet 2: HTML Image Tag -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between select-none">
                    <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1">
                      <span class="w-2 h-2 bg-blue-500 rounded-full"></span> 2. HTML Image Tag
                    </span>
                    <button (click)="copyToClipboard(htmlImgCode())"
                      class="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="scale-50">content_copy</mat-icon> COPY CODE
                    </button>
                  </div>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 text-[10px] font-mono break-all text-zinc-800 dark:text-zinc-300 select-all leading-normal max-h-[140px] overflow-y-auto"><code>{{ htmlImgCode() }}</code></pre>
                </div>

                <!-- Snippet 3: Markdown Picture -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between select-none">
                    <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1">
                      <span class="w-2 h-2 bg-purple-500 rounded-full"></span> 3. Markdown Document Format
                    </span>
                    <button (click)="copyToClipboard(markdownImgCode())"
                      class="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="scale-50">content_copy</mat-icon> COPY CODE
                    </button>
                  </div>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 text-[10px] font-mono break-all text-zinc-800 dark:text-zinc-300 select-all leading-normal max-h-[140px] overflow-y-auto"><code>{{ markdownImgCode() }}</code></pre>
                </div>

                <!-- Snippet 4: Angular safe bindings -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between select-none">
                    <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1">
                      <span class="w-2 h-2 bg-red-600 rounded-full"></span> 4. Angular component model binding
                    </span>
                    <button (click)="copyToClipboard(angularBindingCode())"
                      class="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer cursor-pointer"
                    >
                      <mat-icon class="scale-50">content_copy</mat-icon> COPY CODE
                    </button>
                  </div>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 text-[10px] font-mono break-all text-zinc-800 dark:text-zinc-300 select-all leading-normal max-h-[140px] overflow-y-auto"><code>{{ angularBindingCode() }}</code></pre>
                </div>
              </div>
            @} @else {
              <!-- Empty state templates -->
              <div class="text-center p-12 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-850 rounded-2xl select-none">
                <mat-icon class="text-zinc-400 text-3xl">code_off</mat-icon>
                <p class="text-xs font-mono text-zinc-500 mt-2">No active string selected. Insert values in Text Workspace first or import.</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- ==============================================
           TAB 5: JWT DECODER & TOKEN INSPECTOR
           ============================================== -->
      @if (activeTab() === 'jwt') {
        <div class="space-y-6">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left space-y-6 shadow-sm">
            <div class="border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 class="text-[13px] font-bold font-mono text-zinc-500 uppercase tracking-wider block">JWT Claim Inspections Workbench</h3>
              <p class="text-xs text-zinc-650 dark:text-zinc-400 mt-0.5 font-sans leading-relaxed">JSON Web Tokens encode payloads inside URL-safe Base64 layers. Insert an OAuth cookie token to decode parameters on header metadata and security signatures.</p>
            </div>

            <!-- Input token input box -->
            <div class="space-y-2">
              <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block select-none">Auth token stream:</span>
              <textarea
                #jwtInput
                [value]="jwtText()"
                (input)="jwtText.set(jwtInput.value)"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                class="w-full h-24 p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent select-text"
              ></textarea>
            </div>

            @if (jwtText()) {
              @if (jwtReport().parseSuccess) {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 leading-relaxed select-text">
                  <!-- Header claims card -->
                  <div class="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/25 space-y-4">
                    <div class="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span class="text-xs font-bold text-zinc-500 font-mono">HEADER METRICS (PART 1)</span>
                    </div>
                    <pre class="text-rose-600 dark:text-rose-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all bg-white dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-850 rounded-xl leading-relaxed"><code>{{ jwtReport().headerJson }}</code></pre>
                  </div>

                  <!-- Payload claims card -->
                  <div class="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/25 space-y-4">
                    <div class="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span class="text-xs font-bold text-zinc-500 font-mono">CLAIMS & DECLARED PAYLOAD (PART 2)</span>
                    </div>
                    <pre class="text-blue-600 dark:text-blue-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all bg-white dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-850 rounded-xl leading-relaxed"><code>{{ jwtReport().payloadJson }}</code></pre>

                    <!-- Token Expirations indicators -->
                    @if (jwtReport().expTimes) {
                      <div class="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/35 rounded-xl font-mono text-[11px] text-left space-y-1">
                        <p class="font-bold text-amber-800 dark:text-amber-400">EXPIRATION SECURITY OVERVIEW:</p>
                        <p class="text-zinc-600 dark:text-zinc-400 mt-1">Declared Expiry: <span class="text-zinc-800 dark:text-zinc-300 font-bold">{{ jwtReport().expTimes }}</span></p>
                        <p class="text-zinc-600 dark:text-zinc-400">Claims Token Status: <span class="text-emerald-600 dark:text-emerald-400 font-bold">DECRYPTED SUCCESSFULLY</span></p>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-450 font-mono text-xs text-left">
                  <p class="font-bold">INVALID TOKEN COORDINATE FORMAT</p>
                  <p class="text-[11px] mt-1">JWT represents three parts delimited by dots '.'. Ensure your pasted elements map to authorization standards.</p>
                </div>
              }
            } @else {
              <!-- Empty state decoder -->
              <div class="text-center p-8 bg-zinc-50 dark:bg-zinc-950/25 border border-zinc-200 dark:border-zinc-850 rounded-2xl select-none">
                <mat-icon class="text-zinc-400 text-3xl">lock</mat-icon>
                <p class="text-xs text-zinc-500 font-mono mt-1">Token string coordinates are empty. Provide keys to inspect claims lists.</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- ==============================================
           TAB 6: BATCH BULK ENGINE
           ============================================== -->
      @if (activeTab() === 'batch') {
        <div class="space-y-6 animate-fade-in select-text">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left space-y-6 shadow-sm">
            <div class="border-b border-zinc-200 dark:border-zinc-800 pb-3 select-none">
              <h3 class="text-[13px] font-bold font-mono text-zinc-500 uppercase tracking-wider block">Mass Batch Bulk Translator</h3>
              <p class="text-xs text-zinc-650 dark:text-zinc-400 mt-0.5">Input multiple string inputs separated by line breaks to convert all rows concurrently and export unified CSV records.</p>
            </div>

            <!-- Configuration values -->
            <div class="flex flex-wrap items-center gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-4 select-none">
              <div class="flex items-center bg-zinc-200/50 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-250 dark:border-zinc-800">
                <button (click)="batchMode.set('encode')"
                  [class.bg-white]="batchMode() === 'encode'"
                  [class.dark:bg-zinc-800]="batchMode() === 'encode'"
                  [class.text-emerald-600]="batchMode() === 'encode'"
                  [class.dark:text-emerald-400]="batchMode() === 'encode'"
                  class="px-3.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 rounded-lg transition font-mono font-bold cursor-pointer"
                >
                  BATCH ENCODE
                </button>
                <button (click)="batchMode.set('decode')"
                  [class.bg-white]="batchMode() === 'decode'"
                  [class.dark:bg-zinc-800]="batchMode() === 'decode'"
                  [class.text-amber-600]="batchMode() === 'decode'"
                  [class.dark:text-amber-400]="batchMode() === 'decode'"
                  class="px-3.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 rounded-lg transition font-mono font-bold cursor-pointer"
                >
                  BATCH DECODE
                </button>
              </div>

              <!-- Format safe selections -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono font-bold text-zinc-500 uppercase">WRAP STYLE:</span>
                <select [value]="batchFormat()"
                  (change)="batchFormat.set($any($event.target).value)"
                  class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 rounded-xl p-1 px-2.5 focus:outline-none"
                >
                  <option value="standard">Standard Alphabet</option>
                  <option value="url">URL-Safe Alphabet</option>
                </select>
              </div>
            </div>

            <!-- Raw stack content -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block select-none">Line segmented input values:</span>
                <textarea
                  #batchInputArea
                  (input)="onBatchInputChange(batchInputArea.value)"
                  placeholder="Element 1&#10;Element 2&#10;Element 3"
                  class="w-full h-48 p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none select-text"
                ></textarea>
                <p class="text-[10px] text-zinc-500 font-mono select-none">Each line becomes an individual batch translation block.</p>
              </div>

              <!-- Output columns -->
              <div class="flex flex-col h-[230px] bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl relative">
                <div class="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2 mb-3 select-none">
                  <span class="text-xs font-bold font-mono text-zinc-500 uppercase">Batch Conversion Outcomes</span>
                  @if (batchRows().length > 0) {
                    <button (click)="downloadBatchCsv()"
                      class="text-[10px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <mat-icon class="scale-50">download</mat-icon> DOWNLOAD CSV REPORT
                    </button>
                  }
                </div>

                <div class="flex-1 overflow-y-auto scrollbar-thin space-y-2 font-mono text-xs text-left">
                  @if (batchRows().length === 0) {
                    <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650 text-center select-none">
                      <mat-icon class="text-xl">playlist_add</mat-icon>
                      <p class="text-[11px] mt-1">Waiting for line entries on the left...</p>
                    </div>
                  } @else {
                    @for (row of batchRows(); track $index) {
                      <div class="p-2 border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-xl text-[11px] leading-relaxed flex items-center justify-between gap-4">
                        <div class="truncate">
                          <span class="text-zinc-500 shrink-0 select-none">Row {{ $index + 1 }}:</span> &nbsp;
                          <span class="text-zinc-800 dark:text-zinc-300 select-all">{{ row.input }}</span> &nbsp;
                          <span class="text-zinc-500 shrink-0 select-none">&bull;</span> &nbsp;
                          <span class="text-emerald-600 dark:text-emerald-400 font-bold select-all">{{ row.output }}</span>
                        </div>
                        <button (click)="copyToClipboard(row.output)"
                          class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 rounded transition cursor-pointer"
                          title="Copy Row Output"
                        >
                          <mat-icon class="scale-75">content_copy</mat-icon>
                        </button>
                      </div>
                    }
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .word-break {
      word-break: break-all;
    }
    .bg-checkered {
      background-image: radial-gradient(circle, #e4e4e710 10%, transparent 11%), radial-gradient(circle, #e4e4e110 10%, transparent 11%);
      background-size: 16px 16px;
    }
  `]
})
export class Base64EncoderComponent implements OnInit {
  @Input() set mode(value: string) {
    this._mode.set(value);
    this.applyRouteMode(value);
  }
  public _mode = signal<string>('base64-toolkit');

  // Shared active panel
  public activeTab = signal<'text' | 'file' | 'validator' | 'templates' | 'jwt' | 'batch'>('text');

  // Interactive Text fields
  public inputText = signal<string>('');
  public textMode = signal<'encode' | 'decode'>('encode');
  public textFormat = signal<'standard' | 'url' | 'hex' | 'binary'>('standard');
  public textCharset = signal<'utf8' | 'ascii'>('utf8');
  public chunkedLines = signal<boolean>(false);
  public showSearch = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public replaceQuery = signal<string>('');
  public copySuccess = signal<boolean>(false);

  // Undo/Redo tracking state
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  // File variables
  public uploadedFiles = signal<Base64File[]>([]);
  public activeFileIndex = signal<number>(0);
  public isDragging = signal<boolean>(false);

  // Validator variables
  public valText = signal<string>('');

  // JWT components
  public jwtText = signal<string>('');

  // Batch conversions
  public batchMode = signal<'encode' | 'decode'>('encode');
  public batchFormat = signal<'standard' | 'url'>('standard');
  public batchRows = signal<BatchRow[]>([]);

  // Automatically track line numbers inside rich Textarea
  public lineNumbers = computed(() => {
    const lines = this.inputText().split('\n');
    return Array.from({ length: Math.max(1, lines.length) }, (_, i) => i + 1);
  });

  // Track sensitive credentials
  public isSensitiveDetected = computed(() => {
    const lower = this.inputText().toLowerCase();
    const flags = ['api_key', 'private_key', 'client_secret', 'password', 'passwd', 'auth_token', 'jwt_secret'];
    return flags.some(term => lower.includes(term));
  });

  // Smart suggestions banner
  public detectedTypeBanner = computed(() => {
    const raw = this.inputText().trim();
    if (!raw) return null;

    // Detect format and propose tabs
    if (this.textMode() === 'encode' && /^[A-Za-z0-9+/=_-]{16,}$/.test(raw)) {
      // Looks like base64
      if (raw.split('.').length === 3) {
        return {
          text: "Smart check: This string layout looks like an encoded JSON Web Token (JWT).",
          buttonText: "PARSE IN JWT TAB",
          action: 'jwt'
        };
      }
      return {
        text: "Smart check: This input appears to already be Base64-encoded. Switch mode to Decode?",
        buttonText: "ACTIVATE DECODE",
        action: 'switch_to_decode'
      };
    }
    
    if (this.textMode() === 'decode' && (raw.startsWith('{') || raw.startsWith('['))) {
      return {
        text: "Smart check: Input looks like a raw JSON object string. Switch to Encode?",
        buttonText: "ACTIVATE ENCODE",
        action: 'switch_to_encode'
      };
    }

    return null;
  });

  // Dynamic template target linking
  public templateContent = signal<string>('');

  // Formatted templates derivations
  public cssBgCode = computed(() => {
    const raw = this.templateContent() || '';
    const mime = this.guessMimeType(raw);
    return `background-image: url("data:${mime};base64,${raw}");`;
  });

  public htmlImgCode = computed(() => {
    const raw = this.templateContent() || '';
    const mime = this.guessMimeType(raw);
    return `<img src="data:${mime};base64,${raw}" alt="Inline Base64 Asset" referrerpolicy="no-referrer" />`;
  });

  public markdownImgCode = computed(() => {
    const raw = this.templateContent() || '';
    const mime = this.guessMimeType(raw);
    return `![Base64 Asset](data:${mime};base64,${raw})`;
  });

  public angularBindingCode = computed(() => {
    const raw = this.templateContent() || '';
    const mime = this.guessMimeType(raw);
    return `public base64Src = 'data:${mime};base64,${raw}';`;
  });

  ngOnInit(): void {
    // Start with current inputs
    this.applyRouteMode(this._mode());
  }

  // Map route slug param to view layout and active default tabs
  private applyRouteMode(m: string): void {
    if (m === 'base64-toolkit') {
      this.activeTab.set('text');
    } else if (m === 'base64-encoder') {
      this.activeTab.set('text');
      this.textMode.set('encode');
    } else if (m === 'base64-decoder') {
      this.activeTab.set('text');
      this.textMode.set('decode');
    } else if (m === 'base64-validator') {
      this.activeTab.set('validator');
    } else if (m === 'image-to-base64') {
      this.activeTab.set('file');
    } else if (m === 'data-uri-generator') {
      this.activeTab.set('templates');
    }
  }

  // Apply quick smart checks
  public applySmartDetector(action: string): void {
    if (action === 'jwt') {
      this.jwtText.set(this.inputText());
      this.activeTab.set('jwt');
    } else if (action === 'switch_to_decode') {
      this.textMode.set('decode');
    } else if (action === 'switch_to_encode') {
      this.textMode.set('encode');
    }
  }

  public setActiveTab(tab: 'text' | 'file' | 'validator' | 'templates' | 'jwt' | 'batch'): void {
    this.activeTab.set(tab);
    if (tab === 'templates' && this.inputText() && !this.templateContent()) {
      this.templateContent.set(this.inputText());
    }
  }

  public setTextFormat(select: HTMLSelectElement | null): void {
    if (select) {
      this.textFormat.set(select.value as 'standard' | 'url' | 'hex' | 'binary');
    }
  }

  public setTextCharset(select: HTMLSelectElement | null): void {
    if (select) {
      this.textCharset.set(select.value as 'utf8' | 'ascii');
    }
  }

  public toggleSearchBar(): void {
    this.showSearch.set(!this.showSearch());
  }

  public onTextInput(val: string): void {
    // Record current on stack for undo
    if (this.inputText() !== val) {
      this.undoStack.push(this.inputText());
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = []; // Reset redo
      this.inputText.set(val);
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public triggerUndo(): void {
    if (this.canUndo()) {
      const prev = this.undoStack.pop()!;
      this.redoStack.push(this.inputText());
      this.inputText.set(prev);
    }
  }

  public triggerRedo(): void {
    if (this.canRedo()) {
      const next = this.redoStack.pop()!;
      this.undoStack.push(this.inputText());
      this.inputText.set(next);
    }
  }

  // Auto-detect JSON inside output for formattings
  public isOutputJson(): boolean {
    const out = this.outputText().trim();
    return out.startsWith('{') || out.startsWith('[');
  }

  public prettyPrintJsonOutput(): void {
    try {
      const parsed = JSON.parse(this.outputText());
      const pretty = JSON.stringify(parsed, null, 2);
      // Since OutputText is computed from InputText, if decoding, we format the decrypted text by editing inputText!
      if (this.textMode() === 'decode') {
        const encoded = this.encodeBytes(new TextEncoder().encode(pretty));
        this.inputText.set(encoded);
      }
    } catch {
      // Ignored for invalid JSON formats
    }
  }

  // Active File tracking helper
  public activeFile = computed(() => {
    const list = this.uploadedFiles();
    const idx = this.activeFileIndex();
    if (list.length > idx && idx >= 0) {
      return list[idx];
    }
    return list[0] || null;
  });

  // Calculate standard conversion output dynamically
  public outputText = computed(() => {
    const raw = this.inputText();
    if (!raw) return '';

    try {
      if (this.textMode() === 'encode') {
        // ENCODING WORKFLOWS
        let bytes: Uint8Array;
        
        if (this.textFormat() === 'hex') {
          const cleanHex = raw.replace(/[^0-9A-Fa-f]/g, '');
          const matchHex = cleanHex.match(/.{1,2}/g);
          bytes = new Uint8Array(matchHex?.map(byte => parseInt(byte, 16)) || []);
        } else if (this.textFormat() === 'binary') {
          const cleanBin = raw.replace(/[^01]/g, '');
          const byteCount = Math.ceil(cleanBin.length / 8);
          bytes = new Uint8Array(byteCount);
          let bIdx = 0;
          for (let i = 0; i < byteCount; i++) {
            bytes[bIdx++] = parseInt(cleanBin.substring(i * 8, (i + 1) * 8), 2);
          }
        } else {
          // Plain Text Encoding with configurable properties
          if (this.textCharset() === 'ascii') {
            bytes = new Uint8Array(raw.length);
            let aIdx = 0;
            for (const char of raw) {
              bytes[aIdx++] = char.charCodeAt(0) & 0xff;
            }
          } else {
            bytes = new TextEncoder().encode(raw);
          }
        }

        let base64 = this.encodeBytes(bytes);
        
        if (this.textFormat() === 'url') {
          base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        if (this.chunkedLines()) {
          base64 = this.chunkString(base64, 64);
        }

        return base64;
      } else {
        // DECODING WORKFLOWS
        let base64 = raw.trim().replace(/\s/g, ''); // strip whitespace
        if (this.textFormat() === 'url') {
          base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
        }

        // Standard decode bytes
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        let codeIdx = 0;
        for (const char of binString) {
          bytes[codeIdx++] = char.charCodeAt(0);
        }

        if (this.textFormat() === 'hex') {
          let hex = '';
          for (const byte of bytes) {
            const h = byte.toString(16);
            hex += h.length === 1 ? '0' + h : h;
          }
          return hex.toUpperCase();
        } else if (this.textFormat() === 'binary') {
          let bits = '';
          for (const byte of bytes) {
            const b = byte.toString(2);
            bits += '0'.repeat(8 - b.length) + b + ' ';
          }
          return bits.trim();
        } else {
          return new TextDecoder('utf-8').decode(bytes);
        }
      }
    } catch {
      return '';
    }
  });

  // Track error checks nicely
  public errorMsg = computed(() => {
    if (this.textMode() === 'encode') return null;
    const raw = this.inputText();
    if (!raw) return null;

    try {
      let b64 = raw.trim().replace(/\s/g, '');
      if (this.textFormat() === 'url') {
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) {
          b64 += '=';
        }
      }
      atob(b64);
      return null;
    } catch (e) {
      if (/[^A-Za-z0-9+/=_-]/.test(raw.trim())) {
        return "Non-compliant characters found in standard Base64 sequence (e.g. invalid spaces, percentage %, or symbols #). Click 'Strip Invalid' in validator panel.";
      }
      return e instanceof Error ? e.message : 'Invalid sequence characters detected.';
    }
  });

  // Gutter actions
  private chunkString(str: string, size: number): string {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substring(o, o + size);
    }
    return chunks.join('\n');
  }

  private encodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  public clearInput(): void {
    this.inputText.set('');
    this.undoStack = [];
    this.redoStack = [];
  }

  public pasteInput(): void {
    navigator.clipboard.readText().then(text => {
      this.onTextInput(text);
    }).catch(() => {
      console.warn('Failed to paste from clipboard');
    });
  }

  public copyOutput(): void {
    const out = this.outputText();
    if (!out) return;
    navigator.clipboard.writeText(out).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  public executeReplace(): void {
    const findTerm = this.searchQuery();
    const replaceTerm = this.replaceQuery();
    if (!findTerm) return;
    
    // Global regex escape helper
    const escaped = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    const updated = this.inputText().replace(regex, replaceTerm);
    this.onTextInput(updated);
  }

  public switchToValidatorTab(): void {
    this.valText.set(this.inputText());
    this.activeTab.set('validator');
  }

  // ===================================
  // Tab 2 File workflows
  // ===================================
  public onDragOver(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragging.set(true);
  }

  public onDragLeave(): void {
    this.isDragging.set(false);
  }

  public onFileDrop(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragging.set(false);
    if (evt.dataTransfer?.files) {
      this.processUploadedFilesList(evt.dataTransfer.files);
    }
  }

  public onFileSelected(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    if (target.files) {
      this.processUploadedFilesList(target.files);
    }
  }

  private processUploadedFilesList(files: FileList): void {
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUriStr = reader.result as string;
        const b64Data = dataUriStr.split(',')[1] || '';
        
        const newFile: Base64File = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64: b64Data,
          dataUri: dataUriStr,
          previewUrl: dataUriStr
        };

        this.uploadedFiles.update(list => [...list, newFile]);
        this.activeFileIndex.set(this.uploadedFiles().length - 1);
      };
      reader.readAsDataURL(file);
    }
  }

  public removeFileIndex(idx: number, evt: Event): void {
    evt.stopPropagation();
    this.uploadedFiles.update(list => list.filter((_, i) => i !== idx));
    const size = this.uploadedFiles().length;
    if (this.activeFileIndex() >= size) {
      this.activeFileIndex.set(Math.max(0, size - 1));
    }
  }

  public selectFileIndex(idx: number): void {
    this.activeFileIndex.set(idx);
  }

  public clearFiles(): void {
    this.uploadedFiles.set([]);
    this.activeFileIndex.set(0);
  }

  public getFileIcon(type: string): string {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audiotrack';
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type === 'application/json') return 'settings_ethernet';
    if (type.startsWith('text/')) return 'description';
    return 'insert_drive_file';
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public getFileTextPreview(file: Base64File): string {
    try {
      const binString = atob(file.base64);
      const dec = new TextDecoder('utf-8').decode(new Uint8Array(binString.length).map((_, idx) => binString.charCodeAt(idx)));
      return dec.length > 3000 ? dec.substring(0, 3000) + '\n\n... [Truncated for preview]' : dec;
    } catch {
      return '[Binary stream could not be decoded to UTF-8 cleartext]';
    }
  }

  public downloadDecodedFile(file: Base64File): void {
    try {
      const binString = atob(file.base64);
      const array = new Uint8Array(binString.length);
      for (let i = 0; i < binString.length; i++) {
        array[i] = binString.charCodeAt(i);
      }
      const blob = new Blob([array], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error('Failed to trigger download file');
    }
  }

  public copyRawBase64(b64: string): void {
    navigator.clipboard.writeText(b64);
  }

  public copyDataUri(uri: string): void {
    navigator.clipboard.writeText(uri);
  }

  // ===================================
  // Tab 3 Validator & Repair
  // ===================================
  public valReport = computed(() => {
    const raw = this.valText();
    if (!raw) return { isValid: true, cleanFormat: true, paddingOk: true, estimatedSize: 0, mimeType: 'NONE', invalidCharacters: [] };

    const cleaned = raw.replace(/\s/g, '');
    const cleanFormat = /^[A-Za-z0-9+/=_-]*$/.test(cleaned);
    const paddingOk = cleaned.length % 4 === 0;

    // Detect invalid individual symbols
    const invalidChars: string[] = [];
    for (const c of raw) {
      if (/[^A-Za-z0-9+/=_-]/.test(c) && !/\s/.test(c)) {
        if (!invalidChars.includes(c)) invalidChars.push(c);
      }
    }

    // Estimate file sizes
    const estimatedSize = Math.floor(cleaned.length * 0.75);

    // Mimetypes guess based on parsed headers signatures
    let mimeType = 'text/plain';
    try {
      let b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const parsedBin = atob(b64);
      const firstByte = parsedBin.charCodeAt(0);
      const secondByte = parsedBin.charCodeAt(1);
      const thirdByte = parsedBin.charCodeAt(2);

      if (firstByte === 0x89 && secondByte === 0x50 && thirdByte === 0x4E) {
        mimeType = 'IMAGE (PNG)';
      } else if (firstByte === 0xFF && secondByte === 0xD8) {
        mimeType = 'IMAGE (JPEG)';
      } else if (firstByte === 0x25 && secondByte === 0x50 && thirdByte === 0x44) {
        mimeType = 'DOCUMENT (PDF)';
      } else if (parsedBin.trim().startsWith('{') || parsedBin.trim().startsWith('[')) {
        mimeType = 'JSON STRUCT';
      }
    } catch {
      // Failed to parse mime signatures
    }

    return {
      isValid: cleanFormat && paddingOk,
      cleanFormat,
      paddingOk,
      estimatedSize,
      mimeType,
      invalidCharacters: invalidChars
    };
  });

  public repairCleanWhitespace(): void {
    const cleaned = this.valText().replace(/[^A-Za-z0-9+/=_-]/g, '');
    this.valText.set(cleaned);
  }

  public repairTrailingPadding(): void {
    let cleaned = this.valText().trim();
    while (cleaned.length % 4) {
      cleaned += '=';
    }
    this.valText.set(cleaned);
  }

  public normalizeUrlSafeToStandardVal(): void {
    let clean = this.valText().replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) {
      clean += '=';
    }
    this.valText.set(clean);
  }

  // ===================================
  // Tab 4 Developer Templates Linking
  // ===================================
  public importFromActiveWorkspace(): void {
    const text = this.inputText();
    if (text) {
      this.templateContent.set(text);
    }
  }

  public copyToClipboard(val: string): void {
    navigator.clipboard.writeText(val);
  }

  public guessMimeType(b64: string): string {
    if (!b64) return 'image/png';
    const cleaned = b64.trim().replace(/\s/g, '');
    try {
      const charStr = atob(cleaned.substring(0, 10));
      const first = charStr.charCodeAt(0);
      const second = charStr.charCodeAt(1);
      if (first === 0x89 && second === 0x50) return 'image/png';
      if (first === 0xFF && second === 0xD8) return 'image/jpeg';
      if (first === 0x25 && second === 0x50) return 'application/pdf';
      if (charStr.startsWith('<svg')) return 'image/svg+xml';
    } catch {
      // Failed to guess exact mime type
    }
    return 'image/png'; // Default fallback image container
  }

  // ===================================
  // Tab 5 JWT Token decoders
  // ===================================
  public jwtReport = computed(() => {
    const token = this.jwtText().trim();
    if (!token) return { parseSuccess: false, headerJson: '', payloadJson: '', expTimes: '' };

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { parseSuccess: false, headerJson: '', payloadJson: '', expTimes: '' };
    }

    try {
      // Decode helper
      const decodePart = (str: string) => {
        let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const binStr = atob(b64);
        return new TextDecoder('utf-8').decode(new Uint8Array(binStr.length).map((_, i) => binStr.charCodeAt(i)));
      };

      const header = JSON.parse(decodePart(parts[0]));
      const payload = JSON.parse(decodePart(parts[1]));

      let expTimes = '';
      if (payload.exp) {
        const d = new Date(payload.exp * 1000);
        expTimes = d.toUTCString();
      }

      return {
        parseSuccess: true,
        headerJson: JSON.stringify(header, null, 2),
        payloadJson: JSON.stringify(payload, null, 2),
        expTimes
      };
    } catch {
      return { parseSuccess: false, headerJson: '', payloadJson: '', expTimes: '' };
    }
  });

  // ===================================
  // Tab 6 Batch bulk operations
  // ===================================
  public onBatchInputChange(val: string): void {
    const rows = val.split('\n');
    const newRows: BatchRow[] = [];

    for (const r of rows) {
      if (!r.trim()) continue;
      try {
        let output = '';
        if (this.batchMode() === 'encode') {
          const bytes = new TextEncoder().encode(r);
          output = this.encodeBytes(bytes);
          if (this.batchFormat() === 'url') {
            output = output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          }
        } else {
          let clean = r.trim().replace(/\s/g, '');
          if (this.batchFormat() === 'url') {
            clean = clean.replace(/-/g, '+').replace(/_/g, '/');
            while (clean.length % 4) clean += '=';
          }
          const decodedBin = atob(clean);
          output = new TextDecoder('utf-8').decode(new Uint8Array(decodedBin.length).map((_, idx) => decodedBin.charCodeAt(idx)));
        }

        newRows.push({
          input: r,
          output,
          status: 'success'
        });
      } catch (err) {
        newRows.push({
          input: r,
          output: 'ERROR',
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Invalid sequence'
        });
      }
    }

    this.batchRows.set(newRows);
  }

  public downloadBatchCsv(): void {
    const lines = ['JSON/Text Input,Converted Outcome'];
    for (const r of this.batchRows()) {
      const inpEsc = `"${r.input.replace(/"/g, '""')}"`;
      const outEsc = `"${r.output.replace(/"/g, '""')}"`;
      lines.push(`${inpEsc},${outEsc}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_base64_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcut bounds listener
  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Check shortcuts
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
      const out = this.outputText();
      if (out) {
        event.preventDefault();
        navigator.clipboard.writeText(out).then(() => {
          this.copySuccess.set(true);
          setTimeout(() => this.copySuccess.set(false), 2000);
        });
      }
    }

    if (event.ctrlKey && event.shiftKey && event.code === 'KeyX') {
      event.preventDefault();
      this.clearInput();
    }

    if (event.altKey && event.code === 'KeyE') {
      event.preventDefault();
      this.textMode.set('encode');
    }

    if (event.altKey && event.code === 'KeyD') {
      event.preventDefault();
      this.textMode.set('decode');
    }
  }
}
