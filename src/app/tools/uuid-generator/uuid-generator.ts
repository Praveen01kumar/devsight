import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-uuid-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Controls Panel -->
      <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- UUID Version Select -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">UUID VERSION</span>
            <div class="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
              <button (click)="version.set('v4')"
                [class.bg-zinc-850]="version() === 'v4'"
                [class.text-emerald-400]="version() === 'v4'"
                class="flex-1 py-2 text-xs font-mono font-bold rounded-lg transition cursor-pointer">
                V4 (Random)
              </button>
              <button (click)="version.set('v1')"
                [class.bg-zinc-850]="version() === 'v1'"
                [class.text-emerald-400]="version() === 'v1'"
                class="flex-1 py-2 text-xs font-mono font-bold rounded-lg transition cursor-pointer">
                V1 (Time-based)
              </button>
            </div>
          </div>

          <!-- Quantity Input -->
          <div class="space-y-2">
            <span class="text-xs font-mono font-bold text-zinc-400">QUANTITY (MAX 105)</span>
            <div class="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 overflow-hidden">
              <mat-icon class="text-zinc-600 scale-90">format_list_numbered</mat-icon>
              <input type="number" min="1" max="105" [value]="count()" (change)="onCountChange($event)"
                class="w-full bg-transparent border-none text-zinc-100 text-sm font-mono focus:ring-0 p-3 select-text"/>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <!-- Uppercase Tagger -->
          <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
            <input 
              type="checkbox" 
              [checked]="uppercase()"
              (change)="uppercase.set(!uppercase())"
              class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
            />
            <div class="font-mono text-xs">
              <span class="font-bold text-zinc-300">UPPERCASE FORMAT</span>
            </div>
          </label>

          <!-- Hyphen Tagger -->
          <label class="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition select-none">
            <input 
              type="checkbox" 
              [checked]="hyphens()"
              (change)="hyphens.set(!hyphens())"
              class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
            />
            <div class="font-mono text-xs">
              <span class="font-bold text-zinc-300">HYPHENS EMBEDDED</span>
            </div>
          </label>
        </div>

        <!-- Submit Button -->
        <button (click)="rebuildUUIDs()"
          class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer">
          <mat-icon class="scale-90">cached</mat-icon> GENERATE UUIDS
        </button>
      </div>

      <!-- Result Panel -->
      @if (resultsList().length > 0) {
        <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div class="flex justify-between items-center bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-855 font-mono">
            <span class="text-[10px] text-zinc-500 uppercase font-bold">GENERATED OUTPUTS</span>
            <button (click)="copyAll()"
              class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <mat-icon class="text-xs scale-75">{{ copySuccess() ? 'check' : 'content_copy' }}</mat-icon>
              {{ copySuccess() ? 'COPIED ALL!' : 'COPY ALL' }}
            </button>
          </div>

          <!-- Code output frame -->
          <div class="max-h-[300px] overflow-y-auto border border-zinc-850 rounded-xl bg-zinc-950/60 p-4 font-mono text-zinc-300 text-xs text-left leading-relaxed divide-y divide-zinc-900">
            @for (uuid of resultsList(); track uuid) {
              <div class="py-2 flex items-center justify-between group">
                <span class="select-all">{{ uuid }}</span>
                <button (click)="copySingle(uuid, $index)"
                  class="opacity-0 group-hover:opacity-100 p-1 text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition"
                  title="Copy this UUID">
                  <mat-icon class="text-xs scale-75">
                    {{ activeSingleCopiedIndex() === $index ? 'check' : 'content_copy' }}
                  </mat-icon>
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class UuidGeneratorComponent {
  public version = signal<'v4' | 'v1'>('v4');
  public count = signal<number>(5);
  public uppercase = signal<boolean>(false);
  public hyphens = signal<boolean>(true);
  
  // Storage for generated IDs
  public resultsList = signal<string[]>([]);
  public copySuccess = signal<boolean>(false);
  public activeSingleCopiedIndex = signal<number | null>(null);

  constructor() {
    this.rebuildUUIDs();
  }

  public onCountChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    let n = parseInt(val, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 105) n = 105;
    this.count.set(n);
  }

  public rebuildUUIDs(): void {
    const list: string[] = [];
    const limit = this.count();
    const ver = this.version();

    for (let i = 0; i < limit; i++) {
      let id = ver === 'v4' ? this.generateV4() : this.generateV1();
      
      if (!this.hyphens()) {
        id = id.replace(/-/g, '');
      }
      
      if (this.uppercase()) {
        id = id.toUpperCase();
      }

      list.push(id);
    }

    this.resultsList.set(list);
  }

  public copyAll(): void {
    const val = this.resultsList().join('\n');
    navigator.clipboard.writeText(val).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  public copySingle(uuid: string, idx: number): void {
    navigator.clipboard.writeText(uuid).then(() => {
      this.activeSingleCopiedIndex.set(idx);
      setTimeout(() => {
        if (this.activeSingleCopiedIndex() === idx) {
          this.activeSingleCopiedIndex.set(null);
        }
      }, 1500);
    });
  }

  /**
   * Secure cryptographic UUID Version 4 formulation
   */
  private generateV4(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);

    // Apply exact version tag (0100xxxx) on octet 8
    arr[6] = (arr[6] & 0x0f) | 0x40;
    // Apply exact RFC 4122 variant tag (10xxxxxx) on octet 9
    arr[8] = (arr[8] & 0x3f) | 0x80;

    const hex: string[] = [];
    for (let i = 0; i < 16; i++) {
      hex.push(arr[i].toString(16).padStart(2, '0'));
    }

    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  /**
   * RFC Client V1 time-based UUID formulation helper
   */
  private generateV1(): string {
    // Collect microseconds epoch timestamps, simulating standard clock sequences
    const timestamp = Date.now() * 10000 + 122192928000000000; // Offset since Greg Gregorian epoch
    const timeHex = timestamp.toString(16).padStart(15, '0');
    
    const timeLow = timeHex.slice(7, 15);
    const timeMid = timeHex.slice(3, 7);
    const timeHiAndVersion = '1' + timeHex.slice(0, 3); // V1

    // Clock sequence and node values
    const clockSeqAndNode = this.generateV1Node();

    return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeqAndNode.slice(0, 4)}-${clockSeqAndNode.slice(4)}`;
  }

  private generateV1Node(): string {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    
    // Ensure multicast bit set to represent locally generated address coordinates
    arr[0] = arr[0] | 0x01;
    
    const hex: string[] = [];
    for (let i = 0; i < 8; i++) {
      hex.push(arr[i].toString(16).padStart(2, '0'));
    }
    return hex.join('');
  }
}
