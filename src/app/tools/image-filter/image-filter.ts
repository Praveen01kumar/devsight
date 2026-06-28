import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Color, ColorSolver, rgbToLab, SolverResult } from './color-solver';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  isSvg: boolean;
  svgContent?: string;
  svgFillCode?: string;
}

interface DefaultIcon {
  id: string;
  name: string;
  svg: string;
}

const DEFAULT_ICONS: DefaultIcon[] = [
  {
    id: 'palette',
    name: 'Art Palette',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="#000000">
  <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.22-1.19-.59-1.64-.1-.13-.19-.28-.19-.46 0-.37.3-.68.68-.68H16c3.86 0 7-3.14 7-7 0-4.96-4.59-9-11-9zm-6 10c-.83 0-1.5-.67-1.5-1.5S5.17 9 6 9s1.5.67 1.5 1.5S6.83 12 6 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.17 5 9 5s1.5.67 1.5 1.5S9.83 8 9 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.17 5 14 5s1.5.67 1.5 1.5S14.83 8 14 8zm4 4c-.83 0-1.5-.67-1.5-1.5S17.17 9 18 9s1.5.67 1.5 1.5S18.83 12 18 12z"/>
</svg>`
  }
];

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      const storage = window.localStorage;
      if (storage) {
        return storage.getItem(key);
      }
    }
  } catch (e) {
    console.warn('Storage.getItem is not accessible:', e);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      const storage = window.localStorage;
      if (storage) {
        storage.setItem(key, value);
      }
    }
  } catch (e) {
    console.warn('Storage.setItem is not accessible:', e);
  }
}

function safeBtoa(str: string): string {
  try {
    if (typeof window === 'undefined') {
      const g = globalThis as typeof globalThis & { Buffer?: { from: (s: string) => { toString: (e: string) => string } } };
      if (g.Buffer) {
        return g.Buffer.from(str).toString('base64');
      }
      return '';
    }
    // Secure cross-browser base64 encoding support for non-Latin1 / Unicode characters
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('safeBtoa failed:', e);
    return '';
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-filter',
  imports: [CommonModule, MatIconModule],
  templateUrl: './image-filter.html'
})
export class ImageFilterComponent {
  // Default icons list
  defaultIcons = DEFAULT_ICONS;

  // App settings state
  activeTab = signal<'single' | 'batch'>('single');

  // Drag overlays
  isDragging = signal(false);

  // Selected default icon
  selectedDefaultIconId = signal<string>('palette');

  // Background testing preferences
  bgType = signal<'white' | 'black' | 'custom'>('custom');
  customBgColor = signal<string>('#1e293b');

  // Comparison visual template
  comparisonType = signal<'side-by-side' | 'overlay'>('side-by-side');
  sliderPosition = signal<number>(50);

  // Main Target Color state
  targetColorHex = signal<string>('#3b82f6');
  targetR = signal<number>(59);
  targetG = signal<number>(130);
  targetB = signal<number>(246);

  // Manual Adjuster Tuning parameters
  sliderInvert = signal<number>(0);
  sliderSepia = signal<number>(0);
  sliderSaturate = signal<number>(100);
  sliderHueRotate = signal<number>(0);
  sliderBrightness = signal<number>(100);
  sliderContrast = signal<number>(100);

  isManualMode = signal<boolean>(false);

  // File Upload states
  singleUploadedFile = signal<UploadedFile | null>(null);
  batchUploadedFiles = signal<UploadedFile[]>([]);

  // Clipboard copy feedback dictionary
  // Keys: 'raw-css' | 'class-css' | 'variable-css' | 'svg-fill' | 'batch-css'
  copiedState = signal<Record<string, boolean>>({});

  constructor() {
    try {
      const savedColor = safeGetItem('cfg_color');
      if (savedColor && /^#[0-9a-fA-F]{6}$/.test(savedColor)) {
        this.targetColorHex.set(savedColor);
        const col = Color.fromHex(savedColor);
        if (col) {
          this.targetR.set(col.r);
          this.targetG.set(col.g);
          this.targetB.set(col.b);
        }
      }

      const savedManual = safeGetItem('cfg_is_manual') === 'true';
      const savedValsStr = safeGetItem('cfg_manual_vals');
      if (savedValsStr) {
        try {
          const vals = JSON.parse(savedValsStr);
          if (vals && Array.isArray(vals) && vals.length === 6) {
            this.sliderInvert.set(vals[0]);
            this.sliderSepia.set(vals[1]);
            this.sliderSaturate.set(vals[2]);
            this.sliderHueRotate.set(vals[3]);
            this.sliderBrightness.set(vals[4]);
            this.sliderContrast.set(vals[5]);
            this.isManualMode.set(savedManual);
          }
        } catch (e) {
          console.error('Error loading custom filter values:', e);
        }
      }
    } catch (e) {
      console.warn('Storage read failed gracefully:', e);
    }

    // 3. Setup Filter Solver Side Effect (Saves manual calibration defaults)
    effect(() => {
      if (!this.isManualMode()) {
        const auto = this.autoSolvedResult();
        this.sliderInvert.set(auto.values[0]);
        this.sliderSepia.set(auto.values[1]);
        this.sliderSaturate.set(auto.values[2]);
        this.sliderHueRotate.set(auto.values[3]);
        this.sliderBrightness.set(auto.values[4]);
        this.sliderContrast.set(auto.values[5]);
      }
    }, { allowSignalWrites: true });

    // 4. Persistence of Filter Parameters & active configs
    effect(() => {
      const isManual = this.isManualMode();
      const vals = [
        this.sliderInvert(),
        this.sliderSepia(),
        this.sliderSaturate(),
        this.sliderHueRotate(),
        this.sliderBrightness(),
        this.sliderContrast()
      ];
      safeSetItem('cfg_is_manual', isManual ? 'true' : 'false');
      safeSetItem('cfg_manual_vals', JSON.stringify(vals));
      safeSetItem('cfg_color', this.targetColorHex());
    });
  }

  // --- Computed States (Reactive, Auto-updates on Color transitions) ---

  hexNoHash = computed((): string => {
    return this.targetColorHex().replace('#', '');
  });

  // Target Color represented as Color Type
  targetColorObj = computed((): Color => {
    return Color.fromHex(this.targetColorHex()) || new Color(59, 130, 246);
  });

  // Color Solver computation
  autoSolvedResult = computed((): SolverResult => {
    const solver = new ColorSolver(this.targetColorObj());
    return solver.solve();
  });

  // Current active coefficients [inv, sep, sat, hue, bri, con]
  activeValues = computed((): number[] => {
    if (this.isManualMode()) {
      return [
        this.sliderInvert(),
        this.sliderSepia(),
        this.sliderSaturate(),
        this.sliderHueRotate(),
        this.sliderBrightness(),
        this.sliderContrast()
      ];
    } else {
      return this.autoSolvedResult().values;
    }
  });

  // Active filter string: invert(55%) sepia(...) etc.
  activeFilterString = computed((): string => {
    if (this.isManualMode()) {
      const [inv, sep, sat, hue, bri, con] = this.activeValues();
      return `invert(${Math.round(inv)}%) sepia(${Math.round(sep)}%) saturate(${Math.round(sat)}%) hue-rotate(${Math.round(hue)}deg) brightness(${Math.round(bri)}%) contrast(${Math.round(con)}%)`;
    } else {
      return this.autoSolvedResult().filterString;
    }
  });

  // Matched RGB color coordinates calculated mathematically
  matchedRgbColor = computed((): Color => {
    const solver = new ColorSolver(this.targetColorObj());
    return solver.applyFilters(this.activeValues());
  });

  // Color Loss delta-E distance and visual match accuracy percentage
  matchAccuracy = computed(() => {
    const target = this.targetColorObj();
    const generated = this.matchedRgbColor();

    const targetLab = rgbToLab(target.r, target.g, target.b);
    const genLab = rgbToLab(generated.r, generated.g, generated.b);

    const deltaE = Math.sqrt(
      Math.pow(targetLab[0] - genLab[0], 2) +
      Math.pow(targetLab[1] - genLab[1], 2) +
      Math.pow(targetLab[2] - genLab[2], 2)
    );

    let percentage = 100 - (deltaE * 1.5);
    if (percentage < 0) percentage = 0;
    if (deltaE < 0.1) percentage = 100;

    let rating = 'Impeccable Perfect Match';
    let ratingColor = 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (deltaE > 15) {
      rating = 'Significant deviation';
      ratingColor = 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (deltaE > 7) {
      rating = 'Fair match (needs calibration)';
      ratingColor = 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (deltaE > 3.5) {
      rating = 'Very good match';
      ratingColor = 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }

    return {
      deltaE: parseFloat(deltaE.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(1)),
      rating,
      ratingColor
    };
  });

  // Selected default icon data-uri string representation
  selectedDefaultIconUrl = computed((): string => {
    const iconId = this.selectedDefaultIconId();
    const found = this.defaultIcons.find(icon => icon.id === iconId) || this.defaultIcons[0];
    return 'data:image/svg+xml;base64,' + safeBtoa(found.svg);
  });

  // Active single preview image url representing uploaded asset or fallback default vector
  activeSingleImageUrl = computed((): string => {
    const uploaded = this.singleUploadedFile();
    if (uploaded) return uploaded.dataUrl;
    return this.selectedDefaultIconUrl();
  });

  // Determine if active workspace contains an SVG graphic
  activeSingleIsSvg = computed((): boolean => {
    const uploaded = this.singleUploadedFile();
    if (uploaded) return uploaded.isSvg;
    return true; // default icons are SVGs
  });

  // SVG recommendation details for active single asset
  activeSvgDetails = computed(() => {
    const isSvg = this.activeSingleIsSvg();
    const targetHex = this.targetColorHex();

    if (!isSvg) return null;

    let original = '';
    const uploaded = this.singleUploadedFile();
    if (uploaded) {
      original = uploaded.svgContent || '';
    } else {
      const found = this.defaultIcons.find(icon => icon.id === this.selectedDefaultIconId()) || this.defaultIcons[0];
      original = found.svg;
    }

    // Showcase how they can replace fill="#000" or similar attributes with targetHex
    const fillExample = `fill="${targetHex}"`;
    const strokeExample = `stroke="${targetHex}"`;

    let customSvgMarkup = '';
    if (original) {
      // Modify SVG's top-level or child fill attribute for visual playground
      try {
        if (original.includes('fill=')) {
          customSvgMarkup = original.replace(/fill="[^"]*"/g, fillExample);
        } else {
          customSvgMarkup = original.replace(/<svg /g, `<svg ${fillExample} `);
        }
      } catch {
        customSvgMarkup = original;
      }
    }

    return {
      fillExample,
      strokeExample,
      optimizedSvgCode: customSvgMarkup,
      optimizedSvgDataUrl: 'data:image/svg+xml;base64,' + safeBtoa(customSvgMarkup)
    };
  });

  // --- Input Synchronization ---

  onHexInput(hex: string) {
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    this.targetColorHex.set(hex);

    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const col = Color.fromHex(hex);
      if (col) {
        this.targetR.set(col.r);
        this.targetG.set(col.g);
        this.targetB.set(col.b);
        this.isManualMode.set(false);
      }
    }
  }

  onRgbInput(channel: 'r' | 'g' | 'b', value: string) {
    let num = Number.parseInt(value, 10);
    if (isNaN(num)) num = 0;
    num = Math.max(0, Math.min(255, num));

    if (channel === 'r') this.targetR.set(num);
    if (channel === 'g') this.targetG.set(num);
    if (channel === 'b') this.targetB.set(num);

    const updatedColor = new Color(this.targetR(), this.targetG(), this.targetB());
    this.targetColorHex.set(updatedColor.toHex());
    this.isManualMode.set(false);
  }

  onPickerInput(hex: string) {
    this.targetColorHex.set(hex);
    const col = Color.fromHex(hex);
    if (col) {
      this.targetR.set(col.r);
      this.targetG.set(col.g);
      this.targetB.set(col.b);
      this.isManualMode.set(false);
    }
  }

  // Preset Selection helper
  selectPreset(hex: string) {
    this.onHexInput(hex);
  }

  // --- Slider Fine-Tuning Controls ---

  onSliderChange(sliderName: string, value: string) {
    this.isManualMode.set(true);
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (sliderName === 'invert') this.sliderInvert.set(num);
    if (sliderName === 'sepia') this.sliderSepia.set(num);
    if (sliderName === 'saturate') this.sliderSaturate.set(num);
    if (sliderName === 'hueRotate') this.sliderHueRotate.set(num);
    if (sliderName === 'brightness') this.sliderBrightness.set(num);
    if (sliderName === 'contrast') this.sliderContrast.set(num);
  }

  resetToBestMatch() {
    this.isManualMode.set(false);
  }

  // --- Background Testers ---

  getBgStyle(): string {
    const type = this.bgType();
    if (type === 'white') return '#ffffff';
    if (type === 'black') return '#000000';
    return this.customBgColor();
  }

  setBgType(type: 'white' | 'black' | 'custom') {
    this.bgType.set(type);
  }

  setCustomBgColor(hex: string) {
    this.bgType.set('custom');
    this.customBgColor.set(hex);
  }

  // --- Copy Clipboard Utilities ---

  copyToClipboard(contentStr: string, key: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(contentStr).then(() => {
        this.copiedState.update(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          this.copiedState.update(prev => ({ ...prev, [key]: false }));
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy to clipboard', err);
      });
    }
  }

  // --- File Drag and Drop / Form File Pickers ---

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files);
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files);
    }
  }

  private handleFileSelection(files: FileList) {
    const list = Array.from(files);

    if (this.activeTab() === 'single') {
      // Single Mode - read only the first valid image file
      const file = list.find(f => f.type.startsWith('image/'));
      if (!file) return;

      const reader = new FileReader();
      const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');

      reader.onload = () => {
        const result = reader.result as string;
        if (isSvg) {
          // Read as text to capture contents for custom filling recommendations
          const textReader = new FileReader();
          textReader.onload = (txtEvent) => {
            const svgContent = txtEvent.target?.result as string;
            this.singleUploadedFile.set({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type,
              dataUrl: result,
              isSvg: true,
              svgContent
            });
          };
          textReader.readAsText(file);
        } else {
          this.singleUploadedFile.set({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            dataUrl: result,
            isSvg: false
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Batch Mode - support uploading multiple images
      const imageFiles = list.filter(f => f.type.startsWith('image/'));
      let loadedCount = 0;
      const loadedArray: UploadedFile[] = [];

      imageFiles.forEach(file => {
        const reader = new FileReader();
        const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');

        reader.onload = () => {
          const result = reader.result as string;
          if (isSvg) {
            const textReader = new FileReader();
            textReader.onload = (txtEvent) => {
              const svgContent = txtEvent.target?.result as string;
              loadedArray.push({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type,
                dataUrl: result,
                isSvg: true,
                svgContent
              });
              loadedCount++;
              if (loadedCount === imageFiles.length) {
                this.batchUploadedFiles.update(prev => [...prev, ...loadedArray]);
              }
            };
            textReader.readAsText(file);
          } else {
            loadedArray.push({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type,
              dataUrl: result,
              isSvg: false
            });
            loadedCount++;
            if (loadedCount === imageFiles.length) {
              this.batchUploadedFiles.update(prev => [...prev, ...loadedArray]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  clearSingleUploaded() {
    this.singleUploadedFile.set(null);
  }

  clearBatchUploaded() {
    this.batchUploadedFiles.set([]);
  }

  removeBatchFile(id: string) {
    this.batchUploadedFiles.update(files => files.filter(f => f.id !== id));
  }

  // Load a demo set of assets into batch space to let user try batch mode instantly!
  loadBatchDemo() {
    const demoArray: UploadedFile[] = this.defaultIcons.map(icon => ({
      id: icon.id,
      name: icon.name + '.svg',
      type: 'image/svg+xml',
      dataUrl: 'data:image/svg+xml;base64,' + safeBtoa(icon.svg),
      isSvg: true,
      svgContent: icon.svg
    }));
    this.batchUploadedFiles.set(demoArray);
  }
}
