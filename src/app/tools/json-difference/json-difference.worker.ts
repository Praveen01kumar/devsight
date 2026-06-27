/// <reference lib='webworker' />

import { DiffItem, DiffNode, ComparisonStats } from './json-difference.interfaces';
import { JSONMetadataParser, performJSONComparison } from './json-difference.utils';

addEventListener('message', ({ data }) => {
  const startTime = performance.now();
  const { task, leftJSON, rightJSON, options, leftFilename, rightFilename, leftSize, rightSize } = data;

  if (task === 'compare') {
    try {
      // 1. Parse and gather metadata for Left JSON
      const leftParser = new JSONMetadataParser(leftJSON || '{}');
      const leftResult = leftParser.parse();

      // 2. Parse and gather metadata for Right JSON
      const rightParser = new JSONMetadataParser(rightJSON || '{}');
      const rightResult = rightParser.parse();

      const parseTime = performance.now();

      // 3. Build file statistics
      const leftLinesCount = leftJSON ? leftJSON.split('\n').length : 0;
      const rightLinesCount = rightJSON ? rightJSON.split('\n').length : 0;

      const leftStats = {
        filename: leftFilename || 'Left Document',
        fileSize: leftSize || (leftJSON ? leftJSON.length : 0),
        objectsCount: leftParser.objectsCount,
        arraysCount: leftParser.arraysCount,
        propertiesCount: leftParser.propertiesCount,
        linesCount: leftLinesCount,
        charactersCount: leftJSON ? leftJSON.length : 0,
        validationStatus: (leftResult.valid ? (leftParser.warnings.length > 0 ? 'warning' : 'valid') : 'invalid') as 'valid' | 'invalid' | 'warning' | 'empty'
      };

      const rightStats = {
        filename: rightFilename || 'Right Document',
        fileSize: rightSize || (rightJSON ? rightJSON.length : 0),
        objectsCount: rightParser.objectsCount,
        arraysCount: rightParser.arraysCount,
        propertiesCount: rightParser.propertiesCount,
        linesCount: rightLinesCount,
        charactersCount: rightJSON ? rightJSON.length : 0,
        validationStatus: (rightResult.valid ? (rightParser.warnings.length > 0 ? 'warning' : 'valid') : 'invalid') as 'valid' | 'invalid' | 'warning' | 'empty'
      };

      // 4. Run Diff Comparison if both parsed values exist
      let diffs: DiffItem[] = [];
      let tree: DiffNode = { key: 'root', path: '', type: 'none', children: [] };
      let compareStats: ComparisonStats = {
        totalDiffs: 0,
        added: 0,
        removed: 0,
        modified: 0,
        moved: 0,
        equal: 0,
        ignored: 0,
        similarityPercentage: 100,
        comparisonTime: 0,
        workerTime: 0,
        memoryEstimate: 0,
        leftStats,
        rightStats
      };

      if (leftResult.valid && rightResult.valid) {
        const compareResult = performJSONComparison(
          leftResult.value,
          rightResult.value,
          options,
          leftParser.lineMap,
          rightParser.lineMap
        );

        diffs = compareResult.diffs;
        tree = compareResult.tree;
        const workerTime = performance.now() - startTime;
        const memoryEstimate = estimateSizeInBytes(diffs) + estimateSizeInBytes(tree);
        compareStats = { ...compareStats, ...compareResult.stats, comparisonTime: performance.now() - parseTime, workerTime, memoryEstimate, leftStats, rightStats } as ComparisonStats;
      }

      postMessage({
        success: true,
        leftValid: leftResult.valid,
        leftErrors: leftParser.errors,
        leftWarnings: leftParser.warnings,
        leftLineMap: leftParser.lineMap,
        rightValid: rightResult.valid,
        rightErrors: rightParser.errors,
        rightWarnings: rightParser.warnings,
        rightLineMap: rightParser.lineMap,
        diffs,
        tree,
        stats: compareStats
      });
    } catch (err: unknown) {
      const e = err as Error;
      postMessage({
        success: false,
        error: e.message || 'Comparison failed inside Web Worker.'
      });
    }
  } else if (task === 'validate') {
    try {
      const parser = new JSONMetadataParser(leftJSON || '');
      const result = parser.parse();
      const linesCount = leftJSON ? leftJSON.split('\n').length : 0;

      postMessage({
        success: true,
        valid: result.valid,
        errors: parser.errors,
        warnings: parser.warnings,
        stats: {
          objectsCount: parser.objectsCount,
          arraysCount: parser.arraysCount,
          propertiesCount: parser.propertiesCount,
          linesCount,
          charactersCount: leftJSON ? leftJSON.length : 0
        }
      });
    } catch (err: unknown) {
      const e = err as Error;
      postMessage({
        success: false,
        error: e.message || 'Validation failed inside Web Worker.'
      });
    }
  }
});

// Simple memory footprint estimator for objects
function estimateSizeInBytes(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;
  switch (typeof obj) {
    case 'number': return 8;
    case 'string': return obj.length * 2;
    case 'boolean': return 4;
    case 'object':
      if (Array.isArray(obj)) {
        return obj.reduce((sum: number, item: unknown) => sum + estimateSizeInBytes(item), 0);
      } else {
        let bytes = 0;
        const record = obj as Record<string, unknown>;
        for (const key in record) {
          if (Object.prototype.hasOwnProperty.call(record, key)) {
            bytes += key.length * 2 + estimateSizeInBytes(record[key]);
          }
        }
        return bytes;
      }
    default: return 0;
  }
}
