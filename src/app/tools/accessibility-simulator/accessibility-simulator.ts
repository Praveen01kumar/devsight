import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-accessibility-simulator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto text-left">
      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Controls Sidebar -->
        <div class="p-6 bg-zinc-90 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm h-fit">
          <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 block border-b dark:border-zinc-800 pb-2">ACCESSIBILITY CONTROLLER</span>

          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">VISION SIMULATOR TYPE</span>
            <div class="flex flex-col gap-1.5 font-mono text-xs">
              @for (filter of visionFilters; track filter.id) {
                <button 
                  (click)="activeFilterId.set(filter.id)"
                  [class.bg-emerald-500/10]="activeFilterId() === filter.id"
                  [class.text-emerald-500]="activeFilterId() === filter.id"
                  [class.border-emerald-500/30]="activeFilterId() === filter.id"
                  class="p-2.5 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl transition flex items-center justify-between text-left cursor-pointer"
                >
                  <div class="flex flex-col">
                    <span class="font-bold">{{ filter.name }}</span>
                    <span class="text-[9px] text-zinc-500 lowercase mt-0.5">{{ filter.desc }}</span>
                  </div>
                  <mat-icon style="font-size:16px;" class="text-zinc-[450]" [class.text-emerald-500]="activeFilterId() === filter.id">
                    {{ activeFilterId() === filter.id ? 'radio_button_checked' : 'radio_button_unchecked' }}
                  </mat-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Simulator Mock Canvas Column -->
        <div class="md:col-span-2 space-y-4">
          <span class="text-xs font-mono font-bold text-zinc-500 block">SIMULATED INTERACTIVE SANDBOX</span>

          <!-- Virtual device viewport applying visual CSS matrices on filters -->
          <div 
            class="p-8 border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl min-h-[300px] shadow-sm relative overflow-hidden transition-all duration-300"
            [style.filter]="compiledCssFilterStyle()"
          >
            <!-- Mock Web interface to inspect -->
            <div class="space-y-6">
              <!-- Navigation bar simulator -->
              <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">PORTAL DESIGN</span>
                </div>
                <div class="flex gap-2 font-mono text-[9px] font-extrabold">
                  <span class="text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded">SYSTEM OK</span>
                  <span class="text-indigo-400 px-1.5 py-0.5 bg-indigo-500/10 rounded">PROT-B</span>
                </div>
              </div>

              <!-- Content Cards -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <!-- Card 1: Alert level indicator -->
                <div class="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-[9px] font-mono text-rose-500 font-bold uppercase">ALERT INDICATOR</span>
                    <mat-icon class="text-rose-500 scale-75">error</mat-icon>
                  </div>
                  <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-100">Critical server alert</h4>
                  <p class="text-[10px] text-zinc-500 leading-snug">Red alert color codes typically alert readers. Protanopia and Deuteranopia viewers may see this as a yellowish slate, losing relative visual priority.</p>
                </div>

                <!-- Card 2: Interactive metrics tracker -->
                <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-[9px] font-mono text-emerald-500 font-bold uppercase">REVENUE STABLE</span>
                    <mat-icon class="text-emerald-500 scale-75">trending_up</mat-icon>
                  </div>
                  <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-100">Successful checkouts</h4>
                  <p class="text-[10px] text-zinc-500 leading-snug">Standard emerald trackers signify growing values. Under full color-blindness, both cards might resemble equivalent gray values, requiring shape identifiers.</p>
                </div>

              </div>

              <!-- Button actions and micro-tags -->
              <div class="flex flex-wrap gap-2 pt-2 justify-end border-t dark:border-zinc-820">
                <button class="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-[10px] rounded-lg font-mono font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">DISMISS</button>
                <button class="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px] rounded-lg font-mono cursor-pointer">COMPLETE CHECK</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AccessibilitySimulatorComponent {
  public activeFilterId = signal<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | 'blur'>('none');

  public readonly visionFilters = [
    { id: 'none' as const, name: 'STANDARD TYPICAL VISION', desc: 'No simulated visual impairments', matrix: null },
    { id: 'protanopia' as const, name: 'PROTANOPIA (RED-BLIND)', desc: 'Lacking red retinal receptors entirely', matrix: 'protanopia' },
    { id: 'deuteranopia' as const, name: 'DEUTERANOPIA (GREEN-BLIND)', desc: 'Lacking green retinal receptors entirely', matrix: 'deuteranopia' },
    { id: 'tritanopia' as const, name: 'TRITANOPIA (BLUE-BLIND)', desc: 'Lacking blue retinal receptors entirely', matrix: 'tritanopia' },
    { id: 'achromatopsia' as const, name: 'ACHROMATOPSIA (MONOCHROME)', desc: 'Extreme color deficiency / grey tones', matrix: 'achromatopsia' },
    { id: 'blur' as const, name: 'LOW VISION (BLURRY)', desc: 'Simulating mild cataracts or near-blindness', matrix: null }
  ];

  // Map filters into CSS properties using standard SVG matrices approximations
  public compiledCssFilterStyle = computed(() => {
    switch (this.activeFilterId()) {
      case 'none':
        return 'none';
      case 'blur':
        return 'blur(3.5px)';
      case 'achromatopsia':
        return 'grayscale(1)';
      
      // Protanopia matrix replacement
      case 'protanopia':
        return 'url(\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="f"%3E%3CfeColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/%3E%3C/filter%3E%3C/svg%3E#f\')';
      
      // Deuteranopia matrix replacement
      case 'deuteranopia':
        return 'url(\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="f"%3E%3CfeColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/%3E%3C/filter%3E%3C/svg%3E#f\')';

      // Tritanopia matrix replacement
      case 'tritanopia':
        return 'url(\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="f"%3E%3CfeColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/%3E%3C/filter%3E%3C/svg%3E#f\')';
    }
  });
}
