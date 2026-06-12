import { ChangeDetectionStrategy, Component, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unix-timestamp',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Conversion Tab Panel -->
      <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <span class="text-xs font-mono font-bold text-zinc-400 block pb-1 border-b border-zinc-850">EPOCH TO CALENDAR CONVERTER</span>
        <div class="space-y-3">
          <div class="space-y-1.5">
            <span class="text-[10px] font-mono font-bold text-zinc-400">ENTER UNIX TIMESTAMP (Seconds / Milliseconds)</span>
            <div class="flex items-center bg-zinc-950 border border-zinc-850 rounded-xl px-3 overflow-hidden">
              <input type="text" #epochInputRef [value]="epochInput()"
                (input)="epochInput.set(epochInputRef.value.trim())" placeholder="1779947854"
                class="w-full bg-transparent border-none text-zinc-100 text-sm font-mono focus:ring-0 p-3 select-text"/>
              <button (click)="epochInput.set(currentEpoch().toString())"
                class="p-2 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 rounded-lg whitespace-nowrap">
                INSERT CURRENT
              </button>
            </div>
          </div>

          <!-- Parsed date results list -->
          @if (epochInput() && parsedDate()) {
            <div class="pt-2 divide-y divide-zinc-850 font-mono text-xs text-left">
              <div class="py-2.5 flex justify-between gap-4">
                <span class="text-zinc-500">ISO 8601:</span>
                <span class="text-zinc-300 select-all">{{ parsedDate()?.toISOString() }}</span>
              </div>
              <div class="py-2.5 flex justify-between gap-4">
                <span class="text-zinc-500">Local Time:</span>
                <span class="text-zinc-300 select-all">{{ parsedDate()?.toString() }}</span>
              </div>
              <div class="py-2.5 flex justify-between gap-4">
                <span class="text-zinc-500">UTC representation:</span>
                <span class="text-zinc-300 select-all">{{ parsedDate()?.toUTCString() }}</span>
              </div>
            </div>
          } @else if (epochInput()) {
            <div class="text-xs font-mono text-rose-400 py-2">
              ⚠️ Invalid numeric value. Please write a numeric seconds/milliseconds count.
            </div>
          }
        </div>
      </div>

      <!-- Human Calendar To Epoch Converter -->
      <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <span class="text-xs font-mono font-bold text-zinc-400 block pb-1 border-b border-zinc-850">CALENDAR TO EPOCH CONVERTER</span>
        <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
          <div class="space-y-1.5">
            <span class="text-[10px] font-mono font-bold text-zinc-400">SELECT DATE & TIME</span>
            <input 
              type="datetime-local"
              #calInputRef
              [value]="calendarDateInput()"
              (change)="calendarDateInput.set(calInputRef.value)"
              class="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs font-mono text-zinc-100 focus:ring-0 focus:border-zinc-750"
            />
          </div>

          <!-- Outputs computed dates -->
          @if (calendarEpoch()) {
            <div class="space-y-1 bg-zinc-950/45 p-4 rounded-xl border border-zinc-850 flex flex-col justify-center font-mono text-xs text-left leading-relaxed">
              <div>
                <span class="text-zinc-500 block text-[10px] uppercase font-bold tracking-widest">UNIX TIMESTAMP (Sec)</span>
                <span class="text-emerald-400 font-bold select-all text-sm">{{ calendarEpoch() }}</span>
              </div>
              <div class="mt-2 text-[10px] text-zinc-500">
                Milliseconds: {{ calendarEpoch() * 1000 }}
              </div>
            </div>
          }
        </div>
      </div>
      <!-- Live Ticker Card -->
      <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-3 relative overflow-hidden">
        <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">CURRENT UNIX TIMESTAMP</span>
        <div class="text-2xl md:text-3xl font-mono text-emerald-400 font-bold tracking-wider select-all">
          {{ currentEpoch() }}
        </div>
        <div class="flex items-center justify-center gap-4 text-xs font-mono text-zinc-500">
          <span>{{ currentLocalTime() }}</span>
          <button (click)="copyCurrentEpoch()"
            class="p-1 hover:text-white rounded transition cursor-pointer"
            title="Copy current epoch">
            <mat-icon class="scale-75">{{ tickerCopied() ? 'check' : 'content_copy' }}</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `
})
export class UnixTimestampComponent implements OnDestroy {
  public currentEpoch = signal<number>(Math.floor(Date.now() / 1000));
  public currentLocalTime = signal<string>(new Date().toString());
  public tickerCopied = signal<boolean>(false);
  // Converters inputs
  public epochInput = signal<string>('1779947854');
  public calendarDateInput = signal<string>('2026-05-28T12:00');

  private intervalTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Dynamic timer ticker to increment state values
    if (typeof window !== 'undefined') {
      this.intervalTimer = setInterval(() => {
        const d = new Date();
        this.currentEpoch.set(Math.floor(d.getTime() / 1000));
        this.currentLocalTime.set(d.toString());
      }, 1000);
    }
  }

  public parsedDate = computed(() => {
    const raw = this.epochInput().trim();
    if (!raw) return null;
    let n = parseInt(raw, 10);
    if (isNaN(n)) return null;

    // Check if input represents seconds or milliseconds count
    if (n < 10000000000) {
      n = n * 1000; // seconds to ms
    }
    const d = new Date(n);
    return isNaN(d.getTime()) ? null : d;
  });

  public calendarEpoch = computed(() => {
    const s = this.calendarDateInput();
    if (!s) return 0;
    const d = new Date(s);
    if (isNaN(d.getTime())) return 0;
    return Math.floor(d.getTime() / 1000);
  });

  public copyCurrentEpoch(): void {
    navigator.clipboard.writeText(this.currentEpoch().toString()).then(() => {
      this.tickerCopied.set(true);
      setTimeout(() => this.tickerCopied.set(false), 2000);
    });
  }

  public ngOnDestroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
  }
}
