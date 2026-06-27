import { MergeOptions, JSONValidationResult, JSONValue, JSONObject, JSONArray, JSONConflict } from './json-merge.models';

/**
 * Checks if two JSON values are deeply equal.
 */
export function isEqual(a: JSONValue, b: JSONValue): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as JSONObject;
    const objB = b as JSONObject;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Custom scanner to detect duplicate keys in a JSON string.
 */
export function findDuplicateKeys(jsonStr: string): string[] {
  const duplicates = new Set<string>();
  const stack: Set<string>[] = [];
  let currentKeys = new Set<string>();

  let i = 0;
  const len = jsonStr.length;

  while (i < len) {
    const char = jsonStr[i];
    if (char === '{') {
      stack.push(currentKeys);
      currentKeys = new Set();
      i++;
    } else if (char === '}') {
      if (stack.length > 0) {
        currentKeys = stack.pop()!;
      }
      i++;
    } else if (char === '"') {
      // Read string
      let str = '';
      i++; // skip open quote
      while (i < len) {
        if (jsonStr[i] === '"' && jsonStr[i - 1] !== '\\') {
          break;
        }
        str += jsonStr[i];
        i++;
      }
      i++; // skip close quote

      // Check if followed by colon (ignoring whitespace)
      let temp = i;
      while (temp < len && /\s/.test(jsonStr[temp])) {
        temp++;
      }
      if (temp < len && jsonStr[temp] === ':') {
        if (currentKeys.has(str)) {
          duplicates.add(str);
        } else {
          currentKeys.add(str);
        }
        i = temp + 1; // skip past ':'
      }
    } else if (char === '[') {
      i++;
    } else {
      i++;
    }
  }
  return Array.from(duplicates);
}

/**
 * Computes deep stats for a parsed JSON object.
 */
export function getJSONStats(value: JSONValue): {
  objectCount: number;
  arrayCount: number;
  keysCount: number;
  maxDepth: number;
} {
  let objectCount = 0;
  let arrayCount = 0;
  let keysCount = 0;
  let maxDepth = 0;

  function traverse(node: JSONValue, currentDepth: number): void {
    if (node === null || node === undefined) return;
    maxDepth = Math.max(maxDepth, currentDepth);

    if (Array.isArray(node)) {
      arrayCount++;
      for (const val of node) {
        traverse(val, currentDepth + 1);
      }
    } else if (typeof node === 'object') {
      objectCount++;
      const obj = node as JSONObject;
      const keys = Object.keys(obj);
      keysCount += keys.length;
      for (const key of keys) {
        traverse(obj[key], currentDepth + 1);
      }
    }
  }

  traverse(value, 1);
  return { objectCount, arrayCount, keysCount, maxDepth };
}

/**
 * Validates a JSON string and calculates statistics.
 */
export function validateJSONContent(content: string, strict = false): JSONValidationResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Empty JSON input',
      warning: null,
      duplicateKeys: [],
      objectCount: 0,
      arrayCount: 0,
      keysCount: 0,
      depth: 0,
      linesCount: 0,
      charsCount: 0
    };
  }

  const linesCount = content.split('\n').length;
  const charsCount = content.length;

  let parsed: JSONValue | null = null;
  let errorMsg: string | null = null;
  let warningMsg: string | null = null;

  // Check for trailing commas which parse in some environments but are strictly invalid JSON
  if (/,\s*[\]}]/.test(trimmed)) {
    if (strict) {
      return {
        isValid: false,
        error: 'Trailing comma detected (strictly invalid in JSON)',
        warning: null,
        duplicateKeys: [],
        objectCount: 0,
        arrayCount: 0,
        keysCount: 0,
        depth: 0,
        linesCount,
        charsCount
      };
    } else {
      warningMsg = 'Trailing comma detected (technically invalid in strict JSON)';
    }
  }

  try {
    parsed = JSON.parse(trimmed) as JSONValue;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
    return {
      isValid: false,
      error: errorMsg,
      warning: warningMsg,
      duplicateKeys: [],
      objectCount: 0,
      arrayCount: 0,
      keysCount: 0,
      depth: 0,
      linesCount,
      charsCount
    };
  }

  const duplicateKeys = findDuplicateKeys(trimmed);
  if (strict && duplicateKeys.length > 0) {
    return {
      isValid: false,
      error: `Duplicate keys detected: ${duplicateKeys.join(', ')}`,
      warning: null,
      duplicateKeys,
      objectCount: 0,
      arrayCount: 0,
      keysCount: 0,
      depth: 0,
      linesCount,
      charsCount
    };
  }

  const stats = getJSONStats(parsed);

  return {
    isValid: true,
    error: null,
    warning: duplicateKeys.length > 0 ? `Duplicate keys detected: ${duplicateKeys.slice(0, 3).join(', ')}${duplicateKeys.length > 3 ? '...' : ''}` : warningMsg,
    duplicateKeys,
    objectCount: stats.objectCount,
    arrayCount: stats.arrayCount,
    keysCount: stats.keysCount,
    depth: stats.maxDepth,
    linesCount,
    charsCount
  };
}

/**
 * Intelligent JSON Merging Algorithm.
 */
export function mergeJSONValues(
  valA: JSONValue,
  valB: JSONValue,
  options: MergeOptions,
  fileAName: string,
  fileBName: string,
  conflicts: JSONConflict[],
  resolvedConflicts: Record<string, 'first' | 'second' | 'custom'>,
  customResolvedValues: Record<string, JSONValue>,
  currentPath = 'root'
): JSONValue {
  // If either is null/undefined, or types differ, treat as primitive conflict unless we skip or overwrite
  if (valA === null || valB === null || typeof valA !== typeof valB || Array.isArray(valA) !== Array.isArray(valB)) {
    return resolveConflict(valA, valB, currentPath, '', options, fileAName, fileBName, conflicts, resolvedConflicts, customResolvedValues);
  }

  // If both are arrays
  if (Array.isArray(valA) && Array.isArray(valB)) {
    const arrA = valA as JSONArray;
    const arrB = valB as JSONArray;

    switch (options.arrayMerge) {
      case 'append':
      case 'concat':
        return [...arrA, ...arrB];
      case 'unique': {
        const combined = [...arrA, ...arrB];
        const unique: JSONArray = [];
        for (const item of combined) {
          if (!unique.some((u: JSONValue) => isEqual(u, item))) {
            unique.push(item);
          }
        }
        return unique;
      }
      case 'index': {
        const result: JSONArray = [];
        const maxLen = Math.max(arrA.length, arrB.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < arrA.length && i < arrB.length) {
            result.push(mergeJSONValues(arrA[i], arrB[i], options, fileAName, fileBName, conflicts, resolvedConflicts, customResolvedValues, `${currentPath}[${i}]`));
          } else if (i < arrA.length) {
            result.push(arrA[i]);
          } else {
            result.push(arrB[i]);
          }
        }
        return result;
      }
      default:
        return [...arrA, ...arrB];
    }
  }

  // If both are objects
  if (typeof valA === 'object' && typeof valB === 'object') {
    const objA = valA as JSONObject;
    const objB = valB as JSONObject;

    if (options.mode === 'shallow') {
      // Top-level key merge
      const result: JSONObject = {};
      const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

      for (const key of allKeys) {
        const hasA = key in objA;
        const hasB = key in objB;
        const path = `${currentPath}.${key}`;

        if (hasA && hasB) {
          result[key] = resolveConflict(objA[key], objB[key], path, key, options, fileAName, fileBName, conflicts, resolvedConflicts, customResolvedValues, result);
        } else if (hasA) {
          result[key] = objA[key];
        } else {
          result[key] = objB[key];
        }
      }
      return result;
    }

    // Deep, Recursive, or Smart Merge
    const result: JSONObject = { ...objA };

    // In smart merge or recursive merge, if we detect array elements that match by key/id, we merge them.
    // Let's implement deep object key merging:
    for (const key of Object.keys(objB)) {
      const path = `${currentPath}.${key}`;
      if (key in objA) {
        result[key] = mergeJSONValues(
          objA[key],
          objB[key],
          options,
          fileAName,
          fileBName,
          conflicts,
          resolvedConflicts,
          customResolvedValues,
          path
        );
      } else {
        result[key] = objB[key];
      }
    }
    return result;
  }

  // Primitives that are equal
  if (valA === valB) {
    return valA;
  }

  // Primitive conflict
  return resolveConflict(valA, valB, currentPath, '', options, fileAName, fileBName, conflicts, resolvedConflicts, customResolvedValues);
}

function resolveConflict(
  valA: JSONValue,
  valB: JSONValue,
  path: string,
  key: string,
  options: MergeOptions,
  fileAName: string,
  fileBName: string,
  conflicts: JSONConflict[],
  resolvedConflicts: Record<string, 'first' | 'second' | 'custom'>,
  customResolvedValues: Record<string, JSONValue>,
  parentObj?: JSONObject
): JSONValue {
  // If overwriteKeys is false, keeping existing (takeFirst) is the standard behavior
  const conflictRes = options.overwriteKeys ? options.conflictResolution : 'takeFirst';

  // Check if conflict resolution has already been pre-selected for this exact path
  if (path in resolvedConflicts) {
    const choice = resolvedConflicts[path];
    if (choice === 'first') return valA;
    if (choice === 'second') return valB;
    if (choice === 'custom') {
      return path in customResolvedValues ? customResolvedValues[path] : valB;
    }
  }

  // If we should ask the user, record the conflict and return valB as a preview placeholder
  if (conflictRes === 'askUser') {
    if (!conflicts.some(c => c.path === path)) {
      conflicts.push({
        id: Math.random().toString(36).substr(2, 9),
        path,
        key: key || path.split('.').pop() || '',
        valA,
        valB,
        fileAName,
        fileBName
      });
    }
    return valB; // fallback default
  }

  if (conflictRes === 'takeFirst') {
    return valA;
  }

  if (conflictRes === 'takeLast') {
    return valB;
  }

  if (conflictRes === 'renameDuplicate') {
    if (parentObj && key) {
      // Find a safe new key name in the parent object
      let counter = 2;
      let newKey = `${key}_${counter}`;
      while (newKey in parentObj) {
        counter++;
        newKey = `${key}_${counter}`;
      }
      parentObj[newKey] = valB;
    }
    return valA;
  }

  if (conflictRes === 'keepBoth') {
    // Return an array containing both values
    return [valA, valB];
  }

  return valB;
}

/**
 * Recursively sorts keys of all objects alphabetically.
 */
export function sortJSONKeys(val: JSONValue): JSONValue {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sortJSONKeys);
  }
  const obj = val as JSONObject;
  const sortedObj: JSONObject = {};
  const sortedKeys = Object.keys(obj).sort();
  for (const key of sortedKeys) {
    sortedObj[key] = sortJSONKeys(obj[key]);
  }
  return sortedObj;
}
