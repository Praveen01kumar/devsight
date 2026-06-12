import { ChangeDetectionStrategy, Component, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface HistoryRecord {
  id: string;
  password: string;
  type: string;
  entropy: number;
  strength: string;
  timestamp: string;
}

export interface Preset {
  name: string;
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  minReqs: boolean;
  customSet: string;
  type: string;
  mode: string;
}

const WORDS_POOL = [
  'about', 'active', 'agent', 'alpha', 'amber', 'anchor', 'angel', 'apple', 'apron', 'arctic', 'arrow', 'aspect', 'atlas', 'atomic', 'aurora', 'autumn', 'avatar', 'beacon', 'breeze', 'bronze', 'bubble', 'bullet', 'cactus', 'camel', 'candle', 'canopy', 'canyon', 'canvas', 'carbon', 'cargo', 'castle', 'cedar', 'celto', 'chain', 'chalk', 'cherry', 'cipher', 'circus', 'cliff', 'cloak', 'cloud', 'clover', 'cobalt', 'comet', 'copper', 'coral', 'cosmos', 'coyote', 'crater', 'crayon', 'crystal', 'dagger', 'dahlia', 'dawn', 'desert', 'detail', 'device', 'diesel', 'doctor', 'dolphin', 'dragon', 'dusty', 'eagle', 'earth', 'echo', 'eclipse', 'elastic', 'elbow', 'ember', 'emerald', 'engine', 'epoch', 'exile', 'expert', 'factor', 'falcon', 'fathom', 'feather', 'feline', 'fender', 'finch', 'flame', 'flavor', 'flint', 'forest', 'fossil', 'galaxy', 'garden', 'gasket', 'guitar', 'harbor', 'hazard', 'helmet', 'heron', 'impact', 'indigo', 'island', 'jacket', 'jasper', 'jungle', 'kettle', 'knight', 'laptop', 'lava', 'legend', 'leopard', 'lizard', 'lobster', 'magnet', 'maple', 'marble', 'matrix', 'meadow', 'melody', 'meteor', 'mirror', 'monkey', 'mortar', 'mosaic', 'motion', 'nebula', 'nectar', 'needle', 'neon', 'neutron', 'nomad', 'novel', 'nucleus', 'oasis', 'ocean', 'olive', 'onyx', 'orbit', 'orchid', 'oxygen', 'oyster', 'palace', 'panda', 'panther', 'pebble', 'pelican', 'phantom', 'pigeon', 'pillar', 'pilot', 'pioneer', 'planet', 'plasma', 'plastic', 'plateau', 'pocket', 'polar', 'pollen', 'portal', 'potion', 'prism', 'proton', 'pulley', 'pulsar', 'radar', 'rainbow', 'ranger', 'ratchet', 'raven', 'razor', 'record', 'rescue', 'river', 'rocket', 'rover', 'saddle', 'safari', 'salmon', 'sector', 'sensor', 'shadow', 'shield', 'shiver', 'silver', 'sketch', 'solar', 'spark', 'sphere', 'spiral', 'spring', 'sprout', 'squad', 'stable', 'stripe', 'stucco', 'summit', 'sunset', 'symbol', 'syntax', 'system', 'target', 'temple', 'timber', 'toggle', 'tomato', 'topaz', 'tracker', 'transit', 'trench', 'tulip', 'tunnel', 'tundra', 'turtle', 'vacuum', 'vector', 'vegas', 'velvet', 'vortex', 'voyage', 'walnut', 'weaver', 'whisper', 'willow', 'winter', 'wizard', 'wombat', 'xenon', 'yacht', 'zenith', 'zephyr', 'zinc', 'zodiac'
];

const WEAK_DICTIONARY = [
  '123456', 'password', '12345678', '123456789', 'qwerty', '12345', 'letmein', 'admin', 'admin123', 'password123', 
  'welcome', 'login', 'security', 'oracle', 'google', 'microsoft', 'mustang', 'dragon', 'football', 'soccer', 
  'monkey', 'shadow', 'master', 'hunter', 'hunter2', 'baseball', 'yellow', 'testing', 'test123', 'iloveyou'
];

@Component({
  selector: 'app-password-generator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 text-left select-text max-w-5xl mx-auto">
      <!-- Upper Header & Interactive Navigation Tab Selector -->
      <div class="p-2 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-wrap gap-1">
        <button
          (click)="activeTab.set('password-generator')"
          [class.bg-emerald-500/10]="activeTab() === 'password-generator'"
          [class.text-emerald-400]="activeTab() === 'password-generator'"
          [class.border-emerald-500/20]="activeTab() === 'password-generator'"
          [class.text-zinc-400]="activeTab() !== 'password-generator'"
          class="flex shadow-sm items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent font-sans text-xs font-bold uppercase transition-all duration-200 flex-1 min-w-[150px] justify-center cursor-pointer">
          <mat-icon class="scale-90 select-none">lock</mat-icon>
          <span>Password Generator</span>
        </button>

        <button
          (click)="activeTab.set('passphrase-generator')"
          [class.bg-emerald-500/10]="activeTab() === 'passphrase-generator'"
          [class.text-emerald-400]="activeTab() === 'passphrase-generator'"
          [class.border-emerald-500/20]="activeTab() === 'passphrase-generator'"
          [class.text-zinc-400]="activeTab() !== 'passphrase-generator'"
          class="flex shadow-sm items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent font-sans text-xs font-bold uppercase transition-all duration-200 flex-1 min-w-[150px] justify-center cursor-pointer">
          <mat-icon class="scale-90 select-none">vpn_key</mat-icon>
          <span>Passphrase Mode</span>
        </button>

        <button
          (click)="activeTab.set('password-strength-checker')"
          [class.bg-emerald-500/10]="activeTab() === 'password-strength-checker'"
          [class.text-emerald-400]="activeTab() === 'password-strength-checker'"
          [class.border-emerald-500/20]="activeTab() === 'password-strength-checker'"
          [class.text-zinc-400]="activeTab() !== 'password-strength-checker'"
          class="flex shadow-sm items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent font-sans text-xs font-bold uppercase transition-all duration-200 flex-1 min-w-[150px] justify-center cursor-pointer">
          <mat-icon class="scale-90 select-none">security</mat-icon>
          <span>Policy & Strength Auditor</span>
        </button>
      </div>

      <!-- MAIN TABS OUTER CONTROLLER -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 column parameters viewport -->
        <div class="lg:col-span-2 space-y-6">
          <!-- TAB 1: ADVANCED PASSWORD GENERATOR PANEL -->
          @if (activeTab() === 'password-generator') {
            <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-6 animate-fadeIn transition-all">
              <!-- Subtitle and Password Categories Selector -->
              <div class="space-y-3">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">TEMPLATE TYPES</span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  @for (t of [
                    { id: 'standard', name: 'Alphanumeric Key', icon: 'lock' },
                    { id: 'pin', name: 'Secured PIN', icon: 'dialpad' },
                    { id: 'api', name: 'API Key Token', icon: 'code' },
                    { id: 'wifi', name: 'WiFi Security', icon: 'wifi' },
                    { id: 'token', name: 'Base64 Hash / Salt', icon: 'fingerprint' },
                    { id: 'recovery', name: 'Recovery Key Set', icon: 'restore' }
                  ]; track t.id) {
                    <button
                      (click)="setPresetType(t.id)"
                      [class.bg-zinc-950]="passwordTemplateId() === t.id"
                      [class.border-emerald-500/45]="passwordTemplateId() === t.id"
                      [class.text-white]="passwordTemplateId() === t.id"
                      [class.border-zinc-800/60]="passwordTemplateId() !== t.id"
                      [class.text-zinc-400]="passwordTemplateId() !== t.id"
                      class="px-3 py-2.5 rounded-xl border bg-zinc-950/20 hover:bg-zinc-950/50 hover:text-white transition flex items-center gap-2 text-xs font-mono font-bold text-left cursor-pointer">
                      <mat-icon class="scale-75 text-emerald-400 select-none">{{ t.icon }}</mat-icon>
                      <span class="truncate leading-none">{{ t.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Main interactive slider length -->
              <div class="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-3">
                <div class="flex items-center justify-between font-mono text-xs">
                  <span class="font-bold text-zinc-400 uppercase">PASSWORD CHARACTER COUNT</span>
                  <span class="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">{{ length() }} Chars</span>
                </div>
                <input
                  type="range"
                  [min]="passwordTemplateId() === 'pin' ? 4 : passwordTemplateId() === 'recovery' ? 16 : 6"
                  [max]="passwordTemplateId() === 'pin' ? 12 : 128"
                  [value]="length()"
                  (input)="onLengthChange($event)"
                  class="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div class="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>{{ passwordTemplateId() === 'pin' ? '4 Digits' : '6 Characters' }}</span>
                  <span>{{ passwordTemplateId() === 'token' ? 'URL Safe Cryptography' : 'Standard 16 / 32 Chars' }}</span>
                  <span>{{ passwordTemplateId() === 'pin' ? '12 max' : '128 max' }}</span>
                </div>
              </div>

              <!-- General Preset Rule Engines (Default, Memorability, Security Levels) -->
              <div class="space-y-3">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">CYBER DEFENSE LEVELS</span>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  @for (m of [
                    { id: 'default', title: 'Standard Balanced', desc: 'Secure, normal printable' },
                    { id: 'readable', title: 'Speakable Memor', desc: 'Alternating vowel structures' },
                    { id: 'developer', title: 'Escape-Safe CLI', desc: 'No complex bracket codes' },
                    { id: 'security', title: 'Military Shield', desc: 'Forced ultra density' }
                  ]; track m.id) {
                    <button (click)="onSelectionModeChange(m.id)"
                      [class.bg-emerald-500/10]="generationMode() === m.id"
                      [class.border-emerald-500/35]="generationMode() === m.id"
                      [class.text-emerald-400]="generationMode() === m.id"
                      [class.bg-zinc-950/20]="generationMode() !== m.id"
                      [class.border-zinc-805]="generationMode() !== m.id"
                      [class.text-zinc-450]="generationMode() !== m.id"
                      class="p-3 border rounded-xl text-left hover:border-zinc-700 hover:bg-zinc-950/40 transition hover:text-white cursor-pointer">
                      <p class="font-mono text-[10.5px] font-bold leading-none">{{ m.title }}</p>
                      <p class="text-[9px] text-zinc-500 font-sans mt-1 leading-normal capitalize">{{ m.desc }}</p>
                    </button>
                  }
                </div>
              </div>

              <!-- Parameter Option Blocks -->
              <div class="space-y-3">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">CHARACTER INCLUSIONS</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label [class.opacity-40]="isOptionDisabled('uppercase')" class="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition select-none">
                    <input type="checkbox" [checked]="includeUppercase()"
                      [disabled]="isOptionDisabled('uppercase')"
                      (change)="includeUppercase.set(!includeUppercase())"
                      class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"/>
                    <div class="font-mono text-xs">
                      <span class="font-bold text-zinc-300 block">A-Z UPPERCASE</span>
                      <span class="text-[9.5px] text-zinc-500">Capitalised alphabetical list</span>
                    </div>
                  </label>

                  <label [class.opacity-40]="isOptionDisabled('lowercase')" class="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition select-none">
                    <input type="checkbox" [checked]="includeLowercase()"
                      [disabled]="isOptionDisabled('lowercase')"
                      (change)="includeLowercase.set(!includeLowercase())"
                      class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"/>
                    <div class="font-mono text-xs">
                      <span class="font-bold text-zinc-300 block">a-z LOWERCASE</span>
                      <span class="text-[9.5px] text-zinc-500">Standard lower character pools</span>
                    </div>
                  </label>

                  <label [class.opacity-40]="isOptionDisabled('numbers')" class="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition select-none">
                    <input type="checkbox" [checked]="includeNumbers()"
                      [disabled]="isOptionDisabled('numbers')"
                      (change)="includeNumbers.set(!includeNumbers())"
                      class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"/>
                    <div class="font-mono text-xs">
                      <span class="font-bold text-zinc-300 block">0-9 NUMERALS</span>
                      <span class="text-[9.5px] text-zinc-500">Zero to nine sequence strings</span>
                    </div>
                  </label>

                  <label [class.opacity-40]="isOptionDisabled('symbols')" class="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition select-none">
                    <input type="checkbox" [checked]="includeSymbols()"
                      [disabled]="isOptionDisabled('symbols')"
                      (change)="includeSymbols.set(!includeSymbols())"
                      class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"/>
                    <div class="font-mono text-xs">
                      <span class="font-bold text-zinc-300 block">SPECIAL SYMBOLS</span>
                      <span class="text-[9.5px] text-zinc-500">Symbols (!, &#64;, #, $, %, etc...)</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Exclusions parameters and Custom Pooling -->
              <div class="p-4 bg-zinc-950/20 border border-zinc-850 rounded-xl block space-y-4">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">COMPLEXITY EXCLUSION GUARDS</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white select-none">
                    <input type="checkbox" [checked]="excludeSimilar()"
                      (change)="excludeSimilar.set(!excludeSimilar())"
                      class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0"/>
                    <span class="font-mono text-[10.5px] font-bold">NO SIMILAR (i, l, 1, o, 0)</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white select-none">
                    <input type="checkbox" [checked]="excludeAmbiguous()"
                      (change)="excludeAmbiguous.set(!excludeAmbiguous())"
                      class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0"/>
                    <span class="font-mono text-[10.5px] font-bold">NO AMBIGUOUS (brackets)</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white select-none">
                    <input type="checkbox" [checked]="minRequirements()"
                      (change)="minRequirements.set(!minRequirements())"
                      class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0"/>
                    <span class="font-mono text-[10.5px] font-bold text-emerald-450">STRICT REQUIREMENT</span>
                  </label>
                </div>

                <!-- Custom characters pool overlay -->
                <div class="space-y-2 pt-2 border-t border-zinc-850/60">
                  <span class="text-[10px] font-mono text-zinc-500 font-bold block uppercase">RESTRICT TO CUSTOM CHARACTER BUNDLE (OPTIONAL)</span>
                  <input #customBundleInput type="text" [value]="customCharSet()" (input)="customCharSet.set(customBundleInput.value)"
                    placeholder="e.g. ABCDFGHJ123456$% (forces pooling from only this string value)"
                    class="w-full px-3 py-2 bg-zinc-950 text-xs font-mono text-zinc-200 border border-zinc-800 rounded-xl focus:border-zinc-700 outline-none"/>
                </div>
              </div>

              <!-- Bulk Generator Drawer Configs -->
              <div class="p-4 bg-zinc-950/40 border border-zinc-850/70 rounded-xl block space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold block flex items-center gap-1">
                    <mat-icon class="scale-75 text-emerald-450 select-none">snippet_folder</mat-icon>
                    BULK PASSWORD BATCH ENGINE
                  </span>
                  <span class="text-[10px] font-mono text-zinc-500 font-medium">MULTIPLY PRODUCTION COPIES</span>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-4">
                  <div class="flex-1 w-full space-y-2">
                    <div class="flex justify-between text-xs font-mono text-zinc-400">
                      <span>BATCH SIZE</span>
                      <span class="font-bold text-emerald-400">{{ bulkQuantity() }} Keys</span>
                    </div>
                    <input type="range" min="5" max="100" step="5" [value]="bulkQuantity()" (input)="onBulkQuantityChange($event)"
                      class="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>
                  </div>
                  <button (click)="generateBulk()"
                    class="py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800/80 text-zinc-300 font-mono text-xs font-bold rounded-xl border border-zinc-800 transition active:scale-95 shrink-0 w-full sm:w-auto text-center cursor-pointer">
                    COMPILE BATCH SET
                  </button>
                </div>

                @if (bulkPasses().length > 0) {
                  <div class="space-y-2">
                    <div class="h-44 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-300 leading-relaxed block select-all">
                      @for (p of bulkPasses(); track $index) {
                        <div><span class="text-zinc-650 font-bold text-[10px] select-none mr-2">{{ ($index + 1) | number:'2.0-0' }}</span>{{ p }}</div>
                      }
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <button (click)="downloadBulk('txt')" class="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800/50 rounded-lg font-mono text-[10.5px] font-bold text-zinc-400 hover:text-white transition cursor-pointer">
                        EXPORT .TXT RECORD
                      </button>
                      <button (click)="downloadBulk('json')" class="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800/50 rounded-lg font-mono text-[10.5px] font-bold text-zinc-400 hover:text-white transition cursor-pointer">
                        EXPORT .JSON CONFIG
                      </button>
                      <button (click)="downloadBulk('csv')" class="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800/50 rounded-lg font-mono text-[10.5px] font-bold text-zinc-400 hover:text-white transition cursor-pointer">
                        EXPORT .CSV MATRIX
                      </button>
                      <button (click)="clearBulk()" class="px-3 py-1.5 border border-rose-950 hover:bg-rose-950/20 rounded-lg font-mono text-[10.5px] font-bold text-rose-400 transition ml-auto cursor-pointer">
                        CLOSE BATCH
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Save Preset Configuration in Browser Storage -->
              <div class="p-4 bg-zinc-950/10 border border-zinc-850/50 rounded-xl block space-y-3">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block flex items-center gap-1.5">
                  <mat-icon class="scale-75 text-amber-500 select-none">star</mat-icon>
                  FAVORITE PRESET CONFIGURATIONS
                </span>
                <div class="flex gap-2">
                  <input #savePresetInput type="text" placeholder="Preset label (e.g. My Secure Database Setup)"
                    class="flex-1 px-3 py-2 bg-zinc-950 text-xs font-mono text-zinc-300 border border-zinc-800 rounded-xl focus:border-zinc-700 outline-none"/>
                  <button (click)="savePreset(savePresetInput.value); savePresetInput.value = ''"
                    class="px-4 py-2 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900 font-mono text-xs font-bold rounded-xl transition active:scale-95 text-center shrink-0 cursor-pointer">
                    SAVE PRESET
                  </button>
                </div>

                @if (presetsList().length > 0) {
                  <div class="flex flex-wrap gap-1.5 pt-2">
                    @for (pr of presetsList(); track pr.name) {
                      <div class="px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <button (click)="applyPresetObject(pr)" class="hover:text-white font-bold leading-none select-none text-[10px] cursor-pointer">{{ pr.name }}</button>
                        <button (click)="deletePreset(pr.name)" class="text-zinc-650 hover:text-rose-400 transition cursor-pointer" title="Delete Preset">
                          <mat-icon class="text-xs scale-75 select-none leading-none">close</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-[10px] italic font-mono text-zinc-650 leading-none pt-1">No custom settings configurations registered yet.</p>
                }
              </div>
            </div>
          }

          <!-- TAB 2: CRYPTOGRAPHIC MEMORABLE PASSPHRASE GENERATOR -->
          @if (activeTab() === 'passphrase-generator') {
            <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-6 animate-fadeIn transition-all">
              <!-- Parameters for Diceware passphrases -->
              <div class="space-y-4">
                <div>
                  <h3 class="text-xs font-mono font-bold text-zinc-400 uppercase">PASSPHRASE CONTROLS</h3>
                  <p class="text-[10px] text-zinc-500">Form high security access codes matching the popular diceware criteria.</p>
                </div>

                <!-- Word count slider -->
                <div class="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-3">
                  <div class="flex items-center justify-between font-mono text-xs">
                    <span class="font-bold text-zinc-450 uppercase">NUMBER OF SHUFFLED WORDS</span>
                    <span class="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">{{ passphraseWordCount() }} Words</span>
                  </div>
                  <input type="range" min="3" max="10" [value]="passphraseWordCount()" (input)="onPassphraseWordCountChange($event)"
                    class="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>
                  <div class="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>3 Words (Basic)</span>
                    <span>5 Words (Strong)</span>
                    <span>10 Words (Paranoid Protection)</span>
                  </div>
                </div>

                <!-- Word separations selections -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">WORD SEPARATOR</span>
                    <select #sepSelect (change)="passphraseSeparator.set(sepSelect.value)"
                      class="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 outline-none focus:border-zinc-700">
                      <option value="-" selected>Hyphen ( - )</option>
                      <option value="_">Underscore ( _ )</option>
                      <option value=".">Period ( . )</option>
                      <option value="/">Slash ( / )</option>
                      <option value=" ">Space ( )</option>
                      <option value="none">None (words attached)</option>
                      <option value="custom">Custom Separator...</option>
                    </select>
                  </div>

                  @if (passphraseSeparator() === 'custom') {
                    <div class="space-y-2 animate-fadeIn">
                      <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">ENTER CUSTOM SEPARATOR</span>
                      <input #customSepInput type="text" [value]="passphraseSeparatorCustom()" (input)="passphraseSeparatorCustom.set(customSepInput.value)"
                        maxlength="4" placeholder="e.g. * or #"
                        class="w-full px-3 py-2 bg-zinc-950 text-xs font-mono text-zinc-200 border border-zinc-800 rounded-xl focus:border-zinc-700 outline-none"/>
                    </div>
                  }

                  <div class="space-y-2">
                    <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">CAPITALIZATION MATRIX</span>
                    <select #caseSelect (change)="passphraseCapitalization.set(caseSelect.value)"
                      class="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 outline-none focus:border-zinc-700">
                      <option value="title" selected>Title Case (VelvetCastle)</option>
                      <option value="lower">Lowercase (velvetcastle)</option>
                      <option value="upper">Uppercase (VELVETCASTLE)</option>
                      <option value="camel">Camel Case (velvetCastle)</option>
                    </select>
                  </div>
                </div>

                <!-- Custom variations (digits appending or prepending) -->
                <div class="p-4 bg-zinc-950/20 border border-zinc-850 rounded-xl space-y-4">
                  <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">DIGIT & SYMBOL REQUIREMENTS</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <span class="text-[9px] font-mono text-zinc-550 block font-bold">DIGITS ARRANGEMENTS</span>
                      <select 
                        #digSelect
                        (change)="passphraseDigitPadding.set(digSelect.value)"
                        class="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 outline-none focus:border-zinc-750"
                      >
                        <option value="none" selected>No numbers added</option>
                        <option value="append">Append a number to the end (e.g. ...velvet5)</option>
                        <option value="prepend">Prepend a number to start (e.g. 5velvet...)</option>
                        <option value="random-words">Insert random digits between words</option>
                      </select>
                    </div>

                    <div class="space-y-1.5">
                      <span class="text-[9px] font-mono text-zinc-550 block font-bold">SPECIAL CHARACTER ADDITION</span>
                      <select 
                        #symSelect
                        (change)="passphraseAppendSymbol.set(symSelect.value)"
                        class="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 outline-none focus:border-zinc-750"
                      >
                        <option value="none" selected>No symbols added</option>
                        <option value="append">Append trailing symbol (e.g. ...castle!)</option>
                        <option value="prepend">Prepend initial symbol (e.g. !castle...)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 3: PASSWORD STRENGTH AUDITOR & POLICY CHECKER -->
          @if (activeTab() === 'password-strength-checker') {
            <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-6 animate-fadeIn transition-all">
              <!-- Large input field workspace -->
              <div class="space-y-2">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">DIAGNOSTIC WORKSPACE INPUT PANEL</span>
                <div class="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden p-1 flex items-center pr-3">
                  <input
                    #auditTextEl
                    [type]="showTypedPassword() ? 'text' : 'password'"
                    [value]="typedPassword()"
                    (input)="typedPassword.set(auditTextEl.value)"
                    placeholder="Type or paste any password to audit..."
                    class="w-full py-4 px-4 bg-transparent text-sm font-mono text-zinc-100 outline-none tracking-wider select-all"
                  />
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button (click)="showTypedPassword.set(!showTypedPassword())"
                      class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition cursor-pointer"
                      title="Toggle Visibility">
                      <mat-icon class="scale-90 select-none">{{ showTypedPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    @if (typedPassword()) {
                      <button (click)="typedPassword.set('')"
                        class="p-2 text-rose-500 hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                        title="Clear Input">
                        <mat-icon class="scale-90 select-none">clear</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- HaveIBeenPwned API check secure panel -->
              <div class="p-5 bg-zinc-950/50 border border-zinc-850 rounded-2xl block space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold block flex items-center gap-1">
                    <mat-icon class="scale-75 text-emerald-400 select-none">security_update_good</mat-icon>
                    HAVEIBEENPWNED k-ANONYMITY CHECKER
                  </span>
                  <span class="text-[9px] text-zinc-600 font-mono">100% PRIVATE SECURE PROTOCOL</span>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-4">
                  <p class="text-xs text-zinc-450 leading-relaxed flex-1">
                    Check if this password exists in public credential leaks securely. We process the SHA-1 locally, and transmit ONLY the first 5 bytes of the hash prefix. 
                  </p>
                  <button [disabled]="!typedPassword() || breachStatus() === 'checking'"
                    (click)="checkPwnedLeaks(typedPassword())"
                    class="px-4 py-2.5 disabled:opacity-40 bg-zinc-950 text-zinc-300 hover:text-white font-mono text-xs font-bold rounded-xl border border-zinc-800 transition active:scale-95 shrink-0 w-full sm:w-auto text-center cursor-pointer">
                    @if (breachStatus() === 'checking') {
                      <span>QUERYING CANALS...</span>
                    } @else {
                      <span>CHECK LEAK SAFETY</span>
                    }
                  </button>
                </div>

                <!-- API results output indicators -->
                @if (breachStatus() === 'checking') {
                  <div class="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex items-center gap-2 text-zinc-400 font-mono text-xs animate-pulse">
                    <mat-icon class="scale-75 select-none animate-spin">sync</mat-icon>
                    <span>Calculating cryptographic ranges and executing k-Anonymity queries...</span>
                  </div>
                }

                @if (breachStatus() === 'breached') {
                  <div class="p-4 bg-rose-950/30 border border-rose-900 rounded-xl flex items-start gap-3 text-rose-300">
                    <mat-icon class="scale-90 text-rose-450 select-none shrink-0 mt-0.5">warning</mat-icon>
                    <div class="font-mono text-xs">
                      <p class="font-bold uppercase tracking-wider text-rose-400 leading-tight">CRITICAL ALERT: EXPOSED CREDENTIALS!</p>
                      <p class="text-[10.5px] mt-1 leading-normal text-rose-350">
                        This password matches <span class="font-bold underline text-rose-400">{{ breachCount() | number }}</span> times in documented public database leak archives. You should NEVER use this password online. Rotate immediately.
                      </p>
                    </div>
                  </div>
                }

                @if (breachStatus() === 'clean') {
                  <div class="p-4 bg-emerald-950/35 border border-emerald-900 rounded-xl flex items-start gap-3 text-emerald-300">
                    <mat-icon class="scale-90 text-emerald-450 select-none shrink-0 mt-0.5">verified_user</mat-icon>
                    <div class="font-mono text-xs">
                      <p class="font-bold uppercase tracking-wider text-emerald-400 leading-tight">SECURE & UNSULLIED!</p>
                      <p class="text-[10.5px] mt-1 leading-normal text-emerald-350">
                        Zero matches located in HIBP database range queries. This credential has no recorded leaks in public exposures!
                      </p>
                    </div>
                  </div>
                }

                @if (breachStatus() === 'error') {
                  <div class="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2 text-zinc-450 font-mono text-xs">
                    <mat-icon class="scale-75 text-amber-500 select-none">error_outline</mat-icon>
                    <span>Query interrupted: {{ breachErrorMsg() }}</span>
                  </div>
                }
              </div>

              <!-- Enterprise Password Policies Validator Board -->
              <div class="p-5 bg-zinc-950/30 border border-zinc-850 rounded-2xl block space-y-4">
                <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold block">ENTERPRISE POLICY COMPLIANCE</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  @for (rule of policyRules(); track rule.name) {
                    <div class="flex items-center justify-between p-2.5 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                      <div class="flex items-center gap-2 text-zinc-300 truncate">
                        <mat-icon [class]="rule.passed ? 'text-emerald-450' : 'text-zinc-600'" class="scale-90 select-none shrink-0">
                          {{ rule.passed ? 'check_circle' : 'radio_button_unchecked' }}
                        </mat-icon>
                        <span class="truncate block pr-2 text-[11px] font-bold">{{ rule.name }}</span>
                      </div>
                      <span [class]="rule.passed ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-650 bg-zinc-950 border border-zinc-900'" class="px-2 py-0.5 rounded text-[9.5px] font-extrabold shrink-0 uppercase">
                        {{ rule.passed ? 'PASSED' : 'REQUIRED' }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Sequential & Patterns assessments warnings list -->
              @if (typedPassword() && hasAtypicalChecks()) {
                <div class="p-4 bg-amber-950/15 border border-amber-900/40 rounded-xl block space-y-2 text-amber-200">
                  <span class="text-[10px] font-mono font-bold text-amber-450 flex items-center gap-1 select-none">
                    <mat-icon class="scale-75 select-none text-amber-500">priority_high</mat-icon>
                    REPEATS AND SEQUENCES DETECTED:
                  </span>
                  <div class="font-mono text-[10.5px] text-amber-300 space-y-1 leading-normal list-inside block pl-1">
                    @if (seqWarnings().hasRepeated) {
                      <div>• Contains repeated sequence coordinates (e.g. "aaa" or "111"). This significantly decreases guessing complexity.</div>
                    }
                    @if (seqWarnings().hasAsciiSeq) {
                      <div>• Identifies progressive alphabet sequences (e.g. "abc", "xyz") reducing structural chaos.</div>
                    }
                    @if (seqWarnings().hasKeySeq) {
                      <div>• Locates simple progressive numbers strings (e.g. "123", "789").</div>
                    }
                    @if (seqWarnings().isWeakWord) {
                      <div>• Matches common security dictionary keywords list. Extremely prone to rapid dictionary cracking attack engines.</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Sidebar layout: Right column of Dashboard metrics -->
        <div class="col-span-1 space-y-6">
          <!-- Master Panel output presentation -->
          <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-4">
            <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 block">ACTIVE SELECTION OUTCOME</span>
            <div class="p-4 bg-zinc-950 border border-zinc-850 rounded-xl block relative overflow-visible group text-left space-y-3">
              <div class="min-h-[44px] flex flex-col justify-center">
                @if (displayedSecret()) {
                  <pre class="text-sm md:text-base font-mono font-semibold text-zinc-100 select-all tracking-wide break-all whitespace-pre-wrap outline-none border-none bg-transparent">{{ displayedSecret() }}</pre>
                } @else {
                  <span class="text-xs italic font-mono text-zinc-650 block">Awaiting inputs parameter structures...</span>
                }
              </div>

              @if (displayedSecret()) {
                <div class="pt-3 border-t border-zinc-850/60 flex items-center gap-2 justify-between">
                  <!-- Auto-clear clipboard countdown selector -->
                  <div class="flex items-center gap-2">
                    <label class="flex items-center gap-1 cursor-pointer text-zinc-500 hover:text-zinc-350 select-none" title="Wipe clipboard from memory after 15 seconds">
                      <input 
                        type="checkbox" 
                        [checked]="clipboardAutoClear()" 
                        (change)="clipboardAutoClear.set(!clipboardAutoClear())"
                        class="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 scale-75"
                      />
                      <span class="font-mono text-[9px] font-bold uppercase">AUTO-CLEAR (15s)</span>
                    </label>
                    @if (copiedProgress() > 0) {
                      <div class="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-850/45">
                        <div class="h-full bg-rose-500 transition-all duration-1000" [style.width.%]="copiedProgress()"></div>
                      </div>
                    }
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button (click)="copyActivePassword()"
                      class="px-2.5 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-900 text-emerald-400 rounded-lg flex items-center justify-center transition active:scale-95 text-xs font-mono font-bold gap-1 cursor-pointer"
                      title="Secure Copy to Memory">
                      <mat-icon class="scale-75 select-none">{{ copySuccess() ? 'check' : 'content_copy' }}</mat-icon>
                      <span>{{ copySuccess() ? 'COPIED' : 'COPY' }}</span>
                    </button>
                    @if (activeTab() !== 'password-strength-checker') {
                      <button (click)="regenerate()"
                        class="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                        title="Instantly generate new candidate sequence">
                        <mat-icon class="scale-90 select-none">refresh</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Strength indices dashboard widgets -->
            <div class="space-y-4 pt-3 border-t border-zinc-805 font-mono text-xs">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400 font-bold uppercase">COMPLEXITY INDEX:</span>
                <span [class]="strengthColor()" class="font-bold uppercase tracking-wider text-right">
                  {{ strengthLabel() }}
                </span>
              </div>

              <!-- Horizontal indicators -->
              <div class="grid grid-cols-4 gap-1.5">
                <div [class]="strengthProgress() >= 1 ? strengthBg() : 'bg-zinc-850'" class="h-2 rounded-full transition-all duration-300"></div>
                <div [class]="strengthProgress() >= 2 ? strengthBg() : 'bg-zinc-850'" class="h-2 rounded-full transition-all duration-300"></div>
                <div [class]="strengthProgress() >= 3 ? strengthBg() : 'bg-zinc-850'" class="h-2 rounded-full transition-all duration-300"></div>
                <div [class]="strengthProgress() >= 4 ? strengthBg() : 'bg-zinc-850'" class="h-2 rounded-full transition-all duration-300"></div>
              </div>

              <div class="space-y-2 pt-2 text-[10.5px] leading-relaxed text-zinc-400">
                <div class="flex justify-between border-b border-zinc-850/45 pb-1">
                  <span class="text-zinc-550 select-none font-bold">RAW ENTROPY:</span>
                  <span class="text-white font-extrabold">{{ entropyRating() }} BITS</span>
                </div>
                <div class="flex justify-between border-b border-zinc-850/45 pb-1">
                  <span class="text-zinc-550 select-none font-bold">GUESS ATTACKS FORCES:</span>
                  <span class="text-white font-extrabold">{{ guessAttacksDescription() }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-550 select-none font-bold">FAST CRACK TIME METRICS:</span>
                  <span class="text-emerald-400 font-extrabold">{{ timeToCrack() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Developer hashes extraction playground -->
          <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 block flex items-center gap-1">
                <mat-icon class="scale-75 text-emerald-400 select-none">code</mat-icon>
                DEVELOPER TOOLING CODES
              </span>
              <span class="text-[9px] text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-extrabold px-1.5 rounded">WEB CRYPTO</span>
            </div>

            <!-- Hash outputs list -->
            <div class="space-y-3 font-mono text-[10px] text-zinc-400 leading-normal">
              <div class="space-y-1 block text-left">
                <span class="text-[9px] text-zinc-550 font-bold block select-none border-b border-zinc-850/45 pb-1 uppercase">SHA-256 SUM</span>
                <div class="bg-zinc-950 border border-zinc-905 p-2 rounded-lg text-zinc-300 select-all font-mono text-[9px] break-all leading-normal">
                  {{ computedHashes().sha256 || 'Awaiting inputs character sequence...' }}
                </div>
              </div>

              <div class="space-y-1 block text-left">
                <span class="text-[9px] text-zinc-550 font-bold block select-none border-b border-zinc-850/45 pb-1 uppercase">SHA-1 INDEX SUM</span>
                <div class="bg-zinc-950 border border-zinc-905 p-2 rounded-lg text-zinc-300 select-all font-mono text-[9px] break-all leading-normal">
                  {{ computedHashes().sha1 || 'Awaiting inputs character sequence...' }}
                </div>
              </div>

              <div class="space-y-1 block text-left">
                <span class="text-[9px] text-zinc-550 font-bold block select-none border-b border-zinc-850/45 pb-1 uppercase">SHA-512 CORE SECURE</span>
                <div class="bg-zinc-950 border border-zinc-905 p-2 rounded-lg text-zinc-300 select-all font-mono text-[9px] break-all leading-normal animate-fadeIn">
                  {{ computedHashes().sha512 || 'Awaiting inputs character sequence...' }}
                </div>
              </div>

              <div class="space-y-1 block text-left pt-1 border-t border-zinc-850/40">
                <div class="flex justify-between items-center text-[9px] text-zinc-550 font-bold select-none pb-1 uppercase">
                  <span>ENVIRONMENT CONFIG SYNTAX</span>
                  <button (click)="copyText('SECRET_KEY=' + displayedSecret())" class="hover:text-white transition cursor-pointer">COPY KEY=VAL</button>
                </div>
                <div class="bg-zinc-950 border border-zinc-905 p-2 rounded-lg text-zinc-300 select-all font-mono text-[9px] break-all">
                  API_SECURITY_SECRET_TOKEN="{{ displayedSecret() }}"
                </div>
              </div>
            </div>

            <!-- Cryptographic salt generator utilities border -->
            <div class="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2 text-left">
              <span class="text-[9px] font-mono font-bold text-zinc-500 block uppercase">SECURE PSEUDORANDOM CRYPTO SALT BUNDLER</span>
              <div class="flex gap-2">
                <button (click)="generateSalt(16)" class="p-1 px-2.5 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[9px] font-bold text-zinc-400 hover:text-white transition flex-1 text-center cursor-pointer">
                  HEX SALT (16b)
                </button>
                <button (click)="generateSalt(32)" class="p-1 px-2.5 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[9px] font-bold text-zinc-400 hover:text-white transition flex-1 text-center cursor-pointer">
                  HEX SALT (32b)
                </button>
              </div>

              @if (computedSalt()) {
                <div class="bg-zinc-950 border border-zinc-850 p-2 rounded-lg text-zinc-300 select-all font-mono text-[9.5px] break-all leading-normal mt-2">
                  <span class="text-[8px] text-zinc-650 font-bold select-none mr-1">SALT:</span>{{ computedSalt() }}
                </div>
              }
            </div>
          </div>

          <!-- History Logs Panel -->
          <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl block space-y-4">
            <div class="flex items-center justify-between pointer-events-auto">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 block flex items-center gap-1 select-none">
                <mat-icon class="scale-75 text-emerald-440 select-none">history</mat-icon>
                SESSION COPY HISTORIES LOG
              </span>
              @if (historyList().length > 0) {
                <button (click)="clearHistory()"
                  class="text-[9px] font-mono text-rose-455 hover:text-rose-400 font-bold select-none border-b border-transparent hover:border-rose-400 leading-none pb-0.5 cursor-pointer">
                  CLEAR
                </button>
              }
            </div>

            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              @for (h of historyList(); track h.id) {
                <div class="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1 block text-left">
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span [class]="getHistoryStrengthColor(h.strength)" class="font-bold select-none">{{ h.strength | uppercase }}</span>
                    <span class="text-zinc-600 select-none font-medium">{{ h.timestamp }}</span>
                  </div>
                  <pre class="text-xs font-mono text-zinc-200 select-all break-all leading-normal whitespace-pre-wrap select-all block">{{ h.password }}</pre>
                  <div class="pt-1.5 border-t border-zinc-905/60 flex justify-between items-center font-mono text-[9px] text-zinc-500">
                    <span class="truncate pr-2 leading-none font-bold uppercase select-none">{{ h.type }} • {{ h.entropy }} BITS</span>
                    <button (click)="copyText(h.password)" class="text-emerald-450 hover:text-emerald-400 transition font-extrabold flex items-center gap-0.5 cursor-pointer">
                      <mat-icon class="text-[10px] scale-75 select-none leading-none">content_copy</mat-icon> COPY
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="h-16 flex items-center justify-center text-center text-zinc-655 italic font-sans text-xs select-none">
                  Clipboard copy history logs are empty.
                </div>
              }
            </div>
            <span class="text-[9.5px] italic text-zinc-500 font-mono leading-relaxed block select-none leading-normal">
              Note: History logs persist securely in browser local sandbox storage for security.
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `
})
export class PasswordGeneratorComponent {
  // Input route mode signal mapping
  public mode = input<string>('password-generator');

  // Interal Tab state tracking
  public activeTab = signal<string>('password-generator');

  // TAB 1: Standrad password signals generators
  public length = signal<number>(16);
  public includeUppercase = signal<boolean>(true);
  public includeLowercase = signal<boolean>(true);
  public includeNumbers = signal<boolean>(true);
  public includeSymbols = signal<boolean>(true);
  public excludeSimilar = signal<boolean>(false);
  public excludeAmbiguous = signal<boolean>(false);
  public minRequirements = signal<boolean>(false);
  public customCharSet = signal<string>('');
  
  public passwordTemplateId = signal<string>('standard'); // 'standard' | 'pin' | 'api' | 'wifi' | 'token' | 'recovery'
  public generationMode = signal<string>('default'); // 'default' | 'readable' | 'developer' | 'security'

  // TAB 2: Shuffled Passphrases signals generators
  public passphraseWordCount = signal<number>(4);
  public passphraseSeparator = signal<string>('-');
  public passphraseSeparatorCustom = signal<string>('');
  public passphraseCapitalization = signal<string>('title'); // 'lower' | 'upper' | 'title' | 'camel'
  public passphraseDigitPadding = signal<string>('none'); // 'none' | 'append' | 'prepend' | 'random-words'
  public passphraseAppendSymbol = signal<string>('none'); // 'none' | 'append' | 'prepend'

  // TAB 3: Diagnostic Auditor password tracker Signals
  public typedPassword = signal<string>('');
  public showTypedPassword = signal<boolean>(false);

  // HaveIBeenPwned check output states
  public breachStatus = signal<'idle' | 'checking' | 'breached' | 'clean' | 'error'>('idle');
  public breachCount = signal<number>(0);
  public breachErrorMsg = signal<string>('');

  // Bulk parameters
  public bulkQuantity = signal<number>(10);
  public bulkPasses = signal<string[]>([]);

  // Favorite presets parameter configuration signals
  public presetsList = signal<Preset[]>([]);

  // Session clipboard histories
  public historyList = signal<HistoryRecord[]>([]);

  // Salt generator states
  public computedSalt = signal<string>('');

  // Regeneration helper trigger incrementor
  private refreshTrigger = signal<number>(0);
  public copySuccess = signal<boolean>(false);

  // Auto clear counts tracker
  public clipboardAutoClear = signal<boolean>(false);
  private clearTimeCount = signal<number>(0);
  public copiedProgress = signal<number>(0);
  private clearTimerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Automatically map active mode triggers when route parameters updates
    effect(() => {
      const targetMode = this.mode();
      if (targetMode === 'password-generator' || targetMode === 'passphrase-generator' || targetMode === 'password-strength-checker') {
        this.activeTab.set(targetMode);
      }
    });

    // Load initial favorites structures and histories logs on bootstrap
    effect(() => {
      try {
        const savedPresetsStr = localStorage.getItem('devsight_password_presets');
        if (savedPresetsStr) {
          this.presetsList.set(JSON.parse(savedPresetsStr));
        }
      } catch (e) {
        console.warn('Could not restore favorite presets', e);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      try {
        const savedHistoryStr = localStorage.getItem('devsight_password_history');
        if (savedHistoryStr) {
          this.historyList.set(JSON.parse(savedHistoryStr));
        }
      } catch (e) {
        console.warn('Could not load copy history logs', e);
      }
    }, { allowSignalWrites: true });
  }

  // Unified candidate display presenting based on current active tabs mode
  public displayedSecret = computed<string>(() => {
    const tabClass = this.activeTab();
    if (tabClass === 'password-generator') {
      return this.standardCandidateSecret();
    } else if (tabClass === 'passphrase-generator') {
      return this.passphraseCandidateSecret();
    } else {
      return this.typedPassword();
    }
  });

  // Calculate real-time strength progressive segments
  public strengthProgress = computed<number>(() => {
    const bits = this.entropyRating();
    if (bits === 0) return 0;
    if (bits < 40) return 1;       // Critically Vulnerable
    if (bits < 65) return 2;       // Moderate / Basic Defense
    if (bits < 85) return 3;       // Strong Shield
    return 4;                      // Cryptographically Fortified
  });

  public strengthLabel = computed<string>(() => {
    const prog = this.strengthProgress();
    if (prog === 0) return 'Undecided';
    if (prog === 1) return 'Critically Weak';
    if (prog === 2) return 'Basic Defense';
    if (prog === 3) return 'Strong Shield';
    return 'Quantum-Safe Fortified';
  });

  public strengthColor = computed<string>(() => {
    const prog = this.strengthProgress();
    if (prog === 0) return 'text-zinc-600';
    if (prog === 1) return 'text-rose-450';
    if (prog === 2) return 'text-amber-450';
    if (prog === 3) return 'text-cyan-400';
    return 'text-emerald-400';
  });

  public strengthBg = computed<string>(() => {
    const prog = this.strengthProgress();
    if (prog === 1) return 'bg-rose-500';
    if (prog === 2) return 'bg-amber-500';
    if (prog === 3) return 'bg-cyan-550';
    return 'bg-emerald-500';
  });

  public guessAttacksDescription = computed<string>(() => {
    const bits = this.entropyRating();
    if (bits === 0) return '0 attempts';
    if (bits < 20) return 'Instantly (less than 1,000 attempts)';
    if (bits < 40) return 'Minutes (approx 10 Million tries)';
    if (bits < 60) return 'Days (approx 2^50 operations)';
    if (bits < 80) return 'Years (2^70 cloud clusters forces)';
    if (bits < 100) return 'Millennia (2^90 cryptographic cycles)';
    return 'Cosmic Duration (2^110+ structural barrier)';
  });

  public timeToCrack = computed<string>(() => {
    const bits = this.entropyRating();
    if (bits === 0) return 'Immediate';
    if (bits < 30) return '< 1 millisecond';
    if (bits < 45) return '2.5 seconds';
    if (bits < 55) return '4.2 hours';
    if (bits < 65) return '11.8 days';
    if (bits < 75) return '89 years';
    if (bits < 90) return '4.5 Million Years';
    return 'Indefinite Cryptographic Epoch';
  });

  // Calculate global Entropy Bits depending on candidate pools or characters drawn
  public entropyRating = computed<number>(() => {
    const tabClass = this.activeTab();
    
    if (tabClass === 'password-generator') {
      const tId = this.passwordTemplateId();
      if (tId === 'pin') {
        return Math.round(this.length() * Math.log2(10));
      }
      if (tId === 'recovery') {
        // Recovery keys are 24-character Base32 alphanumeric segments grouped
        return Math.round(24 * Math.log2(28));
      }
      if (tId === 'token' && this.length() >= 32) {
        // Tokens represent pure hexadecimal/Base64 keys
        return Math.round(this.length() * Math.log2(64));
      }

      // Check option pool size
      let poolSize = 0;
      if (this.customCharSet().trim() !== '') {
        poolSize = new Set(this.customCharSet().split('')).size;
      } else {
        if (this.includeUppercase()) poolSize += 26;
        if (this.includeLowercase()) poolSize += 26;
        if (this.includeNumbers()) poolSize += 10;
        if (this.includeSymbols()) poolSize += 26;
        
        if (this.excludeSimilar()) poolSize -= 8; // i l 1 o 0 O L I
        if (this.excludeAmbiguous()) poolSize -= 16;
      }

      if (poolSize === 0) return 0;
      const bits = this.length() * Math.log2(poolSize);
      return Math.round(bits);

    } else if (tabClass === 'passphrase-generator') {
      // Diceware list consists of WORDS_POOL elements (size 240+)
      const count = this.passphraseWordCount();
      const wordEntropy = Math.log2(WORDS_POOL.length);
      let bits = count * wordEntropy;
      
      // Extras padding
      if (this.passphraseDigitPadding() !== 'none') {
        bits += Math.log2(10);
      }
      if (this.passphraseAppendSymbol() !== 'none') {
        bits += Math.log2(20);
      }
      return Math.round(bits);

    } else {
      // Dynamic password string audits
      const pass = this.typedPassword();
      if (!pass) return 0;
      
      let hasLower = false;
      let hasUpper = false;
      let hasDigit = false;
      let hasSym = false;

      for (const c of pass) {
        if (/[a-z]/.test(c)) hasLower = true;
        else if (/[A-Z]/.test(c)) hasUpper = true;
        else if (/[0-9]/.test(c)) hasDigit = true;
        else hasSym = true;
      }

      let poolSize = 0;
      if (hasLower) poolSize += 26;
      if (hasUpper) poolSize += 26;
      if (hasDigit) poolSize += 10;
      if (hasSym) poolSize += 30;

      if (poolSize === 0) return 0;
      const bits = pass.length * Math.log2(poolSize);
      return Math.round(bits);
    }
  });

  // Check state options locking standard UI checkboxes
  public isOptionDisabled(charGroup: string): boolean {
    const tId = this.passwordTemplateId();
    if (tId === 'pin' || tId === 'token' || tId === 'recovery') return true;
    
    // In Military mode, everything is locked to True
    if (this.generationMode() === 'security') return true;

    // Developer mode avoids symbols
    if (this.generationMode() === 'developer' && charGroup === 'symbols') return true;

    return false;
  }

  // Preset Template Setter
  public setPresetType(typeId: string): void {
    this.passwordTemplateId.set(typeId);
    
    if (typeId === 'pin') {
      this.length.set(6);
      this.includeUppercase.set(false);
      this.includeLowercase.set(false);
      this.includeNumbers.set(true);
      this.includeSymbols.set(false);
    } else if (typeId === 'api') {
      this.length.set(40);
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(false);
      this.generationMode.set('developer');
    } else if (typeId === 'wifi') {
      this.length.set(24);
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(true);
      this.excludeAmbiguous.set(true);
    } else if (typeId === 'token') {
      this.length.set(64);
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(false);
    } else if (typeId === 'recovery') {
      this.length.set(24);
      this.includeUppercase.set(true);
      this.includeLowercase.set(false);
      this.includeNumbers.set(true);
      this.includeSymbols.set(false);
    } else {
      // standard
      this.length.set(16);
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(true);
      this.generationMode.set('default');
    }
  }

  public onSelectionModeChange(modeId: string): void {
    this.generationMode.set(modeId);
    if (modeId === 'security') {
      this.length.set(48);
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(true);
      this.excludeSimilar.set(false);
      this.excludeAmbiguous.set(false);
    } else if (modeId === 'developer') {
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(false);
    } else {
      this.includeUppercase.set(true);
      this.includeLowercase.set(true);
      this.includeNumbers.set(true);
      this.includeSymbols.set(true);
    }
  }

  // Reactive Standard Password calculations
  private standardCandidateSecret = computed<string>(() => {
    this.refreshTrigger();
    
    const tId = this.passwordTemplateId();
    const len = this.length();

    if (tId === 'pin') {
      return this.getRandomStringFromPool('0123456789', len);
    }

    if (tId === 'recovery') {
      // recovery keys look like ABCD-EFGH-IJKL-MNOP-QRST-UVWX
      const cleanBase32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const blocks: string[] = [];
      for (let i = 0; i < 6; i++) {
        blocks.push(this.getRandomStringFromPool(cleanBase32, 4));
      }
      return blocks.join('-');
    }

    if (tId === 'api') {
      // Dev suite standard prefix sk_live_ or dev_ + standard base62 keys
      const b62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return 'sk_dev_' + this.getRandomStringFromPool(b62, 32);
    }

    if (tId === 'token') {
      const hex = '0123456789abcdef';
      return this.getRandomStringFromPool(hex, len);
    }

    // Custom Char list drawing override
    if (this.customCharSet().trim() !== '') {
      return this.getRandomStringFromPool(this.customCharSet().trim(), len);
    }

    // Pronounceable Memorable Alternate Vocalizations
    if (this.generationMode() === 'readable') {
      return this.generatePronounceablePassword(len);
    }

    // Traditional customizable generation blocks
    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowers = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let uPool = uppers;
    let lPool = lowers;
    let nPool = numbers;
    let sPool = symbols;

    // Filters similar
    if (this.excludeSimilar()) {
      uPool = uPool.replace(/[IOL]/g, '');
      lPool = lPool.replace(/[il]/g, '');
      nPool = nPool.replace(/[01]/g, '');
    }

    // Filters ambiguous
    if (this.excludeAmbiguous()) {
      sPool = sPool.split('').filter(char => !"[](){}|;:,.<>?\\/".includes(char)).join('');
    }

    let finalPool = '';
    const guaranteed: string[] = [];

    if (this.includeUppercase()) {
      finalPool += uPool;
      guaranteed.push(this.drawRandomChar(uPool));
    }
    if (this.includeLowercase()) {
      finalPool += lPool;
      guaranteed.push(this.drawRandomChar(lPool));
    }
    if (this.includeNumbers()) {
      finalPool += nPool;
      guaranteed.push(this.drawRandomChar(nPool));
    }
    if (this.includeSymbols()) {
      finalPool += sPool;
      guaranteed.push(this.drawRandomChar(sPool));
    }

    if (!finalPool) return '';

    const parts: string[] = [...guaranteed];
    while (parts.length < len) {
      parts.push(this.drawRandomChar(finalPool));
    }

    // If minimum requirement triggers ensures structural distribution
    const shuffled = this.shuffleCryptoBuffer(parts);
    return shuffled.join('');
  });

  // Reactive Shuffled Passphrase diceware generator logic
  private passphraseCandidateSecret = computed<string>(() => {
    this.refreshTrigger();

    const wCount = this.passphraseWordCount();
    const caseStyle = this.passphraseCapitalization();
    const separator = this.passphraseSeparator() === 'custom' ? this.passphraseSeparatorCustom() : 
                     this.passphraseSeparator() === 'none' ? '' : this.passphraseSeparator();

    const picks: string[] = [];
    const poolSize = WORDS_POOL.length;

    for (let i = 0; i < wCount; i++) {
      const u32 = new Uint32Array(1);
      crypto.getRandomValues(u32);
      const wordIdx = u32[0] % poolSize;
      let word = WORDS_POOL[wordIdx];

      // Format casing logic
      if (caseStyle === 'upper') {
        word = word.toUpperCase();
      } else if (caseStyle === 'lower') {
        word = word.toLowerCase();
      } else if (caseStyle === 'camel') {
        if (i === 0) {
          word = word.toLowerCase();
        } else {
          word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
      } else {
        // title
        word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }

      picks.push(word);
    }

    // Padding digits overlays
    const padding = this.passphraseDigitPadding();
    const randomNumber = (new Uint32Array(1))[0] % 90 + 10; // e.g. 10 to 99

    if (padding === 'append') {
      picks[picks.length - 1] = picks[picks.length - 1] + randomNumber.toString();
    } else if (padding === 'prepend') {
      picks[0] = randomNumber.toString() + picks[0];
    } else if (padding === 'random-words') {
      // Injects digits random indexes
      const idx = (new Uint32Array(1))[0] % (picks.length - 1) + 1;
      picks.splice(idx, 0, randomNumber.toString());
    }

    // Symbols prepends
    const appendSym = this.passphraseAppendSymbol();
    if (appendSym === 'append') {
      picks[picks.length - 1] = picks[picks.length - 1] + '!';
    } else if (appendSym === 'prepend') {
      picks[0] = '!' + picks[0];
    }

    return picks.join(separator);
  });

  // Pronounceable password constructor
  private generatePronounceablePassword(length: number): string {
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const nums = '23456789';
    const syms = '!@#$%^&*()_+-=';

    let pass = '';
    for (let i = 0; i < length - 2; i++) {
      if (i % 2 === 0) {
        pass += consonants.charAt(Math.floor(this.drawCryptoIndex0toMax(consonants.length)));
      } else {
        pass += vowels.charAt(Math.floor(this.drawCryptoIndex0toMax(vowels.length)));
      }
    }

    // Alternates case
    let modified = '';
    for (let i = 0; i < pass.length; i++) {
      if (i === 0 || i === Math.floor(length / 2)) {
        modified += pass[i].toUpperCase();
      } else {
        modified += pass[i];
      }
    }

    // Append single number & standard ending symbol
    modified += nums.charAt(Math.floor(this.drawCryptoIndex0toMax(nums.length)));
    modified += syms.charAt(Math.floor(this.drawCryptoIndex0toMax(syms.length)));

    return modified;
  }

  // Policy validation list evaluation checks
  public policyRules = computed(() => {
    const pass = this.typedPassword();
    return [
      { name: '8+ Characters minimum count', passed: pass.length >= 8 },
      { name: 'Contains Uppercase (A-Z)', passed: /[A-Z]/.test(pass) },
      { name: 'Contains Lowercase (a-z)', passed: /[a-z]/.test(pass) },
      { name: 'Contains Numbers (0-9)', passed: /[0-9]/.test(pass) },
      { name: 'Contains Special Symbols e.g. (!, #, $)', passed: /[^A-Za-z0-9]/.test(pass) },
      { name: 'High chaos (no repeated characters sequence like "aaa")', passed: !/(.)\1\1/.test(pass) }
    ];
  });

  public hasAtypicalChecks(): boolean {
    const warnings = this.seqWarnings();
    return warnings.hasRepeated || warnings.hasAsciiSeq || warnings.hasKeySeq || warnings.isWeakWord;
  }

  public seqWarnings = computed(() => {
    const pass = this.typedPassword().toLowerCase();
    if (!pass) return { hasRepeated: false, hasAsciiSeq: false, hasKeySeq: false, isWeakWord: false };

    const hasRepeated = /(.)\1\1/.test(pass);
    const hasAsciiSeq = /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/.test(pass);
    const hasKeySeq = /123|234|345|456|567|678|789|012|098|876|765|654|543|432|321/.test(pass);
    const isWeakWord = WEAK_DICTIONARY.includes(pass);

    return { hasRepeated, hasAsciiSeq, hasKeySeq, isWeakWord };
  });

  // Calculate real-time WebCrypto SHA-256 and other cryptographic summaries
  public computedHashes = computed(() => {
    const secret = this.displayedSecret();
    if (!secret) return { sha256: '', sha1: '', sha512: '' };

    // Since WebCrypto digest requires async execution, we calculate them and update synchronously using a placeholder trigger
    // Instead of locking, let's trigger an async parsing update that writes to a signal structure
    this.calculateAsyncHashes(secret);
    return this.asyncHashesSignal();
  });

  private asyncHashesSignal = signal<{ sha256: string, sha1: string, sha512: string }>({ sha256: '', sha1: '', sha512: '' });

  private lastHashedSecret = '';
  private async calculateAsyncHashes(secret: string): Promise<void> {
    if (this.lastHashedSecret === secret) return;
    this.lastHashedSecret = secret;

    try {
      const encoder = new TextEncoder();
      const codeBytes = encoder.encode(secret);

      const [sha256Buf, sha1Buf, sha512Buf] = await Promise.all([
        crypto.subtle.digest('SHA-256', codeBytes),
        crypto.subtle.digest('SHA-1', codeBytes),
        crypto.subtle.digest('SHA-512', codeBytes)
      ]);

      this.asyncHashesSignal.set({
        sha256: this.hexString(sha256Buf),
        sha1: this.hexString(sha1Buf),
        sha512: this.hexString(sha512Buf)
      });
    } catch (e) {
      console.warn('Crypto subtle computations failed in this sandbox context', e);
    }
  }

  private hexString(buffer: ArrayBuffer): string {
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // HAVEIBEENPWNED API check range k-Anonymity execution
  public async checkPwnedLeaks(password: string): Promise<void> {
    if (!password) return;
    this.breachStatus.set('checking');
    this.breachCount.set(0);

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) {
        throw new Error('Public database Range Server rejected connection.');
      }

      const text = await response.text();
      const lines = text.split('\n');
      let foundCount = 0;

      for (const line of lines) {
        const [lineSuffix, countStr] = line.trim().split(':');
        if (lineSuffix === suffix) {
          foundCount = parseInt(countStr, 10);
          break;
        }
      }

      this.breachCount.set(foundCount);
      if (foundCount > 0) {
        this.breachStatus.set('breached');
      } else {
        this.breachStatus.set('clean');
      }
    } catch (err: unknown) {
      this.breachStatus.set('error');
      this.breachErrorMsg.set(err instanceof Error ? err.message : 'Unknown communication disruption');
    }
  }

  // Bulk compilers
  public generateBulk(): void {
    const qty = this.bulkQuantity();
    const tabClass = this.activeTab();
    const bulkList: string[] = [];

    for (let i = 0; i < qty; i++) {
      if (tabClass === 'password-generator') {
        const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowers = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let uPool = uppers;
        let lPool = lowers;
        let nPool = numbers;
        let sPool = symbols;

        if (this.excludeSimilar()) {
          uPool = uPool.replace(/[IOL]/g, '');
          lPool = lPool.replace(/[il]/g, '');
          nPool = nPool.replace(/[01]/g, '');
        }
        if (this.excludeAmbiguous()) {
          sPool = sPool.split('').filter(char => !"[](){}|;:,.<>?\\/".includes(char)).join('');
        }

        let pool = '';
        if (this.includeUppercase()) pool += uPool;
        if (this.includeLowercase()) pool += lPool;
        if (this.includeNumbers()) pool += nPool;
        if (this.includeSymbols()) pool += sPool;

        if (!pool) pool = lowers;
        bulkList.push(this.getRandomStringFromPool(pool, this.length()));
      } else {
        // passphrase word picker
        const picks: string[] = [];
        for (let j = 0; j < this.passphraseWordCount(); j++) {
          picks.push(WORDS_POOL[Math.floor(this.drawCryptoIndex0toMax(WORDS_POOL.length))]);
        }
        bulkList.push(picks.join('-'));
      }
    }

    this.bulkPasses.set(bulkList);
  }

  public downloadBulk(mode: 'txt' | 'json' | 'csv'): void {
    const list = this.bulkPasses();
    if (list.length === 0) return;

    let content = '';
    let mime = 'text/plain';
    const filename = `devsight_bulk_passwords.${mode}`;

    if (mode === 'json') {
      content = JSON.stringify({ generator: 'devsight Bulk Engine', quantity: list.length, passwords: list }, null, 2);
      mime = 'application/json';
    } else if (mode === 'csv') {
      content = 'Index,Password\n' + list.map((p, idx) => `${idx + 1},"${p.replace(/"/g, '""')}"`).join('\n');
      mime = 'text/csv';
    } else {
      content = list.join('\n');
    }

    const b = new Blob([content], { type: mime });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(u);
  }

  public clearBulk(): void {
    this.bulkPasses.set([]);
  }

  // Custom presets mechanics
  public savePreset(name: string): void {
    const inputName = name.trim();
    if (!inputName) return;

    const currentPresets = [...this.presetsList()];
    const index = currentPresets.findIndex(p => p.name === inputName);

    const presetObj: Preset = {
      name: inputName,
      length: this.length(),
      uppercase: this.includeUppercase(),
      lowercase: this.includeLowercase(),
      numbers: this.includeNumbers(),
      symbols: this.includeSymbols(),
      excludeSimilar: this.excludeSimilar(),
      excludeAmbiguous: this.excludeAmbiguous(),
      minReqs: this.minRequirements(),
      customSet: this.customCharSet(),
      type: this.passwordTemplateId(),
      mode: this.generationMode()
    };

    if (index >= 0) {
      currentPresets[index] = presetObj;
    } else {
      currentPresets.push(presetObj);
    }

    this.presetsList.set(currentPresets);
    localStorage.setItem('devsight_password_presets', JSON.stringify(currentPresets));
  }

  public applyPresetObject(p: Preset): void {
    this.length.set(p.length);
    this.includeUppercase.set(p.uppercase);
    this.includeLowercase.set(p.lowercase);
    this.includeNumbers.set(p.numbers);
    this.includeSymbols.set(p.symbols);
    this.excludeSimilar.set(p.excludeSimilar);
    this.excludeAmbiguous.set(p.excludeAmbiguous);
    this.minRequirements.set(p.minReqs);
    this.customCharSet.set(p.customSet);
    this.passwordTemplateId.set(p.type);
    this.generationMode.set(p.mode);
  }

  public deletePreset(name: string): void {
    const filtered = this.presetsList().filter(p => p.name !== name);
    this.presetsList.set(filtered);
    localStorage.setItem('devsight_password_presets', JSON.stringify(filtered));
  }

  // Secure copy metrics
  public copyActivePassword(): void {
    const secret = this.displayedSecret();
    this.copyText(secret);
  }

  public copyText(text: string): void {
    if (!text) return;
    
    // Auto clears clipboard timers if running
    if (this.clearTimerId) {
      clearInterval(this.clearTimerId);
      this.clearTimerId = null;
    }

    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);

      // Records historical lists
      this.recordToSessionHistory(text);

      // Auto clear countdown setup if checked
      if (this.clipboardAutoClear()) {
        this.copiedProgress.set(100);
        this.clearTimeCount.set(15);

        this.clearTimerId = setInterval(() => {
          this.clearTimeCount.update(c => c - 1);
          const percent = (this.clearTimeCount() / 15) * 100;
          this.copiedProgress.set(percent);

          if (this.clearTimeCount() <= 0) {
            navigator.clipboard.writeText(''); // Clear Clipboard!
            if (this.clearTimerId) {
              clearInterval(this.clearTimerId);
              this.clearTimerId = null;
            }
            this.copiedProgress.set(0);
          }
        }, 1000);
      }
    });
  }

  private recordToSessionHistory(secret: string): void {
    if (!secret) return;
    const currentList = [...this.historyList()];
    
    // Prevent duplicate entries adjacent to the list
    if (currentList.length > 0 && currentList[0].password === secret) return;

    const date = new Date();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const record: HistoryRecord = {
      id: Math.random().toString(),
      password: secret,
      type: this.activeTab() === 'passphrase-generator' ? 'Passphrase' : 'Generator',
      entropy: this.entropyRating(),
      strength: this.strengthLabel(),
      timestamp: timeString
    };

    // Keep history maximum strictly to last 15 copies
    const updated = [record, ...currentList].slice(0, 15);
    this.historyList.set(updated);
    localStorage.setItem('devsight_password_history', JSON.stringify(updated));
  }

  public clearHistory(): void {
    this.historyList.set([]);
    localStorage.removeItem('devsight_password_history');
  }

  public getHistoryStrengthColor(lvl: string): string {
    const level = lvl.toLowerCase();
    if (level.includes('weak')) return 'text-rose-450';
    if (level.includes('basic')) return 'text-amber-450';
    if (level.includes('strong')) return 'text-cyan-400';
    return 'text-emerald-400';
  }

  // Salt generator helpers
  public generateSalt(bytesSize: number): void {
    const raw = new Uint8Array(bytesSize);
    crypto.getRandomValues(raw);
    const hex = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
    this.computedSalt.set(hex);
  }

  public onLengthChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.length.set(parseInt(val, 10));
  }

  public onBulkQuantityChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.bulkQuantity.set(parseInt(val, 10));
  }

  public onPassphraseWordCountChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.passphraseWordCount.set(parseInt(val, 10));
  }

  public regenerate(): void {
    this.refreshTrigger.update(prev => prev + 1);
  }

  // Static cryptographic tools extractors
  private drawRandomChar(pool: string): string {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const randomIndex = arr[0] % pool.length;
    return pool.charAt(randomIndex);
  }

  private drawCryptoIndex0toMax(max: number): number {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  private getRandomStringFromPool(pool: string, len: number): string {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += this.drawRandomChar(pool);
    }
    return result;
  }

  private shuffleCryptoBuffer<T>(array: T[]): T[] {
    const res = [...array];
    for (let i = res.length - 1; i > 0; i--) {
      const u32 = new Uint32Array(1);
      crypto.getRandomValues(u32);
      const j = u32[0] % (i + 1);
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }
}
