export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface HSV { h: number; s: number; v: number; }
export interface OKLCH { l: number; c: number; h: number; }

// --- COLOR SPACE CONVERSIONS ---

export function hexToRgb(hex: string): RGB {
  // Normalize string
  let c = hex.trim().replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(rgb: RGB): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t: number) => {
      let val = t;
      if (val < 0) val += 1;
      if (val > 1) val -= 1;
      if (val < 1/6) return p + (q - p) * 6 * val;
      if (val < 1/2) return q;
      if (val < 2/3) return p + (q - p) * (2/3 - val) * 6;
      return p;
    };
    r = hue2rgb(h + 1/3);
    g = hue2rgb(h);
    b = hue2rgb(h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

export function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Simple, performant approximation of OKLCH to/from RGB.
// Standard color library conversions in browser.
export function rgbToOklch(rgb: RGB): OKLCH {
  // Simple approximation
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  // Linearize sRGB
  const linear = (c: number) => c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);

  // LMS Cone response space
  const l_cone = lr * 0.4122214708 + lg * 0.5363325363 + lb * 0.0514459929;
  const m_cone = lr * 0.2119034982 + lg * 0.6806995451 + lb * 0.1073970423;
  const s_cone = lr * 0.0883024619 + lg * 0.2817188376 + lb * 0.6299787005;

  const l_cube = Math.pow(Math.max(0, l_cone), 1/3);
  const m_cube = Math.pow(Math.max(0, m_cone), 1/3);
  const s_cube = Math.pow(Math.max(0, s_cone), 1/3);

  const L = l_cube * 0.2104542553 + m_cube * 0.7936177850 - s_cube * 0.0040720468;
  const a = l_cube * 1.9779984951 - m_cube * 2.4285922050 + s_cube * 0.4505937099;
  const b_co = l_cube * 0.0259040371 + m_cube * 0.7827717658 - s_cube * 0.8086757660;

  const C = Math.sqrt(a * a + b_co * b_co);
  let h = Math.atan2(b_co, a) * (180 / Math.PI);
  if (h < 0) h += 360;

  return {
    l: parseFloat(L.toFixed(3)),
    c: parseFloat(C.toFixed(3)),
    h: Math.round(h)
  };
}

export function oklchToRgb(oklch: OKLCH): RGB {
  const L = oklch.l;
  const C = oklch.c;
  const h_rad = (oklch.h * Math.PI) / 180;
  const a = C * Math.cos(h_rad);
  const b_co = C * Math.sin(h_rad);

  const l_cube = L + a * 0.3963377774 + b_co * 0.2158037573;
  const m_cube = L - a * 0.1055613458 - b_co * 0.0638541728;
  const s_cube = L - a * 0.0894841775 - b_co * 1.2914855480;

  const l_cone = Math.max(0, l_cube * l_cube * l_cube);
  const m_cone = Math.max(0, m_cube * m_cube * m_cube);
  const s_cone = Math.max(0, s_cube * s_cube * s_cube);

  let r_lin = l_cone * +4.0767416621 + m_cone * -3.3077115913 + s_cone * +0.2309699292;
  let g_lin = l_cone * -1.2684380046 + m_cone * +2.6097574011 + s_cone * -0.3413193965;
  let b_lin = l_cone * -0.0041960863 + m_cone * -0.7034186149 + s_cone * +1.7076147010;

  const srgb = (c: number) => c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  const r = Math.max(0, Math.min(255, Math.round(srgb(r_lin) * 100) * 2.55));
  const g = Math.max(0, Math.min(255, Math.round(srgb(g_lin) * 100) * 2.55));
  const b = Math.max(0, Math.min(255, Math.round(srgb(b_lin) * 100) * 2.55));

  return { r, g, b };
}

// --- CONTRAST & ACCESSIBILITY RULES ---

export function getRelativeLuminance(rgb: RGB): number {
  const rs = rgb.r / 255;
  const gs = rgb.g / 255;
  const bs = rgb.b / 255;

  const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(colorA: RGB, colorB: RGB): number {
  const lumA = getRelativeLuminance(colorA);
  const lumB = getRelativeLuminance(colorB);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

// APCA Scoring
// Standard APCA contrast formula approximation:
export function getApcaContrast(textRgb: RGB, bgRgb: RGB): number {
  const txtY = getRelativeLuminance(textRgb);
  const bgY = getRelativeLuminance(bgRgb);
  
  // Weights (approximated APCA constants)
  const textScale = 0.58;
  const bgScale = 0.42;
  
  let contrast = 0;
  if (bgY > txtY) {
    // Light background
    contrast = (Math.pow(bgY, 0.56) - Math.pow(txtY, 0.62)) * 175;
  } else {
    // Dark background
    contrast = (Math.pow(bgY, 0.65) - Math.pow(txtY, 0.43)) * 175;
  }

  // Clamping and scaling to match Lc scores
  if (Math.abs(contrast) < 7.5) {
    return 0;
  }
  return parseFloat(contrast.toFixed(1));
}

// --- COLOR BLINDNESS SIMULATOR ---

export function simulateColorBlindness(rgb: RGB, type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'): RGB {
  // Standard LDS/RGB transformation matrices
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  let sr = r, sg = g, sb = b;

  switch (type) {
    case 'protanopia':
      sr = r * 0.56667 + g * 0.43333;
      sg = r * 0.55833 + g * 0.44167;
      sb = r * 0.0      + b * 1.0;
      break;
    case 'deuteranopia':
      sr = r * 0.625    + g * 0.375;
      sg = r * 0.70     + g * 0.30;
      sb = g * 0.30     + b * 0.70;
      break;
    case 'tritanopia':
      sr = r * 0.95     + g * 0.05;
      sg = g * 0.43333 + b * 0.56667;
      sb = g * 0.475    + b * 0.525;
      break;
    case 'achromatopsia':
      const gray = r * 0.2126 + g * 0.7152 + b * 0.0722;
      sr = gray;
      sg = gray;
      sb = gray;
      break;
  }

  return {
    r: Math.max(0, Math.min(255, Math.round(sr * 255))),
    g: Math.max(0, Math.min(255, Math.round(sg * 255))),
    b: Math.max(0, Math.min(255, Math.round(sb * 255)))
  };
}

// --- TAILWIND & MATERIAL MATCHERS ---

export const TAILWIND_PALETTE: { [key: string]: { [shade: string]: string } } = {
  slate: { "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155", "800": "#1e293b", "900": "#0f172a", "950": "#020617" },
  zinc: { "50": "#fafafa", "100": "#f4f4f5", "200": "#e4e4e7", "300": "#d4d4d8", "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46", "800": "#27272a", "900": "#18181b", "950": "#09090b" },
  red: { "50": "#fef2f2", "100": "#fee2e2", "200": "#fecaca", "300": "#fca5a5", "400": "#f87171", "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c", "800": "#991b1b", "900": "#7f1d1d", "950": "#450a0a" },
  orange: { "50": "#fff7ed", "100": "#ffedd5", "200": "#fed7aa", "300": "#fdbb74", "400": "#fb923c", "500": "#f97316", "600": "#ea580c", "700": "#c2410c", "800": "#9a3412", "900": "#7c2d12", "950": "#431407" },
  amber: { "50": "#fffbeb", "100": "#fef3c7", "200": "#fde68a", "300": "#fcd34d", "400": "#fbbf24", "500": "#f59e0b", "600": "#d97706", "700": "#b45309", "800": "#92400e", "900": "#78350f", "950": "#451a03" },
  yellow: { "50": "#fefce8", "100": "#fef9c3", "200": "#fef08a", "300": "#fde047", "400": "#facc15", "500": "#eab308", "600": "#ca8a04", "700": "#a16207", "800": "#854d0e", "900": "#713f12", "950": "#422006" },
  emerald: { "50": "#ecfdf5", "100": "#d1fae5", "200": "#a7f3d0", "300": "#6ee7b7", "400": "#34d399", "500": "#10b981", "600": "#059669", "700": "#047857", "800": "#065f46", "900": "#064e3b", "950": "#022c22" },
  blue: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af", "900": "#1e3a8a", "950": "#172554" },
  indigo: { "50": "#eef2ff", "100": "#e0e7ff", "200": "#c7d2fe", "300": "#a5b4fc", "400": "#818cf8", "500": "#6366f1", "600": "#4f46e5", "700": "#4338ca", "800": "#3730a3", "900": "#312e81", "950": "#1e1b4b" },
  violet: { "50": "#f5f3ff", "100": "#ede9fe", "200": "#ddd6fe", "300": "#c4b5fd", "400": "#a78bfa", "500": "#8b5cf6", "600": "#7c3aed", "700": "#6d28d9", "800": "#5b21b6", "900": "#4c1d95", "950": "#2e1065" },
  fuchsia: { "50": "#fdf4ff", "100": "#fae8ff", "200": "#f5d0fe", "300": "#f0abfc", "400": "#e879f9", "500": "#d946ef", "600": "#c084fc", "700": "#a21caf", "800": "#86198f", "900": "#701a75", "950": "#4a044e" },
  pink: { "50": "#fdf2f8", "100": "#fce7f3", "200": "#fbcfe8", "300": "#f9a8d4", "400": "#f472b6", "500": "#ec4899", "600": "#db2777", "700": "#be185d", "800": "#9d174d", "900": "#831843", "950": "#500724" }
};

export function matchTailwindColor(rgb: RGB): { name: string; shade: string; hex: string; distance: number } {
  let minDistance = Infinity;
  let bestMatch = { name: 'zinc', shade: '500', hex: '#71717a' };

  Object.entries(TAILWIND_PALETTE).forEach(([name, shades]) => {
    Object.entries(shades).forEach(([shade, hex]) => {
      const shadeRgb = hexToRgb(hex);
      // Euclidean distance in RGB coordinates
      const distance = Math.sqrt(
        Math.pow(rgb.r - shadeRgb.r, 2) +
        Math.pow(rgb.g - shadeRgb.g, 2) +
        Math.pow(rgb.b - shadeRgb.b, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = { name, shade, hex };
      }
    });
  });

  return { ...bestMatch, distance: minDistance };
}

// Convert RGB to HEX opacity/alpha format
export function rgbToRgbaString(rgb: RGB, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
}
