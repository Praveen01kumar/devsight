import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-jwt-decoder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Input Token Area -->
      <div class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
          <span class="text-xs font-semibold text-zinc-400 font-mono">PASTE TOKEN HERE (JWT)</span>
          @if (tokenInput()) {
            <button (click)="tokenInput.set('')"
              class="px-2 py-0.5 text-xs text-zinc-500 hover:text-white rounded transition font-mono flex items-center gap-1 cursor-pointer">
              <mat-icon class="scale-50">delete</mat-icon> CLEAR
            </button>
          }
        </div>
        <textarea
          #jwtTextarea
          [value]="tokenInput()"
          (input)="tokenInput.set(jwtTextarea.value.trim())"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE4MDc1Njc4OTB9.signature..."
          class="w-full h-24 p-4 text-xs font-mono bg-zinc-900 text-zinc-100 placeholder-zinc-700 border-none outline-none resize-none focus:ring-0 select-text"
        ></textarea>
      </div>

      <!-- Decode Outputs panel -->
      @if (tokenInput()) {
        @if (decodeError()) {
          <div class="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-400 font-mono flex items-start gap-3 text-xs text-left leading-relaxed">
            <mat-icon class="text-rose-400 scale-90 shrink-0">error_outline</mat-icon>
            <div class="space-y-1">
              <span class="font-bold">Invalid Token Format</span>
              <p>{{ decodeError() }}</p>
            </div>
          </div>
        } @else {
          <!-- Token Status indicators -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Algorithm Card -->
            <div class="p-4 bg-zinc-900/50 border border-zinc-850 rounded-xl font-mono text-left space-y-1">
              <span class="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">ALGORITHM</span>
              <span class="text-sm font-semibold text-zinc-200">{{ algorithm() || 'None' }}</span>
            </div>

            <!-- Signature Verification -->
            <div class="p-4 bg-zinc-900/50 border border-zinc-850 rounded-xl font-mono text-left space-y-1">
              <span class="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">SIGNATURE TYPE</span>
              <span class="text-sm font-semibold text-amber-400 font-mono">{{ signatureInfo() }}</span>
            </div>

            <!-- Expiration Meter -->
            <div class="p-4 bg-zinc-900/50 border border-zinc-850 rounded-xl font-mono text-left space-y-1">
              <span class="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">TOKEN LIFETIME</span>
              <div class="flex items-center gap-2">
                @if (isExpired() === true) {
                  <span class="text-xs border border-rose-950 bg-rose-950/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                    EXPIRED
                  </span>
                } @else if (isExpired() === false) {
                  <span class="text-xs border border-emerald-950 bg-emerald-950/10 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    ACTIVE
                  </span>
                } @else {
                  <span class="text-zinc-500">No expiration claim</span>
                }
              </div>
            </div>
          </div>

          <!-- Decoded payload panels -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <!-- Header section -->
            <div class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-[350px]">
              <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 font-mono">
                <span class="text-[10px] uppercase font-bold text-sky-400">Section 1: HEADER</span>
                <span class="text-[10px] text-zinc-500">Defines Signature & Token Type</span>
              </div>
              <div class="flex-1 overflow-auto p-4 bg-zinc-900/40 text-xs font-mono text-zinc-300 text-left select-text">
                <pre class="whitespace-pre overflow-x-auto text-sky-300 leading-relaxed">{{ headerJson() }}</pre>
              </div>
            </div>

            <!-- Payload section -->
            <div class="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-[350px]">
              <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 font-mono">
                <span class="text-[10px] uppercase font-bold text-emerald-400">Section 2: PAYLOAD</span>
                <span class="text-[10px] text-zinc-500">Contains Claims & User Info</span>
              </div>
              <div class="flex-1 overflow-auto p-4 bg-zinc-900/40 text-xs font-mono text-zinc-300 text-left select-text">
                <pre class="whitespace-pre overflow-x-auto text-emerald-300 leading-relaxed">{{ payloadJson() }}</pre>
              </div>
            </div>
          </div>

          <!-- Life details metrics -->
          <div class="p-4 bg-zinc-950/30 border border-zinc-800 rounded-xl font-mono text-left space-y-2 text-xs text-zinc-400">
            <span class="font-bold text-zinc-300">CLAIMS DECODED TIMESTAMPS:</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span class="text-zinc-500">Issued At (iat):</span>
                <span class="text-zinc-200 ml-2 select-all">{{ iatString() || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-zinc-500">Expires At (exp):</span>
                <span class="text-zinc-200 ml-2 select-all">{{ expString() || 'N/A' }}</span>
              </div>
            </div>
          </div>
        }
      } @else {
        <!-- Helper view -->
        <div class="p-12 border border-zinc-850/60 rounded-2xl bg-zinc-950/20 text-center space-y-3 max-w-sm mx-auto">
          <mat-icon class="text-4xl text-zinc-700 animate-pulse">lock_open</mat-icon>
          <div class="space-y-1">
            <p class="text-xs font-mono font-bold text-zinc-400 uppercase">Input Token Required</p>
            <p class="text-xs text-zinc-600 leading-relaxed">Paste your signature JWT token above to evaluate header variables and claims instantly.</p>
          </div>
        </div>
      }
    </div>
  `
})
export class JwtDecoderComponent {
  public tokenInput = signal<string>('');

  // Slices JWT sections
  private segments = computed(() => {
    const raw = this.tokenInput().trim();
    if (!raw) return [];
    return raw.split('.');
  });

  // Flag invalid inputs
  public decodeError = computed(() => {
    const parts = this.segments();
    if (parts.length === 0) return null;
    if (parts.length !== 3) {
      return `JWT tokens must comprise 3 base64URL sections separated by periods. Found ${parts.length} segments.`;
    }
    
    // Check if sections are parsable
    try {
      this.decodeBase64Url(parts[0]);
      this.decodeBase64Url(parts[1]);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      return `Failed to decode Base64Url segments structural content. ${msg}`;
    }
  });

  // Extract Header Object
  public headerObj = computed(() => {
    if (this.decodeError()) return null;
    const parts = this.segments();
    if (parts.length < 1) return null;
    try {
      return JSON.parse(this.decodeBase64Url(parts[0]));
    } catch {
      return null;
    }
  });

  // Extract Payload Object
  public payloadObj = computed(() => {
    if (this.decodeError()) return null;
    const parts = this.segments();
    if (parts.length < 2) return null;
    try {
      return JSON.parse(this.decodeBase64Url(parts[1]));
    } catch {
      return null;
    }
  });

  // Formatted output text strings
  public headerJson = computed(() => {
    const h = this.headerObj();
    return h ? JSON.stringify(h, null, 2) : '';
  });

  public payloadJson = computed(() => {
    const p = this.payloadObj();
    return p ? JSON.stringify(p, null, 2) : '';
  });

  // Extract Algorithm
  public algorithm = computed(() => {
    const h = this.headerObj();
    return h ? h.alg : '';
  });

  // Check Expiration
  public isExpired = computed(() => {
    const p = this.payloadObj();
    if (!p || !p.exp) return null;
    const nowEpoch = Math.floor(Date.now() / 1000);
    return nowEpoch > parseInt(p.exp, 10);
  });

  public iatString = computed(() => {
    const p = this.payloadObj();
    if (!p || !p.iat) return '';
    try {
      return new Date(parseInt(p.iat, 10) * 1000).toString();
    } catch {
      return '';
    }
  });

  public expString = computed(() => {
    const p = this.payloadObj();
    if (!p || !p.exp) return '';
    try {
      return new Date(parseInt(p.exp, 10) * 1000).toString();
    } catch {
      return '';
    }
  });

  public signatureInfo = computed(() => {
    const parts = this.segments();
    if (parts.length < 3) return 'No Signature Segment';
    return parts[2] ? `Encrypted (Segment 3 Present)` : 'Truncated Signature';
  });

  /**
   * Decodes Base64Url string format
   */
  private decodeBase64Url(str: string): string {
    // Swap padding tokens
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Convert to native string safely supporting UTF-8 content unicode ranges
    const raw = atob(base64);
    const codePoints = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      codePoints[i] = raw.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(codePoints);
  }
}
