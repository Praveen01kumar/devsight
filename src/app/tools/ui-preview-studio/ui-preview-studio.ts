import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ui-preview-studio',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Layout Controls Top Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b dark:border-zinc-800 pb-4">
        <!-- Viewport selector buttons -->
        <div class="flex gap-2 font-mono text-[10px] font-bold">
          <button (click)="viewportType.set('desktop')"
            [class.bg-emerald-500/10]="viewportType() === 'desktop'"
            [class.text-emerald-500]="viewportType() === 'desktop'"
            class="px-3.5 py-2 border border-zinc-200 dark:border-zinc-850 rounded-xl cursor-pointer transition flex items-center gap-1 uppercase">
            <mat-icon style="font-size:14px; width:14px; height:14px;" class="flex items-center justify-center">desktop_windows</mat-icon> DESKTOP LAYOUT
          </button>
          <button (click)="viewportType.set('mobile')"
            [class.bg-emerald-500/10]="viewportType() === 'mobile'"
            [class.text-emerald-500]="viewportType() === 'mobile'"
            class="px-3.5 py-2 border border-zinc-200 dark:border-zinc-855 rounded-xl cursor-pointer transition flex items-center gap-1 uppercase">
            <mat-icon style="font-size:14px; width:14px; height:14px;" class="flex items-center justify-center">phone_iphone</mat-icon> MOBILE GRID
          </button>
        </div>

        <!-- Selected Widget Preset picker -->
        <div class="flex gap-2 font-mono text-[10px] font-bold">
          <button (click)="selectedUiPreset.set('dashboard')"
            [class.bg-emerald-500/10]="selectedUiPreset() === 'dashboard'"
            [class.text-emerald-500]="selectedUiPreset() === 'dashboard'"
            class="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer text-xs"
          >ANALYTICS</button>
          <button (click)="selectedUiPreset.set('form')"
            [class.bg-emerald-500/10]="selectedUiPreset() === 'form'"
            [class.text-emerald-500]="selectedUiPreset() === 'form'"
            class="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer text-xs"
          >FEEDBACK</button>
        </div>

      </div>

      <!-- Live Virtual Simulator viewports area -->
      <div class="flex justify-center items-center bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 relative overflow-hidden transition-all duration-300">
        <div [class.max-w-[340px]]="viewportType() === 'mobile'"
          [class.w-full]="viewportType() === 'mobile'"
          [class.h-[500px]]="viewportType() === 'mobile'"
          [class.w-full]="viewportType() === 'desktop'"
          [class.min-h-[280px]]="viewportType() === 'desktop'"
          class="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col p-6 text-left transition-all duration-300 relative overflow-y-auto">
          <!-- Presets template renderer -->
          @if (selectedUiPreset() === 'dashboard') {
            <div class="space-y-4">
              <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h4 class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200 uppercase">Live Performance Track</h4>
                </div>
                <span class="text-[9px] font-mono text-zinc-400 font-bold">14s AGO</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-1">
                  <span class="text-[9px] font-mono text-zinc-400 font-bold block">PAGE CONVERSIONS</span>
                  <p class="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono">1,485/hr</p>
                  <span class="text-[9px] font-mono font-bold text-emerald-500">+12% vs yesterday</span>
                </div>

                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-1">
                  <span class="text-[9px] font-mono text-zinc-400 font-bold block font-bold">AVG SESSION DURATION</span>
                  <p class="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono">4:54 MIN</p>
                  <span class="text-[9px] font-mono font-bold text-rose-400">-2.1% Bounce Rate</span>
                </div>
              </div>
            </div>
          }

          @if (selectedUiPreset() === 'form') {
            <div class="space-y-4">
              <div class="pb-2 border-b dark:border-zinc-800">
                <h4 class="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">Send direct feedback</h4>
                <p class="text-[10px] text-zinc-500 font-mono mt-0.5">Let the design engineering teams know what we should scale.</p>
              </div>

              <!-- Dummy form inputs -->
              <div class="space-y-2.5 font-mono text-[10px]">
                <div class="space-y-1">
                  <span class="text-zinc-[450] font-bold">EMAIL ADDRESS</span>
                  <input type="text" placeholder="dev@corp.com" class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-2 rounded" />
                </div>
                <div class="space-y-1">
                  <span class="text-zinc-[450] font-bold">COMMENT SEGMENTS</span>
                  <textarea placeholder="Great system performance, loving the CSS compilers..." class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-2 rounded max-h-[80px]"></textarea>
                </div>
                <button class="w-full py-2 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 font-bold rounded-lg text-center cursor-pointer">
                  SUBMIT PRESETS REPORT
                </button>
              </div>
            </div>
          }

        </div>

      </div>

      <!-- Collapsible Copy Code sections -->
      <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-950 rounded-2xl font-mono text-xs space-y-4 text-left">
        <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
          <span class="text-[10px] text-zinc-500 font-bold uppercase">PRE-RENDERED INLINE COMPONENT HTML</span>
          <button (click)="copyValue(compiledPresetOutput())" class="text-xs text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
            <mat-icon class="text-xs scale-75">content_copy</mat-icon> COPY CODES
          </button>
        </div>

        <div>
          <span class="text-[9px] text-zinc-400 font-bold uppercase block pb-1">EXPORTABLE HTML SNIPPETS</span>
          <pre class="bg-zinc-900 leading-relaxed text-[10px] p-2.5 rounded-lg text-zinc-300 mt-1 select-all overflow-y-auto max-h-[140px] whitespace-pre">{{ compiledPresetOutput() }}</pre>
        </div>
      </div>

      <!-- SUCCESS alert popup indicator elements -->
      @if (copySuccess()) {
        <div class="fixed bottom-4 right-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold px-4 py-2 text-center rounded-xl shadow-2xl transition z-[99999] flex items-center gap-2">
          <mat-icon class="scale-75 mb-0.5">check_circle</mat-icon> COPIED COMPONENT HTML TEMPLATES!
        </div>
      }
    </div>
  `
})
export class UiPreviewStudioComponent {
  public viewportType = signal<'desktop' | 'mobile'>('desktop');
  public selectedUiPreset = signal<'dashboard' | 'form'>('dashboard');
  public copySuccess = signal<boolean>(false);

  public compiledPresetOutput = computed(() => {
    if (this.selectedUiPreset() === 'dashboard') {
      return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
    <span class="text-[9px] font-mono text-zinc-400 block font-bold">PAGE CONVERSIONS</span>
    <p class="text-xl font-extrabold">1,485/hr</p>
    <span class="text-[9px] font-mono text-emerald-500 font-bold">+12% vs yesterday</span>
  </div>
  <div class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
    <span class="text-[9px] font-mono text-zinc-400 block font-bold">SESSION TIMEOUTS</span>
    <p class="text-xl font-extrabold">4:54 MIN</p>
    <span class="text-[9px] font-mono text-rose-400 font-bold">-2.1% bounce</span>
  </div>
</div>`;
    }
    return `<div class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3.5">
  <h4 class="text-sm font-extrabold">Contact designs team</h4>
  <input type="text" placeholder="dev@corp.com" class="w-full bg-white p-2 rounded border" />
  <textarea placeholder="Comment" class="w-full bg-white p-2 rounded border"></textarea>
  <button class="w-full py-2 bg-emerald-500 text-black font-bold rounded-lg text-center cursor-pointer">SUBMIT REPORT</button>
</div>`;
  });

  public copyValue(val: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }
}
