import { Injectable, signal } from '@angular/core';
import { UNIT_CATEGORIES, UNITS } from '../../data/units.data';

export interface UnitCategory {
  id: string;
  name: string;
  icon: string;
  baseUnit: string;
}

export interface Unit {
  id: string;
  categoryId: string;
  name: string;
  symbol: string;
  factor: number;
  offset: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  categoryId: string;
  categoryName: string;
  fromUnitName: string;
  fromUnitSymbol: string;
  toUnitName: string;
  toUnitSymbol: string;
  inputValue: number;
  outputValue: number;
  precision: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConversionService {
  // Read-only data exports
  readonly categories = UNIT_CATEGORIES;
  readonly allUnits = UNITS;

  // Signal state for active selections
  currentCategoryId = signal<string>('length');
  currentInputValue = signal<number>(1);
  currentPrecision = signal<number>(4);

  // Get active category
  getCategoryById(id: string): UnitCategory | undefined {
    return this.categories.find(c => c.id === id);
  }

  // Get units of a specific category
  getUnitsByCategory(categoryId: string): Unit[] {
    return this.allUnits.filter(u => u.categoryId === categoryId);
  }

  // Primary conversion logic
  convert(value: number, from: Unit, to: Unit): number {
    if (from.id === to.id) {
      return value;
    }

    // Special handling for Fuel Economy (L/100km reciprocal conversion)
    if (from.categoryId === 'fuel_economy') {
      if (from.id === 'fuel_l100km') {
        if (value === 0) return 0;
        // L/100km -> km/L (base)
        const kmL = 100 / value;
        // km/L -> target unit
        return kmL / to.factor;
      }
      if (to.id === 'fuel_l100km') {
        // from -> km/L
        const kmL = value * from.factor;
        if (kmL === 0) return 0;
        // km/L -> L/100km
        return 100 / kmL;
      }
    }

    // Standard base-unit conversion formula:
    // baseValue = (value + from.offset) * from.factor
    // result = baseValue / to.factor - to.offset
    const baseValue = (value + from.offset) * from.factor;
    return baseValue / to.factor - to.offset;
  }

  // Get explanation & steps of conversion for the UI
  getFormulaAndSteps(value: number, from: Unit, to: Unit, precision: number): {
    formula: string;
    factorText: string;
    steps: string[];
  } {
    const formattedVal = value.toString();
    const result = this.convert(value, from, to);
    const formattedResult = result.toFixed(precision);

    // Fuel economy reciprocal steps
    if (from.categoryId === 'fuel_economy') {
      if (from.id === 'fuel_l100km' && to.id !== 'fuel_l100km') {
        const kmL = (100 / value);
        return {
          formula: `y = (100 / x) / factor`,
          factorText: `1 L/100km = 100 km/L, Target Factor = ${to.factor}`,
          steps: [
            `1. Invert the fuel storage rate: 100 / ${formattedVal} = ${kmL.toFixed(precision)} km/L (base unit).`,
            `2. Convert km/L to ${to.name} (${to.symbol}): ${kmL.toFixed(precision)} / ${to.factor} = ${formattedResult} ${to.symbol}.`
          ]
        };
      }
      if (to.id === 'fuel_l100km' && from.id !== 'fuel_l100km') {
        const kmL = value * from.factor;
        return {
          formula: `y = 100 / (x * factor)`,
          factorText: `Source Factor = ${from.factor}, 1 L/100km = 100 km/L`,
          steps: [
            `1. Convert ${from.name} (${from.symbol}) to base unit (km/L): ${formattedVal} * ${from.factor} = ${kmL.toFixed(precision)} km/L.`,
            `2. Invert to calculate L/100km: 100 / ${kmL.toFixed(precision)} = ${formattedResult} L/100km.`
          ]
        };
      }
    }

    // Temperature steps
    if (from.categoryId === 'temperature') {
      if (from.id === 'temp_c' && to.id === 'temp_f') {
        return {
          formula: `°F = (°C × 9/5) + 32`,
          factorText: `Offset = 32, Multiplier = 1.8`,
          steps: [
            `1. Multiply ${formattedVal}°C by 1.8 (9/5): ${value * 1.8}`,
            `2. Add 32: ${(value * 1.8) + 32} = ${formattedResult}°F.`
          ]
        };
      }
      if (from.id === 'temp_f' && to.id === 'temp_c') {
        return {
          formula: `°C = (°F - 32) × 5/9`,
          factorText: `Offset = -32, Multiplier = 5/9`,
          steps: [
            `1. Subtract 32 from ${formattedVal}°F: ${value - 32}`,
            `2. Multiply by 5/9 (0.5556): ${(value - 32) * (5 / 9)} = ${formattedResult}°C.`
          ]
        };
      }
      if (from.id === 'temp_c' && to.id === 'temp_k') {
        return {
          formula: `K = °C + 273.15`,
          factorText: `Offset = 273.15`,
          steps: [
            `1. Add 273.15 to ${formattedVal}°C: ${value + 273.15} = ${formattedResult} K.`
          ]
        };
      }
      if (from.id === 'temp_k' && to.id === 'temp_c') {
        return {
          formula: `°C = K - 273.15`,
          factorText: `Offset = -273.15`,
          steps: [
            `1. Subtract 273.15 from ${formattedVal} K: ${value - 273.15} = ${formattedResult}°C.`
          ]
        };
      }
      if (from.id === 'temp_f' && to.id === 'temp_k') {
        const c = (value - 32) * (5 / 9);
        return {
          formula: `K = (°F - 32) × 5/9 + 273.15`,
          factorText: `Fahrenheit to Celsius to Kelvin`,
          steps: [
            `1. Convert ${formattedVal}°F to Celsius: (${formattedVal} - 32) × 5/9 = ${c.toFixed(precision)}°C.`,
            `2. Add 273.15: ${c.toFixed(precision)} + 273.15 = ${formattedResult} K.`
          ]
        };
      }
      if (from.id === 'temp_k' && to.id === 'temp_f') {
        const c = value - 273.15;
        return {
          formula: `°F = (K - 273.15) × 9/5 + 32`,
          factorText: `Kelvin to Celsius to Fahrenheit`,
          steps: [
            `1. Convert ${formattedVal} K to Celsius: ${formattedVal} - 273.15 = ${c.toFixed(precision)}°C.`,
            `2. Convert Celsius to Fahrenheit: ${c.toFixed(precision)} × 1.8 + 32 = ${formattedResult}°F.`
          ]
        };
      }
    }

    // Standard conversions
    const fromFactor = from.factor;
    const toFactor = to.factor;

    const baseValue = (value + from.offset) * fromFactor;

    const hasFromOffset = from.offset !== 0;
    const hasToOffset = to.offset !== 0;

    const formulaExpr = `y = ((x + ${from.offset}) × ${fromFactor}) / ${toFactor} - ${to.offset}`;
    const simplifiedFormula = from.offset === 0 && to.offset === 0
      ? `y = x × (${fromFactor} / ${toFactor})`
      : formulaExpr;

    const steps: string[] = [];
    if (hasFromOffset) {
      steps.push(`1. Add offset to raw input: ${value} + ${from.offset} = ${value + from.offset}`);
      steps.push(`2. Multiply by source factor ${fromFactor} to convert to Base Unit: ${(value + from.offset) * fromFactor} ${from.categoryId === 'length' ? 'm' : ''}`);
    } else {
      steps.push(`1. Multiply input ${formattedVal} by source unit factor ${fromFactor} to convert to Base Unit: ${baseValue.toFixed(precision)}`);
    }

    if (hasToOffset) {
      steps.push(`3. Divide by destination factor ${toFactor}: ${(baseValue / toFactor).toFixed(precision)}`);
      steps.push(`4. Subtract destination offset ${to.offset}: ${((baseValue / toFactor) - to.offset).toFixed(precision)} ${to.symbol}`);
    } else {
      steps.push(`2. Divide by destination unit factor ${toFactor} to convert from Base Unit: ${result.toFixed(precision)} ${to.symbol}`);
    }

    return {
      formula: simplifiedFormula,
      factorText: `1 ${from.symbol} = ${fromFactor} (Base Unit), 1 ${to.symbol} = ${toFactor} (Base Unit)`,
      steps
    };
  }
}
