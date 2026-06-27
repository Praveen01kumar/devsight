import { ChangeDetectionStrategy, Component, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Input } from '@angular/core';

// Interfaces for our state and UI
interface WorldClock {
  name: string;
  zone: string;
  flag: string;
  time: string;
  offset: string;
}

interface SavedCalculation {
  id: string;
  type: string;
  description: string;
  input: string;
  output: string;
  timestamp: number;
}

interface OccurenceRow {
  index: number;
  date: string;
  dayOfWeek: string;
}

@Component({
  selector: 'app-date-time-suite',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 text-zinc-900 dark:text-zinc-105 select-text">
      
      <!-- Top Live Banner Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2 p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm select-none">
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">SYSTEM TIME & ZONE (AUTO-DETECTED)</span>
            <div class="text-xl font-mono text-emerald-600 dark:text-emerald-400 font-extrabold tracking-tight">
              {{ systemClock() }}
            </div>
            <div class="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 font-mono">
              <mat-icon class="scale-50 max-h-4">public</mat-icon>
              <span>{{ userTimezone() }} (UTC{{ userOffsetString() }})</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-mono shrink-0">
            <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl leading-snug">
              <span class="text-zinc-500 block uppercase font-bold">DAY OF YR</span>
              <span class="text-zinc-800 dark:text-zinc-300 font-extrabold">{{ dayOfYear() }}</span>
            </div>
            <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl leading-snug">
              <span class="text-zinc-500 block uppercase font-bold">WEEK NO</span>
              <span class="text-zinc-800 dark:text-zinc-300 font-extrabold">{{ weekOfYear() }}</span>
            </div>
            <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl leading-snug">
              <span class="text-zinc-500 block uppercase font-bold">LEAP YEAR</span>
              <span class="font-extrabold" [class.text-emerald-500]="isLeapYear()" [class.text-zinc-500]="!isLeapYear()">
                {{ isLeapYear() ? 'YES' : 'NO' }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col justify-between shadow-sm font-mono text-center relative overflow-hidden select-none">
          <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block pb-1 border-b border-zinc-150 dark:border-zinc-850">LIVE EPOCH</span>
          <div class="text-xl md:text-2xl font-bold text-sky-500 dark:text-sky-455 tracking-wider py-1.5 select-all">
            {{ tickingEpoch() }}
          </div>
          <div class="flex items-center justify-center gap-2 text-[10px]">
            <button 
              (click)="toggleEpochPause()" 
              class="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-650 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-white transition flex items-center gap-1 font-bold cursor-pointer dark:text-zinc-400"
            >
              <mat-icon class="scale-50 max-h-4 text-emerald-500">{{ epochPaused() ? 'play_arrow' : 'pause' }}</mat-icon>
              <span>{{ epochPaused() ? 'RESUME' : 'PAUSE' }}</span>
            </button>
            <button 
              (click)="copyEpochTicker()" 
              class="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-650 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-white transition flex items-center gap-1 font-bold cursor-pointer dark:text-zinc-400"
            >
              <mat-icon class="scale-50 max-h-4 text-sky-500">{{ tickerCopied() ? 'check' : 'content_copy' }}</mat-icon>
              <span>{{ tickerCopied() ? 'COPIED' : 'COPY' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Suite Tabs Navigation Header (Synchronized with URL Mode or fallback) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-150 dark:border-zinc-800 select-none no-scrollbar">
        @for (item of SUITE_TABS; track item.id) {
          <button
            (click)="selectLocalMode(item.id)"
            [class.border-emerald-500]="activeMode() === item.id"
            [class.bg-emerald-500/5]="activeMode() === item.id"
            [class.text-emerald-700]="activeMode() === item.id"
            [class.dark:text-emerald-400]="activeMode() === item.id"
            [class.border-zinc-200]="activeMode() !== item.id"
            [class.dark:border-zinc-800]="activeMode() !== item.id"
            [class.text-zinc-600]="activeMode() !== item.id"
            [class.dark:text-zinc-400]="activeMode() !== item.id"
            class="px-3.5 py-2 shrink-0 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-950/20 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="scale-75 text-zinc-500 dark:text-zinc-400">{{ item.icon }}</mat-icon>
            <span>{{ item.label | uppercase }}</span>
          </button>
        }
      </div>

      <!-- MAIN CONTAINER: Switches view panels based on [activeMode] -->
      <main class="space-y-6">
        <!-- ======================= 1. DATE DIFFERENCE & DAYS / MONTHS / YEARS CALCULATOR ======================= -->
        @if (activeMode() === 'date-difference' || activeMode() === 'days-calculator' || activeMode() === 'months-calculator' || activeMode() === 'years-calculator') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <!-- Controls block -->
            <div class="lg:col-span-2 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5">
                  <mat-icon class="text-emerald-500">date_range</mat-icon> CALCULATION BOUNDARIES
                </span>

                <!-- Start Date input -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="block text-[10px] font-mono font-bold text-zinc-400">START DATE & TIME</span>
                    <button (click)="diffStart.set(todayISO())" class="text-[10px] font-mono text-emerald-500 font-extrabold">SET TODAY</button>
                  </div>
                  <input 
                    type="datetime-local" 
                    #diffStartInput
                    [value]="diffStart()"
                    (change)="diffStart.set(diffStartInput.value)"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <!-- End Date input -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="block text-[10px] font-mono font-bold text-zinc-400">END DATE & TIME</span>
                    <button (click)="diffEnd.set(todayISO())" class="text-[10px] font-mono text-emerald-500 font-extrabold">SET TODAY</button>
                  </div>
                  <input 
                    type="datetime-local" 
                    #diffEndInput
                    [value]="diffEnd()"
                    (change)="diffEnd.set(diffEndInput.value)"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <!-- Business days checkbox -->
                <div class="pt-2 flex items-center justify-between border-t border-zinc-150 dark:border-zinc-850 text-xs font-mono select-none">
                  <span class="text-zinc-500">Only count Business Days (Mon-Fri)</span>
                  <button 
                    (click)="diffBusinessOnly.set(!diffBusinessOnly())"
                    [class.bg-emerald-500]="diffBusinessOnly()"
                    [class.bg-zinc-200]="!diffBusinessOnly()"
                    [class.dark:bg-zinc-800]="!diffBusinessOnly()"
                    class="w-10 h-6 rounded-full p-1 transition-colors relative cursor-pointer"
                  >
                    <span 
                      [class.translate-x-4]="diffBusinessOnly()"
                      [class.translate-x-0]="!diffBusinessOnly()"
                      class="w-4 h-4 bg-white rounded-full block transition-transform"
                    ></span>
                  </button>
                </div>
                <!-- Quick Preset Selects -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-mono font-bold text-zinc-400">QUICK PRESET RANGE</span>
                  <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                    <button (click)="presetDiff('this-month')" class="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 rounded-lg text-left truncate font-bold cursor-pointer dark:text-zinc-400">🌙 THIS MONTH</button>
                    <button (click)="presetDiff('this-year')" class="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 rounded-lg text-left truncate font-bold cursor-pointer dark:text-zinc-400">📅 THIS YEAR</button>
                    <button (click)="presetDiff('last-30')" class="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 rounded-lg text-left truncate font-bold cursor-pointer dark:text-zinc-400">⏱️ LAST 30 DAYS</button>
                    <button (click)="presetDiff('to-newyear')" class="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 rounded-lg text-left truncate font-bold cursor-pointer dark:text-zinc-400">🎆 TO NEW YEAR</button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Visualization / Results grid -->
            <div class="lg:col-span-3 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between">
                  <span>📊 DIFFERENCE COMPILATION REPORT</span>
                  <button [disabled]="!isDiffValid()" (click)="saveCalculationsList('Difference')" class="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition">
                    <mat-icon class="scale-50 max-h-4">favorite</mat-icon> SAVE RESULT
                  </button>
                </span>

                @if (!isDiffValid()) {
                  <div class="p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                    <mat-icon class="text-zinc-300">warning</mat-icon>
                    <p class="font-bold">Invalid Boundary Setting</p>
                    <p class="text-[11px]">Please check that both datetimes are valid.</p>
                  </div>
                } @else {
                  <!-- Chronological exact display -->
                  <div class="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-150 dark:border-emerald-500/30 rounded-xl space-y-1">
                    <span class="text-[9px] font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block uppercase">EXACT CHRONOLOGICAL BREAKDOWN</span>
                    <div class="text-lg font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                      {{ exactDiffOutput() }}
                    </div>
                  </div>

                  <!-- Unit Grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL YEARS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().years | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL MONTHS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().months | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL WEEKS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().weeks | number:'1.0-1' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL DAYS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().days | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-200/30 dark:bg-zinc-950/40 rounded-xl">
                      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">BUSINESS DAYS</span>
                      <span class="text-sm font-extrabold text-emerald-500 select-all">{{ totalDiffUnits().businessDays | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-[10px] text-zinc-500 block font-bold">WEEKEND DAYS</span>
                      <span class="text-sm font-extrabold text-amber-500 select-all">{{ (totalDiffUnits().days - totalDiffUnits().businessDays) | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl col-span-2 sm:col-span-1">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL HOURS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().hours | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl col-span-1">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL MINUTES</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().minutes | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl col-span-1">
                      <span class="text-[10px] text-zinc-500 block font-bold">TOTAL SECONDS</span>
                      <span class="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 select-all">{{ totalDiffUnits().seconds | number:'1.0-0' }}</span>
                    </div>
                  </div>

                  <!-- Quick copy summary link -->
                  <div class="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex flex-wrap gap-2">
                    <button (click)="copyDiffText('exact')" class="px-3 py-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer dark:text-zinc-400">
                      <mat-icon class="scale-50 max-h-4 text-emerald-500">content_copy</mat-icon> COPY CHRONO SUMMARY
                    </button>
                    <button (click)="copyDiffText('units')" class="px-3 py-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer dark:text-zinc-400">
                      <mat-icon class="scale-50 max-h-4 text-sky-500">content_copy</mat-icon> COPY ALL UNITS LIST
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ======================= 2. AGE CALCULATOR & COUNTDOWN ======================= -->
        @if (activeMode() === 'age-calculator') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            <!-- BIRTH INPUT PANEL -->
            <div class="lg:col-span-2 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5">
                  <mat-icon class="text-emerald-500">cake</mat-icon> BIOLOGICAL PROFILE
                </span>

                <div class="space-y-1.5">
                  <span class="block text-[10px] font-mono font-bold text-zinc-400">DATE OF BIRTH</span>
                  <input 
                    type="date" 
                    #birthDateInput
                    [value]="ageDob()"
                    (change)="ageDob.set(birthDateInput.value)"
                    max="{{ todaySimple() }}"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div class="space-y-1.5">
                  <span class="block text-[10px] font-mono font-bold text-zinc-400">TIME OF BIRTH (OPTIONAL)</span>
                  <input 
                    type="time" 
                    #birthTimeInput
                    [value]="ageTob()"
                    (change)="ageTob.set(birthTimeInput.value)"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl text-[11px] leading-relaxed select-none font-mono">
                  <span class="text-zinc-400 font-bold block uppercase text-[9px] tracking-wider mb-1">BIRTHDAY HIGHLIGHTS</span>
                  @if (isDobLeapYear()) {
                    <div class="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><mat-icon class="scale-50 max-h-4">check_circle</mat-icon> Born in a Leap Year!</div>
                  } @else {
                    <div class="text-zinc-500 flex items-center gap-1"><mat-icon class="scale-50 max-h-4">info</mat-icon> Non-leap Year baby.</div>
                  }
                  <div class="text-zinc-500 font-medium mt-1 flex items-center gap-1">
                    <mat-icon class="scale-50 max-h-4 text-sky-500">calendar_today</mat-icon>
                    <span>Day of Arrival: <strong>{{ dobWeekday() }}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RESULTS LIST -->
            <div class="lg:col-span-3 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-5 shadow-sm">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between">
                  <span>🎂 AGE COMPLEX SYNOPSIS</span>
                  <button (click)="saveCalculationsList('Age')" class="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition">
                    <mat-icon class="scale-50 max-h-4">favorite</mat-icon> SAVE RECORD
                  </button>
                </span>

                <!-- Large metric showing Age -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/15 border border-emerald-150 dark:border-emerald-500/30 rounded-2xl text-left space-y-1.5 relative overflow-hidden">
                    <span class="block text-[9px] font-mono tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">CURRENT AGE IN ACCUMULATED UNITS</span>
                    <div class="text-3xl font-extrabold text-zinc-900 dark:text-white leading-none font-sans flex items-baseline gap-1.5">
                      <span>{{ computedAge().years }}</span>
                      <span class="text-xs font-mono text-zinc-500 pr-2">YRS</span>
                      <span>{{ computedAge().months }}</span>
                      <span class="text-xs font-mono text-zinc-500 pr-2">MOS</span>
                      <span>{{ computedAge().days }}</span>
                      <span class="text-xs font-mono text-zinc-500">DAYS</span>
                    </div>
                  </div>

                  <!-- Next birthday ticking countdown -->
                  <div class="p-5 bg-sky-500/5 dark:bg-sky-500/10 border border-sky-150 dark:border-sky-500/30 rounded-2xl text-left space-y-1.5">
                    <span class="block text-[9px] font-mono tracking-wider font-extrabold text-sky-600 dark:text-sky-400 uppercase flex items-center gap-1">
                      <mat-icon class="scale-50 max-h-4 animate-bounce">alarm</mat-icon> COUNTDOWN TO NEXT BIRTHDAY
                    </span>
                    <div class="text-base font-extrabold text-zinc-900 dark:text-white leading-none font-mono">
                      {{ computedBirthdayCountdown() }}
                    </div>
                    <div class="text-[10px] font-mono text-zinc-500 select-none">
                      Turning <strong>{{ computedAge().years + 1 }}</strong> on {{ nextBirthdayDateString() }}
                    </div>
                  </div>
                </div>

                <!-- Lived Stats Grid -->
                <div class="space-y-2">
                  <span class="text-[10px] font-mono font-bold tracking-widest text-[#9CA3AF] block uppercase">BIOPROFILE LIFETIME STATS (TOTAL ACCUMULATED)</span>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL MONTHS</span>
                      <span class="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().months | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL WEEKS</span>
                      <span class="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().weeks | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL DAYS</span>
                      <span class="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().days | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL HOURS</span>
                      <span class="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().hours | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL MINUTES</span>
                      <span class="text-xs font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().minutes | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl leading-normal">
                      <span class="text-zinc-500 block text-[9px] font-bold">TOTAL SECONDS</span>
                      <span class="text-xs font-extrabold text-zinc-850 dark:text-zinc-100 select-all">{{ ageTotalUnits().seconds | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-zinc-155 dark:border-zinc-850">
                  <button (click)="copyAgeToClipboard()" class="px-3.5 py-2 border border-zinc-150 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-[10px] font-mono font-bold hover:text-white transition flex items-center gap-1.5 select-none dark:text-zinc-400">
                    <mat-icon class="scale-50 max-h-4 text-emerald-500">content_copy</mat-icon> COPY BIOMETRICS SYNOPIS
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ======================= 3. DATE ADD / SUBTRACT (DAYS, MONTHS, YEARS, TIME) ======================= -->
        @if (activeMode() === 'date-add-subtract') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            <!-- Parameters control form -->
            <div class="lg:col-span-2 space-y-4 text-left font-mono">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-sans font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5 select-none">
                  <mat-icon class="text-emerald-500">tune</mat-icon> MODIFICATION CONFIG
                </span>

                <!-- Start datetime -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-extrabold text-zinc-400 select-none">STARTING AT</span>
                  <input 
                    type="datetime-local" 
                    #addBaseInput
                    [value]="addBaseDate()"
                    (change)="addBaseDate.set(addBaseInput.value)"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <!-- Operation selector -->
                <div class="space-y-1.5 select-none">
                  <span class="block text-[10px] font-extrabold text-zinc-400">OPERATION TYPE</span>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      (click)="addOperation.set('add')" 
                      [class.bg-emerald-500]="addOperation() === 'add'"
                      [class.text-white]="addOperation() === 'add'"
                      [class.border-emerald-500]="addOperation() === 'add'"
                      [class.border-zinc-200]="addOperation() !== 'add'"
                      [class.dark:border-zinc-850]="addOperation() !== 'add'"
                      class="py-2.5 border text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 dark:text-zinc-400 cursor-pointer"
                    >
                      <mat-icon class="scale-50 max-h-4">add_circle</mat-icon> ADD (+)
                    </button>
                    <button 
                      (click)="addOperation.set('sub')" 
                      [class.bg-amber-600]="addOperation() === 'sub'"
                      [class.text-white]="addOperation() === 'sub'"
                      [class.border-amber-600]="addOperation() === 'sub'"
                      [class.border-zinc-200]="addOperation() !== 'sub'"
                      [class.dark:border-zinc-850]="addOperation() !== 'sub'"
                      class="py-2.5 border text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 dark:text-zinc-400 cursor-pointer"
                    >
                      <mat-icon class="scale-50 max-h-4">remove_circle</mat-icon> SUBTRACT (-)
                    </button>
                  </div>
                </div>

                <!-- Parameters inputs sliders -->
                <div class="space-y-3.5 pt-2 border-t border-zinc-150 dark:border-zinc-850">
                  <!-- Years -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-500 uppercase">Years</span>
                      <span class="text-zinc-855 dark:text-zinc-100">{{ addYears() }} yrs</span>
                    </div>
                    <input type="range" min="0" max="100" #yearInputRange [value]="addYears()" (input)="addYears.set(toInt(yearInputRange.value))"
                      class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <!-- Months -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-500 uppercase">Months</span>
                      <span class="text-zinc-855 dark:text-zinc-100">{{ addMonths() }} mos</span>
                    </div>
                    <input type="range" min="0" max="60" #monthInputRange [value]="addMonths()" (input)="addMonths.set(toInt(monthInputRange.value))"
                      class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <!-- Days -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-500 uppercase">Days</span>
                      <span class="text-zinc-855 dark:text-zinc-100">{{ addDays() }} days</span>
                    </div>
                    <input type="range" min="0" max="365" #daysInputRange [value]="addDays()" (input)="addDays.set(toInt(daysInputRange.value))"
                      class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <!-- Hours -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-500 uppercase">Hours</span>
                      <span class="text-zinc-855 dark:text-zinc-100">{{ addHours() }} hrs</span>
                    </div>
                    <input type="range" min="0" max="72" #hoursInputRange [value]="addHours()" (input)="addHours.set(toInt(hoursInputRange.value))"
                      class="w-full h-2 rounded-lg appearance-auto bg-zinc-200 dark:bg-zinc-800 cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                <!-- Skip weekends option -->
                <div class="pt-2 flex items-center justify-between border-t border-zinc-150 dark:border-zinc-850 text-xs font-mono select-none">
                  <span class="text-zinc-400 font-bold">Skip Weekends (Add working days)</span>
                  <button (click)="addSkipWeekends.set(!addSkipWeekends())"
                    [class.bg-emerald-500]="addSkipWeekends()"
                    [class.bg-zinc-200]="!addSkipWeekends()"
                    [class.dark:bg-zinc-800]="!addSkipWeekends()"
                    class="w-10 h-6 rounded-full p-1 transition-colors relative cursor-pointer">
                    <span [class.translate-x-4]="addSkipWeekends()"
                      [class.translate-x-0]="!addSkipWeekends()"
                      class="w-4 h-4 bg-white rounded-full block transition-transform"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Calculated TARGET PREVIEW -->
            <div class="lg:col-span-3 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-5 shadow-sm">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between">
                  <span>🎯 TARGET CALCULATED DATETIME</span>
                  <button (click)="saveCalculationsList('Temporal shift')" class="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition cursor-pointer">
                    <mat-icon class="scale-50 max-h-4">favorite</mat-icon> SAVE RESULT
                  </button>
                </span>

                <!-- Target results presentation -->
                <div class="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-150 dark:border-emerald-500/30 rounded-2xl space-y-3 relative overflow-hidden">
                  <span class="text-[9px] font-mono tracking-widest font-extrabold text-emerald-600 dark:text-emerald-400 block uppercase">CALCULATED TARGET POINT</span>
                  <div class="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                    {{ calculatedTargetString() }}
                  </div>
                  <div class="text-xs font-mono text-zinc-500">
                    Day of Week: <span class="font-extrabold text-zinc-700 dark:text-zinc-300">{{ calculatedTargetWeekday() }}</span> (UTC Offset: {{ userOffsetString() }})
                  </div>
                </div>

                <!-- Code Friendly Formats List -->
                <div class="space-y-3 font-mono text-xs">
                  <span class="text-[10px] font-mono font-bold tracking-widest text-[#9CA3AF] block uppercase">DEVELOPER READY EXPORTS</span>
                  <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500 text-[10px] uppercase font-bold">JavaScript Date Instantiation</span>
                      <button (click)="copyJsDate(targetISOString())" class="cursor-pointer text-[10px] font-bold text-emerald-500 hover:underline">COPY CODE</button>
                    </div>
                    <code class="text-[11px] block text-zinc-800 dark:text-zinc-300 truncate bg-zinc-100/50 dark:bg-zinc-950/60 p-2 rounded border border-zinc-150 dark:border-zinc-850 select-all">new Date('{{ targetISOString() }}')</code>
                  </div>

                  <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500 text-[10px] uppercase font-bold">SQL Datetime (UTC Format)</span>
                      <button (click)="copyToClipboard(targetSQLString())" class="cursor-pointer text-[10px] font-bold text-emerald-500 hover:underline">COPY</button>
                    </div>
                    <code class="text-[11px] block text-zinc-800 dark:text-zinc-300 truncate bg-zinc-100/50 dark:bg-zinc-950/60 p-2 rounded border border-zinc-150 dark:border-zinc-850 select-all">{{ targetSQLString() }}</code>
                  </div>

                  <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/20 rounded-xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500 text-[10px] uppercase font-bold">JSON String representation</span>
                      <button (click)="copyToClipboard(targetISOString())" class="cursor-pointer text-[10px] font-bold text-emerald-500 hover:underline">COPY</button>
                    </div>
                    <code class="text-[11px] block text-zinc-800 dark:text-zinc-300 truncate bg-zinc-100/50 dark:bg-zinc-950/60 p-2 rounded border border-zinc-150 dark:border-zinc-855 select-all">"{{ targetISOString() }}"</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ======================= 4. TIMEZONE CONVERTER & WORLD CLOCK ======================= -->
        @if (activeMode() === 'timezone-converter') {
          <div class="space-y-6">
            <!-- Target converters block -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div class="lg:col-span-2 space-y-4 text-left">
                <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                  <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5 select-none">
                    <mat-icon class="text-emerald-500">public</mat-icon> CONVERSION TRANSIT ENGINE
                  </span>

                  <div class="space-y-1.5">
                    <span class="block text-[10px] font-mono font-bold text-zinc-400 select-none">SOURCE DATETIME (LOCAL TIMEZONE)</span>
                    <input 
                      type="datetime-local" 
                      #tzBaseInput
                      [value]="tzSourceInput()"
                      (change)="tzSourceInput.set(tzBaseInput.value)"
                      class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-3 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <!-- Dropdown search for world zone -->
                  <div class="space-y-1.5">
                    <span class="block text-[10px] font-mono font-bold text-zinc-400 select-none">ADD CUSTOM ZONE FOR ANALYSIS</span>
                    <div class="flex gap-2">
                      <select 
                        #customTzSelect
                        class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-850 dark:text-zinc-100 focus:outline-none"
                      >
                        @for (domain of WORLD_COUNTRY_ZONES; track domain.zone) {
                          <option [value]="domain.zone">{{ domain.name }} ({{ domain.zone }})</option>
                        }
                      </select>
                      <button (click)="appendSelectedZone(customTzSelect.value)" class="cursor-pointer px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-mono font-bold transition flex items-center shrink-0">
                        ADD
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Multi zones comparisons results list -->
              <div class="lg:col-span-3 space-y-4 text-left">
                <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                  <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between">
                    <span>🌍 MULTI-ZONE ALIGNMENTS REPORT</span>
                    <button (click)="tzTrackedZones.set(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'])" class="cursor-pointer text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-mono">RESET DEFAULTS</button>
                  </span>

                  <!-- Live zone table grid -->
                  <div class="divide-y divide-zinc-150 dark:divide-zinc-850 font-mono text-xs">
                    @for (zoneName of tzTrackedZones(); track zoneName) {
                      <div class="py-3 flex items-center justify-between gap-4 flex-wrap">
                        <div class="space-y-0.5">
                          <span class="text-[11px] font-bold text-zinc-850 dark:text-zinc-200 block">{{ zoneName }}</span>
                          <span class="text-[9px] text-zinc-500 block uppercase">Offset: {{ getZoneOffsetInHours(zoneName) }}</span>
                        </div>
                        <div class="flex items-center gap-3">
                          <code class="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 font-extrabold text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-855 rounded-lg text-xs leading-none select-all">
                            {{ formatSourceDateToZone(zoneName) }}
                          </code>
                          <button (click)="copyToClipboard(formatSourceDateToZone(zoneName))" class="cursor-pointer p-1.5 hover:text-white text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-950 rounded-lg transition" title="Copy text">
                            <mat-icon class="scale-75">content_copy</mat-icon>
                          </button>
                          @if (tzTrackedZones().length > 1) {
                            <button (click)="removeTrackedZone(zoneName)" class="cursor-pointer p-1 text-rose-500 hover:bg-rose-500/10 rounded" title="Remove row">
                              <mat-icon class="scale-50">delete</mat-icon>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- WORLD CLOCK COMPASS LIST -->
            <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm text-left">
              <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5 select-none">
                <mat-icon class="text-emerald-500">schedule</mat-icon> REAL-TIME WORLD CITY COMPASS CLOCK
              </span>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-3.5 font-mono">
                @for (clk of activeWorldClockList(); track clk.name) {
                  <div class="p-3.5 border border-zinc-150 dark:border-zinc-855 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl leading-normal text-center relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span class="text-lg block">{{ clk.flag }}</span>
                      <span class="text-[11px] font-extrabold text-zinc-885 dark:text-zinc-200 block mt-1 truncate">{{ clk.name }}</span>
                    </div>
                    <div class="mt-2 space-y-0.5">
                      <div class="text-sm font-bold text-sky-555 dark:text-emerald-400 select-all leading-none">{{ clk.time }}</div>
                      <span class="text-[8px] text-zinc-500 block uppercase font-medium">UTC{{ clk.offset }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ======================= 5. COUNTDOWNS, RELATIVE TIMESTAMPS & DURATIONS ======================= -->
        @if (activeMode() === 'duration-calculator') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            <!-- Configure countdown form -->
            <div class="lg:col-span-2 space-y-4 text-left font-mono select-none">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-sans font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5">
                  <mat-icon class="text-emerald-500">hourglass_empty</mat-icon> TEMPORAL MILESTONE CONFIG
                </span>

                <!-- Milestone label -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-bold text-zinc-400">EVENT / MILESTONE LABEL</span>
                  <input 
                    type="text" 
                    #evtLabelRef
                    [value]="durationEventLabel()"
                    (input)="durationEventLabel.set(evtLabelRef.value)"
                    placeholder="Widescreen Product Launch, Code Deploy..."
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-3 text-xs text-zinc-855 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <!-- Event date input -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-bold text-zinc-400">EVENT DATE & TIME</span>
                  <input 
                    type="datetime-local" 
                    #evtDateRef
                    [value]="durationEventDate()"
                    (change)="durationEventDate.set(evtDateRef.value)"
                    class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-3 text-xs text-zinc-855 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <!-- Suggested list parameters -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-bold text-zinc-400 uppercase">SUGGESTED HISTORIC MARKERS</span>
                  <div class="grid grid-cols-2 gap-1 font-mono text-[9px]">
                    <button (click)="loadPresetEvent('Luna Moon Landing', '1969-07-20T20:17:40')" class="p-1.5 cursor-pointer border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded font-bold truncate text-left dark:text-zinc-400 cursor-pointer">🌕 LUNA 11</button>
                    <button (click)="loadPresetEvent('Y2K Epoch Shift', '2000-01-01T00:00:00')" class="p-1.5 cursor-pointer border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded font-bold truncate text-left dark:text-zinc-400 cursor-pointer">💿 Y2K CLASH</button>
                    <button (click)="loadPresetEvent('Halley Comet return', '2061-07-28T00:00:00')" class="p-1.5 cursor-pointer border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded font-bold truncate text-left dark:text-zinc-400 cursor-pointer">☄️ COMET RETURN</button>
                    <button (click)="loadPresetEvent('Next Unix rollover', '2038-01-19T03:14:07')" class="p-1.5 cursor-pointer border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded font-bold truncate text-left dark:text-zinc-400 cursor-pointer">☣️ UNIX ROLL OVER</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dynamic Countdown Display -->
            <div class="lg:col-span-3 space-y-4 text-left">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between">
                  <span>⏰ REAL-TIME DRIFT REPORT</span>
                  <button (click)="saveCalculationsList('Drift')" class="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition cursor-pointer">
                    <mat-icon class="scale-50 max-h-4">favorite</mat-icon> SAVE TRACKER
                  </button>
                </span>

                <!-- Large countdown dashboard -->
                <div class="p-5 bg-zinc-900 border border-zinc-805 text-center rounded-2xl space-y-3 relative overflow-hidden font-mono">
                  <span class="text-[8px] tracking-widest font-extrabold text-zinc-500 uppercase block leading-none">TARGET: "{{ durationEventLabel() | uppercase }}"</span>
                  <div class="text-lg md:text-xl font-bold tracking-tight text-white leading-relaxed select-all">
                    {{ computedDurationDriftWords() }}
                  </div>
                  <div class="text-[10px] text-zinc-500 font-bold" [class.text-emerald-500]="isEventInFuture()" [class.text-amber-500]="!isEventInFuture()">
                    {{ isEventInFuture() ? '⌛ TICKING COUNTDOWN TO FUTURE POINT' : '⏳ ELAPSED DURATION FROM HISTORIC EVENT' }}
                  </div>
                </div>

                <!-- Exact numeric units -->
                <div class="space-y-4 font-mono text-xs">
                  <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-zinc-500 block uppercase font-bold">TOTAL DAYS</span>
                      <span class="text-zinc-800 dark:text-zinc-300 font-extrabold text-xs select-all">{{ durationTotalUnits().days | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl animate-pulse">
                      <span class="text-zinc-500 block uppercase font-bold">TOTAL MINS</span>
                      <span class="text-zinc-800 dark:text-zinc-300 font-extrabold text-xs select-all">{{ durationTotalUnits().minutes | number:'1.0-0' }}</span>
                    </div>
                    <div class="p-2 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl">
                      <span class="text-zinc-500 block uppercase font-bold">TOTAL SECS</span>
                      <span class="text-[#EF4444] dark:text-emerald-400 font-extrabold text-xs select-all">{{ durationTotalUnits().seconds | number:'1.0-0' }}</span>
                    </div>
                  </div>

                  <span class="text-[10px] uppercase text-[#9CA3AF] font-extrabold tracking-widest block pt-2 border-t border-zinc-150 dark:border-zinc-850 pb-1">REATIVE PARSERS FOR HUMAN COMPLIANCE</span>
                  <div class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/15 rounded-xl flex items-center justify-between">
                    <div class="space-y-0.5">
                      <span class="text-[9px] text-zinc-500 uppercase font-bold">Relative Locale String (JS Intl)</span>
                      <span class="text-zinc-800 dark:text-zinc-200 block font-bold text-xs select-all">{{ computedRelativeLocaleString() }}</span>
                    </div>
                    <button (click)="copyToClipboard(computedRelativeLocaleString())" class="p-1.5 hover:text-white text-zinc-500 rounded hover:bg-zinc-950 transition cursor-pointer"><mat-icon class="scale-75">content_copy</mat-icon></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ======================= 6. CRON EXPRESSION GENERATOR & RECURRING SCHEDULER ======================= -->
        @if (activeMode() === 'unix-timestamp-converter') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            <!-- Controls panel -->
            <div class="lg:col-span-2 space-y-4 text-left font-mono">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm">
                <span class="text-xs font-sans font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center gap-1.5 select-none">
                  <mat-icon class="text-emerald-500">settings</mat-icon> SCHEDULING SPECIFIER
                </span>

                <!-- Quick Presets -->
                <div class="space-y-1.5 select-none">
                  <span class="block text-[10px] font-bold text-zinc-400 pb-1">CRON PRESET PATTERNS</span>
                  <div class="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                    <button (click)="setCronVal('* * * * *')" class="p-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 rounded truncate text-left font-extrabold font-mono cursor-pointer">⏳ EVERY MINUTE</button>
                    <button (click)="setCronVal('0 * * * *')" class="p-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 rounded truncate text-left font-extrabold font-mono cursor-pointer">⏰ EVERY HOUR</button>
                    <button (click)="setCronVal('0 0 * * *')" class="p-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 rounded truncate text-left font-extrabold font-mono cursor-pointer">📅 EVERY MIDNIGHT</button>
                    <button (click)="setCronVal('0 8 * * 1-5')" class="p-1.5 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 rounded truncate text-left font-extrabold font-mono cursor-pointer">👔 WEEKDAYS 8AM</button>
                  </div>
                </div>

                <!-- Input Expression field -->
                <div class="space-y-1.5">
                  <span class="block text-[10px] font-bold text-zinc-400">CRON SYNTAX EXPRESSION (5 Fields)</span>
                  <input 
                    type="text" 
                    #cronValInput
                    [value]="cronExpressionString()"
                    (input)="cronExpressionString.set(cronValInput.value.trim())"
                    placeholder="0 0 * * *"
                    class="dark:text-zinc-400 w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-3 text-sm text-sky-455 tracking-widest focus:outline-none placeholder-zinc-700"
                  />
                </div>

                <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl text-[10px] !leading-relaxed select-none space-y-1">
                  <span class="text-zinc-500 block uppercase font-bold text-[9px] mb-1">SYNTAX BREAKDOWN INDEX</span>
                  <div class="flex justify-between border-b border-zinc-150 dark:border-zinc-850/50 pb-1"><span>*</span> <span>minute (0-59)</span></div>
                  <div class="flex justify-between border-b border-zinc-150 dark:border-zinc-850/50 pb-1"><span>*</span> <span>hour (0-23)</span></div>
                  <div class="flex justify-between border-b border-zinc-150 dark:border-zinc-850/50 pb-1"><span>*</span> <span>day of month (1-31)</span></div>
                  <div class="flex justify-between border-b border-zinc-150 dark:border-zinc-850/50 pb-1"><span>*</span> <span>month (1-12)</span></div>
                  <div class="flex justify-between"><span>*</span> <span>day of week (0-6, Sun=0)</span></div>
                </div>
              </div>
            </div>

            <!-- Calculated targets list -->
            <div class="lg:col-span-3 space-y-4 text-left font-mono">
              <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-5 shadow-sm">
                <span class="text-xs font-sans font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block select-none">
                  📋 SCHEDULATION PARSER VERDICT
                </span>

                <!-- Verdict translation block -->
                <div class="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-150 dark:border-emerald-500/30 rounded-xl space-y-1">
                  <span class="text-[9px] font-mono tracking-widest font-extrabold text-emerald-600 dark:text-emerald-400 block uppercase">TRANSLATED HUMAN SEMANTICS</span>
                  <div class="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white leading-relaxed">
                    {{ cronTranslatedHuman() }}
                  </div>
                </div>

                <!-- Next 5 runs -->
                <div class="space-y-3">
                  <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-extrabold block">SIMULATED CHRONOLOGICAL NEXT 5 ECLAPSES</span>
                  
                  <div class="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden text-xs">
                    <div class="grid grid-cols-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-150 dark:border-zinc-850 text-[10px] font-bold text-zinc-500 uppercase select-none">
                      <span>RUN IDX</span>
                      <span>PREDICTED TARGET</span>
                      <span>WEEKDAY</span>
                    </div>
                    <div class="divide-y divide-zinc-150 dark:divide-zinc-850">
                      @for (row of computedCronNextRuns(); track row.index) {
                        <div class="grid grid-cols-3 p-3 items-center select-all hover:bg-zinc-50 dark:hover:bg-zinc-950/20">
                          <span class="text-zinc-500 font-extrabold">#0{{ row.index }}</span>
                          <span class="text-zinc-800 dark:text-zinc-200 font-extrabold">{{ row.date }}</span>
                          <span class="text-emerald-500 font-bold uppercase">{{ row.dayOfWeek }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

      </main>

      <!-- ======================= BOTTOM PANEL: RECENT COPIES OR CALCULATIONS HISTORY ======================= -->
      @if (calculationsHistory().length > 0) {
        <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 text-left font-mono">
          <span class="text-xs font-sans font-bold text-zinc-500 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-850 block flex items-center justify-between select-none">
            <span class="flex items-center gap-1.5"><mat-icon class="text-amber-500">history</mat-icon> PERSISTED RECENT CALCULATION WORKSPACE</span>
            <button (click)="clearCalculationsHistory()" class="cursor-pointer text-[9px] font-bold text-[#EF4444] hover:underline">PURGE ALL RECORDS</button>
          </span>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (rec of calculationsHistory(); track rec.id) {
              <div class="p-3.5 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl space-y-2 relative group leading-normal">
                <button (click)="removeCalculationItem(rec.id)" class="cursor-pointer absolute right-2 top-2 p-1 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition select-none">
                  <mat-icon class="scale-50">delete</mat-icon>
                </button>
                <div class="space-y-0.5 pr-6">
                  <span class="text-[10px] font-bold py-0.5 px-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350 rounded-md block w-max uppercase">{{ rec.type }}</span>
                  <span class="text-[10px] text-zinc-500 block uppercase font-medium">Inputs: {{ rec.input }}</span>
                </div>
                <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-950/50 p-2 rounded border border-zinc-150 dark:border-zinc-850 select-all leading-tight">
                  {{ rec.output }}
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `]
})
export class DateTimeSuite implements OnInit, OnDestroy {
  @Input() public mode = 'date-difference';

  public SUITE_TABS = [
    { id: 'date-difference', label: 'Date Difference', icon: 'difference' },
    { id: 'age-calculator', label: 'Age Calculator', icon: 'cake' },
    { id: 'date-add-subtract', label: 'Add/Subtract', icon: 'add_circle' },
    { id: 'timezone-converter', label: 'Timezones', icon: 'public' },
    { id: 'duration-calculator', label: 'Milestones & Countdown', icon: 'timer' },
    { id: 'unix-timestamp-converter', label: 'Cron Scheduler', icon: 'schedule' }
  ];

  // System local variables auto-detected
  public userTimezone = signal('UTC');
  public userOffsetString = signal('+00:00');
  public systemClock = signal('');
  public dayOfYear = signal(1);
  public weekOfYear = signal(1);
  public isLeapYear = signal(false);

  // Live ticking epoch Pause/Resume state
  public tickingEpoch = signal(0);
  public epochPaused = signal(false);
  public tickerCopied = signal(false);
  private liveInterval: ReturnType<typeof setInterval> | undefined;

  // Track active sub-tool route mode selector
  public activeMode = signal('date-difference');

  // Calculation History Persistence
  public calculationsHistory = signal<SavedCalculation[]>([]);

  // 1. DATE DIFFERENCE WORKSPACE STATE
  public diffStart = signal('2026-01-01T00:00');
  public diffEnd = signal('2026-05-28T09:00');
  public diffBusinessOnly = signal(false);

  // 2. AGE CALCULATOR STATE
  public ageDob = signal('1998-10-14');
  public ageTob = signal('08:30');

  // 3. DATE ADD / SUBTRACT STATE
  public addBaseDate = signal('2026-05-28T12:00');
  public addOperation = signal<'add' | 'sub'>('add');
  public addYears = signal(0);
  public addMonths = signal(3);
  public addDays = signal(15);
  public addHours = signal(0);
  public addSkipWeekends = signal(false);

  // 4. TIMEZONE MULTI-ZONE CONVERT STATES
  public tzSourceInput = signal('2026-05-28T12:00');
  public tzTrackedZones = signal<string[]>(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']);

  // Popular ISO zone directory checklist
  public WORLD_COUNTRY_ZONES = [
    { name: 'UTC Coordinated', zone: 'UTC' },
    { name: 'New York (EST)', zone: 'America/New_York' },
    { name: 'London (GMT/BST)', zone: 'Europe/London' },
    { name: 'Tokyo (JST)', zone: 'Asia/Tokyo' },
    { name: 'Sydney (AEST)', zone: 'Australia/Sydney' },
    { name: 'Paris (CET)', zone: 'Europe/Paris' },
    { name: 'Frankfurt (CET)', zone: 'Europe/Berlin' },
    { name: 'Dubai (GST)', zone: 'Asia/Dubai' },
    { name: 'Singapore (SGT)', zone: 'Asia/Singapore' },
    { name: 'Los Angeles (PST)', zone: 'America/Los_Angeles' },
    { name: 'Austin (CST)', zone: 'America/Chicago' },
    { name: 'Sao Paulo (BRT)', zone: 'America/Sao_Paulo' },
    { name: 'Johannesburg (SAST)', zone: 'Africa/Johannesburg' },
    { name: 'Mumbai (IST)', zone: 'Asia/Kolkata' },
    { name: 'Shanghai (CST)', zone: 'Asia/Shanghai' },
    { name: 'Honolulu (HST)', zone: 'Pacific/Honolulu' },
    { name: 'Rejavik (GMT)', zone: 'Atlantic/Reykjavik' },
    { name: 'Vienna (CET)', zone: 'Europe/Vienna' },
    { name: 'Mexico City (CST)', zone: 'America/Mexico_City' },
    { name: 'Vancouver (PST)', zone: 'America/Vancouver' }
  ];

  // Dynamic ticking World city list triggers
  public activeWorldClockList = signal<WorldClock[]>([]);

  // 5. COUNTDOWNS/DURATIONS ELAPSED
  public durationEventLabel = signal('Next Decennial Milestone 2030');
  public durationEventDate = signal('2030-01-01T00:00');

  // 6. CRON SCHEDULER STATE
  public cronExpressionString = signal('0 8 * * 1-5');

  constructor() {
    // Sync external mode pass-in to local active mode selector cleanly
    effect(() => {
      if (this.mode) {
        // Map alias slugs to concrete tab IDs smoothly
        if (this.mode === 'days-calculator' || this.mode === 'months-calculator' || this.mode === 'years-calculator') {
          this.activeMode.set('date-difference');
        } else if (this.mode === 'unix-timestamp-converter') {
          this.activeMode.set('unix-timestamp-converter');
        } else {
          this.activeMode.set(this.mode);
        }
      }
    });
  }

  public ngOnInit(): void {
    // Detect system values dynamically using Intl API
    if (typeof window !== 'undefined') {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        this.userTimezone.set(detected);
      } catch {
        this.userTimezone.set('UTC');
      }

      // Compute timezone offset string: e.g. UTC-04:00, UTC+01:00
      const now = new Date();
      const offsetMinutes = now.getTimezoneOffset();
      const sign = offsetMinutes <= 0 ? '+' : '-';
      const absMins = Math.abs(offsetMinutes);
      const hours = Math.floor(absMins / 60);
      const mins = absMins % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.userOffsetString.set(`${sign}${pad(hours)}:${pad(mins)}`);

      // Initialize Dob / inputs with dynamic values based on 2026 LOCAL METADATA
      this.todaySimple.set(now.toISOString().split('T')[0]);
      this.todayISO.set(now.toISOString().substring(0, 16));

      // Preset Dob input nicely
      this.ageDob.set('2000-05-15');
      this.tzSourceInput.set(now.toISOString().substring(0, 16));
      this.addBaseDate.set(now.toISOString().substring(0, 16));
      this.durationEventDate.set(new Date(now.getFullYear() + 2, 0, 1).toISOString().substring(0, 16));

      // Calculate annual week and day indicators
      this.calculateCalendarIndices(now);

      // Hydrate local saved history logs
      this.hydrateHistoryLogs();

      // Launch continuous 1-second system ticking thread
      this.tickingEpoch.set(Math.floor(Date.now() / 1000));
      this.liveInterval = setInterval(() => {
        this.runRealtimeTick();
      }, 1000);
    }
  }

  public ngOnDestroy(): void {
    if (this.liveInterval) {
      clearInterval(this.liveInterval);
    }
  }

  // Pure helper triggers
  public toInt(v: string): number {
    return parseInt(v, 10) || 0;
  }

  private calculateCalendarIndices(d: Date): void {
    // Day of Year
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime() + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay) + 1;
    this.dayOfYear.set(day);

    // Leap Year validation
    const yr = d.getFullYear();
    const leap = (yr % 4 === 0 && yr % 100 !== 0) || (yr % 400 === 0);
    this.isLeapYear.set(leap);

    // Week of Year ISO-8601
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursday - target.valueOf()) / (oneDay * 7));
    this.weekOfYear.set(week);
  }

  private hydrateHistoryLogs(): void {
    try {
      const serialized = localStorage.getItem('dt_suite_saved_v1');
      if (serialized) {
        this.calculationsHistory.set(JSON.parse(serialized));
      }
    } catch {
      // safe fallback
    }
  }

  private runRealtimeTick(): void {
    const d = new Date();
    this.systemClock.set(d.toLocaleString());

    if (!this.epochPaused()) {
      this.tickingEpoch.set(Math.floor(d.getTime() / 1000));
    }

    // Refresh World City times list
    const nyc = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const lon = d.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tok = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const syd = d.toLocaleTimeString('en-US', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const utcTime = d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    this.activeWorldClockList.set([
      { name: 'UTC Coordinated', zone: 'UTC', flag: '🌐', time: utcTime, offset: '+00:00' },
      { name: 'New York (EST)', zone: 'America/New_York', flag: '🇺🇸', time: nyc, offset: '-05:00' },
      { name: 'London (GMT)', zone: 'Europe/London', flag: '🇬🇧', time: lon, offset: '+00:00' },
      { name: 'Tokyo (JST)', zone: 'Asia/Tokyo', flag: '🇯🇵', time: tok, offset: '+09:00' },
      { name: 'Sydney (AEST)', zone: 'Australia/Sydney', flag: '🇦🇺', time: syd, offset: '+10:00' }
    ]);
  }

  // Global triggers
  public selectLocalMode(m: string): void {
    this.activeMode.set(m);
  }

  // Ticking Epoch interactions
  public toggleEpochPause(): void {
    this.epochPaused.set(!this.epochPaused());
  }

  public copyEpochTicker(): void {
    navigator.clipboard.writeText(this.tickingEpoch().toString()).then(() => {
      this.tickerCopied.set(true);
      setTimeout(() => this.tickerCopied.set(false), 2000);
    });
  }

  // Copy helper for developer JS instantiation code block
  public copyJsDate(isoString: string): void {
    this.copyToClipboard(`new Date("${isoString}")`);
  }

  // Copy to clipboard utility
  public copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // notify success
    });
  }

  // Save calculation item
  public saveCalculationsList(type: string): void {
    let inputDescriptor = '';
    let outputDescriptor = '';

    if (type === 'Difference') {
      inputDescriptor = `From ${this.diffStart().replace('T', ' ')} To ${this.diffEnd().replace('T', ' ')}`;
      outputDescriptor = this.exactDiffOutput();
    } else if (type === 'Age') {
      inputDescriptor = `Born ${this.ageDob()}`;
      outputDescriptor = `${this.computedAge().years} years, ${this.computedAge().months} months old`;
    } else if (type === 'Temporal shift') {
      inputDescriptor = `${this.addOperation() === 'add' ? 'Add' : 'Sub'} values from ${this.addBaseDate().replace('T', ' ')}`;
      outputDescriptor = this.calculatedTargetString();
    } else if (type === 'Drift') {
      inputDescriptor = `Milestone: "${this.durationEventLabel()}"`;
      outputDescriptor = this.computedDurationDriftWords();
    }

    if (!outputDescriptor) return;

    const newItem: SavedCalculation = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      description: `${type} analysis block`,
      input: inputDescriptor,
      output: outputDescriptor,
      timestamp: Date.now()
    };

    const updated = [newItem, ...this.calculationsHistory()].slice(0, 10);
    this.calculationsHistory.set(updated);
    localStorage.setItem('dt_suite_saved_v1', JSON.stringify(updated));
  }

  public removeCalculationItem(id: string): void {
    const updated = this.calculationsHistory().filter(x => x.id !== id);
    this.calculationsHistory.set(updated);
    localStorage.setItem('dt_suite_saved_v1', JSON.stringify(updated));
  }

  public clearCalculationsHistory(): void {
    this.calculationsHistory.set([]);
    localStorage.removeItem('dt_suite_saved_v1');
  }

  // Today helpers string
  public todaySimple = signal('2026-05-28');
  public todayISO = signal('2026-05-28T09:00');

  // ======================= 1. DATE DIFFERENCE BUSINESS LOGIC =======================
  public isDiffValid = computed(() => {
    return !!this.diffStart() && !!this.diffEnd();
  });

  public presetDiff(preset: string): void {
    const now = new Date();
    if (preset === 'this-month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      this.diffStart.set(start.toISOString().substring(0, 16));
      this.diffEnd.set(end.toISOString().substring(0, 16));
    } else if (preset === 'this-year') {
      const y = now.getFullYear();
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59);
      this.diffStart.set(start.toISOString().substring(0, 16));
      this.diffEnd.set(end.toISOString().substring(0, 16));
    } else if (preset === 'last-30') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      this.diffStart.set(start.toISOString().substring(0, 16));
      this.diffEnd.set(now.toISOString().substring(0, 16));
    } else if (preset === 'to-newyear') {
      const nextY = now.getFullYear() + 1;
      const target = new Date(nextY, 0, 1);
      this.diffStart.set(now.toISOString().substring(0, 16));
      this.diffEnd.set(target.toISOString().substring(0, 16));
    }
  }

  // Compute total units cumulative
  public totalDiffUnits = computed(() => {
    if (!this.isDiffValid()) return { years: 0, months: 0, weeks: 0, days: 0, businessDays: 0, hours: 0, minutes: 0, seconds: 0 };

    const d1 = new Date(this.diffStart());
    const d2 = new Date(this.diffEnd());
    const msDiff = Math.abs(d2.getTime() - d1.getTime());

    const seconds = Math.floor(msDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = days / 7;

    // Approximate units
    const years = days / 365.2425;
    const months = days / 30.436875;

    // Business Days calculation (Mon-Fri) excluding weekends
    let bDays = 0;
    if (d1.getTime() <= d2.getTime()) {
      const start = new Date(d1);
      const end = new Date(d2);
      while (start <= end) {
        const dayOfWeek = start.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          bDays++;
        }
        start.setDate(start.getDate() + 1);
      }
    } else {
      const start = new Date(d2);
      const end = new Date(d1);
      while (start <= end) {
        const dayOfWeek = start.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          bDays++;
        }
        start.setDate(start.getDate() + 1);
      }
    }

    return { years, months, weeks, days, businessDays: bDays, hours, minutes, seconds };
  });

  // Human-readable exact chrono representation
  public exactDiffOutput = computed(() => {
    if (!this.isDiffValid()) return '';
    const d1 = new Date(this.diffStart());
    const d2 = new Date(this.diffEnd());

    const start = d1 < d2 ? d1 : d2;
    const end = d1 < d2 ? d2 : d1;

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    let hours = end.getHours() - start.getHours();
    let minutes = end.getMinutes() - start.getMinutes();

    if (minutes < 0) {
      hours--;
      minutes += 60;
    }
    if (hours < 0) {
      days--;
      hours += 24;
    }

    const segments: string[] = [];
    if (years > 0) segments.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) segments.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0) segments.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) segments.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) segments.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);

    if (segments.length === 0) return 'Identical calendar points';
    return segments.join(', ');
  });

  public copyDiffText(type: string): void {
    if (type === 'exact') {
      this.copyToClipboard(`Difference summary: ${this.exactDiffOutput()}`);
    } else {
      const u = this.totalDiffUnits();
      const txt = `Date difference metric breakdown list:
Total days: ${u.days} days
Business days (Mon-Fri): ${u.businessDays} days
Total weeks: ${u.weeks.toFixed(2)} weeks
Total months: ${u.months.toFixed(1)} months
Total years: ${u.years.toFixed(2)} years`;
      this.copyToClipboard(txt);
    }
  }

  // ======================= 2. AGE CALCULATOR BUSINESS LOGIC =======================
  public isDobLeapYear = computed(() => {
    const dob = this.ageDob();
    if (!dob) return false;
    const y = new Date(dob).getFullYear();
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  });

  public dobWeekday = computed(() => {
    const dob = this.ageDob();
    if (!dob) return '';
    const d = new Date(dob + 'T12:00:00'); // normalise midday timezone issues
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  });

  public computedAge = computed(() => {
    const dobStr = this.ageDob();
    if (!dobStr) return { years: 0, months: 0, days: 0 };

    // account for birthtime if provided
    const tobStr = this.ageTob() || '00:00';
    const dob = new Date(`${dobStr}T${tobStr}`);
    const now = new Date();

    if (isNaN(dob.getTime())) return { years: 0, months: 0, days: 0 };

    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  });

  public ageTotalUnits = computed(() => {
    const dobStr = this.ageDob();
    if (!dobStr) return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const tobStr = this.ageTob() || '00:00';
    const dob = new Date(`${dobStr}T${tobStr}`);
    const now = new Date();

    if (isNaN(dob.getTime())) return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const msDiff = Math.max(0, now.getTime() - dob.getTime());
    const seconds = Math.floor(msDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30.436875);

    return { months, weeks, days, hours, minutes, seconds };
  });

  // Next birthday details
  public nextBirthdayDateString = computed(() => {
    const dobStr = this.ageDob();
    if (!dobStr) return '';
    const dob = new Date(dobStr);
    const now = new Date();

    const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (bday < now) {
      bday.setFullYear(now.getFullYear() + 1);
    }
    return bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  public computedBirthdayCountdown = computed(() => {
    const dobStr = this.ageDob();
    if (!dobStr) return '';
    const dob = new Date(dobStr);
    const now = new Date();

    const target = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (target < now) {
      target.setFullYear(now.getFullYear() + 1);
    }

    const diff = target.getTime() - now.getTime();
    if (diff < 0) return 'Ticking...';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days} days, ${hrs} hours, ${mins} mins`;
  });

  public copyAgeToClipboard(): void {
    const age = this.computedAge();
    const stats = this.ageTotalUnits();
    const summary = `Age biometrics summary:
Exact Age: ${age.years} years, ${age.months} months, ${age.days} days
Day of birth: ${this.dobWeekday()}
Cumulative Days lived: ${stats.days.toLocaleString()} days
Cumulative Hours lived: ${stats.hours.toLocaleString()} hours`;
    this.copyToClipboard(summary);
  }

  // ======================= 3. DATE ADD / SUBTRACT LOGIC =======================
  public targetISOString = computed(() => {
    const baseStr = this.addBaseDate();
    if (!baseStr) return '';
    const date = new Date(baseStr);
    if (isNaN(date.getTime())) return '';

    const sign = this.addOperation() === 'add' ? 1 : -1;

    // Years & Months shifting
    const newYear = date.getFullYear() + (this.addYears() * sign);
    const newMonth = date.getMonth() + (this.addMonths() * sign);

    // adjust month and year overflows gracefully
    date.setFullYear(newYear, newMonth);

    // Days shifting
    if (this.addSkipWeekends()) {
      let daysCounter = this.addDays();
      while (daysCounter > 0) {
        date.setDate(date.getDate() + sign);
        const dayOfWeek = date.getDay();
        // Skip Sat (6) and Sun (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysCounter--;
        }
      }
    } else {
      date.setDate(date.getDate() + (this.addDays() * sign));
    }

    // Hours shifting
    date.setHours(date.getHours() + (this.addHours() * sign));

    return date.toISOString();
  });

  public calculatedTargetString = computed(() => {
    const iso = this.targetISOString();
    if (!iso) return 'Invalid parameters';
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  });

  public calculatedTargetWeekday = computed(() => {
    const iso = this.targetISOString();
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  });

  public targetSQLString = computed(() => {
    const iso = this.targetISOString();
    if (!iso) return '';
    return iso.replace('T', ' ').substring(0, 19);
  });

  // ======================= 4. TIMEZONE INTL ALIGNMENTS =======================
  public formatSourceDateToZone(zone: string): string {
    const srcStr = this.tzSourceInput();
    if (!srcStr) return '';
    try {
      const d = new Date(srcStr);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleDateString('en-US', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', '') + ' (' + zone.split('/').pop()?.replace('_', ' ') + ')';
    } catch {
      return 'Zone Error';
    }
  }

  public getZoneOffsetInHours(zone: string): string {
    try {
      const d = new Date();
      const tzPart = d.toLocaleString('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).split('GMT');
      return tzPart.length > 1 ? 'GMT' + tzPart[1] : 'UTC';
    } catch {
      return '+00:00';
    }
  }

  public appendSelectedZone(zone: string): void {
    if (!this.tzTrackedZones().includes(zone)) {
      this.tzTrackedZones.update(list => [...list, zone]);
    }
  }

  public removeTrackedZone(zone: string): void {
    this.tzTrackedZones.update(list => list.filter(item => item !== zone));
  }

  // ======================= 5. EVENT MILESTONES DURATIONS =======================
  public isEventInFuture = computed(() => {
    const tgt = this.durationEventDate();
    if (!tgt) return false;
    return new Date(tgt).getTime() > Date.now();
  });

  public loadPresetEvent(lbl: string, dateStr: string): void {
    this.durationEventLabel.set(lbl);
    this.durationEventDate.set(dateStr);
  }

  public durationTotalUnits = computed(() => {
    const tgt = this.durationEventDate();
    if (!tgt) return { days: 0, minutes: 0, seconds: 0 };
    const date = new Date(tgt);
    if (isNaN(date.getTime())) return { days: 0, minutes: 0, seconds: 0 };

    const diff = Math.abs(date.getTime() - Date.now());
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const days = Math.floor(mins / (60 * 24));

    return { days, minutes: mins, seconds: secs };
  });

  public computedDurationDriftWords = computed(() => {
    const tgt = this.durationEventDate();
    if (!tgt) return 'Setup event date';
    const targetDate = new Date(tgt);
    if (isNaN(targetDate.getTime())) return 'Invalid milestone datetime';

    const now = new Date();
    const start = targetDate < now ? targetDate : now;
    const end = targetDate < now ? now : targetDate;

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    let hours = end.getHours() - start.getHours();
    let minutes = end.getMinutes() - start.getMinutes();
    let seconds = end.getSeconds() - start.getSeconds();

    if (seconds < 0) {
      minutes--;
      seconds += 60;
    }
    if (minutes < 0) {
      hours--;
      minutes += 60;
    }
    if (hours < 0) {
      days--;
      hours += 24;
    }

    const comps: string[] = [];
    if (years > 0) comps.push(`${years} yr${years > 1 ? 's' : ''}`);
    if (months > 0) comps.push(`${months} mo${months > 1 ? 's' : ''}`);
    if (days > 0) comps.push(`${days} day${days > 1 ? 's' : ''}`);
    comps.push(`${hours.toString().padStart(2, '0')}h`);
    comps.push(`${minutes.toString().padStart(2, '0')}m`);
    comps.push(`${seconds.toString().padStart(2, '0')}s`);

    const direct = targetDate > now ? 'In ' : '';
    const suffix = targetDate < now ? ' ago' : '';

    return `${direct}${comps.join(' ')}${suffix}`;
  });

  // Relative locale formatting calculation (Intl RelativeTimeFormat)
  public computedRelativeLocaleString = computed(() => {
    const tgt = this.durationEventDate();
    if (!tgt) return '';
    try {
      const date = new Date(tgt);
      if (isNaN(date.getTime())) return '';

      const secondsDiff = Math.floor((date.getTime() - Date.now()) / 1000);
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'long' });

      if (Math.abs(secondsDiff) < 60) {
        return rtf.format(secondsDiff, 'second');
      }
      const minsMatches = Math.floor(secondsDiff / 60);
      if (Math.abs(minsMatches) < 60) {
        return rtf.format(minsMatches, 'minute');
      }
      const hrsMatches = Math.floor(minsMatches / 60);
      if (Math.abs(hrsMatches) < 24) {
        return rtf.format(hrsMatches, 'hour');
      }
      const daysMatches = Math.floor(hrsMatches / 24);
      if (Math.abs(daysMatches) < 30) {
        return rtf.format(daysMatches, 'day');
      }
      const mosMatches = Math.floor(daysMatches / 30.43);
      if (Math.abs(mosMatches) < 12) {
        return rtf.format(mosMatches, 'month');
      }
      const yrsMatches = Math.floor(mosMatches / 12);
      return rtf.format(yrsMatches, 'year');
    } catch {
      return '';
    }
  });

  // ======================= 6. CRON EXPRESSION TRANSLATION =======================
  public setCronVal(expr: string): void {
    this.cronExpressionString.set(expr);
  }

  public cronTranslatedHuman = computed(() => {
    const expr = this.cronExpressionString().trim();
    if (!expr) return 'Enter a standard cron schedule expression';

    const fields = expr.split(/\s+/);
    if (fields.length !== 5) {
      return '⚠️ Warning: A standard cron pattern demands exactly 5 parameters (minute, hour, dayOfMonth, month, dayOfWeek).';
    }

    const [min, hour, dom, mon, dow] = fields;

    // Check simple replacements
    const minDesc = min === '*' ? 'every minute' : `at minute ${min}`;
    const hourDesc = hour === '*' ? 'of every hour' : `at hour ${hour}`;
    const domDesc = dom === '*' ? 'every day' : `on day of month ${dom}`;
    const monDesc = mon === '*' ? 'every month' : `in month ${mon}`;
    const dowDesc = dow === '*' ? 'every day of the week' : `on day of week ${dow}`;

    return `Executes ${minDesc} ${hourDesc}, ${domDesc} of ${monDesc}, ${dowDesc}.`;
  });

  public computedCronNextRuns = computed((): OccurenceRow[] => {
    const expr = this.cronExpressionString().trim();
    if (!expr) return [];
    const fields = expr.split(/\s+/);
    if (fields.length !== 5) return [];

    const now = new Date();
    const list: OccurenceRow[] = [];

    // Simulate runs based on fields dynamically
    let hoursOffset = 1;
    for (let i = 1; i <= 5; i++) {
      const simRun = new Date(now.getTime());

      // Simulating realistic cron intervals based on common indicators
      if (expr.includes('* * * * *')) {
        simRun.setMinutes(now.getMinutes() + i);
      } else if (expr.includes('0 * * * *')) {
        simRun.setHours(now.getHours() + i);
        simRun.setMinutes(0);
      } else if (expr.includes('0 0 * * *') || expr.includes('0 8 * *')) {
        simRun.setDate(now.getDate() + i);
        if (expr.includes('0 8 * *')) simRun.setHours(8, 0, 0);
        else simRun.setHours(0, 0, 0);
      } else {
        // Fallback offset interval simulation
        simRun.setHours(now.getHours() + (i * hoursOffset++));
      }

      list.push({
        index: i,
        date: simRun.toLocaleDateString() + ' ' + simRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dayOfWeek: simRun.toLocaleDateString('en', { weekday: 'short' })
      });
    }

    return list;
  });
}
