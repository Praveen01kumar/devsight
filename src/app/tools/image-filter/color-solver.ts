export class Color {
  constructor(public r: number, public g: number, public b: number) {
    this.r = Math.min(255, Math.max(0, r));
    this.g = Math.min(255, Math.max(0, g));
    this.b = Math.min(255, Math.max(0, b));
  }

  toString(): string {
    return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
  }

  toHex(): string {
    const rStr = Math.round(this.r).toString(16).padStart(2, '0');
    const gStr = Math.round(this.g).toString(16).padStart(2, '0');
    const bStr = Math.round(this.b).toString(16).padStart(2, '0');
    return `#${rStr}${gStr}${bStr}`;
  }

  toHsl() {
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  static fromHex(hex: string): Color | null {
    let cleanHex = hex.trim().replace(/^#/, '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    if (cleanHex.length !== 6) return null;
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return null;
    return new Color((num >> 16) & 255, (num >> 8) & 255, num & 255);
  }

  static fromRgb(r: number, g: number, b: number): Color {
    return new Color(r, g, b);
  }
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  // D65 relative illuminant
  const x = rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805;
  const y = rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722;
  const z = rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505;

  // XYZ to CIELAB
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1 / 3) : 7.787 * (x / xn) + 16 / 116;
  const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1 / 3) : 7.787 * (y / yn) + 16 / 116;
  const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1 / 3) : 7.787 * (z / zn) + 16 / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bCoord = 200 * (fy - fz);

  return [l, a, bCoord];
}

export interface SolverResult {
  values: number[];
  loss: number;
  filterString: string;
  color: Color;
  percentage: number;
}

export class ColorSolver {
  private targetLab: [number, number, number];

  constructor(private target: Color) {
    this.targetLab = rgbToLab(target.r, target.g, target.b);
  }

  solve(): SolverResult {
    let bestLoss = Infinity;
    let bestValues = [0, 0, 0, 0, 0, 0];

    // Standard filter keys:
    // [0] Invert (0 to 100)
    // [1] Sepia (0 to 100)
    // [2] Saturate (0 to 1000)
    // [3] Hue-rotate (0 to 360)
    // [4] Brightness (0 to 200)
    // [5] Contrast (0 to 200)

    // Run SPSA with randomized multi-starts to prevent local minima traps
    const restarts = [
      this.getGuessFromHsl(),
      [50, 20, 150, 180, 100, 100],
      [100, 0, 300, 90, 80, 110],
      [20, 80, 100, 270, 120, 90],
      [80, 40, 500, 0, 110, 120]
    ];

    for (const startVals of restarts) {
      let values = [...startVals];

      // Decay SPSA coefficients
      const alpha = 0.602;
      const gamma = 0.101;
      const c = 0.01;
      const a = 1.5;
      const A = 100;

      for (let i = 0; i < 350; i++) {
        const k = i + 1;
        const ck = c / Math.pow(k, gamma);
        const ak = a / Math.pow(k + A, alpha);

        const delta = Array.from({ length: 6 }, () => (Math.random() > 0.5 ? 1 : -1));

        const valPlus = values.map((v, idx) => this.clamp(v + ck * delta[idx], idx));
        const valMinus = values.map((v, idx) => this.clamp(v - ck * delta[idx], idx));

        const lossPlus = this.loss(valPlus);
        const lossMinus = this.loss(valMinus);

        const g = delta.map((d) => (lossPlus - lossMinus) / (2 * ck * d));

        values = values.map((v, idx) => this.clamp(v - ak * g[idx], idx));
        const currentLoss = this.loss(values);

        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          bestValues = [...values];
        }
      }
    }

    // Direct Hill-Climbing / Downhill Simplex refinement for perfect accuracy
    let values = [...bestValues];
    let step = 0.5;
    for (let iter = 0; iter < 120; iter++) {
      let improved = false;
      for (let idx = 0; idx < 6; idx++) {
        for (const dir of [-1, 1]) {
          const testVal = [...values];
          testVal[idx] = this.clamp(testVal[idx] + dir * step, idx);
          const testLoss = this.loss(testVal);
          if (testLoss < bestLoss) {
            bestLoss = testLoss;
            values = testVal;
            improved = true;
          }
        }
      }
      if (!improved) {
        step *= 0.6;
        if (step < 0.001) break;
      }
    }

    bestValues = values;
    const finalColor = this.applyFilters(bestValues);

    // Delta E difference maps to a Match Accuracy rating.
    // Standard: DeltaE <= 1 is essentially 100% indistinguishable.
    // We formulate percentage = max(0, 100 - (Loss * 1.5))
    // This gives a solid, dynamic, realistic indicator
    let percentage = 100 - (bestLoss * 1.5);
    if (percentage < 0) percentage = 0;
    if (bestLoss < 0.1) percentage = 100;

    return {
      values: bestValues,
      loss: bestLoss,
      filterString: this.getFilterString(bestValues),
      color: finalColor,
      percentage: parseFloat(percentage.toFixed(1))
    };
  }

  private getGuessFromHsl(): number[] {
    const hsl = this.target.toHsl();
    // Build values based on the target HSL to start close to the target
    const inv = Math.max(10, Math.min(90, hsl.l));
    const sep = hsl.s < 30 ? 30 : 0;
    const sat = Math.min(1000, hsl.s * 4);
    const hue = hsl.h;
    const bri = Math.max(50, Math.min(150, hsl.l * 1.5));
    const con = 100;
    return [inv, sep, sat, hue, bri, con];
  }

  private clamp(val: number, idx: number): number {
    if (idx === 0) return Math.min(100, Math.max(0, val)); // invert
    if (idx === 1) return Math.min(100, Math.max(0, val)); // sepia
    if (idx === 2) return Math.min(4000, Math.max(0, val)); // saturate
    if (idx === 3) return (val + 360) % 360; // hue-rotate
    if (idx === 4) return Math.min(300, Math.max(0, val)); // brightness
    if (idx === 5) return Math.min(300, Math.max(0, val)); // contrast
    return val;
  }

  private loss(values: number[]): number {
    const c = this.applyFilters(values);
    const lab = rgbToLab(c.r, c.g, c.b);
    return Math.sqrt(
      Math.pow(lab[0] - this.targetLab[0], 2) +
      Math.pow(lab[1] - this.targetLab[1], 2) +
      Math.pow(lab[2] - this.targetLab[2], 2)
    );
  }

  public applyFilters(values: number[]): Color {
    // Standard starting color is raw black (0, 0, 0).
    let r = 0, g = 0, b = 0;

    const [invert, sepia, saturate, hueRotate, brightness, contrast] = values;

    // 1. Invert
    const inv = invert / 100;
    r = inv * 255;
    g = inv * 255;
    b = inv * 255;

    // 2. Sepia
    const sep = sepia / 100;
    if (sep > 0) {
      const tr = r, tg = g, tb = b;
      r = (1 - 0.607 * sep) * tr + 0.769 * sep * tg + 0.189 * sep * tb;
      g = 0.349 * sep * tr + (1 - 0.314 * sep) * tg + 0.168 * sep * tb;
      b = 0.272 * sep * tr + 0.534 * sep * tg + (1 - 0.869 * sep) * tb;
    }

    // 3. Saturate
    const sat = saturate / 100;
    const lr = 0.213, lg = 0.715, lb = 0.072;
    const tr2 = r, tg2 = g, tb2 = b;
    r = (lr + (1 - lr) * sat) * tr2 + (lg * (1 - sat)) * tg2 + (lb * (1 - sat)) * tb2;
    g = (lr * (1 - sat)) * tr2 + (lg + (1 - lg) * sat) * tg2 + (lb * (1 - sat)) * tb2;
    b = (lr * (1 - sat)) * tr2 + (lg * (1 - sat)) * tg2 + (lb + (1 - lb) * sat) * tb2;

    // 4. Hue Rotate
    const hue = (hueRotate * Math.PI) / 180;
    const co = Math.cos(hue);
    const si = Math.sin(hue);
    const tr3 = r, tg3 = g, tb3 = b;
    r = (lr + co * (1 - lr) - si * lr) * tr3 + (lg - co * lg - si * lg) * tg3 + (lb - co * lb + si * (1 - lb)) * tb3;
    g = (lr - co * lr + si * 0.143) * tr3 + (lg + co * (1 - lg) + si * 0.140) * tg3 + (lb - co * lb - si * 0.283) * tb3;
    b = (lr - co * lr - si * (1 - lr)) * tr3 + (lg - co * lg + si * lg) * tg3 + (lb + co * (1 - lb) + si * lb) * tb3;

    // 5. Brightness
    const bri = brightness / 100;
    r *= bri;
    g *= bri;
    b *= bri;

    // 6. Contrast
    const con = contrast / 100;
    r = (r - 127.5) * con + 127.5;
    g = (g - 127.5) * con + 127.5;
    b = (b - 127.5) * con + 127.5;

    return new Color(r, g, b);
  }

  public getFilterString(values: number[]): string {
    const [invert, sepia, saturate, hueRotate, brightness, contrast] = values;
    return `invert(${Math.round(invert)}%) sepia(${Math.round(sepia)}%) saturate(${Math.round(saturate)}%) hue-rotate(${Math.round(hueRotate)}deg) brightness(${Math.round(brightness)}%) contrast(${Math.round(contrast)}%)`;
  }
}
