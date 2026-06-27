import { ChangeDetectionStrategy, Component, signal, computed, effect, input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface DOMNode {
  id: string;
  tagName: string;
  nodeType: number; // 1 = Element, 3 = Text
  attributes: { name: string, value: string }[];
  classes: string[];
  children: DOMNode[];
  textContext?: string;
  isExpanded?: boolean;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  category: 'syntax' | 'accessibility' | 'structure';
}

@Component({
  selector: 'app-html-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 select-text text-zinc-100">
      <!-- Upper Tabs Option Selection Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-2 bg-zinc-950 border border-zinc-800 rounded-2xl select-none">
        <div class="flex flex-wrap items-center gap-1.5">
          <button (click)="activeTab.set('playground')"
            [class.bg-zinc-800]="activeTab() === 'playground'"
            [class.text-emerald-400]="activeTab() === 'playground'"
            class="px-4 py-2 text-xs font-mono font-bold rounded-xl text-zinc-400 hover:text-zinc-200 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="text-xs scale-90">preview</mat-icon>
            PLAYGROUND & VIEWER
          </button>
          <button (click)="activeTab.set('editor')"
            [class.bg-zinc-800]="activeTab() === 'editor'"
            [class.text-cyan-400]="activeTab() === 'editor'"
            class="px-4 py-2 text-xs font-mono font-bold rounded-xl text-zinc-400 hover:text-zinc-200 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="text-xs scale-90">code</mat-icon>
            EDIT & CONVERT TOOLS
          </button>
          <button (click)="activeTab.set('seo-preview')"
            [class.bg-zinc-800]="activeTab() === 'seo-preview'"
            [class.text-indigo-400]="activeTab() === 'seo-preview'"
            class="px-4 py-2 text-xs font-mono font-bold rounded-xl text-zinc-400 hover:text-zinc-200 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="text-xs scale-90">devices</mat-icon>
            SEO & SOCIAL PREVIEW
          </button>
        </div>

        <div class="flex items-center gap-2 px-3">
          <span class="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
            Active Workspace: {{ activeTab() | uppercase }}
          </span>
        </div>
      </div>

      <!-- MAIN SPLIT WORKSPACE INTERFACE -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <!-- COLUMN A (LEFT SIDE - CODE CANVAS & UTILITIES) -->
        <!-- Resizing dynamically to 5 columns in split-ready structures, or full block in separate views -->
        <div [class.xl:col-span-6]="!isInputFullScreen()" [class.col-span-12]="isInputFullScreen()" class="space-y-6">
          <div [class]="isInputFullScreen() ? 'fixed inset-4 z-[9999] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[calc(100vh-32px)] shadow-2xl flex flex-col' : 'flex flex-col bg-zinc-900 border border-zinc-805 rounded-2xl overflow-hidden h-[630px] shadow-lg relative'">
            <!-- Editor Title Ribbon & Commands -->
            <div class="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800/80">
              <div class="flex items-center gap-2 font-mono">
                <span class="p-1 px-2 text-[10px] bg-zinc-800 text-zinc-300 rounded font-mono font-bold tracking-wide flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LOCAL HTML SOURCE
                </span>
                <span class="text-[11px] font-mono text-zinc-500 font-semibold hidden md:inline">UTF-8 File Workspace</span>
              </div>

              <!-- Top Quick actions inside editor frame bar -->
              <div class="flex items-center gap-2">
                <button (click)="triggerFileInput()"
                  class="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all duration-150 flex items-center gap-1 text-[11px] font-mono font-bold border border-transparent hover:border-zinc-700 cursor-pointer"
                  title="Upload / Open Local HTML File">
                  <mat-icon class="scale-90 text-zinc-400">file_upload</mat-icon>
                  OPEN FILE
                </button>
                <input #fileInputEl type="file" accept=".html,.htm,.txt" class="hidden" (change)="onFileSelected($event)" />
                <button (click)="beautifyHTML()"
                  class="p-1.5 hover:bg-zinc-800 text-zinc-450 hover:text-emerald-400 rounded-lg transition-all duration-150 flex items-center gap-1 text-[11px] font-mono font-bold cursor-pointer"
                  title="Pretty print HTML structure (Ctrl+S)">
                  <mat-icon class="scale-90">format_align_left</mat-icon>
                  PRETTY PRINT
                </button>

                <button (click)="clearCode()"
                  class="p-1.5 hover:bg-zinc-900/85 hover:text-rose-450 text-zinc-500 rounded-lg transition-all duration-150 flex items-center gap-1 text-[11px] font-mono font-bold cursor-pointer"
                  title="Clear source code from buffer">
                  <mat-icon class="scale-75">clear</mat-icon>
                  CLEAR
                </button>

                <button (click)="isInputFullScreen.set(!isInputFullScreen())"
                  class="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all duration-150 flex items-center gap-1 text-[11px] font-mono font-bold border border-transparent hover:border-zinc-700 cursor-pointer"
                  [title]="isInputFullScreen() ? 'Exit Full Screen' : 'Full Screen View'">
                  <mat-icon class="scale-90">{{ isInputFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                  {{ isInputFullScreen() ? 'EXIT' : 'FULL' }}
                </button>
              </div>
            </div>

            <!-- Drag & Drop Zone Covering Editor Body -->
            <div class="flex-1 flex overflow-hidden relative select-text" (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
              [class.bg-emerald-950/20]="isDraggingOver()"
              [class.border-2]="isDraggingOver()"
              [class.border-dashed]="isDraggingOver()"
              [class.border-emerald-500/55]="isDraggingOver()"
            >
              @if (isDraggingOver()) {
                <div class="absolute inset-0 z-40 bg-zinc-950/80 pointer-events-none flex flex-col items-center justify-center text-center space-y-4">
                  <mat-icon class="text-4xl text-emerald-400 animate-bounce">backup</mat-icon>
                  <p class="font-mono text-sm text-emerald-400 font-bold">Release to Import HTML Markup instantly</p>
                  <p class="text-xs text-zinc-500">Supports direct drag-and-drop of web layout files</p>
                </div>
              }

              <!-- Editor Finder search bar overlay -->
              @if (showSearchOverlay()) {
                <div class="absolute top-2 right-4 z-35 p-3 border border-zinc-800 bg-zinc-950/95 rounded-xl shadow-2xl flex items-center gap-2 flex-wrap">
                  <div class="flex items-center bg-zinc-90 w-44 rounded-lg px-2 py-1 border border-zinc-850">
                    <input #findInput type="text" [formControl]="findControl" placeholder="Find characters..."
                      class="bg-transparent text-xs text-white border-none outline-none w-full"/>
                  </div>
                  <div class="flex items-center bg-zinc-90 w-44 rounded-lg px-2 py-1 border border-zinc-850">
                    <input type="text" [formControl]="replaceControl" placeholder="Replace with..."
                      class="bg-transparent text-xs text-white border-none outline-none w-full"/>
                  </div>
                  <div class="flex items-center gap-1">
                    <button (click)="performFindNext()"
                      class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold rounded cursor-pointer"
                      title="Locate instances">
                      FIND
                    </button>
                    <button (click)="performReplace()"
                      class="px-2 py-1 bg-zinc-850 hover:bg-zinc-750 text-[10px] font-mono font-bold rounded cursor-pointer"
                      title="Replace occurrence">
                      REP
                    </button>
                    <button (click)="performReplaceAll()"
                      class="px-2 py-1 bg-emerald-900/50 hover:bg-emerald-850 hover:text-emerald-300 text-[10px] font-mono font-bold rounded cursor-pointer"
                      title="Replace all">
                      ALL
                    </button>
                    <button (click)="showSearchOverlay.set(false)"
                      class="p-1 hover:bg-zinc-800 text-zinc-450 rounded-md cursor-pointer">
                      <mat-icon class="scale-75">close</mat-icon>
                    </button>
                  </div>
                </div>
              }

              <!-- Dynamic Code Gutter Line List Column -->
              <div #gutterElement
                class="w-12 bg-zinc-950/70 border-r border-zinc-850/80 flex flex-col pt-4 overflow-hidden select-none">
                @for (num of lineNumbers(); track num) {
                  <div class="text-[10px] text-zinc-650 font-mono text-right pr-2 leading-[20px] h-[20px] select-none">
                    {{ num }}
                  </div>
                }
              </div>

              <!-- Pure Editable Code Editor Area -->
              <textarea #codeEditorEl [value]="htmlCode()" (input)="onCodeChange($event)" (keydown)="onKeydown($event)"
                (keyup)="onKeyup($event)" (scroll)="onScroll($event, gutterElement)" placeholder="Type or paste html structure here..."
                class="flex-1 w-full p-4 pt-4 text-xs font-mono bg-zinc-900 text-zinc-100 placeholder-zinc-600 border-none outline-none resize-none focus:ring-0 leading-[20px] overflow-y-auto select-all selection:bg-emerald-800/40"
              ></textarea>
            </div>

            <!-- Footer Meta Ribbon -->
            <div class="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-850/85 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500 gap-2 select-none">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1"><span class="text-zinc-650">Lines:</span> {{ lineNumbers().length }}</span>
                <span class="flex items-center gap-1"><span class="text-zinc-650">Bytes:</span> {{ htmlCode().length }}B</span>
                @if (validationIssues().length > 0) {
                  <button type="button" (click)="activeTab.set('editor')"
                    class="flex items-center gap-1 cursor-pointer hover:text-amber-400 bg-transparent border-none p-0 text-[11px] font-mono text-zinc-500 outline-none cursor-pointer">
                    <mat-icon class="text-[11px] h-3 w-3 text-amber-500 align-middle">warning</mat-icon>
                    {{ validationIssues().length }} warnings
                  </button>
                } @else {
                  <span class="flex items-center gap-1 text-emerald-500 font-bold">
                    <mat-icon class="text-[11px] h-3 w-3 align-middle">check_circle</mat-icon>
                    DOM Compliant
                  </span>
                }
              </div>
              <div class="flex items-center gap-2.5">
                <button (click)="showSearchOverlay.set(!showSearchOverlay())"
                  class="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 rounded flex items-center gap-1 transition-all duration-150 cursor-pointer"
                  title="Search and Replace occurrences">
                  <mat-icon class="scale-75 text-zinc-400">search</mat-icon> Find/Rep
                </button>
                <button (click)="downloadHTMLFile()"
                  class="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 rounded flex items-center gap-1 transition-all duration-150 cursor-pointer"
                  title="Save locally">
                  <mat-icon class="scale-75 text-zinc-400">download</mat-icon> Save .html
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Console Warnings and Dynamic Validation List -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-4">
            <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-550 flex items-center gap-1">
              <mat-icon class="scale-75 text-amber-500 align-middle">playlist_add_check</mat-icon>
              INTEGRITY AUDITOR & COMPLIANCE PARSER
            </span>

            @if (validationIssues().length === 0) {
              <div class="flex items-center gap-3 p-4 bg-emerald-950/15 border border-emerald-900/35 rounded-xl text-emerald-450 text-xs">
                <mat-icon class="text-lg">verified_user</mat-icon>
                <div>
                  <p class="font-bold">Static Verification Successful!</p>
                  <p class="text-[11px] text-zinc-400">No invalid tags, unclosed quotes, or structural WCAG errors found in active sandbox memory.</p>
                </div>
              </div>
            } @else {
              <div class="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                @for (issue of validationIssues(); track issue.message) {
                  <div [class.border-rose-900/40]="issue.type === 'error'"
                    [class.bg-rose-950/10]="issue.type === 'error'"
                    [class.border-amber-900/40]="issue.type === 'warning'"
                    [class.bg-amber-950/10]="issue.type === 'warning'"
                    class="p-3 border rounded-xl flex items-start gap-2.5 text-xs transition duration-150"
                  >
                    <mat-icon [class.text-rose-500]="issue.type === 'error'"
                      [class.text-amber-500]="issue.type === 'warning'"
                      class="scale-90 shrink-0 mt-0.5"
                    >
                      {{ issue.type === 'error' ? 'cancel' : 'warning' }}
                    </mat-icon>
                    <div class="space-y-0.5 flex-1 p-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-zinc-200 leading-tight">{{ issue.message }}</span>
                        <span [class.bg-rose-950/40]="issue.type === 'error'"
                          [class.text-rose-450]="issue.type === 'error'"
                          [class.bg-amber-950/40]="issue.type === 'warning'"
                          [class.text-amber-450]="issue.type === 'warning'"
                          class="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border border-current"
                        >
                          {{ issue.category | uppercase }}
                        </span>
                      </div>
                      @if (issue.element) {
                        <p class="text-[10px] font-mono text-zinc-500 select-all">Snippet: <code class="bg-zinc-950 px-1 py-0.5 rounded text-zinc-400">{{ issue.element }}</code></p>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- COLUMN B (RIGHT SIDE - PREVIEW MODES) -->
        <div class="xl:col-span-6 space-y-6">
          <!-- TAB SECTION 1: PLAYGROUND & VIEW DISPLAY -->
          @if (activeTab() === 'playground') {
            <div class="space-y-6">
              <!-- Responsive devices bar & features -->
              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <!-- Screen profile modes selection -->
                <div class="flex items-center bg-zinc-950 rounded-xl p-1 border border-zinc-800/80">
                  <button (click)="previewWidth.set('100%')"
                    [class.bg-zinc-800]="previewWidth() === '100%'"
                    [class.text-emerald-400]="previewWidth() === '100%'"
                    class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    title="Liquid width preview dashboard">
                    <mat-icon class="scale-75">desktop_windows</mat-icon>
                    DESKTOP (100%)
                  </button>
                  <button (click)="previewWidth.set('768px')"
                    [class.bg-zinc-800]="previewWidth() === '768px'"
                    [class.text-indigo-400]="previewWidth() === '768px'"
                    class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    title="Simulate medium tablet view port">
                    <mat-icon class="scale-75">tablet_mac</mat-icon>
                    TABLET (768px)
                  </button>
                  <button (click)="previewWidth.set('375px')"
                    [class.bg-zinc-800]="previewWidth() === '375px'"
                    [class.text-purple-400]="previewWidth() === '375px'"
                    class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    title="Simulate mobile device layout">
                    <mat-icon class="scale-75">phone_iphone</mat-icon>
                    MOBILE (375px)
                  </button>
                </div>

                <!-- Sandbox switches -->
                <div class="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap select-none">
                  <label class="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
                    <input type="checkbox" [checked]="enableScripts()"(change)="onScriptToggleChange($event)"
                      class="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"/>
                    <span>SCRIPTS (JS)</span>
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
                    <input type="checkbox" [checked]="enableCSSFrameworks()" (change)="enableCSSFrameworks.set(!enableCSSFrameworks())"
                      class="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"/>
                    <span>TAILWIND CDN</span>
                  </label>
                </div>
              </div>

              <!-- Live Sandboxed Frame Container -->
              <div [class]="isOutputFullScreen() ? 'fixed inset-4 z-[9999] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[calc(100vh-32px)] shadow-2xl flex flex-col' : 'flex flex-col bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden h-[545px] shadow-lg relative'">
                <!-- Render panel header -->
                <div class="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span class="text-xs font-semibold text-zinc-400 font-mono">ISOLATED RENDER PREVIEW</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button (click)="isOutputFullScreen.set(!isOutputFullScreen())"
                      class="p-1 hover:bg-zinc-805 rounded-lg text-zinc-400 hover:text-white transition-all duration-150 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                      [title]="isOutputFullScreen() ? 'Exit Full Screen' : 'Full Screen View'">
                      <mat-icon class="scale-75">{{ isOutputFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                      {{ isOutputFullScreen() ? 'EXIT' : 'FULL' }}
                    </button>
                    <span class="px-2 py-0.5 text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono rounded">
                      Viewport: {{ previewWidth() === '100%' ? 'Liquid (Full Width)' : previewWidth() }}
                    </span>
                    <button (click)="refreshIframe()"
                      class="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all duration-150 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                      title="Reload sandbox window">
                      <mat-icon class="scale-75">sync</mat-icon>
                      REFRESH
                    </button>
                  </div>
                </div>

                <!-- Resizable Device Body -->
                <div class="flex-1 bg-zinc-950 flex justify-center items-center overflow-auto p-4 relative">
                  <!-- Responsive frame container simulation wrapper -->
                  <div [style.width]="previewWidth()"
                    [class.border]="previewWidth() !== '100%'"
                    [class.border-zinc-750]="previewWidth() !== '100%'"
                    [class.rounded-2xl]="previewWidth() !== '100%'"
                    [class.shadow-2xl]="previewWidth() !== '100%'"
                    class="h-full bg-white transition-all duration-350 relative flex flex-col min-w-[320px] max-w-full">
                    <!-- Device physical notch simulated top line -->
                    @if (previewWidth() !== '100%') {
                      <div class="w-full bg-zinc-900 py-1.5 border-b border-zinc-800 flex justify-center items-center gap-1 rounded-t-2xl shrink-0">
                        <span class="w-2 h-2 rounded-full bg-zinc-700"></span>
                        <span class="w-10 h-1 rounded-full bg-zinc-700"></span>
                      </div>
                    }

                    <div class="flex-1 w-full relative bg-white">
                      <iframe #previewIframe
                        sandbox="allow-popups-to-escape-sandbox allow-forms allow-pointer-lock allow-same-origin allow-downloads"
                        class="absolute inset-0 w-full h-full bg-white border-none select-text"></iframe>
                    </div>

                    <!-- Device physical bottom layout line -->
                    @if (previewWidth() !== '100%') {
                      <div class="w-full bg-zinc-900 py-1.5 border-t border-zinc-800 flex justify-center items-center rounded-b-2xl shrink-0 select-none">
                        <span class="w-4 h-4 rounded-full border border-zinc-700"></span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Interactive DOM Inspector & Attribute Drawer -->
              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
                  <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-450 flex items-center gap-1">
                    <mat-icon class="scale-75 text-purple-400">layers</mat-icon>
                    DOM TREE TRAVERSAL & INLINE ATTRIBUTES DEBUGGER
                  </span>
                  <p class="text-[11px] text-zinc-500 font-mono">Click node tag to inspect attributes</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <!-- Node Tree (Left 3 cols) -->
                  <div class="md:col-span-3 border border-zinc-800 rounded-xl p-3 bg-zinc-950 max-h-[220px] overflow-y-auto font-mono text-[11px] space-y-1">
                    @if (domTreeNodes().length === 0) {
                      <div class="text-zinc-650 p-4 text-center">No elements detected on active root frame.</div>
                    } @else {
                      @for (node of domTreeNodes(); track node.id) {
                        <div class="space-y-1">
                          <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: node, depth: 0 }"></ng-container>
                        </div>
                      }
                    }
                  </div>

                  <!-- Attributes inspector and modification drawer (Right 2 cols) -->
                  <div class="md:col-span-2 border border-zinc-805 bg-zinc-950/40 rounded-xl p-4 space-y-4 text-xs font-mono">
                    <div class="border-b border-zinc-850 pb-2">
                      <p class="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Active Element Selection</p>
                      @if (selectedDOMNode()) {
                        <p class="text-xs font-bold text-emerald-400 font-mono mb-1">&lt;{{ selectedDOMNode()?.tagName }}&gt;</p>
                        <p class="text-[10px] text-zinc-500">ID: {{ selectedDOMNode()?.id }}</p>
                      } @else {
                        <p class="text-zinc-600 italic">No selection</p>
                      }
                    </div>

                    @if (selectedDOMNode()) {
                      <div class="space-y-3">
                        <!-- Attribute additions form inputs -->
                        <div class="space-y-2">
                          <p class="text-[10px] text-zinc-400 font-bold uppercase">Insert Attribute</p>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <input #attrNameInput type="text" placeholder="Name"
                              class="bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] rounded flex-1 min-w-[40px] text-zinc-200 outline-none"/>
                            <input #attrValueInput type="text" placeholder="Value" 
                              class="bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] rounded flex-1 min-w-[40px] text-zinc-200 outline-none"/>
                            <button (click)="addNodeAttribute(selectedDOMNode()?.id || '', attrNameInput, attrValueInput)"
                              class="px-2 py-1 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 hover:text-white border border-emerald-900/40 rounded font-bold text-[10px] cursor-pointer">
                              ADD
                            </button>
                          </div>
                        </div>

                        <!-- Active Attribute Values List -->
                        <div class="space-y-1.5">
                          <p class="text-[10px] text-zinc-400 font-bold uppercase">Mutable Parameters</p>
                          @if ((selectedDOMNode()?.attributes ?? []).length === 0) {
                            <p class="text-zinc-650 italic text-[10px]">No parameters configured</p>
                          } @else {
                            <div class="space-y-1 select-text max-h-[100px] overflow-y-auto">
                              @for (attr of selectedDOMNode()?.attributes; track attr.name) {
                                <div class="flex items-center justify-between text-[11px] bg-zinc-900/60 p-1 px-2 rounded border border-zinc-850">
                                  <span class="text-zinc-350"><span class="text-indigo-400">{{ attr.name }}</span>="{{ attr.value }}"</span>
                                  <button (click)="removeNodeAttribute(selectedDOMNode()?.id || '', attr.name)"
                                    class="text-rose-500 hover:text-rose-450 p-0.5 cursor-pointer"
                                    title="Strips attribute">
                                    <mat-icon class="text-xs scale-75 h-3.5 w-3.5">delete_outline</mat-icon>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    } @else {
                      <div class="text-zinc-600 text-center py-6">
                        <mat-icon class="text-zinc-700 block mb-1">touch_app</mat-icon>
                        <p class="text-[11px]">Select any tag link inside DOM list on the left to review inline styles, attributes vectors, and classes lists.</p>
                      </div>
                    }

                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB SECTION 2: EDITING & CONVERTERS -->
          @if (activeTab() === 'editor') {
            <div class="space-y-6">
              <!-- Transpilers Panel with active actions -->
              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-4">
                <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-450 flex items-center gap-1">
                  <mat-icon class="scale-75 text-cyan-400">sync</mat-icon>
                  HTML TRANSPILIATION & FORMAT CONVERSIONS
                </span>

                <!-- Converters choice triggers -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-zinc-800 pb-4">
                  <button (click)="activeConversion.set('jsx')"
                    [class.border-cyan-500]="activeConversion() === 'jsx'"
                    [class.bg-cyan-950/20]="activeConversion() === 'jsx'"
                    [class.text-cyan-400]="activeConversion() === 'jsx'"
                    class="p-2 border border-zinc-800 bg-zinc-950 rounded-xl text-center font-mono font-bold text-xs text-zinc-400 transition hover:text-white"
                  >
                    HTML TO JSX
                  </button>
                  <button (click)="activeConversion.set('angular')"
                    [class.border-rose-500]="activeConversion() === 'angular'"
                    [class.bg-rose-950/20]="activeConversion() === 'angular'"
                    [class.text-rose-450]="activeConversion() === 'angular'"
                    class="p-2 border border-zinc-800 bg-zinc-950 rounded-xl text-center font-mono font-bold text-xs text-zinc-400 transition hover:text-white cursor-pointer"
                  >
                    TO ANGULAR
                  </button>
                  <button (click)="activeConversion.set('markdown')"
                    [class.border-indigo-500]="activeConversion() === 'markdown'"
                    [class.bg-indigo-950/20]="activeConversion() === 'markdown'"
                    [class.text-indigo-400]="activeConversion() === 'markdown'"
                    class="p-2 border border-zinc-800 bg-zinc-950 rounded-xl text-center font-mono font-bold text-xs text-zinc-400 transition hover:text-white cursor-pointer"
                  >
                    TO MARKDOWN
                  </button>
                  <button (click)="activeConversion.set('entity')"
                    [class.border-amber-500]="activeConversion() === 'entity'"
                    [class.bg-amber-950/20]="activeConversion() === 'entity'"
                    [class.text-amber-400]="activeConversion() === 'entity'"
                    class="p-2 border border-zinc-800 bg-zinc-950 rounded-xl text-center font-mono font-bold text-xs text-zinc-400 transition hover:text-white cursor-pointer"
                  >
                    ENTITIES BOX
                  </button>
                </div>

                <!-- Live conversion output screen wrapper -->
                <div [class]="isConvertedFullScreen() ? 'fixed inset-4 z-[9999] bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden h-[calc(100vh-32px)] shadow-2xl flex flex-col' : 'flex flex-col h-[400px] bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden relative'">
                  <div class="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-zinc-850">
                    <span class="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider">
                      CONVERTED OUTLET: {{ activeConversion() | uppercase }}
                    </span>
                    <div class="flex items-center gap-2">
                      @if (convertedOutput()) {
                        <button (click)="copyConverted()"
                          class="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/35 border border-emerald-950 rounded transition font-mono flex items-center gap-1 cursor-pointer">
                          <mat-icon class="scale-75">{{ copySuccessConverted() ? 'check' : 'content_copy' }}</mat-icon>
                          {{ copySuccessConverted() ? 'COPIED!' : 'COPY' }}
                        </button>
                      }
                      <button (click)="isConvertedFullScreen.set(!isConvertedFullScreen())"
                        class="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-805 rounded transition font-mono flex items-center gap-1 cursor-pointer"
                        [title]="isConvertedFullScreen() ? 'Exit Full Screen' : 'Full Screen View'">
                        <mat-icon class="scale-75">{{ isConvertedFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                        {{ isConvertedFullScreen() ? 'EXIT' : 'FULL' }}
                      </button>
                    </div>
                  </div>

                  <div class="flex-1 w-full p-4 overflow-auto font-mono text-xs select-all text-zinc-300">
                    @if (!htmlCode()) {
                      <div class="h-full flex flex-col items-center justify-center text-zinc-600 text-center space-y-1">
                        <mat-icon class="text-2xl">compare_arrows</mat-icon>
                        <p class="text-[11px]">Paste or write standard markup in the editor on the left column to review converted transpiler results.</p>
                      </div>
                    } @else {
                      <pre class="whitespace-pre-wrap leading-relaxed select-all">{{ convertedOutput() }}</pre>
                    }
                  </div>
                </div>

                <!-- Utilities Compression bar actions -->
                <div class="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3">
                  <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 block">
                    COMPRESSION, COMPACTING & ENCODING OPERATIONS
                  </span>
                  <div class="flex flex-wrap items-center gap-3">
                    <button (click)="minifyHTML()"
                      class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-semibold rounded-lg text-zinc-350 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                      title="Collapse spaces, strip comments, compress markup structure">
                      <mat-icon class="scale-75 text-zinc-400">zoom_in_map</mat-icon>
                      MINIFY MARKUP
                    </button>
                    <button (click)="encodeEntities()"
                      class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-semibold rounded-lg text-zinc-350 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
                      <mat-icon class="scale-75 text-zinc-400">font_download</mat-icon>
                      ENCODE ALL ENTITIES
                    </button>
                    <button (click)="decodeEntities()"
                      class="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-semibold rounded-lg text-zinc-350 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
                      <mat-icon class="scale-75 text-zinc-400">text_fields</mat-icon>
                      DECODE ENTITIES
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB SECTION 3: SEO PREVIEWS -->
          @if (activeTab() === 'seo-preview') {
            <div class="space-y-6">
              <!-- Social Media card simulators -->
              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-5">
                <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 flex items-center gap-1">
                  <mat-icon class="scale-75 text-indigo-400">travel_explore</mat-icon>
                  SEO SNIPPET & OPEN GRAPH CARDS SIMULATOR
                </span>

                <!-- 1. Google Snippet preview -->
                <div class="space-y-2.5">
                  <span class="text-[9px] uppercase font-mono font-bold text-zinc-550 block select-none">GOOGLE SEARCH MOBILE SNIPPET</span>
                  <div class="p-4 bg-white border border-zinc-200 rounded-xl max-w-lg select-text text-left font-sans">
                    <div class="text-[11px] text-[#202124] flex items-center gap-1.5 mb-1.5">
                      <span class="bg-zinc-100 p-1.5 rounded-full inline-block leading-none"><mat-icon class="text-xs scale-75 text-zinc-600">language</mat-icon></span>
                      <div class="leading-tight">
                        <p class="font-bold text-xs">devsight.dev</p>
                        <p class="text-[10px] text-zinc-650">https://devsight.dev &larr; sandbox</p>
                      </div>
                    </div>
                    <!-- Title tag output -->
                    <h3 class="text-lg text-[#1a0dab] hover:underline cursor-pointer leading-tight mb-1 font-medium font-sans">
                      {{ seoTitle() || 'Priscilla-Dev Developer Sandbox Space' }}
                    </h3>
                    <!-- Meta description output -->
                    <p class="text-[11px] text-[#4d5156] leading-relaxed select-text font-sans">
                      {{ seoDescription() || 'An aesthetic full-stack offline simulation environment. Design clean and responsive markup with interactive sidecar inspectors and custom code parameters.' }}
                    </p>
                  </div>
                </div>

                <!-- 2. Facebook Open Graph card preview -->
                <div class="space-y-2.5">
                  <span class="text-[9px] uppercase font-mono font-bold text-zinc-550 block select-none">FACEBOOK BRANDED SOCIAL CARD</span>
                  <div class="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden max-w-md select-text font-sans">
                    <div class="w-full h-[180px] bg-zinc-850 relative overflow-hidden flex justify-center items-center">
                      @if (seoImage()) {
                        <img [src]="seoImage()" referrerpolicy="no-referrer" alt="Extracted SEO banner image" class="absolute inset-0 w-full h-full object-cover" />
                      } @else {
                        <div class="text-zinc-600 flex flex-col items-center justify-center space-y-1">
                          <mat-icon class="text-3xl text-zinc-700">image</mat-icon>
                          <p class="text-[10px]">No og:image property detected on header</p>
                        </div>
                      }
                    </div>
                    <div class="p-3 border-t border-zinc-850 space-y-1 bg-zinc-950">
                      <p class="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wide">devsight.DEV</p>
                      <h4 class="text-xs font-bold text-white leading-snug truncate">{{ seoTitle() || 'Workspace Default Sandbox Title' }}</h4>
                      <p class="text-[10px] text-zinc-450 leading-relaxed line-clamp-2">{{ seoDescription() || 'A detailed preview metadata description compiled dynamically in local browser space.' }}</p>
                    </div>
                  </div>
                </div>

                <!-- 3. Json-LD Structural validator schema lists -->
                <div class="space-y-2.5 bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                  <span class="text-[9px] uppercase font-mono font-semibold text-zinc-500 block select-none">STRUCTURED JSON-LD SCHEMAS AUDITOR</span>
                  @if (structuredSchemas().length === 0) {
                    <p class="text-[11px] text-zinc-650 italic">No structured &lt;script type="application/ld+json"&gt; schemas found inside content header.</p>
                  } @else {
                    <div class="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      @for (schema of structuredSchemas(); track schema) {
                        <pre class="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[10px] text-indigo-300 overflow-x-auto select-all selection:bg-indigo-900/40">{{ schema }}</pre>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }

        </div>
      </div>
    </div>

    <!-- Template helper node representation recursively rendering components -->
    <ng-template #nodeTemplate let-node let-depth="depth">
      <!-- Tag row header element line -->
      <div role="button" tabindex="0"
        (click)="selectNode(node); $event.stopPropagation()"
        (keydown.enter)="selectNode(node); $event.stopPropagation()"
        (mouseenter)="highlightInIframe(node.id)"
        (mouseleave)="highlightInIframe('')"
        [style.padding-left.px]="depth * 14"
        [class.bg-zinc-800/45]="selectedDOMNode()?.id === node.id"
        class="group p-1 leading-relaxed rounded flex items-center justify-between cursor-pointer hover:bg-zinc-850 transition duration-150 relative truncate outline-none"
      >
        <div class="flex items-center gap-1.5 truncate">
          @if (node.children && node.children.length > 0) {
            <mat-icon 
              (click)="node.isExpanded = !node.isExpanded; $event.stopPropagation()"
              class="text-zinc-600 group-hover:text-zinc-350 scale-75 cursor-pointer selection:hidden"
            >
              {{ node.isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}
            </mat-icon>
          } @else {
            <span class="w-3.5 inline-block"></span>
          }

          @if (node.tagName === '#text') {
            <span class="text-zinc-550 leading-none">"</span>
            <span class="text-zinc-500 italic select-text truncate max-w-[130px] leading-none">{{ node.textContext }}</span>
            <span class="text-zinc-550 leading-none">"</span>
          } @else {
            <!-- Opening chevron tag names colors -->
            <span class="text-zinc-600 font-normal leading-none">&lt;</span>
            <span class="text-emerald-400 font-bold leading-none">{{ node.tagName }}</span>
            <!-- Quick ID/Class badging info -->
            @for (attr of node.attributes; track attr.name) {
              @if (attr.name === 'id') {
                <span class="text-amber-400 text-[9px] font-bold leading-none">#{{ attr.value }}</span>
              }
              @if (attr.name === 'class' && attr.value) {
                <span class="text-indigo-400 text-[9px] font-semibold leading-none shrink-0 truncate max-w-[65px] h-3 px-1 rounded bg-indigo-950/40 border border-indigo-900/30">.{{ attr.value.split(' ')[0] }}</span>
              }
            }
            <span class="text-zinc-600 font-normal leading-none">&gt;</span>
          }
        </div>

        <!-- Float indicators -->
        <span class="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 font-mono transition-opacity shrink-0">
          SELECT
        </span>
      </div>

      <!-- If children exist and are expanded, render recursively -->
      @if (node.isExpanded && node.children && node.children.length > 0) {
        @for (child of node.children; track child.id) {
          <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: child, depth: depth + 1 }"></ng-container>
        }
        <!-- Render ending tag footer alignment -->
        @if (node.tagName !== '#text') {
          <div [style.padding-left.px]="(depth * 14) + 14"
            class="text-zinc-650 leading-relaxed select-none pointer-events-none">
            &lt;/{{ node.tagName }}&gt;
          </div>
        }
      }
    </ng-template>
  `,
  styles: [`
    textarea::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    textarea::-webkit-scrollbar-track {
      background: transparent;
    }
    textarea::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 10px;
    }
    textarea::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `]
})
export class HtmlViewerComponent implements AfterViewInit, OnChanges {
  public mode = input<string>('html-viewer');
  // Interactive core source signals
  public htmlCode = signal<string>('');
  // Full screen view toggles
  public isInputFullScreen = signal<boolean>(false);
  public isOutputFullScreen = signal<boolean>(false);
  public isConvertedFullScreen = signal<boolean>(false);
  // Tab states layout
  public activeTab = signal<'playground' | 'editor' | 'seo-preview'>('playground');
  // Custom Viewport parameters
  public previewWidth = signal<string>('100%');
  public enableScripts = signal<boolean>(false);
  public enableCSSFrameworks = signal<boolean>(true);

  // Drag controls
  public isDraggingOver = signal<boolean>(false);

  // Search/Replace overlay signals
  public showSearchOverlay = signal<boolean>(false);
  public findControl = new FormControl<string>('');
  public replaceControl = new FormControl<string>('');

  // DOM node signals
  public domTreeNodes = signal<DOMNode[]>([]);
  public selectedDOMNode = signal<DOMNode | null>(null);

  // Formatting clipboard signals
  public copySuccess = signal<boolean>(false);
  public copySuccessConverted = signal<boolean>(false);

  // Converters signals
  public activeConversion = signal<'jsx' | 'angular' | 'markdown' | 'entity'>('jsx');

  // IFrame view ref binder
  @ViewChild('previewIframe') previewIframe!: ElementRef<HTMLIFrameElement>;
  @ViewChild('codeEditorEl') codeEditorEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInputEl') fileInputEl!: ElementRef<HTMLInputElement>;

  constructor() {
    // Standard starting template content
    this.htmlCode.set(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elegant devsight Web Portal</title>
  <!-- SEO & Social Meta Configuration -->
  <meta name="description" content="A pristine sandbox portal simulated with modern structural design parameters.">
  <meta property="og:title" content="devsight Sandbox Portal">
  <meta property="og:description" content="Explore advanced developer utilities running entirely offline and secure in sandboxed browser memory.">
  <meta property="og:image" content="https://picsum.photos/seed/devsight/1200/630">
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "devsight Tools",
      "url": "https://devsight.dev"
    }
  </script>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #0c0a09;
      color: #e4e4e7;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: linear-gradient(135deg, #1c1917, #0c0a09);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8);
      transition: transform 0.3s ease, border-color 0.3s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: #10b981;
    }
    h1 {
      color: #10b981;
      margin-top: 0;
      font-size: 2rem;
      letter-spacing: -0.025em;
      font-weight: 800;
    }
    p {
      line-height: 1.6;
      color: #a1a1aa;
      font-size: 0.9rem;
    }
    .btn {
      background-color: #10b981;
      color: #09090b;
      font-weight: 700;
      border: none;
      padding: 10px 24px;
      border-radius: 9999px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: box-shadow 0.3s, transform 0.2s;
    }
    .btn:hover {
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>devsight Interactive</h1>
    <p>Welcome to your isolated layout simulator canvas. Start typing standard HTML directly in your workspace panel, explore live responsive viewports, inspect attributes, or translate markup elements instantly.</p>
    <button class="btn" onclick="alert('Sandbox iframe execution validated successfully!')">Explore Workbench</button>
  </div>
</body>
</html>`);

    // Dynamic Effect: Update preview render and parsed DOM tree automatically as code mutate
    effect(() => {
      const code = this.htmlCode();
      this.refreshIframe();
      this.recomputeDOMTree(code);
    });

    // Dynamic Effect: Sync CSS Framework toggle trigger
    effect(() => {
      this.enableCSSFrameworks(); // subscribe
      this.refreshIframe();
    });
  }

  // Intercept route mode mutations
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && changes['mode'].currentValue) {
      this.activeTab.set('playground');
    }
  }

  ngAfterViewInit(): void {
    this.refreshIframe();
  }

  // Sync scroll listeners
  public onScroll(event: Event, gutterEl: HTMLDivElement): void {
    const textarea = event.target as HTMLTextAreaElement;
    gutterEl.scrollTop = textarea.scrollTop;
  }

  // Character updates
  public onCodeChange(event: Event): void {
    const elem = event.target as HTMLTextAreaElement;
    this.htmlCode.set(elem.value);
  }

  // Dynamic Gutter Counts calculation
  public lineNumbers = computed(() => {
    const lineCount = this.htmlCode().split('\n').length;
    return Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);
  });

  // Action: Clear Editor
  public clearCode(): void {
    this.htmlCode.set('');
    if (this.codeEditorEl) {
      this.codeEditorEl.nativeElement.value = '';
    }
  }

  // Safe manual file loading
  public triggerFileInput(): void {
    this.fileInputEl?.nativeElement.click();
  }

  public onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          this.htmlCode.set(text);
          if (this.codeEditorEl) {
            this.codeEditorEl.nativeElement.value = text;
          }
        }
      };
      reader.readAsText(file);
    }
  }

  // Drag overlays
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
  }

  public onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          this.htmlCode.set(text);
          if (this.codeEditorEl) {
            this.codeEditorEl.nativeElement.value = text;
          }
        }
      };
      reader.readAsText(file);
    }
  }

  // Native Tag Closures and Indentation triggers inside keyboard controls
  public onKeydown(event: KeyboardEvent): void {
    const textarea = this.codeEditorEl?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Standard tab spaces indent
    if (event.key === 'Tab') {
      event.preventDefault();
      const val = textarea.value;
      textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this.htmlCode.set(textarea.value);
    }

    // Ctrl+S formatting trigger
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.beautifyHTML();
    }
  }

  // Listen to angle closure key to trigger autotag creation
  public onKeyup(event: KeyboardEvent): void {
    const textarea = this.codeEditorEl?.nativeElement;
    if (!textarea) return;

    if (event.key === '>') {
      const start = textarea.selectionStart;
      const val = textarea.value;

      const textBefore = val.substring(0, start);
      const tagMatch = textBefore.match(/<([a-zA-Z0-9_\-:]+)(?:\s+[^>]*?)?>$/);
      if (tagMatch) {
        const tagName = tagMatch[1];
        const singleTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        if (!singleTags.includes(tagName.toLowerCase())) {
          const closingTag = `</${tagName}>`;
          textarea.value = val.substring(0, start) + closingTag + val.substring(start);
          textarea.selectionStart = textarea.selectionEnd = start;
          this.htmlCode.set(textarea.value);
        }
      }
    }
  }

  // Script Toggles
  public onScriptToggleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.enableScripts.set(target.checked);
    this.refreshIframe();
  }

  // Local compilation sandbox reload
  public refreshIframe(): void {
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe) return;

    // Determine sandbox permission flags
    let sandboxVal = "allow-popups-to-escape-sandbox allow-forms allow-pointer-lock allow-same-origin allow-downloads";
    if (this.enableScripts()) {
      sandboxVal += " allow-scripts animate-bezier";
    }
    iframe.setAttribute('sandbox', sandboxVal);

    // Build the rendered script body
    let rawContent = this.htmlCode();

    // Format if CDM tailwind framework is requested
    if (this.enableCSSFrameworks()) {
      const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        }
      }
    }
  }
</script>`;

      // Inject CDN into head
      if (rawContent.includes('<head>')) {
        rawContent = rawContent.replace('<head>', `<head>\n  ${tailwindScript}`);
      } else {
        rawContent = tailwindScript + '\n' + rawContent;
      }
    }

    // Inject temporary Outline CSS for inspector hover highlight
    const inspectorStyles = `<style>
      @keyframes dsHighlightPulse {
        0% { outline: 3px solid #10b981; outline-offset: 2px; }
        50% { outline: 3px solid #3b82f6; outline-offset: 4px; }
        100% { outline: 3px solid #10b981; outline-offset: 2px; }
      }
      .data-ds-highlighted {
        animation: dsHighlightPulse 1.5s infinite !important;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4) !important;
      }
    </style>`;

    if (rawContent.includes('</head>')) {
      rawContent = rawContent.replace('</head>', `${inspectorStyles}\n</head>`);
    } else {
      rawContent = inspectorStyles + '\n' + rawContent;
    }

    // Capture Traversal IDs in sandbox elements so highlighting works cleanly
    try {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(rawContent, 'text/html');

      let count = 0;
      const recurseAssign = (element: Element) => {
        count++;
        element.setAttribute('data-ds-id', `node-${count}`);
        const elChildren = Array.from(element.children);
        for (const child of elChildren) {
          recurseAssign(child);
        }
      };

      if (parsedDoc.documentElement) {
        recurseAssign(parsedDoc.documentElement);
        rawContent = parsedDoc.documentElement.outerHTML;
      }
    } catch {
      // Avoid crash on unclosed structure
    }

    // Rewrite Iframe Document
    try {
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(rawContent);
        doc.close();
      }
    } catch {
      // handle sandboxed block if any
    }
  }

  // Traversal: Highlight matching elements inside iframe
  public highlightInIframe(nodeId: string): void {
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe || !iframe.contentWindow) return;

    try {
      const doc = iframe.contentWindow.document;

      // Reset previous targets
      doc.querySelectorAll('.data-ds-highlighted').forEach(el => {
        el.classList.remove('data-ds-highlighted');
      });

      if (!nodeId) return;

      // Select matching data element path
      const targetEl = doc.querySelector(`[data-ds-id="${nodeId}"]`);
      if (targetEl) {
        targetEl.classList.add('data-ds-highlighted');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch {
      // catch potential cross origin bounds
    }
  }

  // Interactive node clicks inside tree selections
  public selectNode(node: DOMNode): void {
    if (node.tagName === '#text') return;
    this.selectedDOMNode.set(node);
  }

  // Action: Add dynamic Attribute over target DOM node
  public addNodeAttribute(nodeId: string, nameInput: HTMLInputElement, valueInput: HTMLInputElement): void {
    const attrName = nameInput.value.trim();
    const attrVal = valueInput.value.trim();

    if (!attrName) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(this.htmlCode(), 'text/html');

    let count = 0;
    let target: Element | null = null;

    const locate = (element: Element) => {
      count++;
      if (`node-${count}` === nodeId) {
        target = element;
        return;
      }
      const elChildren = Array.from(element.children);
      for (const child of elChildren) {
        if (target) return;
        locate(child);
      }
    };

    if (doc.documentElement) {
      locate(doc.documentElement);
    }

    if (target) {
      (target as Element).setAttribute(attrName, attrVal);
      this.htmlCode.set(doc.documentElement.outerHTML);

      // Auto-update interactive selector values
      this.recomputeDOMTree(this.htmlCode());

      // Clear inputs
      nameInput.value = '';
      valueInput.value = '';
    }
  }

  // Action: Remove dynamic Attribute over target DOM Node
  public removeNodeAttribute(nodeId: string, attrName: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.htmlCode(), 'text/html');

    let count = 0;
    let target: Element | null = null;

    const locate = (element: Element) => {
      count++;
      if (`node-${count}` === nodeId) {
        target = element;
        return;
      }
      const elementChildren = Array.from(element.children);
      for (const child of elementChildren) {
        if (target) return;
        locate(child);
      }
    };

    if (doc.documentElement) {
      locate(doc.documentElement);
    }

    if (target) {
      (target as Element).removeAttribute(attrName);
      this.htmlCode.set(doc.documentElement.outerHTML);
      this.recomputeDOMTree(this.htmlCode());
    }
  }

  // Realtime Parsing & Virtual tree generation
  private recomputeDOMTree(code: string): void {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');
      let nodeIndex = 0;

      const parseElement = (el: Element): DOMNode => {
        nodeIndex++;
        const uniqueId = `node-${nodeIndex}`;
        // Extract tag attributes
        const attributes: { name: string, value: string }[] = [];
        const elAttributes = Array.from(el.attributes);
        for (const item of elAttributes) {
          if (item.name !== 'data-ds-id') {
            attributes.push({ name: item.name, value: item.value });
          }
        }

        // Extracted classes
        const classes = Array.from(el.classList).filter(c => c !== 'data-ds-highlighted');

        // Parse Children Nodes
        const children: DOMNode[] = [];
        const childNodesList = Array.from(el.childNodes);
        for (let i = 0; i < childNodesList.length; i++) {
          const cNode = childNodesList[i];
          if (cNode.nodeType === 1) { // Element
            children.push(parseElement(cNode as Element));
          } else if (cNode.nodeType === 3) { // Text Node
            const textText = cNode.textContent?.trim() || '';
            if (textText) {
              children.push({
                id: `txt-${uniqueId}-${i}`,
                tagName: '#text',
                nodeType: 3,
                attributes: [],
                classes: [],
                children: [],
                textContext: textText
              });
            }
          }
        }

        return {
          id: uniqueId,
          tagName: el.tagName.toLowerCase(),
          nodeType: 1,
          attributes,
          classes,
          children,
          isExpanded: true
        };
      };

      if (doc.body && doc.body.children.length > 0) {
        const nodes: DOMNode[] = [];
        const bodyChildren = Array.from(doc.body.children);
        for (const child of bodyChildren) {
          nodes.push(parseElement(child));
        }
        this.domTreeNodes.set(nodes);

        // Update active matching selected reference if matches
        const currentSel = this.selectedDOMNode();
        if (currentSel) {
          const findNodeById = (nodeList: DOMNode[], targetId: string): DOMNode | null => {
            for (const n of nodeList) {
              if (n.id === targetId) return n;
              const sub = findNodeById(n.children, targetId);
              if (sub) return sub;
            }
            return null;
          };
          const updatedSelected = findNodeById(nodes, currentSel.id);
          this.selectedDOMNode.set(updatedSelected);
        }
      } else {
        this.domTreeNodes.set([]);
      }
    } catch {
      // ignore parse warnings
    }
  }

  // HTML Beautification algorithm pretty print
  public beautifyHTML(): void {
    const raw = this.htmlCode();
    if (!raw.trim()) return;

    let formatted = '';
    const reg = /(<\/?[a-zA-Z0-9_\-:]+(?:\s+[a-zA-Z0-9_\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*\s*\/?>)|([^<]+)/g;
    let pad = 0;
    const matches = raw.match(reg);
    if (!matches) return;

    const singleTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    for (const match of matches) {
      const trimmed = match.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('<!--')) {
        formatted += '  '.repeat(pad) + trimmed + '\n';
      } else if (trimmed.startsWith('</')) {
        pad = Math.max(0, pad - 1);
        formatted += '  '.repeat(pad) + trimmed + '\n';
      } else if (trimmed.startsWith('<') && !trimmed.endsWith('/>')) {
        const tagNameMatch = trimmed.match(/<([a-zA-Z0-9_\-:]+)/);
        const tagName = tagNameMatch ? tagNameMatch[1] : '';
        formatted += '  '.repeat(pad) + trimmed + '\n';
        if (tagName && !singleTags.includes(tagName.toLowerCase()) && !trimmed.endsWith('>')) {
          // nested multiline
        } else if (tagName && !singleTags.includes(tagName.toLowerCase())) {
          pad++;
        }
      } else if (trimmed.startsWith('<') && trimmed.endsWith('/>')) {
        formatted += '  '.repeat(pad) + trimmed + '\n';
      } else {
        formatted += '  '.repeat(pad) + trimmed + '\n';
      }
    }

    const beautified = formatted.trim();
    this.htmlCode.set(beautified);
    if (this.codeEditorEl) {
      this.codeEditorEl.nativeElement.value = beautified;
    }
  }

  // Compact HTML minification
  public minifyHTML(): void {
    const raw = this.htmlCode();
    if (!raw.trim()) return;

    const minified = raw
      .replace(/<!--[\s\S]*?-->/g, '') // strip comments
      .replace(/\s+/g, ' ')            // collapse multiple whitespace
      .replace(/>\s+</g, '><')         // strip spacing between tags
      .trim();

    this.htmlCode.set(minified);
    if (this.codeEditorEl) {
      this.codeEditorEl.nativeElement.value = minified;
    }
  }

  // HTML Entity encoding
  public encodeEntities(): void {
    const raw = this.htmlCode();
    if (!raw.trim()) return;

    const encoded = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    this.htmlCode.set(encoded);
    if (this.codeEditorEl) {
      this.codeEditorEl.nativeElement.value = encoded;
    }
  }

  // HTML Entity Decoding
  public decodeEntities(): void {
    const raw = this.htmlCode();
    if (!raw.trim()) return;

    const decoded = raw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'");

    this.htmlCode.set(decoded);
    if (this.codeEditorEl) {
      this.codeEditorEl.nativeElement.value = decoded;
    }
  }

  // Converters computing signal
  public convertedOutput = computed(() => {
    const code = this.htmlCode();
    const mode = this.activeConversion();
    if (!code) return '';

    if (mode === 'jsx') {
      let jsx = code;
      // Convert standard class attributes
      jsx = jsx.replace(/class=/g, 'className=');
      // Convert standard contentfor targets
      jsx = jsx.replace(/for=/g, 'htmlFor=');

      // Inline styles to JSX expressions objects
      jsx = jsx.replace(/style="([^"]*)"/g, (match, p1) => {
        const rules = p1.split(';').filter((r: string) => r.trim());
        const props = rules.map((r: string) => {
          const parts = r.split(':');
          if (parts.length < 2) return '';
          // Convert dash-case style parameter names to camelCase keys
          const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          const val = parts.slice(1).join(':').trim();
          return `${key}: '${val.replace(/'/g, "\\'")}'`;
        }).filter(Boolean).join(', ');
        return `style={{ ${props} }}`;
      });

      // Self close void element nodes
      const voids = ['img', 'br', 'hr', 'input', 'meta', 'link'];
      for (const t of voids) {
        const r = new RegExp(`<(${t})([^>]*?)(?<!/)>`, 'gi');
        jsx = jsx.replace(r, '<$1$2 />');
      }
      return jsx;
    }

    if (mode === 'angular') {
      let ang = code;
      // Replace inline angular-like parameter bindings for testing
      ang = ang.replace(/checked/g, '[checked]="true"');
      ang = ang.replace(/disabled/g, '[disabled]="true"');
      return ang;
    }

    if (mode === 'markdown') {
      let md = code;
      // heads typography
      md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n');
      md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n');
      md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n');
      // anchors
      md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
      // breaks
      md = md.replace(/<br\s*\/?>/gi, '\n');
      // text weight styles
      md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
      md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
      // Lists items
      md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
      // Strip everything else to avoid tag clutter
      md = md.replace(/<\/?[a-zA-Z0-9_\-:]+(?:\s+[^>]*?)?>/g, '').trim();
      return md;
    }

    if (mode === 'entity') {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    return code;
  });

  // Action: Copy converted text results
  public copyConverted(): void {
    const text = this.convertedOutput();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copySuccessConverted.set(true);
      setTimeout(() => this.copySuccessConverted.set(false), 2000);
    });
  }

  // Compliance validator diagnostic engine
  public validationIssues = computed<ValidationIssue[]>(() => {
    const code = this.htmlCode();
    const list: ValidationIssue[] = [];
    if (!code.trim()) return list;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');

      // 1. Accessibility Checks: alt property verification
      const imgNoAlt = doc.querySelectorAll('img:not([alt])');
      imgNoAlt.forEach(img => {
        list.push({
          type: 'warning',
          category: 'accessibility',
          message: 'Image element is missing the required "alt" accessibility tag.',
          element: img.outerHTML.substring(0, 100) + '...'
        });
      });

      // 2. Headings SEO checks sequence jumps
      const heads = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      heads.forEach(h => {
        const lvl = parseInt(h.tagName.substring(1));
        if (lastLevel > 0 && lvl - lastLevel > 1) {
          list.push({
            type: 'warning',
            category: 'structure',
            message: `Heading nesting levels jumped from H${lastLevel} straight to H${lvl}. Correct semantic balance.`,
            element: h.outerHTML
          });
        }
        lastLevel = lvl;
      });

      // 3. Bad nesting violations e.g. placing div tags inside span tags
      const badNestingElems = doc.querySelectorAll('span div, span p, span section, span h1, span h2, span h3, span ul, span li');
      badNestingElems.forEach(el => {
        list.push({
          type: 'error',
          category: 'syntax',
          message: 'Markup contains block-level node tags incorrectly nested inside inline span tags.',
          element: el.outerHTML.substring(0, 80) + '...'
        });
      });

      // 4. Trace label missing indicators on controls
      const formControlsNoIds = doc.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])');
      formControlsNoIds.forEach(ctrl => {
        const typeAttr = ctrl.getAttribute('type');
        if (typeAttr !== 'submit' && typeAttr !== 'button' && typeAttr !== 'hidden') {
          list.push({
            type: 'warning',
            category: 'accessibility',
            message: 'Direct input element is missing binding ID attributes linked with functional labels.',
            element: ctrl.outerHTML.substring(0, 80) + '...'
          });
        }
      });

      // 5. Basic Syntax balance auditor counts tags
      const rawCountOpens = (code.match(/<[\w-]+(?:\s+[^>]*?)?>/g) || []).length;
      const rawCountCloses = (code.match(/<\/[\w-]+>/g) || []).length;
      const singleTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

      const singleTagsCount = singleTags.reduce((sum, tag) => {
        const r = new RegExp(`<${tag}(?:\\s+[^>]*?)?>`, 'gi');
        return sum + (code.match(r) || []).length;
      }, 0);

      const expectedClose = rawCountOpens - singleTagsCount;
      if (rawCountCloses !== expectedClose && expectedClose > 0) {
        list.push({
          type: 'error',
          category: 'structure',
          message: `Nesting bracket unbalance detected. Read and verify your tags count match.`,
          element: `Opened (structural): ${expectedClose}, Closed: ${rawCountCloses}`
        });
      }

    } catch {
      // capture parser issues
    }

    return list;
  });

  // Action Search and Replace
  public performFindNext(): void {
    const textToFind = this.findControl.value;
    const textarea = this.codeEditorEl?.nativeElement;
    if (!textarea || !textToFind) return;

    const val = textarea.value;
    const index = val.indexOf(textToFind, textarea.selectionStart + 1);

    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + textToFind.length);
    } else {
      // wrap search
      const firstIndex = val.indexOf(textToFind);
      if (firstIndex !== -1) {
        textarea.focus();
        textarea.setSelectionRange(firstIndex, firstIndex + textToFind.length);
      }
    }
  }

  public performReplace(): void {
    const textToFind = this.findControl.value;
    const textToReplace = this.replaceControl.value || '';
    const textarea = this.codeEditorEl?.nativeElement;

    if (!textarea || !textToFind) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    const selectedText = val.substring(start, end);
    if (selectedText === textToFind) {
      textarea.value = val.substring(0, start) + textToReplace + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + textToReplace.length;
      this.htmlCode.set(textarea.value);
    } else {
      this.performFindNext();
    }
  }

  public performReplaceAll(): void {
    const textToFind = this.findControl.value;
    const textToReplace = this.replaceControl.value || '';
    const textarea = this.codeEditorEl?.nativeElement;

    if (!textarea || !textToFind) return;

    const val = textarea.value;
    const updated = val.split(textToFind).join(textToReplace);
    textarea.value = updated;
    this.htmlCode.set(updated);
  }

  // SEO & Social Cards simulated attributes extraction
  public seoTitle = computed(() => {
    const code = this.htmlCode();
    try {
      const match = code.match(/<title>([\s\S]*?)<\/title>/i);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  });

  public seoDescription = computed(() => {
    const code = this.htmlCode();
    try {
      const match = code.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  });

  public seoImage = computed(() => {
    const code = this.htmlCode();
    try {
      const match = code.match(/<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/i);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  });

  // Crawled JSON-LD structural listings
  public structuredSchemas = computed<string[]>(() => {
    const code = this.htmlCode();
    const list: string[] = [];
    try {
      const regObj = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = regObj.exec(code)) !== null) {
        if (m[1]) {
          list.push(m[1].trim());
        }
      }
    } catch {
      // fail safe
    }
    return list;
  });

  // Action: Save and download file
  public downloadHTMLFile(): void {
    const text = this.htmlCode();
    if (!text) return;

    const fileBlob = new Blob([text], { type: 'text/html' });
    const fileUrl = URL.createObjectURL(fileBlob);

    const clickLink = document.createElement('a');
    clickLink.href = fileUrl;
    clickLink.download = 'devsight_sandbox_markup.html';
    clickLink.click();

    URL.revokeObjectURL(fileUrl);
  }
}
