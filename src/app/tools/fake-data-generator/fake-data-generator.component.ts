import { Component, ElementRef, ViewChild, signal, computed, effect, inject, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FakeDataGeneratorService } from './fake-data-generator.service';
import { FieldType } from './fake-data-generator.interfaces';
import { FIELD_CATEGORIES, LOCALES, APP_TEMPLATES } from './fake-data-generator.models';
import loader from '@monaco-editor/loader';

@Component({
  selector: 'app-fake-data-generator',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
      <div class="min-h-screen text-zinc-100 font-sans flex flex-col gap-4 dark:bg-zinc-950 bg-white text-zinc-900 transition-colors duration-200">
        <!-- Toolbar Section -->
        <div id="toolbar_card" class="bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
          <div class="flex flex-wrap gap-2">
            <button (click)="newProject()" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl flex items-center gap-2 border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm">
              <mat-icon class="text-sm">add_box</mat-icon> New Project
            </button>
            <button (click)="showProjectManager.set(!showProjectManager())" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl flex items-center gap-2 border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm">
              <mat-icon class="text-xs">folder_open</mat-icon> Projects ({{ service.recentProjects().length }})
            </button>
            <button (click)="showTemplateLibrary.set(!showTemplateLibrary())" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl flex items-center gap-2 border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm">
              <mat-icon class="text-xs">library_books</mat-icon> Templates
            </button>
            <div class="h-6 w-px bg-zinc-800 dark:bg-zinc-800 bg-zinc-300 mx-1"></div>
            <button (click)="triggerImportSchemaInput()" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl flex items-center gap-2 border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm">
              <mat-icon class="text-xs">file_upload</mat-icon> Import Schema
            </button>
            <button (click)="exportSchema()" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl flex items-center gap-2 border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm">
              <mat-icon class="text-xs">file_download</mat-icon> Export Schema
            </button>
          </div>

          <div class="flex items-center gap-2">
            <!-- Records Count Select -->
            <div class="flex items-center gap-1.5 bg-zinc-950 dark:bg-zinc-950 bg-zinc-100 border border-zinc-800 dark:border-zinc-800 border-zinc-300 px-3 py-1 rounded-xl">
              <span class="text-xs font-mono text-zinc-400 dark:text-zinc-400 text-zinc-600">Rows:</span>
              <select [formControl]="recordsControl" class="bg-transparent border-none text-xs font-mono text-zinc-200 dark:text-zinc-200 text-zinc-800 focus:outline-none">
                <option value="10" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">10</option>
                <option value="100" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">100</option>
                <option value="1000" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">1,000</option>
                <option value="10000" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">10,000</option>
                <option value="100000" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">100,000</option>
                <option value="1000000" class="dark:bg-zinc-900 bg-white text-zinc-800 dark:text-zinc-200">1,000,000</option>
              </select>
            </div>

            <!-- Undo / Redo -->
            <button (click)="service.undo()" [disabled]="false" class="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs rounded-xl border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300" title="Undo">
              <mat-icon class="text-sm">undo</mat-icon>
            </button>
            <button (click)="service.redo()" [disabled]="false" class="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs rounded-xl border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300" title="Redo">
              <mat-icon class="text-sm">redo</mat-icon>
            </button>

            <!-- Generate / Cancel -->
            @if (service.isGenerating()) {
              <button (click)="service.cancelGeneration()" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer text-white animate-pulse">
                <mat-icon class="text-sm">stop</mat-icon> Cancel
              </button>
            } @else {
              <button (click)="service.generateData()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer text-white">
                <mat-icon class="text-sm">play_arrow</mat-icon> Generate
              </button>
            }

            <button (click)="copyOutput()" class="p-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300" title="Copy dataset">
              <mat-icon class="text-sm">content_copy</mat-icon>
            </button>
            <button (click)="downloadOutputFile()" class="p-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl border border-zinc-700 text-zinc-200 cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300" title="Download dataset">
              <mat-icon class="text-sm">download</mat-icon>
            </button>
          </div>
        </div>

        <!-- Hidden inputs -->
        <input type="file" #importSchemaFileInput class="hidden" (change)="onSchemaFileImported($event)" accept=".json" />

        <!-- Panels: Project Manager / Template Library -->
        @if (showProjectManager()) {
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div class="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span class="text-sm font-medium flex items-center gap-2"><mat-icon>folder</mat-icon> Project Manager</span>
              <button (click)="showProjectManager.set(false)" class="text-xs text-zinc-400 hover:text-white"><mat-icon>close</mat-icon></button>
            </div>
            
            <div class="flex gap-2">
              <input type="text" #projectNameInput [value]="service.currentProjectName()" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 w-full" placeholder="Enter Project Name" />
              <button (click)="service.saveProject(projectNameInput.value)" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white">Save Current</button>
            </div>

            @if (service.recentProjects().length === 0) {
              <p class="text-xs text-zinc-500 py-2">No recent projects found on this browser.</p>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                @for (p of service.recentProjects(); track p.id) {
                  <div class="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl flex justify-between items-center">
                    <button (click)="service.openProject(p); showProjectManager.set(false)" class="text-left cursor-pointer flex-1">
                      <span class="text-xs font-semibold text-emerald-400 block truncate">{{ p.name }}</span>
                      <span class="text-[10px] text-zinc-500 block">Saved: {{ p.updatedAt | date:'short' }}</span>
                    </button>
                    <button (click)="service.deleteProject(p.id)" class="text-zinc-500 hover:text-rose-400 p-1 rounded"><mat-icon class="text-xs">delete</mat-icon></button>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (showTemplateLibrary()) {
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div class="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span class="text-sm font-medium flex items-center gap-2"><mat-icon>library_books</mat-icon> Predefined Templates Library</span>
              <button (click)="showTemplateLibrary.set(false)" class="text-xs text-zinc-400 hover:text-white"><mat-icon>close</mat-icon></button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              @for (tpl of templates; track tpl.name) {
                <div class="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col justify-between gap-3">
                  <div>
                    <div class="flex justify-between items-center">
                      <span class="text-xs font-semibold text-zinc-200">{{ tpl.name }}</span>
                      <span class="px-1.5 py-0.5 bg-zinc-800 text-[9px] font-mono rounded text-zinc-400">{{ tpl.category }}</span>
                    </div>
                    <p class="text-[11px] text-zinc-400 mt-2">{{ tpl.description }}</p>
                  </div>
                  <button (click)="service.loadTemplate(tpl.name); showTemplateLibrary.set(false)" class="w-full py-1 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-[11px] font-semibold rounded-lg text-zinc-300 border border-zinc-700">
                    Use Template
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Workspace Section -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          
          <!-- LEFT PANEL: Schema Builder -->
          <div id="left_panel" class="lg:col-span-4 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-3 h-[700px] lg:h-auto overflow-hidden">
            <div class="flex justify-between items-center pb-2 border-b border-zinc-800 dark:border-zinc-800 border-zinc-200">
              <span class="text-sm font-medium tracking-wide text-zinc-300 dark:text-zinc-300 text-zinc-800 flex items-center gap-1.5">
                <mat-icon>view_list</mat-icon> Schema Fields Builder ({{ service.schema().fields.length }})
              </span>
              <button (click)="service.clearSchema()" class="text-[11px] font-mono text-zinc-400 hover:text-rose-400 flex items-center gap-1">
                <mat-icon class="text-xs">delete_sweep</mat-icon> Clear Schema
              </button>
            </div>

            <!-- AI Suggest Prompt Input -->
            <div class="bg-zinc-950 dark:bg-zinc-950 bg-zinc-100 border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl p-2.5 flex flex-col gap-2">
              <span class="text-[10px] font-mono font-bold text-emerald-400 dark:text-emerald-400 text-emerald-600 flex items-center gap-1">
                <mat-icon class="text-xs">psychology</mat-icon> GOOGLE GEMINI AI FIELD ASSISTANT
              </span>
              <div class="flex gap-1.5">
                <input type="text" #aiPromptInput class="bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-lg px-2.5 py-1 text-xs text-zinc-200 dark:text-zinc-200 text-zinc-800 focus:outline-none focus:border-emerald-500 w-full" placeholder="e.g. products, transaction metrics, user profiles" (keyup.enter)="askGeminiAI(aiPromptInput.value); aiPromptInput.value=''" />
                <button (click)="askGeminiAI(aiPromptInput.value); aiPromptInput.value=''" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  Match
                </button>
              </div>
            </div>

            <!-- Field Search and Filter -->
            <div class="flex gap-1.5">
              <div class="relative flex-1">
                <input type="text" [formControl]="searchFieldControl" class="w-full bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl px-8 py-1.5 text-xs text-zinc-200 dark:text-zinc-200 text-zinc-800 focus:outline-none focus:border-emerald-500" placeholder="Search fields..." />
                <mat-icon class="absolute left-2.5 top-2 text-sm text-zinc-500">search</mat-icon>
              </div>
              <select [formControl]="filterCategoryControl" class="bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 dark:text-zinc-300 text-zinc-700 focus:outline-none focus:border-emerald-500">
                <option value="All">All Categories</option>
                <option value="Personal & Auth">Personal</option>
                <option value="Location & Geography">Location</option>
                <option value="Business & Finance">Business</option>
                <option value="Temporal (Date & Time)">Temporal</option>
                <option value="Basic & Structural">Basic</option>
              </select>
            </div>

            <!-- Scrollable fields list -->
            <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
              @if (filteredFields().length === 0) {
                <div class="text-center py-12 text-zinc-500">
                  <mat-icon class="text-3xl">view_agenda</mat-icon>
                  <p class="text-xs mt-2">No matching fields found in the workspace.</p>
                </div>
              }

              @for (field of filteredFields(); track field.id; let idx = $index) {
                <div class="group relative flex flex-col bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-200 hover:border-zinc-700 dark:hover:border-zinc-700 rounded-xl p-3 transition-all duration-150"
                  [class.border-emerald-500]="service.selectedFieldId() === field.id">
                  
                  <div class="flex justify-between items-center gap-2">
                    <button (click)="service.selectedFieldId.set(field.id)" class="text-left flex-1 cursor-pointer">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono bg-zinc-800 dark:bg-zinc-800 bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-400 dark:text-zinc-400 text-zinc-600">#{{ idx + 1 }}</span>
                        <span class="text-xs font-semibold text-zinc-100 dark:text-zinc-100 text-zinc-900 group-hover:text-emerald-400">{{ field.name }}</span>
                      </div>
                      <span class="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 text-zinc-400 block mt-0.5">Type: {{ field.type }}</span>
                    </button>

                    <div class="flex items-center gap-1">
                      <!-- Reorder Buttons -->
                      <button (click)="moveField(idx, -1)" [disabled]="idx === 0" class="p-1 hover:text-zinc-200 disabled:opacity-30 text-zinc-500" title="Move Up"><mat-icon class="text-xs">arrow_upward</mat-icon></button>
                      <button (click)="moveField(idx, 1)" [disabled]="idx === filteredFields().length - 1" class="p-1 hover:text-zinc-200 disabled:opacity-30 text-zinc-500" title="Move Down"><mat-icon class="text-xs">arrow_downward</mat-icon></button>
                      
                      <!-- Clone & Delete -->
                      <button (click)="service.duplicateField(field.id)" class="p-1 hover:text-emerald-400 text-zinc-500" title="Clone Field"><mat-icon class="text-xs">content_copy</mat-icon></button>
                      <button (click)="service.deleteField(field.id)" class="p-1 hover:text-rose-400 text-zinc-500" title="Delete Field"><mat-icon class="text-xs">delete</mat-icon></button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Add Field Button Dropdown -->
            <div class="border-t border-zinc-800 dark:border-zinc-800 border-zinc-200 pt-3">
              <span class="text-[10px] text-zinc-500 font-mono block mb-1.5">QUICK ADD FIELD TYPE:</span>
              <div class="grid grid-cols-4 gap-1.5">
                @for (t of quickAddTypes; track t) {
                  <button (click)="service.addField(t)" class="py-1 bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white border border-zinc-700 rounded-lg text-[10px] font-semibold cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 bg-white text-zinc-800 border-zinc-300 shadow-sm text-center truncate">
                    + {{ t }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- CENTER PANEL: Live Preview and Monaco Editor -->
          <div id="center_panel" class="lg:col-span-5 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-3 min-h-[500px]">
            <div class="flex justify-between items-center border-b border-zinc-800 dark:border-zinc-800 border-zinc-200 pb-2">
              <div class="flex items-center gap-1.5">
                <mat-icon class="text-emerald-400">code</mat-icon>
                <span class="text-sm font-medium tracking-wide text-zinc-300 dark:text-zinc-300 text-zinc-800">Dynamic Live Output Preview</span>
              </div>
              <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">
                Format: {{ service.outputFormat() }}
              </span>
            </div>

            <!-- Preview Mode Selectors -->
            <div class="flex items-center justify-between gap-1.5 bg-zinc-950 dark:bg-zinc-950 bg-zinc-100 p-1.5 rounded-xl border border-zinc-800/80">
              <div class="flex flex-wrap gap-1">
                @for (mode of previewModes; track mode) {
                  <button (click)="onPreviewModeChanged(mode)" 
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                    [class]="selectedPreviewMode() === mode ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 dark:text-zinc-400 text-zinc-600'">
                    {{ mode }}
                  </button>
                }
              </div>
            </div>

            <!-- Virtual Render Preview Space -->
            <div class="flex-1 bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-2xl relative overflow-hidden flex flex-col">
              
              <!-- Monaco text mode container -->
              <div [class.hidden]="selectedPreviewMode() === 'Table' || selectedPreviewMode() === 'Tree' || selectedPreviewMode() === 'Statistics'" class="flex-1 w-full h-full min-h-[300px]">
                <div #editorContainer class="w-full h-full absolute inset-0"></div>
              </div>

              <!-- Table mode rendering -->
              @if (selectedPreviewMode() === 'Table') {
                <div class="flex-1 overflow-auto p-3 scrollbar-thin">
                  @if (service.generatedRecords().length === 0) {
                    <p class="text-xs text-zinc-500 text-center py-20">Click 'Generate' to load preview table dataset.</p>
                  } @else {
                    <table class="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr class="border-b border-zinc-800 dark:border-zinc-800 border-zinc-200">
                          @for (h of tableHeaders(); track h) {
                            <th class="py-2 px-3 text-zinc-400 font-semibold font-mono">{{ h }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of service.generatedRecords().slice(0, 50); track $index) {
                          <tr class="border-b border-zinc-900 dark:border-zinc-900 border-zinc-100 hover:bg-zinc-900/40">
                            @for (h of tableHeaders(); track h) {
                              <td class="py-2 px-3 font-mono text-zinc-300 dark:text-zinc-300 text-zinc-800 max-w-[200px] truncate">
                                {{ formatCellValue(row[h]) }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }

              <!-- Tree Mode rendering -->
              @if (selectedPreviewMode() === 'Tree') {
                <div class="flex-1 overflow-auto p-4 font-mono text-[11px] text-zinc-400 scrollbar-thin">
                  @if (service.generatedRecords().length === 0) {
                    <p class="text-xs text-zinc-500 text-center py-20">No generated trees to display.</p>
                  } @else {
                    <div class="flex flex-col gap-2">
                      @for (row of service.generatedRecords().slice(0, 3); track $index; let idx = $index) {
                        <div class="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                          <span class="text-emerald-400 font-bold">[Record #{{ idx + 1 }}]</span>
                          <pre class="mt-1 text-zinc-300">{{ row | json }}</pre>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Statistics View inside Center Panel -->
              @if (selectedPreviewMode() === 'Statistics') {
                <div class="flex-1 overflow-auto p-4 flex flex-col gap-4 scrollbar-thin">
                  <span class="text-xs font-semibold text-zinc-200">Execution Metadata Report</span>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span class="text-[10px] text-zinc-500 block">Total Fields Count</span>
                      <span class="text-base font-semibold font-mono text-emerald-400">{{ service.stats().fieldsCount }}</span>
                    </div>
                    <div class="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span class="text-[10px] text-zinc-500 block">Unique Values Estimate</span>
                      <span class="text-base font-semibold font-mono text-emerald-400">{{ service.stats().uniqueValues }}</span>
                    </div>
                    <div class="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span class="text-[10px] text-zinc-500 block">Null Values Generated</span>
                      <span class="text-base font-semibold font-mono text-amber-500">{{ service.stats().nullValues }}</span>
                    </div>
                    <div class="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span class="text-[10px] text-zinc-500 block">Memory Estimate</span>
                      <span class="text-base font-semibold font-mono text-sky-400">{{ service.stats().memoryEstimate }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Custom Formats Quick Selector -->
            <div class="flex justify-between items-center pt-2">
              <span class="text-[10px] text-zinc-500 font-mono">EXPORT SPEC / DIALECT SCHEMA:</span>
              <div class="flex gap-2">
                <button (click)="setDialectFormat('JSON')" [class]="service.outputFormat() === 'JSON' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">JSON</button>
                <button (click)="setDialectFormat('CSV')" [class]="service.outputFormat() === 'CSV' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">CSV</button>
                <button (click)="setDialectFormat('SQL_INSERT')" [class]="service.outputFormat() === 'SQL_INSERT' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">SQL</button>
                <button (click)="setDialectFormat('YAML')" [class]="service.outputFormat() === 'YAML' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">YAML</button>
                <button (click)="setDialectFormat('TSInterface')" [class]="service.outputFormat() === 'TSInterface' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">TYPESCRIPT</button>
                <button (click)="setDialectFormat('OpenAPI')" [class]="service.outputFormat() === 'OpenAPI' ? 'text-emerald-400 font-bold' : 'text-zinc-500'" class="text-[10px] font-mono">OPENAPI</button>
              </div>
            </div>
          </div>

          <!-- RIGHT PANEL: Properties Selector -->
          <div id="right_panel" class="lg:col-span-3 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
            <div class="border-b border-zinc-800 dark:border-zinc-800 border-zinc-200 pb-2">
              <span class="text-sm font-medium tracking-wide text-zinc-300 dark:text-zinc-300 text-zinc-800 flex items-center gap-1.5">
                <mat-icon>settings_applications</mat-icon> Selected Field Properties
              </span>
            </div>

            @if (!service.selectedField()) {
              <div class="text-center py-20 text-zinc-500">
                <mat-icon class="text-4xl text-zinc-600">touch_app</mat-icon>
                <p class="text-xs mt-2">Click any field in the builder to edit properties or add parameters.</p>
              </div>
            } @else {
              <!-- Field Property Controls -->
              <div class="flex flex-col gap-3">
                <!-- Name -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-zinc-400 font-mono block">
                    FIELD NAME
                    <input type="text" [formControl]="fieldNameControl" class="bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-100 dark:text-zinc-100 text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono w-full mt-1 block" />
                  </label>
                </div>

                <!-- Description -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-zinc-400 font-mono block">
                    DESCRIPTION
                    <input type="text" [formControl]="fieldDescControl" class="bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-100 dark:text-zinc-100 text-zinc-800 focus:outline-none focus:border-emerald-500 w-full mt-1 block" />
                  </label>
                </div>

                <!-- Type -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-zinc-400 font-mono block">
                    FIELD GENERATOR TYPE
                    <select [formControl]="fieldTypeControl" class="bg-zinc-950 dark:bg-zinc-950 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-100 dark:text-zinc-100 text-zinc-800 focus:outline-none focus:border-emerald-500 w-full mt-1 block">
                      @for (cat of fieldCategories; track cat.name) {
                        <optgroup [label]="cat.name" class="bg-zinc-900 text-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 bg-white text-zinc-800">
                          @for (t of cat.types; track t) {
                            <option [value]="t" class="bg-zinc-900 text-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 bg-white text-zinc-800">{{ t }}</option>
                          }
                        </optgroup>
                      }
                    </select>
                  </label>
                </div>

                <!-- Toggles: Required / Nullable / Unique -->
                <div class="flex flex-col gap-1.5 mt-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [formControl]="fieldRequiredControl" class="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-800" />
                    <span class="text-xs text-zinc-300">Required Field</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [formControl]="fieldNullableControl" class="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-800" />
                    <span class="text-xs text-zinc-300">Nullable Field</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [formControl]="fieldUniqueControl" class="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-800" />
                    <span class="text-xs text-zinc-300">Unique Constraint</span>
                  </label>
                </div>

                <!-- Custom Expression / Formula Box -->
                @if (service.selectedField()?.type === 'Custom Formula') {
                  <div class="flex flex-col gap-1 mt-2">
                    <label class="text-[10px] text-amber-400 font-mono flex flex-col gap-1 block">
                      <span class="flex items-center gap-1"><mat-icon class="text-xs">calculate</mat-icon> FORMULA EXPRESSION</span>
                      <textarea [formControl]="fieldCustomExprControl" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono h-24 w-full block" placeholder="e.g. firstName + ' ' + lastName"></textarea>
                    </label>
                    <span class="text-[9px] text-zinc-500">Concatenate variables using '+' or use functions like lower(name).</span>
                  </div>
                }

                <!-- Enum fields -->
                @if (service.selectedField()?.type === 'Enum') {
                  <div class="flex flex-col gap-1 mt-2">
                    <label class="text-[10px] text-zinc-400 font-mono block">
                      ENUM VALUES (Comma-separated)
                      <input type="text" [formControl]="fieldEnumControl" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500 w-full mt-1 block" placeholder="e.g. Active, Pending, Inactive" />
                    </label>
                  </div>
                }

                <!-- Number constraints -->
                @if (service.selectedField()?.type === 'Number' || service.selectedField()?.type === 'Integer' || service.selectedField()?.type === 'Price') {
                  <div class="grid grid-cols-2 gap-2 mt-2">
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] text-zinc-400 font-mono block">
                        MINIMUM
                        <input type="number" [formControl]="fieldMinControl" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 w-full mt-1 block" />
                      </label>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] text-zinc-400 font-mono block">
                        MAXIMUM
                        <input type="number" [formControl]="fieldMaxControl" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 w-full mt-1 block" />
                      </label>
                    </div>
                  </div>
                  
                  <div class="flex flex-col gap-1 mt-2">
                    <label class="text-[10px] text-zinc-400 font-mono block">
                      DISTRIBUTION
                      <select [formControl]="fieldDistributionControl" class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 w-full mt-1 block">
                        <option value="Uniform">Uniform</option>
                        <option value="Normal">Normal (Gaussian)</option>
                      </select>
                    </label>
                  </div>
                }

                <!-- Null Probability Sliders -->
                <div class="flex flex-col gap-1 mt-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-zinc-400">NULL PERCENTAGE</span>
                    <span class="text-emerald-400 font-bold">{{ fieldNullPercentageControl.value }}%</span>
                  </div>
                  <input type="range" [formControl]="fieldNullPercentageControl" min="0" max="100" step="5" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                </div>

                <!-- Duplicate Probability Slider -->
                <div class="flex flex-col gap-1 mt-1 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-zinc-400">DUPLICATE RATIO</span>
                    <span class="text-emerald-400 font-bold">{{ fieldDuplicatePercentageControl.value }}%</span>
                  </div>
                  <input type="range" [formControl]="fieldDuplicatePercentageControl" min="0" max="50" step="5" class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500" />
                </div>
              </div>
            }

            <!-- Global Configurations -->
            <div class="border-t border-zinc-800 dark:border-zinc-800 border-zinc-200 pt-3 mt-auto">
              <span class="text-[10px] text-zinc-500 font-mono block mb-2">GLOBAL OPTIONS:</span>
              
              <div class="flex flex-col gap-2 bg-zinc-950 dark:bg-zinc-950 bg-zinc-100 border border-zinc-800 dark:border-zinc-800 border-zinc-300 p-3 rounded-xl">
                <!-- Locale Select -->
                <div class="flex justify-between items-center">
                  <span class="text-xs text-zinc-400">Target Locale:</span>
                  <select [formControl]="localeControl" class="bg-zinc-900 dark:bg-zinc-900 bg-white text-xs text-zinc-200 border border-zinc-800 rounded px-2 py-1">
                    @for (loc of locales; track loc.code) {
                      <option [value]="loc.code">{{ loc.name }}</option>
                    }
                  </select>
                </div>
                
                <!-- Global Seed -->
                <div class="flex justify-between items-center mt-1">
                  <span class="text-xs text-zinc-400">Global Seed:</span>
                  <input type="number" [formControl]="seedControl" class="bg-zinc-900 dark:bg-zinc-900 bg-white text-xs text-zinc-200 border border-zinc-800 rounded px-2 py-1 w-20 text-center font-mono" />
                </div>

                <!-- Table/Collection/Update properties -->
                <div class="flex justify-between items-center mt-1">
                  <span class="text-xs text-zinc-400">Entity Name:</span>
                  <input type="text" [formControl]="tableNameControl" class="bg-zinc-900 dark:bg-zinc-900 bg-white text-xs text-zinc-200 border border-zinc-800 rounded px-2 py-1 w-24 text-center font-mono" />
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Progress Panel -->
        @if (service.isGenerating()) {
          <div id="progress_panel" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex justify-between items-center text-xs font-mono">
              <span class="text-zinc-400">Running Web Worker generation chunkers...</span>
              <span class="text-emerald-400 font-bold">{{ service.generationProgress() }}%</span>
            </div>
            <div class="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-full transition-all duration-150" [style.width.%]="service.generationProgress()"></div>
            </div>
          </div>
        }

        <!-- BOTTOM PANELS: Validation, Statistics, & Logs -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          <!-- Validation Warnings Panel -->
          <div id="validation_panel" class="md:col-span-4 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-2">
            <span class="text-xs font-semibold text-zinc-200 dark:text-zinc-200 text-zinc-800 flex items-center gap-1.5">
              <mat-icon class="text-rose-400">warning</mat-icon> Schema Diagnostics ({{ service.validationErrors().length }})
            </span>
            <div class="flex-1 overflow-y-auto max-h-[140px] text-[11px] font-mono scrollbar-thin">
              @if (service.validationErrors().length === 0) {
                <p class="text-emerald-400">✔ Ready. Zero compiler warnings detected.</p>
              } @else {
                <div class="flex flex-col gap-1.5">
                  @for (err of service.validationErrors(); track err) {
                    <div class="text-rose-400/90 flex items-start gap-1">
                      <span>•</span>
                      <span>{{ err }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Statistics Panel -->
          <div id="statistics_panel" class="md:col-span-4 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-2">
            <span class="text-xs font-semibold text-zinc-200 dark:text-zinc-200 text-zinc-800 flex items-center gap-1.5">
              <mat-icon class="text-emerald-400">analytics</mat-icon> Production Statistics Report
            </span>
            <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">GENERATED</span>
                <span class="font-bold text-zinc-200">{{ service.stats().records | number }}</span>
              </div>
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">SIZE</span>
                <span class="font-bold text-zinc-200">{{ service.stats().outputSize }}</span>
              </div>
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">SPEED</span>
                <span class="font-bold text-emerald-400">{{ service.stats().generationTime }}ms</span>
              </div>
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">DUPLICATES</span>
                <span class="font-bold text-amber-500">{{ service.stats().duplicates }}</span>
              </div>
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">NULL VALUES</span>
                <span class="font-bold text-zinc-400">{{ service.stats().nullValues }}</span>
              </div>
              <div class="p-1.5 bg-zinc-950 rounded-lg">
                <span class="text-zinc-500 block">AVG SIZE</span>
                <span class="font-bold text-zinc-200">{{ service.stats().avgRecordSize }}</span>
              </div>
            </div>
          </div>

          <!-- Logs Console -->
          <div id="logs_panel" class="md:col-span-4 bg-zinc-900 dark:bg-zinc-900 bg-zinc-50 border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex justify-between items-center border-b border-zinc-800 pb-1">
              <span class="text-xs font-semibold text-zinc-200 dark:text-zinc-200 text-zinc-800 flex items-center gap-1.5">
                <mat-icon>subject</mat-icon> Log Console
              </span>
              <button (click)="service.clearLogs()" class="text-[9px] font-mono text-zinc-500 hover:text-white">Clear</button>
            </div>
            <div class="flex-1 overflow-y-auto max-h-[140px] text-[10px] font-mono flex flex-col gap-1 scrollbar-thin">
              @for (log of service.logs(); track log) {
                <div class="flex gap-2">
                  <span class="text-zinc-500">[{{ log.timestamp }}]</span>
                  <span [class]="getLogColor(log.level)">{{ log.message }}</span>
                </div>
              }
            </div>
          </div>

        </div>

      </div>
  `,
  styles: `
    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: #3f3f46;
    }
  `
})
export class FakeDataGeneratorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('importSchemaFileInput') importSchemaFileInput!: ElementRef;

  service = inject(FakeDataGeneratorService);
  private readonly platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  // Editor instance
  private editor: unknown = null;

  // Constants
  fieldCategories = FIELD_CATEGORIES;
  locales = LOCALES;
  templates = APP_TEMPLATES;
  previewModes = ['JSON', 'Table', 'Tree', 'Statistics'];
  quickAddTypes: FieldType[] = ['String', 'Integer', 'Boolean', 'Email', 'UUID', 'Phone', 'Company', 'Price'];

  // Preview tab state
  selectedPreviewMode = signal<string>('JSON');

  // Reactive Forms Control bindings
  recordsControl = new FormControl('100');
  searchFieldControl = new FormControl('');
  filterCategoryControl = new FormControl('All');

  // Property Selector Control bindings
  fieldNameControl = new FormControl('');
  fieldDescControl = new FormControl('');
  fieldTypeControl = new FormControl<FieldType>('String');
  fieldRequiredControl = new FormControl(true);
  fieldNullableControl = new FormControl(false);
  fieldUniqueControl = new FormControl(false);
  fieldCustomExprControl = new FormControl('');
  fieldEnumControl = new FormControl('');
  fieldMinControl = new FormControl<number>(1);
  fieldMaxControl = new FormControl<number>(1000);
  fieldDistributionControl = new FormControl<'Uniform' | 'Normal'>('Uniform');
  fieldNullPercentageControl = new FormControl(0);
  fieldDuplicatePercentageControl = new FormControl(0);

  // Global option form controls
  localeControl = new FormControl('en');
  seedControl = new FormControl(12345);
  tableNameControl = new FormControl('mock_table');

  // Floating views
  showProjectManager = signal<boolean>(false);
  showTemplateLibrary = signal<boolean>(false);

  // Computed fields filtering
  filteredFields = computed(() => {
    const s = this.service.schema();
    const query = this.searchFieldControl.value?.toLowerCase() || '';
    const cat = this.filterCategoryControl.value || 'All';

    let fields = s.fields;

    // Search query match
    if (query) {
      fields = fields.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.type.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query)
      );
    }

    // Category match
    if (cat !== 'All') {
      const selectedCategory = FIELD_CATEGORIES.find(c => c.name === cat);
      if (selectedCategory) {
        fields = fields.filter(f => selectedCategory.types.includes(f.type));
      }
    }

    return fields;
  });

  tableHeaders = computed(() => {
    const fields = this.service.schema().fields;
    return fields.map(f => f.name);
  });

  constructor() {
    // Synchronize form properties with the active selected field
    effect(() => {
      const field = this.service.selectedField();
      if (field) {
        this.fieldNameControl.setValue(field.name, { emitEvent: false });
        this.fieldDescControl.setValue(field.description, { emitEvent: false });
        this.fieldTypeControl.setValue(field.type, { emitEvent: false });
        this.fieldRequiredControl.setValue(field.required, { emitEvent: false });
        this.fieldNullableControl.setValue(field.nullable, { emitEvent: false });
        this.fieldUniqueControl.setValue(field.unique, { emitEvent: false });
        this.fieldCustomExprControl.setValue(field.properties.customExpression || '', { emitEvent: false });
        this.fieldEnumControl.setValue(field.properties.enumValues?.join(', ') || '', { emitEvent: false });
        this.fieldMinControl.setValue(field.properties.min || 1, { emitEvent: false });
        this.fieldMaxControl.setValue(field.properties.max || 1000, { emitEvent: false });
        this.fieldDistributionControl.setValue(field.properties.distributionType === 'Normal' ? 'Normal' : 'Uniform', { emitEvent: false });
        this.fieldNullPercentageControl.setValue(field.properties.nullPercentage || 0, { emitEvent: false });
        this.fieldDuplicatePercentageControl.setValue(field.properties.duplicatePercentage || 0, { emitEvent: false });
      }
    });

    // Handle updates from preview text buffer inside Monaco
    effect(() => {
      const text = this.service.previewOutput();
      if (this.editor && this.isBrowser) {
        (this.editor as { setValue: (v: string) => void }).setValue(text);
      }
    });

    // Synchronize global options with service
    effect(() => {
      const sch = this.service.schema();
      this.localeControl.setValue(sch.locale, { emitEvent: false });
      this.seedControl.setValue(sch.seed, { emitEvent: false });
      this.tableNameControl.setValue(this.service.tableName(), { emitEvent: false });
    });
  }

  ngOnInit() {
    // Attach reactive subscriptions for fields properties updates
    this.recordsControl.valueChanges.subscribe(val => {
      if (val) this.service.recordsToGenerate.set(parseInt(val));
    });

    // Field form property subscriptions
    this.fieldNameControl.valueChanges.subscribe(name => {
      const activeId = this.service.selectedFieldId();
      if (activeId && name) {
        this.service.updateFieldProperties(activeId, { name });
      }
    });

    this.fieldDescControl.valueChanges.subscribe(description => {
      const activeId = this.service.selectedFieldId();
      if (activeId && description !== null) {
        this.service.updateFieldProperties(activeId, { description });
      }
    });

    this.fieldTypeControl.valueChanges.subscribe(type => {
      const activeId = this.service.selectedFieldId();
      if (activeId && type) {
        this.service.updateFieldProperties(activeId, { type });
      }
    });

    this.fieldRequiredControl.valueChanges.subscribe(required => {
      const activeId = this.service.selectedFieldId();
      if (activeId && required !== null) {
        this.service.updateFieldProperties(activeId, { required });
      }
    });

    this.fieldNullableControl.valueChanges.subscribe(nullable => {
      const activeId = this.service.selectedFieldId();
      if (activeId && nullable !== null) {
        this.service.updateFieldProperties(activeId, { nullable });
      }
    });

    this.fieldUniqueControl.valueChanges.subscribe(unique => {
      const activeId = this.service.selectedFieldId();
      if (activeId && unique !== null) {
        this.service.updateFieldProperties(activeId, { unique });
      }
    });

    this.fieldCustomExprControl.valueChanges.subscribe(expr => {
      const activeId = this.service.selectedFieldId();
      if (activeId && expr !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, customExpression: expr };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldEnumControl.valueChanges.subscribe(enumStr => {
      const activeId = this.service.selectedFieldId();
      if (activeId && enumStr !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const enumValues = enumStr.split(',').map(s => s.trim()).filter(Boolean);
          const props = { ...currentField.properties, enumValues };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldMinControl.valueChanges.subscribe(min => {
      const activeId = this.service.selectedFieldId();
      if (activeId && min !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, min };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldMaxControl.valueChanges.subscribe(max => {
      const activeId = this.service.selectedFieldId();
      if (activeId && max !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, max };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldDistributionControl.valueChanges.subscribe(dist => {
      const activeId = this.service.selectedFieldId();
      if (activeId && dist) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, distributionType: dist };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldNullPercentageControl.valueChanges.subscribe(nullPercentage => {
      const activeId = this.service.selectedFieldId();
      if (activeId && nullPercentage !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, nullPercentage };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    this.fieldDuplicatePercentageControl.valueChanges.subscribe(duplicatePercentage => {
      const activeId = this.service.selectedFieldId();
      if (activeId && duplicatePercentage !== null) {
        const currentField = this.service.selectedField();
        if (currentField) {
          const props = { ...currentField.properties, duplicatePercentage };
          this.service.updateFieldProperties(activeId, { properties: props });
        }
      }
    });

    // Global selector subscriptions
    this.localeControl.valueChanges.subscribe(locale => {
      if (locale) {
        this.service.schema.update(s => ({ ...s, locale }));
      }
    });

    this.seedControl.valueChanges.subscribe(seed => {
      if (seed !== null) {
        this.service.schema.update(s => ({ ...s, seed }));
      }
    });

    this.tableNameControl.valueChanges.subscribe(tbl => {
      if (tbl) {
        this.service.tableName.set(tbl);
      }
    });

    // Auto-generate initial set of data
    setTimeout(() => {
      this.service.generateData();
    }, 100);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Lazy load Monaco Editor
      loader.init().then(monaco => {
        const container = this.editorContainer.nativeElement;
        this.editor = monaco.editor.create(container, {
          value: this.service.previewOutput(),
          language: 'json',
          theme: 'dark',
          readOnly: true,
          minimap: { enabled: false },
          automaticLayout: true,
          wordWrap: 'on'
        });
      });
    }
  }

  ngOnDestroy() {
    if (this.editor) {
      (this.editor as { dispose: () => void }).dispose();
    }
  }

  // Monaco and Tab Selection Controllers
  onPreviewModeChanged(mode: string) {
    this.selectedPreviewMode.set(mode);
    if (mode === 'JSON' || mode === 'SQL' || mode === 'CSV' || mode === 'Raw') {
      const format = mode === 'SQL' ? 'SQL_INSERT' : mode === 'CSV' ? 'CSV' : 'JSON';
      this.service.outputFormat.set(format);
      setTimeout(() => {
        const previewText = this.service.getFormattedOutput(this.service.generatedRecords());
        this.service.previewOutput.set(previewText);
        if (this.editor) {
          const lang = mode.toLowerCase();
          const win = window as unknown as { monaco?: { editor: { setModelLanguage: (model: unknown, lang: string) => void } } };
          const monacoInstance = win.monaco;
          if (monacoInstance) {
            const model = (this.editor as { getModel: () => unknown }).getModel();
            monacoInstance.editor.setModelLanguage(model, lang === 'raw' ? 'plaintext' : lang);
          }
        }
      }, 50);
    }
  }

  setDialectFormat(format: string) {
    this.service.outputFormat.set(format);
    const textMode = format.includes('SQL') || format === 'CSV' || format === 'YAML' || format === 'JSON' || format === 'TSInterface' || format === 'OpenAPI';
    if (textMode) {
      this.selectedPreviewMode.set('JSON'); // Force text view
      setTimeout(() => {
        const previewText = this.service.getFormattedOutput(this.service.generatedRecords());
        this.service.previewOutput.set(previewText);
        if (this.editor) {
          let lang = 'json';
          if (format.includes('SQL')) lang = 'sql';
          else if (format === 'CSV') lang = 'plaintext';
          else if (format === 'YAML') lang = 'yaml';
          else if (format === 'TSInterface') lang = 'typescript';

          const win = window as unknown as { monaco?: { editor: { setModelLanguage: (model: unknown, lang: string) => void } } };
          const monacoInstance = win.monaco;
          if (monacoInstance) {
            const model = (this.editor as { getModel: () => unknown }).getModel();
            monacoInstance.editor.setModelLanguage(model, lang);
          }
        }
      }, 50);
    }
  }

  // Schema movement
  moveField(index: number, direction: number) {
    const fields = [...this.service.schema().fields];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    // Swap elements
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    this.service.reorderFields(fields);
  }

  // File triggers
  triggerImportSchemaInput() {
    this.importSchemaFileInput.nativeElement.click();
  }

  onSchemaFileImported(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const sch = JSON.parse(reader.result as string);
          if (sch && Array.isArray(sch.fields)) {
            this.service.saveState();
            this.service.schema.set(sch);
            this.service.addLog('success', `Imported schema "${sch.name || 'External file'}" successfully.`);
            this.service.generateData();
          } else {
            this.service.addLog('error', 'Invalid JSON schema file formatting.');
          }
        } catch {
          this.service.addLog('error', 'Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
  }

  exportSchema() {
    const schemaStr = JSON.stringify(this.service.schema(), null, 2);
    const blob = new Blob([schemaStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.service.schema().name.toLowerCase().replace(/\s+/g, '_')}_schema.json`;
    link.click();
    this.service.addLog('success', 'Schema definition file exported.');
  }

  newProject() {
    this.service.saveState();
    this.service.clearSchema();
    this.service.currentProjectName.set('New Project');
    this.service.currentProjectId.set(null);
    this.service.addLog('info', 'New workspace initialized.');
  }

  // Exporters
  copyOutput() {
    const text = this.service.getFormattedOutput(this.service.generatedRecords());
    navigator.clipboard.writeText(text);
    this.service.addLog('success', 'Copied generated dataset to system clipboard.');
  }

  downloadOutputFile() {
    const format = this.service.outputFormat();
    const text = this.service.getFormattedOutput(this.service.generatedRecords());

    let extension = 'json';
    let mimeType = 'application/json';

    if (format === 'JSONL') extension = 'jsonl';
    else if (format === 'CSV') { extension = 'csv'; mimeType = 'text/csv'; }
    else if (format === 'TSV') { extension = 'tsv'; mimeType = 'text/tab-separated-values'; }
    else if (format === 'XML') { extension = 'xml'; mimeType = 'application/xml'; }
    else if (format === 'YAML') { extension = 'yaml'; mimeType = 'text/yaml'; }
    else if (format.includes('SQL')) { extension = 'sql'; mimeType = 'text/plain'; }
    else if (format === 'Excel') { extension = 'xls'; mimeType = 'application/vnd.ms-excel'; }
    else if (format === 'TSInterface') { extension = 'ts'; mimeType = 'text/plain'; }
    else if (format === 'OpenAPI') { extension = 'json'; mimeType = 'application/json'; }

    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.service.tableName()}_dataset.${extension}`;
    link.click();
    this.service.addLog('success', `Downloaded dataset as ${extension.toUpperCase()} file.`);
  }

  // Helpers
  getLogColor(level: string): string {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'warn': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      default: return 'text-zinc-300';
    }
  }

  formatCellValue(val: unknown): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  askGeminiAI(prompt: string) {
    if (!prompt.trim()) return;
    this.service.fetchAiFieldSuggestions(prompt);
  }
}
