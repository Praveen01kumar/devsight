/// <reference lib="webworker" />

// Helper functions copied for 100% self-contained worker reliability and perfect production bundling

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject { [key: string]: JSONValue; }
type JSONArray = JSONValue[];

interface MergeOptions {
  mode: 'deep' | 'shallow' | 'recursive' | 'smart';
  conflictResolution: 'takeFirst' | 'takeLast' | 'askUser' | 'keepBoth' | 'renameDuplicate';
  arrayMerge: 'append' | 'index' | 'unique' | 'concat';
  overwriteKeys: boolean;
  strictValidation: boolean;
  sortKeys: boolean;
}

interface JSONConflict {
  id: string;
  path: string;
  key: string;
  valA: JSONValue;
  valB: JSONValue;
  fileAName: string;
  fileBName: string;
}

function isEqual(a: JSONValue, b: JSONValue): boolean {
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

function getJSONStats(value: JSONValue): {
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

function mergeJSONValues(
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
  if (valA === null || valB === null || typeof valA !== typeof valB || Array.isArray(valA) !== Array.isArray(valB)) {
    return resolveConflict(valA, valB, currentPath, '', options, fileAName, fileBName, conflicts, resolvedConflicts, customResolvedValues);
  }

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
          if (!unique.some(u => isEqual(u, item))) {
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

  if (typeof valA === 'object' && typeof valB === 'object') {
    const objA = valA as JSONObject;
    const objB = valB as JSONObject;

    if (options.mode === 'shallow') {
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

    const result: JSONObject = { ...objA };
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

  if (valA === valB) {
    return valA;
  }

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
  const conflictRes = options.overwriteKeys ? options.conflictResolution : 'takeFirst';

  if (path in resolvedConflicts) {
    const choice = resolvedConflicts[path];
    if (choice === 'first') return valA;
    if (choice === 'second') return valB;
    if (choice === 'custom') {
      return path in customResolvedValues ? customResolvedValues[path] : valB;
    }
  }

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
    return valB;
  }

  if (conflictRes === 'takeFirst') {
    return valA;
  }

  if (conflictRes === 'takeLast') {
    return valB;
  }

  if (conflictRes === 'renameDuplicate') {
    if (parentObj && key) {
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
    return [valA, valB];
  }

  return valB;
}

addEventListener('message', ({ data }) => {
  const startTime = performance.now();
  const { files, options, resolvedConflicts, customResolvedValues } = data as {
    files: { name: string; content: string }[];
    options: MergeOptions;
    resolvedConflicts: Record<string, 'first' | 'second' | 'custom'>;
    customResolvedValues: Record<string, JSONValue>;
  };

  const logs: { id: string; timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }[] = [];
  const conflicts: JSONConflict[] = [];

  const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string) => {
    logs.push({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    });
  };

  addLog('info', `Starting merge process of ${files.length} files...`);

  if (files.length === 0) {
    postMessage({
      type: 'complete',
      success: false,
      error: 'No files provided for merge.',
      logs
    });
    return;
  }

  try {
    // Phase 1: Parsing
    const parsedFiles: { name: string; val: JSONValue; size: number }[] = [];
    let largestSize = 0;
    let smallestSize = Infinity;
    let largestName = '';
    let smallestName = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileSize = file.content.length; // rough estimate in characters/bytes

      postMessage({
        type: 'progress',
        percent: Math.round((i / files.length) * 40),
        message: `Parsing and validating ${file.name}...`
      });

      if (fileSize > largestSize) {
        largestSize = fileSize;
        largestName = file.name;
      }
      if (fileSize < smallestSize) {
        smallestSize = fileSize;
        smallestName = file.name;
      }

      try {
        const val = JSON.parse(file.content) as JSONValue;
        parsedFiles.push({ name: file.name, val, size: fileSize });
        addLog('success', `Parsed and validated ${file.name} successfully.`);
      } catch (e) {
        const err = e as Error;
        addLog('error', `Failed to parse ${file.name}: ${err.message}`);
        postMessage({
          type: 'complete',
          success: false,
          error: `JSON parsing failed in file "${file.name}": ${err.message}`,
          logs
        });
        return;
      }
    }

    // Phase 2: Sequential merging
    let currentResult: JSONValue = parsedFiles[0].val;
    let currentFileName = parsedFiles[0].name;

    for (let i = 1; i < parsedFiles.length; i++) {
      const nextFile = parsedFiles[i];
      const progressPercent = 40 + Math.round((i / parsedFiles.length) * 40);

      postMessage({
        type: 'progress',
        percent: progressPercent,
        message: `Merging ${currentFileName} with ${nextFile.name}...`
      });

      currentResult = mergeJSONValues(
        currentResult,
        nextFile.val,
        options,
        currentFileName,
        nextFile.name,
        conflicts,
        resolvedConflicts,
        customResolvedValues,
        'root'
      );

      currentFileName = `Merged(${currentFileName} + ${nextFile.name})`;
    }

    // Phase 3: Post-processing & formatting
    postMessage({
      type: 'progress',
      percent: 90,
      message: 'Generating stringified JSON and calculating stats...'
    });

    let finalResult = currentResult;
    if (options.sortKeys) {
      finalResult = sortJSONKeys(currentResult);
    }

    const mergedString = JSON.stringify(finalResult, null, 2);
    const stats = getJSONStats(finalResult);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    const statistics = {
      filesLoaded: files.length,
      mergedSize: mergedString.length,
      objectsCount: stats.objectCount,
      arraysCount: stats.arrayCount,
      propertiesCount: stats.keysCount,
      mergeDuration: duration,
      memoryEstimate: Math.round(mergedString.length * 2), // rough character to bytes estimation
      largestFile: largestName ? { name: largestName, size: largestSize } : null,
      smallestFile: smallestName ? { name: smallestName, size: smallestSize } : null,
      maxDepth: stats.maxDepth
    };

    addLog('success', `Successfully merged ${files.length} documents in ${duration}ms.`);
    if (conflicts.length > 0) {
      addLog('warn', `Found ${conflicts.length} conflict(s). Resolution: ${options.conflictResolution}.`);
    }

    postMessage({
      type: 'complete',
      success: true,
      mergedContent: mergedString,
      statistics,
      conflicts,
      logs
    });

  } catch (error) {
    const err = error as Error;
    addLog('error', `Fatal error during merge: ${err.message}`);
    postMessage({
      type: 'complete',
      success: false,
      error: `Merge process crashed: ${err.message}`,
      logs
    });
  }
});

function sortJSONKeys(val: JSONValue): JSONValue {
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
