import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ConversionService, HistoryItem, UnitCategory } from './conversion.service';

@Component({
    selector: 'app-unit-converter',
    standalone: true,
    imports: [CommonModule, MatIconModule, ReactiveFormsModule, MatSnackBarModule],
    template: `<div class="flex-grow w-full max-w-7xl mx-auto p-0 md:p-0 lg:p-0 gap-2 md:gap-2">
                <!-- LEFT PANEL: Category selector grid & Main conversion engine card (8 columns on desktop) -->
                <section id="conversion-workspace" class="flex flex-col space-y-4 md:space-y-6">
                <!-- Category Browser & Filter Search -->
                <aside class="m-0 mb-2 relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                    <!-- Toggle Button -->
                    <button (click)="toggleSidebar()" type="button" tabindex="0" class="absolute top-2 cursor-pointer right-3 z-20 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg flex items-center justify-center transition"
                    [title]="sidebarExpanded() ? 'Collapse tools' : 'Expand tools'">
                    <mat-icon style="font-size:18px;width:18px;height:18px;">
                        {{ sidebarExpanded() ? 'expand_circle_up' : 'expand_circle_down' }}
                    </mat-icon>
                    </button>
                    @if (sidebarExpanded()) {
                    <!-- Expanded State -->
                    <div class="p-4 pr-12 border-b border-zinc-150 dark:border-zinc-850">
                        <span class="text-[10px] font-mono font-extrabold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
                        <div class="flex items-center space-x-2.5">
                            <mat-icon class="text-emerald-600 dark:text-emerald-400">grid_view</mat-icon>
                            <h2 class="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Select Conversion Class</h2>
                        </div>
                        </span>
                    </div>
                    <!-- Active files container with drag handles -->
                    <div class="p-2 space-y-3">
                        <!-- Scrollable Category Grid -->
                        <div id="category-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                        @for (cat of filteredCategories(); track cat.id) {
                            <button [id]="'cat-btn-' + cat.id"
                                    (click)="selectCategory(cat.id)"
                                    [class.bg-emerald-600]="activeCategory().id === cat.id"
                                    [class.text-white]="activeCategory().id === cat.id"
                                    [class.border-emerald-600]="activeCategory().id === cat.id"
                                    [class.dark:bg-emerald-500]="activeCategory().id === cat.id"
                                    [class.bg-slate-50]="activeCategory().id !== cat.id"
                                    [class.text-slate-700]="activeCategory().id !== cat.id"
                                    [class.dark:text-slate-300]="activeCategory().id !== cat.id"
                                    [class.dark:bg-slate-800/50]="activeCategory().id !== cat.id"
                                    [class.border-slate-200]="activeCategory().id !== cat.id"
                                    [class.dark:border-slate-800]="activeCategory().id !== cat.id"
                                    class="cursor-pointer flex items-center space-x-2.5 p-2.5 rounded-xl border text-left text-xs sm:text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer truncate shadow-sm">
                            <mat-icon [class.text-emerald-500]="activeCategory().id !== cat.id" [class.text-white]="activeCategory().id === cat.id" class="text-lg flex-shrink-0">{{ cat.icon }}</mat-icon>
                            <span class="truncate">{{ cat.name }}</span>
                            </button>
                        } @empty {
                            <div class="col-span-full py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            <mat-icon class="text-3xl mb-1">sentiment_dissatisfied</mat-icon>
                            <p>No categories found matching search.</p>
                            </div>
                        }
                        </div>
                    </div>
                    } @else {
                        <!-- Collapsed State -->
                        <div class="flex items-center gap-2 p-2">
                            <mat-icon class="text-emerald-600 dark:text-emerald-400">grid_view</mat-icon>
                            <h2 class="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Select Conversion Class</h2>
                        </div>
                    }
                </aside>
                <!-- Main Engine Converter Card -->
                 @if (activeCategory().id !== 'percentage') {
                <div id="converter-primary-card" class="bg-white dark:bg-slate-900/35 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300">
                    <!-- Floating decorative corner badge representing active conversion category -->
                    <div class="absolute -right-12 -top-12 h-32 w-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full flex items-end justify-start p-6 text-emerald-500">
                    <mat-icon class="text-[50px] font-bold opacity-30">{{ activeCategory().icon }}</mat-icon>
                    </div>

                    <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-3">
                        <span class="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <mat-icon>{{ activeCategory().icon }}</mat-icon>
                        </span>
                        <div>
                        <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Active Class</span>
                        <h3 id="current-conversion-header" class="text-xl font-bold text-slate-800 dark:text-white">{{ activeCategory().name }} Calculator</h3>
                        </div>
                    </div>
                    </div>

                    <!-- The Transformation Interactive Row -->
                    <div class="grid grid-cols-1 md:grid-cols-11 gap-4 items-center mb-6">
                    <!-- Source Entry Field Block (from) -->
                    <div class="md:col-span-5 flex flex-col space-y-2">
                        <label for="source-unit-val" class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Source Value</label>
                        <div class="relative bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-inner hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                        <!-- Real Numeric Value Input -->
                        <input id="source-unit-val"
                                type="number"
                                [formControl]="inputValueControl"
                                placeholder="0.00"
                                aria-label="Value to convert"
                                class="w-full text-xl md:text-2xl font-semibold bg-transparent text-slate-900 dark:text-white border-none focus:outline-none focus:ring-0 font-mono" />
                        <div class="mt-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
                            Input unit helper
                        </div>
                        </div>
                        <!-- Source Unit search and selection selector -->
                        <div class="flex flex-col space-y-1 mt-2">
                        <!-- Standard custom select listing -->
                        <select id="source-units-select"
                                [formControl]="fromUnitControl"
                                aria-label="Source unit selection"
                                class="w-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1 shadow-sm">
                            @for (unit of currentUnits(); track unit.id) {
                            <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
                            }
                        </select>
                        </div>
                    </div>

                    <!-- Swap Trigger Column (centered) -->
                    <div class="md:col-span-1 flex flex-col items-center justify-center pt-4 md:pt-6">
                        <button id="swap-units-btn"
                                (click)="swapUnits()"
                                title="Swap source and target units"
                                aria-label="Swap source and target units"
                                class="cursor-pointer h-11 w-11 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-700 dark:hover:bg-emerald-650 hover:scale-110 active:scale-95 shadow-md hover:shadow-lg transition-all cursor-pointer">
                        <mat-icon class="transform rotate-90 md:rotate-0">sync_alt</mat-icon>
                        </button>
                    </div>

                    <!-- Destination Target Field Block (to) -->
                    <div class="md:col-span-5 flex flex-col space-y-2">
                        <label for="destination-output" class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Converted Value</label>
                        <div class="relative bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-500/20 dark:border-emerald-500/10 p-3 shadow-inner min-h-[58px] flex items-center">
                        <div id="destination-output" class="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight break-all">
                            {{ formattedValue() }}
                        </div>
                        </div>

                        <!-- Destination Unit search and selection selector -->
                        <div class="flex flex-col space-y-1 mt-2">
                        <!-- Standard custom select listing -->
                        <select id="target-units-select"
                                [formControl]="toUnitControl"
                                aria-label="Target unit selection"
                                class="w-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1 shadow-sm">
                            @for (unit of this.currentUnits(); track unit.id) {
                            <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
                            }
                        </select>
                        </div>
                    </div>

                    </div>

                    <!-- Utility controls: Precision decimals, Clear, Copy -->
                    <div class="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex flex-wrap items-center justify-between gap-4">
                    <!-- Precision selection -->
                    <div class="flex items-center space-x-2.5">
                        <span class="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wide">Decimals:</span>
                        <select id="precision-select"
                                [formControl]="precisionControl"
                                aria-label="Decimal precision selector"
                                class="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2.5 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500">
                        @for (pr of [0,1,2,3,4,5,6,7,8,9,10]; track pr) {
                            <option [value]="pr">{{ pr }}</option>
                        }
                        </select>
                    </div>

                    <!-- Clear and Copy Action Buttons -->
                    <div class="flex items-center space-x-2">
                        <!-- Clear trigger -->
                        <button id="clear-workspace-btn"
                                (click)="clearValues()"
                                class="px-4 py-2 border border-red-200 bg-red-50/10 text-red-500 hover:text-red-600 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer">
                        <mat-icon class="text-base">clear_all</mat-icon>Reset
                        </button>

                        <!-- Copy result -->
                        <button id="copy-result-btn"
                                (click)="copyResult()"
                                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-550 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer">
                        <mat-icon class="text-base">content_copy</mat-icon>
                        <span>Copy Result</span>
                        </button>
                    </div>
                    </div>
                </div>
                }

                <!-- Interactive Percentage Companion Card -->
                @if (activeCategory().id === 'percentage') {
                    <div id="percentage-companion-card" class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/35 rounded-2xl p-4 shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div class="flex items-center space-x-3">
                        <span class="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <mat-icon>percent</mat-icon>
                        </span>
                        <div>
                            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Interactive Tool</span>
                            <h3 class="text-lg font-bold text-slate-800 dark:text-white">Percentage Multi-Calculator</h3>
                        </div>
                        </div>
                        <!-- Tab switches for the three sub-calculators -->
                        <div class="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                        <button (click)="pctType.set('value')"
                                [class.bg-white]="pctType() === 'value'"
                                [class.dark:bg-slate-800]="pctType() === 'value'"
                                [class.shadow-sm]="pctType() === 'value'"
                                [class.text-slate-900]="pctType() === 'value'"
                                [class.dark:text-white]="pctType() === 'value'"
                                [class.text-slate-500]="pctType() !== 'value'"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                            Find Value
                        </button>
                        <button (click)="pctType.set('percent')"
                                [class.bg-white]="pctType() === 'percent'"
                                [class.dark:bg-slate-800]="pctType() === 'percent'"
                                [class.shadow-sm]="pctType() === 'percent'"
                                [class.text-slate-900]="pctType() === 'percent'"
                                [class.dark:text-white]="pctType() === 'percent'"
                                [class.text-slate-500]="pctType() !== 'percent'"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                            Find Percent
                        </button>
                        <button (click)="pctType.set('change')"
                                [class.bg-white]="pctType() === 'change'"
                                [class.dark:bg-slate-800]="pctType() === 'change'"
                                [class.shadow-sm]="pctType() === 'change'"
                                [class.text-slate-900]="pctType() === 'change'"
                                [class.dark:text-white]="pctType() === 'change'"
                                [class.text-slate-500]="pctType() !== 'change'"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                            % Change
                        </button>
                        </div>
                    </div>

                    <!-- SUB-CALCULATOR 1: Find Value (What is P% of X?) -->
                    @if (pctType() === 'value') {
                        <div class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                            <!-- Percentage (P) -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">Percentage (P)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <input type="number" [value]="pctValP()"
                                    (input)="updatePctValP($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                                <span class="text-xs font-bold text-slate-400 font-mono ml-1">%</span>
                            </div>
                            </div>

                            <!-- OF word -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-xs uppercase">
                            of
                            </div>

                            <!-- Number (X) -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">Value (X)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl">
                                <input type="number" [value]="pctValX()"
                                    (input)="updatePctValX($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                            </div>
                            </div>

                            <!-- EQUALS sign -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-xs">
                            =
                            </div>

                            <!-- Result -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-emerald-500 uppercase tracking-wide block">Result</span>
                            <div class="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-xl py-2 px-3 text-center">
                                <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {{ computedPctValueResult().toFixed(precisionValue()) }}
                                </span>
                            </div>
                            </div>
                        </div>

                        <!-- Explanation equation badge -->
                        <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                            <mat-icon class="text-emerald-500 text-sm">info</mat-icon>
                            <span>
                            <strong>Equation:</strong> ({{ pctValP() }}% / 100) × {{ pctValX() }} = <strong>{{ computedPctValueResult().toFixed(precisionValue()) }}</strong>
                            </span>
                        </div>
                        </div>
                    }

                    <!-- SUB-CALCULATOR 2: Find Ratio Percent (X is what percent of Y?) -->
                    @if (pctType() === 'percent') {
                        <div class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                            <!-- Value X -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">Value (X)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <input type="number" [value]="pctRatioX()"
                                    (input)="updatePctRatioX($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                            </div>
                            </div>

                            <!-- IS WHAT PERCENT OF word -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-[10px] uppercase">
                            is what % of
                            </div>

                            <!-- Total Y -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">Total Value (Y)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <input type="number" [value]="pctRatioY()"
                                    (input)="updatePctRatioY($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                            </div>
                            </div>

                            <!-- EQUALS -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-xs">
                            =
                            </div>

                            <!-- Result -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-emerald-500 uppercase tracking-wide block">Percent Result</span>
                            <div class="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-xl py-2 px-3 text-center flex items-center justify-center space-x-1">
                                <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {{ computedPctRatioResult().toFixed(precisionValue()) }}
                                </span>
                                <span class="text-xs font-bold text-emerald-500">%</span>
                            </div>
                            </div>
                        </div>

                        <!-- Explanation equation badge -->
                        <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                            <mat-icon class="text-emerald-500 text-sm">info</mat-icon>
                            <span>
                            <strong>Equation:</strong> ({{ pctRatioX() }} / {{ pctRatioY() }}) × 100 = <strong>{{ computedPctRatioResult().toFixed(precisionValue()) }}%</strong>
                            </span>
                        </div>
                        </div>
                    }

                    <!-- SUB-CALCULATOR 3: Find Percentage Change (Increase/Decrease) -->
                    @if (pctType() === 'change') {
                        <div class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                            <!-- Initial X -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">Initial Value (X)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <input type="number" [value]="pctChangeX()"
                                    (input)="updatePctChangeX($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                            </div>
                            </div>

                            <!-- TO word -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-xs uppercase">
                            to
                            </div>

                            <!-- New Y -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide block">New Value (Y)</span>
                            <div class="relative flex items-center px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <input type="number" [value]="pctChangeY()"
                                    (input)="updatePctChangeY($event)"
                                    class="w-full py-2.5 bg-transparent text-slate-850 dark:text-white font-mono text-sm font-semibold focus:outline-none focus:ring-0" />
                            </div>
                            </div>

                            <!-- EQUALS -->
                            <div class="md:col-span-1 text-center font-bold text-slate-400 text-xs">
                            =
                            </div>

                            <!-- Result -->
                            <div class="md:col-span-3 flex flex-col space-y-1.5">
                            <span class="text-xs font-bold uppercase tracking-wide block"
                                    [class.text-emerald-500]="computedPctChangeResult() >= 0"
                                    [class.text-red-500]="computedPctChangeResult() < 0">
                                {{ computedPctChangeResult() >= 0 ? 'Increase' : 'Decrease' }}
                            </span>
                            <div class="rounded-xl py-2 px-3 text-center flex items-center justify-center space-x-1 border"
                                [class.bg-emerald-50]="computedPctChangeResult() >= 0"
                                [class.dark:bg-emerald-950/20]="computedPctChangeResult() >= 0"
                                [class.border-emerald-200]="computedPctChangeResult() >= 0"
                                [class.dark:border-emerald-900/40]="computedPctChangeResult() >= 0"
                                [class.bg-red-50]="computedPctChangeResult() < 0"
                                [class.dark:bg-red-950/20]="computedPctChangeResult() < 0"
                                [class.border-red-200]="computedPctChangeResult() < 0"
                                [class.dark:border-red-900/40]="computedPctChangeResult() < 0">
                                <span class="text-sm font-bold font-mono"
                                    [class.text-emerald-600]="computedPctChangeResult() >= 0"
                                    [class.dark:text-emerald-400]="computedPctChangeResult() >= 0"
                                    [class.text-red-700]="computedPctChangeResult() < 0"
                                    [class.dark:text-red-400]="computedPctChangeResult() < 0">
                                {{ computedPctChangeResult() >= 0 ? '+' : '' }}{{ computedPctChangeResult().toFixed(precisionValue()) }}
                                </span>
                                <span class="text-xs font-bold"
                                    [class.text-emerald-500]="computedPctChangeResult() >= 0"
                                    [class.text-red-500]="computedPctChangeResult() < 0">%</span>
                            </div>
                            </div>
                        </div>

                        <!-- Explanation equation badge -->
                        <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                            <mat-icon class="text-emerald-500 text-sm">info</mat-icon>
                            <span>
                            <strong>Equation:</strong> (({{ pctChangeY() }} - {{ pctChangeX() }}) / {{ pctChangeX() }}) × 100 = <strong>{{ computedPctChangeResult() >= 0 ? '+' : '' }}{{ computedPctChangeResult().toFixed(precisionValue()) }}%</strong>
                            </span>
                        </div>
                        </div>
                    }
                    </div>
                }

                <!-- Formula and Calculation Steps Visualizer panel -->
                @if (currentFormulaSteps(); as fs) {
                    <div id="mathematical-steps-container" class="bg-white dark:bg-zinc-900/35 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-all duration-300">
                    <div class="flex items-center space-x-2.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <mat-icon class="text-sky-550 dark:text-emerald-400">calculate</mat-icon>
                        <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Calculation Steps & Formulas</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400">See behind the numbers & mathematical relationships</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <!-- Left block: Mathematical algebraic parameters -->
                        <div class="md:col-span-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 flex flex-col justify-between">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono block">Algebraic Formula</span>
                            <code class="text-base font-bold text-slate-800 dark:text-emerald-300 font-mono break-all mt-1 block select-all bg-black/5 dark:bg-white/5 py-1.5 px-2.5 rounded border border-black/5">
                            {{ fs.formula }}
                            </code>
                        </div>

                        <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono block">Conversion Ratio Factors</span>
                            <p class="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-1 font-mono">
                            {{ fs.factorText }}
                            </p>
                        </div>
                        </div>

                        <!-- Right block: Multi-step calculation timeline stepper -->
                        <div class="md:col-span-7 flex flex-col space-y-3">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono block">Execution Procedure</span>
                        <div class="space-y-3.5 pl-2 border-l-2 border-emerald-500/30 dark:border-emerald-500/20 ml-1">
                            @for (step of fs.steps; track step; let idx = $index) {
                            <div class="relative pl-4">
                                <!-- Steps node indicator -->
                                <span class="absolute -left-[15px] top-0.5 h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-xs font-bold font-mono">
                                {{ idx + 1 }}
                                </span>
                                <p class="text-xs md:text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-mono font-medium">
                                {{ step }}
                                </p>
                            </div>
                            }
                        </div>
                        </div>

                    </div>
                    </div>
                }

                </section>

            </div>
            `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitConverterComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly snackBar = inject(MatSnackBar);
    readonly conversionService = inject(ConversionService);
    private readonly platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);
    activeCategory = signal<UnitCategory>(this.conversionService.categories[0]);
    fromUnitId = signal<string>('length_m');
    toUnitId = signal<string>('length_km');
    inputValue = signal<number>(1);
    precisionValue = signal<number>(4);
    // Percentage Companion Calculator Signal States
    pctType = signal<'value' | 'percent' | 'change'>('value');
    pctValP = signal<number>(15);
    pctValX = signal<number>(200);
    pctRatioX = signal<number>(30);
    pctRatioY = signal<number>(150);
    pctChangeX = signal<number>(100);
    pctChangeY = signal<number>(125);
    computedPctValueResult = computed(() => (this.pctValP() / 100) * this.pctValX());

    computedPctRatioResult = computed(() => {
        const y = this.pctRatioY();
        if (y === 0) return 0;
        return (this.pctRatioX() / y) * 100;
    });

    computedPctChangeResult = computed(() => {
        const x = this.pctChangeX();
        if (x === 0) return 0;
        return ((this.pctChangeY() - x) / x) * 100;
    });

    // Input event updates for zoneless reactivity
    updatePctValP(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctValP.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    updatePctValX(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctValX.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    updatePctRatioX(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctRatioX.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    updatePctRatioY(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctRatioY.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    updatePctChangeX(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctChangeX.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    updatePctChangeY(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        const parsed = Number.parseFloat(val);
        this.pctChangeY.set(Number.isNaN(parsed) ? 0 : parsed);
    }

    inputValueControl = new FormControl(1);
    fromUnitControl = new FormControl('length_m');
    toUnitControl = new FormControl('length_km');
    precisionControl = new FormControl(4);

    // Common conversions list
    readonly commonConversionsList = [
        { id: 'km_mi', categoryId: 'length', categoryName: 'Length', title: 'km ➔ mi', fromUnitId: 'length_km', toUnitId: 'length_mi', value: 1 },
        { id: 'm_ft', categoryId: 'length', categoryName: 'Length', title: 'm ➔ ft', fromUnitId: 'length_m', toUnitId: 'length_ft', value: 1 },
        { id: 'c_f', categoryId: 'temperature', categoryName: 'Temperature', title: '°C ➔ °F', fromUnitId: 'temp_c', toUnitId: 'temp_f', value: 20 },
        { id: 'kg_lb', categoryId: 'mass', categoryName: 'Mass / Weight', title: 'kg ➔ lb', fromUnitId: 'mass_kg', toUnitId: 'mass_lb', value: 5 },
        { id: 'l_gal', categoryId: 'volume', categoryName: 'Volume', title: 'L ➔ gal', fromUnitId: 'volume_l', toUnitId: 'volume_gal_us', value: 2 },
        { id: 'pct_dec_pct', categoryId: 'percentage', categoryName: 'Percentage', title: 'dec ➔ %', fromUnitId: 'pct_decimal', toUnitId: 'pct_percent', value: 0.15 }
    ];

    // COMPUTED SIGNALS
    currentUnits = computed(() => this.conversionService.getUnitsByCategory(this.activeCategory().id));

    // Filtered categories based on the layout search query
    filteredCategories = computed(() => this.conversionService.categories);
    // Core conversions values
    currentFromUnit = computed(() => this.conversionService.allUnits.find(u => u.id === this.fromUnitId()));

    currentToUnit = computed(() => this.conversionService.allUnits.find(u => u.id === this.toUnitId()));

    convertedValue = computed(() => {
        const from = this.currentFromUnit();
        const to = this.currentToUnit();
        const val = this.inputValue();
        if (!from || !to) return 0;
        return this.conversionService.convert(val, from, to);
    });

    formattedValue = computed(() => {
        const res = this.convertedValue();
        const pr = this.precisionValue();
        if (Math.abs(res) < 1e-10 && res !== 0) {
            return res.toExponential(pr);
        }
        return res.toFixed(pr);
    });

    currentFormulaSteps = computed(() => {
        const from = this.currentFromUnit();
        const to = this.currentToUnit();
        const val = this.inputValue();
        const pr = this.precisionValue();
        if (!from || !to) return null;
        return this.conversionService.getFormulaAndSteps(val, from, to, pr);
    });

    constructor() {
        // Sync reactive state changes to tracking signals
        this.inputValueControl.valueChanges.subscribe(v => {
            const parsed = v !== null ? Number(v) : 0;
            if (!Number.isNaN(parsed)) {
                this.inputValue.set(parsed);
            }
        });

        this.fromUnitControl.valueChanges.subscribe(v => {
            if (v) {
                this.fromUnitId.set(v);
            }
        });

        this.toUnitControl.valueChanges.subscribe(v => {
            if (v) {
                this.toUnitId.set(v);
            }
        });

        this.precisionControl.valueChanges.subscribe(v => {
            if (v !== null) {
                this.precisionValue.set(Number(v));
            }
        });

    }

    public sidebarExpanded = signal<boolean>(false);
    public toggleSidebar(): void {
        this.sidebarExpanded.update(v => !v);
    }
    ngOnInit(): void {
        // Set SEO metadata and titles
        this.titleService.setTitle('Unit Converter - Standalone Precision Conversions');
        this.metaService.addTags([
            { name: 'description', content: 'Modern offline-ready unit converter using responsive standalone Angular. Supports 30 conversion categories including scientific units.' },
            { name: 'keywords', content: 'unit converter, metrics conversion, temperature converter, typography calculator, cooking converter, angle conversion, angular physical units' },
            { name: 'author', content: 'OmniConvert Engine Studio' }
        ]);

        // Read values from LocalStorage if browser context
        if (this.isBrowser) {
            // Register PWA service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then((reg) => console.log('Service Worker registered', reg.scope)).catch((err) => console.warn('Service Worker registration failed', err));
            }
        }
    }

    // Set the structural category selection
    selectCategory(catId: string): void {
        const cat = this.conversionService.getCategoryById(catId);
        if (!cat) return;

        // Reset unit inputs inside the chosen class
        const categoryUnits = this.conversionService.getUnitsByCategory(catId);
        if (categoryUnits.length > 0) {
            const defaultFrom = categoryUnits[0];
            const defaultTo = categoryUnits[1] || categoryUnits[0];

            // Update state triggers
            this.activeCategory.set(cat);

            // Update Signals & controls
            this.fromUnitControl.setValue(defaultFrom.id, { emitEvent: false });
            this.toUnitControl.setValue(defaultTo.id, { emitEvent: false });

            this.fromUnitId.set(defaultFrom.id);
            this.toUnitId.set(defaultTo.id);

            // Auto-scale value default matching simple calculations
            this.inputValueControl.setValue(1, { emitEvent: false });
            this.inputValue.set(1);
        }
    }

    // Swaps source and target units instantly
    swapUnits(): void {
        const fromId = this.fromUnitId();
        const toId = this.toUnitId();
        this.fromUnitControl.setValue(toId, { emitEvent: false });
        this.toUnitControl.setValue(fromId, { emitEvent: false });
        this.fromUnitId.set(toId);
        this.toUnitId.set(fromId);
        this.snackBar.open('Swapped units.', 'OK', { duration: 1500 });
    }

    // Clears active conversion variables
    clearValues(): void {
        this.inputValueControl.setValue(0);
        this.inputValue.set(0);
        this.snackBar.open('Cleaned numeric inputs.', 'OK', { duration: 1500 });
    }

    // Clipboard copy functions
    copyResult(): void {
        if (typeof window !== 'undefined') {
            const copyStr = `${this.inputValue()} ${this.currentFromUnit()?.symbol || ''} = ${this.formattedValue()} ${this.currentToUnit()?.symbol || ''}`;
            navigator.clipboard.writeText(copyStr).then(() => {
                this.snackBar.open('Successfully copied to clipboard: ' + copyStr, 'Perfect', { duration: 3000 });
            }).catch(() => {
                this.snackBar.open('Copy failed.', 'Close', { duration: 2000 });
            });
        }
    }

    // Copy standard text values directly
    copyValueText(textVal: string): void {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(textVal).then(() => {
                this.snackBar.open(`Value "${textVal}" copied.`, 'Close', { duration: 1500 });
            });
        }
    }

    // Popular Conversion link clicks
    loadCommonConversion(link: { id: string; categoryId: string; categoryName: string; title: string; fromUnitId: string; toUnitId: string; value: number }): void {
        const cat = this.conversionService.getCategoryById(link.categoryId);
        if (!cat) return;

        this.activeCategory.set(cat);

        this.fromUnitControl.setValue(link.fromUnitId, { emitEvent: false });
        this.toUnitControl.setValue(link.toUnitId, { emitEvent: false });

        this.fromUnitId.set(link.fromUnitId);
        this.toUnitId.set(link.toUnitId);

        this.inputValueControl.setValue(link.value);
        this.inputValue.set(link.value);

        this.snackBar.open(`Loaded standard conversion: ${link.title}`, 'OK', { duration: 1500 });
    }

    // Historical items reload setup
    loadHistory(item: HistoryItem): void {
        const cat = this.conversionService.getCategoryById(item.categoryId);
        if (!cat) return;

        // Search and extract units representing active item
        const fromUnitOpt = this.conversionService.allUnits.find(u => u.name === item.fromUnitName && u.categoryId === item.categoryId);
        const toUnitOpt = this.conversionService.allUnits.find(u => u.name === item.toUnitName && u.categoryId === item.categoryId);

        if (!fromUnitOpt || !toUnitOpt) {
            this.snackBar.open('Historical unit mappings are no longer available in engine data.', 'Close', { duration: 2000 });
            return;
        }

        this.activeCategory.set(cat);

        this.fromUnitControl.setValue(fromUnitOpt.id, { emitEvent: false });
        this.toUnitControl.setValue(toUnitOpt.id, { emitEvent: false });

        this.fromUnitId.set(fromUnitOpt.id);
        this.toUnitId.set(toUnitOpt.id);

        this.inputValueControl.setValue(item.inputValue);
        this.inputValue.set(item.inputValue);

        this.precisionControl.setValue(item.precision, { emitEvent: false });
        this.precisionValue.set(item.precision);

        this.snackBar.open('Restored calculation configuration.', 'OK', { duration: 2000 });
    }

    // Timestamp typography formattings
    formatTime(timestamp: number): string {
        const d = new Date(timestamp);
        const hrs = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        const secs = d.getSeconds().toString().padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }
}
