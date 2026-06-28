import { ComparisonOptions, DiffItem, DiffNode, ValidationError, ComparisonStats, JSONValue } from './json-difference.interfaces';

// Helper to check if values are primitive
function isPrimitive(val: JSONValue | undefined): boolean {
  return val === null || typeof val !== 'object';
}

// Helper to determine accurate JS type
function getType(val: JSONValue | undefined): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

// Join JSON paths nicely
export function joinPath(parent: string, key: string | number): string {
  if (!parent) {
    return typeof key === 'number' ? `[${key}]` : key.toString();
  }
  return typeof key === 'number' ? `${parent}[${key}]` : `${parent}.${key}`;
}

export class JSONMetadataParser {
  private index = 0;
  private line = 1;
  private column = 1;
  private length = 0;
  errors: ValidationError[] = [];
  warnings: ValidationError[] = [];
  lineMap: Record<string, { startLine: number; endLine: number }> = {};
  objectsCount = 0;
  arraysCount = 0;
  propertiesCount = 0;

  constructor(private readonly source: string) {
    this.length = source.length;
  }

  parse(): { value: JSONValue; valid: boolean } {
    this.skipWhitespace();
    if (this.index >= this.length) {
      return { value: null, valid: false };
    }
    const value = this.parseValue('');
    this.skipWhitespace();
    if (this.index < this.length) {
      this.errors.push({
        line: this.line,
        column: this.column,
        message: 'Extra content at end of JSON input',
        type: 'syntax'
      });
    }
    const valid = this.errors.length === 0;
    return { value, valid };
  }

  private peek(): string {
    return this.index < this.length ? this.source[this.index] : '';
  }

  private next(): string {
    const char = this.peek();
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.index++;
    return char;
  }

  private skipWhitespace(): void {
    while (this.index < this.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.next();
      } else {
        break;
      }
    }
  }

  private parseValue(path: string): JSONValue {
    this.skipWhitespace();
    const char = this.peek();
    if (char === '{') {
      return this.parseObject(path);
    } else if (char === '[') {
      return this.parseArray(path);
    } else if (char === '"') {
      return this.parseString();
    } else if (char === '-' || (char >= '0' && char <= '9')) {
      return this.parseNumber();
    } else if (char === 't') {
      return this.parseLiteral('true', true);
    } else if (char === 'f') {
      return this.parseLiteral('false', false);
    } else if (char === 'n') {
      return this.parseLiteral('null', null);
    } else {
      this.errors.push({
        line: this.line,
        column: this.column,
        message: `Unexpected token '${char}'`,
        type: 'syntax'
      });
      this.next(); // Consume bad token
      return null;
    }
  }

  private parseObject(path: string): Record<string, JSONValue> {
    const obj: Record<string, JSONValue> = {};
    this.objectsCount++;
    this.next(); // consume '{'
    this.skipWhitespace();
    let first = true;
    while (this.index < this.length && this.peek() !== '}') {
      if (!first) {
        if (this.peek() === ',') {
          this.next();
          this.skipWhitespace();
          if (this.peek() === '}') {
            this.warnings.push({
              line: this.line,
              column: this.column,
              message: 'Trailing comma in object literal',
              type: 'trailing_comma'
            });
            break;
          }
        } else {
          this.errors.push({
            line: this.line,
            column: this.column,
            message: "Expected comma ',' or closing bracket '}' in object",
            type: 'syntax'
          });
          break;
        }
      }
      this.skipWhitespace();
      if (this.peek() === '}') {
        break;
      }
      const keyStartLine = this.line;
      let key = '';
      if (this.peek() === '"') {
        key = this.parseString();
      } else {
        this.errors.push({
          line: this.line,
          column: this.column,
          message: 'Expected double-quoted property name key',
          type: 'syntax'
        });
        key = this.recoverUnquotedKey();
      }
      this.propertiesCount++;
      this.skipWhitespace();
      if (this.peek() === ':') {
        this.next(); // consume ':'
      } else {
        this.errors.push({
          line: this.line,
          column: this.column,
          message: `Expected colon ':' after property key '${key}'`,
          type: 'syntax'
        });
      }
      this.skipWhitespace();
      const childPath = joinPath(path, key);
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        this.warnings.push({
          line: keyStartLine,
          column: 1,
          message: `Duplicate key detected: '${key}'`,
          type: 'duplicate_key'
        });
      }
      const valueStartLine = this.line;
      const val = this.parseValue(childPath);
      const valueEndLine = this.line;
      obj[key] = val;
      this.lineMap[childPath] = { startLine: valueStartLine, endLine: valueEndLine };
      first = false;
      this.skipWhitespace();
    }
    if (this.peek() === '}') {
      this.next(); // consume '}'
    } else {
      this.errors.push({
        line: this.line,
        column: this.column,
        message: "Expected closing bracket '}' at end of object",
        type: 'syntax'
      });
    }
    return obj;
  }

  private recoverUnquotedKey(): string {
    let key = '';
    while (this.index < this.length) {
      const char = this.peek();
      if (char === ':' || char === '}' || char === ',' || char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        break;
      }
      key += this.next();
    }
    return key;
  }

  private parseArray(path: string): JSONValue[] {
    const arr: JSONValue[] = [];
    this.arraysCount++;
    this.next(); // consume '['
    this.skipWhitespace();
    let index = 0;
    let first = true;
    while (this.index < this.length && this.peek() !== ']') {
      if (!first) {
        if (this.peek() === ',') {
          this.next();
          this.skipWhitespace();
          if (this.peek() === ']') {
            this.warnings.push({
              line: this.line,
              column: this.column,
              message: 'Trailing comma in array literal',
              type: 'trailing_comma'
            });
            break;
          }
        } else {
          this.errors.push({
            line: this.line,
            column: this.column,
            message: "Expected comma ',' or closing bracket ']' in array",
            type: 'syntax'
          });
          break;
        }
      }
      this.skipWhitespace();
      if (this.peek() === ']') {
        break;
      }
      const childPath = joinPath(path, index);
      const valueStartLine = this.line;
      const val = this.parseValue(childPath);
      const valueEndLine = this.line;
      arr.push(val);
      this.lineMap[childPath] = { startLine: valueStartLine, endLine: valueEndLine };
      index++;
      first = false;
      this.skipWhitespace();
    }
    if (this.peek() === ']') {
      this.next(); // consume ']'
    } else {
      this.errors.push({
        line: this.line,
        column: this.column,
        message: "Expected closing bracket ']' at end of array",
        type: 'syntax'
      });
    }
    return arr;
  }

  private parseString(): string {
    this.next(); // consume '"'
    let result = '';
    while (this.index < this.length) {
      const char = this.peek();
      if (char === '"') {
        this.next(); // consume '"'
        return result;
      } else if (char === '\\') {
        this.next(); // consume '\\'
        const escapeChar = this.next();
        switch (escapeChar) {
          case '"': result += '"'; break;
          case '\\': result += '\\'; break;
          case '/': result += '/'; break;
          case 'b': result += '\b'; break;
          case 'f': result += '\f'; break;
          case 'n': result += '\n'; break;
          case 'r': result += '\r'; break;
          case 't': result += '\t'; break;
          case 'u': {
            let hex = '';
            for (let i = 0; i < 4; i++) {
              hex += this.next();
            }
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              this.warnings.push({
                line: this.line,
                column: this.column,
                message: `Invalid unicode escape sequence '\\u${hex}'`,
                type: 'warning'
              });
            }
            result += String.fromCharCode(Number.parseInt(hex, 16));
            break;
          }
          default:
            result += escapeChar;
        }
      } else if (char === '\n') {
        this.errors.push({
          line: this.line,
          column: this.column,
          message: 'Unescaped newline inside string literal',
          type: 'syntax'
        });
        result += this.next();
      } else {
        result += this.next();
      }
    }
    this.errors.push({
      line: this.line,
      column: this.column,
      message: 'Unterminated string literal',
      type: 'syntax'
    });
    return result;
  }

  private parseNumber(): number {
    let numStr = '';
    if (this.peek() === '-') {
      numStr += this.next();
    }
    while (this.index < this.length && /[0-9.eE+-]/.test(this.peek())) {
      numStr += this.next();
    }
    const val = parseFloat(numStr);
    if (isNaN(val)) {
      this.errors.push({
        line: this.line,
        column: this.column,
        message: `Invalid numeric literal '${numStr}'`,
        type: 'syntax'
      });
      return 0;
    }
    return val;
  }

  private parseLiteral(expected: string, val: JSONValue): JSONValue {
    for (const char of expected) {
      if (this.next() !== char) {
        this.errors.push({
          line: this.line,
          column: this.column,
          message: `Expected literal token '${expected}'`,
          type: 'syntax'
        });
        return val;
      }
    }
    return val;
  }
}

// Custom Deep Compare Engine
export function performJSONComparison(
  left: JSONValue,
  right: JSONValue,
  options: ComparisonOptions,
  leftLineMap: Record<string, { startLine: number; endLine: number }>,
  rightLineMap: Record<string, { startLine: number; endLine: number }>
): { diffs: DiffItem[]; tree: DiffNode; stats: Partial<ComparisonStats> } {
  const diffs: DiffItem[] = [];
  let diffId = 1;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let movedCount = 0;
  let equalCount = 0;
  const ignoredCount = 0;

  function addDiff(
    path: string,
    type: 'added' | 'removed' | 'modified' | 'moved',
    oldVal: JSONValue | undefined,
    newVal: JSONValue | undefined,
    msg: string
  ) {
    const leftLines = leftLineMap[path] || { startLine: 1, endLine: 1 };
    const rightLines = rightLineMap[path] || { startLine: 1, endLine: 1 };
    
    const diff: DiffItem = {
      id: diffId++,
      path,
      type,
      oldValue: oldVal,
      newValue: newVal,
      leftLineStart: leftLines.startLine,
      leftLineEnd: leftLines.endLine,
      rightLineStart: rightLines.startLine,
      rightLineEnd: rightLines.endLine,
      severity: type === 'removed' ? 'error' : type === 'added' ? 'info' : 'warning',
      message: msg
    };
    diffs.push(diff);

    if (type === 'added') addedCount++;
    else if (type === 'removed') removedCount++;
    else if (type === 'modified') modifiedCount++;
    else if (type === 'moved') movedCount++;

    return diff.id;
  }

  // Deep comparison recursion
  function compare(lVal: JSONValue | undefined, rVal: JSONValue | undefined, path: string): 'added' | 'removed' | 'modified' | 'moved' | 'none' {
    // 1. Missing vs Null setting check
    if (options.ignoreNullVsMissing) {
      if ((lVal === undefined || lVal === null) && (rVal === undefined || rVal === null)) {
        equalCount++;
        return 'none';
      }
    }

    if (lVal === undefined && rVal !== undefined) {
      addDiff(path, 'added', undefined, rVal, `Property '${path}' was added.`);
      return 'added';
    }
    if (lVal !== undefined && rVal === undefined) {
      addDiff(path, 'removed', lVal, undefined, `Property '${path}' was removed.`);
      return 'removed';
    }

    const lType = getType(lVal);
    const rType = getType(rVal);

    // 2. Strict Type Comparison Check
    if (options.strictTypeComparison && lType !== rType) {
      addDiff(
        path,
        'modified',
        lVal,
        rVal,
        `Type changed from '${lType}' to '${rType}' at '${path}'.`
      );
      return 'modified';
    }

    // 3. Primitive Comparison
    if (isPrimitive(lVal) || isPrimitive(rVal)) {
      let equal = false;
      
      let lCompare = lVal;
      let rCompare = rVal;

      if (!options.strictTypeComparison) {
        // Coerce to strings for loose typing comparison
        lCompare = String(lVal);
        rCompare = String(rVal);
      }

      if (typeof lCompare === 'string' && typeof rCompare === 'string') {
        let sL = lCompare;
        let sR = rCompare;
        if (options.ignoreWhitespace) {
          sL = sL.replace(/\s+/g, '');
          sR = sR.replace(/\s+/g, '');
        }
        if (options.ignoreStringValueCase) {
          sL = sL.toLowerCase();
          sR = sR.toLowerCase();
        }
        equal = sL === sR;
      } else if (typeof lCompare === 'number' && typeof rCompare === 'number') {
        if (options.ignoreNumericPrecision) {
          equal = Math.abs(lCompare - rCompare) < 1e-9;
        } else {
          equal = lCompare === rCompare;
        }
      } else {
        equal = lCompare === rCompare;
      }

      if (equal) {
        equalCount++;
        return 'none';
      } else {
        addDiff(
          path,
          'modified',
          lVal,
          rVal,
          `Value changed from '${JSON.stringify(lVal)}' to '${JSON.stringify(rVal)}'.`
        );
        return 'modified';
      }
    }

    // 4. Array Comparison
    if (lType === 'array' && rType === 'array') {
      const lArr = lVal as JSONValue[];
      const rArr = rVal as JSONValue[];
      let nodeType: 'added' | 'removed' | 'modified' | 'moved' | 'none' = 'none';

      if (options.ignoreArrayOrder) {
        // Attempt match items in different positions
        const matchedRight = new Set<number>();
        const matchedLeft = new Set<number>();

        // Match identical matches first
        for (let i = 0; i < lArr.length; i++) {
          for (let j = 0; j < rArr.length; j++) {
            if (matchedRight.has(j)) continue;
            // Strict deeply equal comparison of the objects
            if (JSON.stringify(lArr[i]) === JSON.stringify(rArr[j])) {
              matchedRight.add(j);
              matchedLeft.add(i);
              if (i !== j) {
                // Moved!
                const childPath = joinPath(path, j);
                addDiff(
                  childPath,
                  'moved',
                  lArr[i],
                  rArr[j],
                  `Element moved from index ${i} to ${j}.`
                );
                nodeType = 'modified';
              } else {
                equalCount++;
              }
              break;
            }
          }
        }

        // Compare remaining indices
        for (let i = 0; i < lArr.length; i++) {
          if (matchedLeft.has(i)) continue;
          // Find first unmatched in right to compare and report modified
          let matchedAny = false;
          for (let j = 0; j < rArr.length; j++) {
            if (matchedRight.has(j)) continue;
            // Treat as modified/matched but in different place
            const childPath = joinPath(path, j);
            compare(lArr[i], rArr[j], childPath);
            matchedRight.add(j);
            matchedLeft.add(i);
            matchedAny = true;
            nodeType = 'modified';
            break;
          }
          if (!matchedAny) {
            const childPath = joinPath(path, `[left_${i}]`);
            addDiff(childPath, 'removed', lArr[i], undefined, `Array item removed.`);
            nodeType = 'modified';
          }
        }

        for (let j = 0; j < rArr.length; j++) {
          if (matchedRight.has(j)) continue;
          const childPath = joinPath(path, j);
          addDiff(childPath, 'added', undefined, rArr[j], `Array item added.`);
          nodeType = 'modified';
        }

      } else {
        // Compare elements index-by-index
        const maxLen = Math.max(lArr.length, rArr.length);
        for (let i = 0; i < maxLen; i++) {
          const childPath = joinPath(path, i);
          const childType = compare(lArr[i], rArr[i], childPath);
          if (childType !== 'none') {
            nodeType = 'modified';
          }
        }
      }
      return nodeType;
    }

    // 5. Object Comparison
    if (lType === 'object' && rType === 'object') {
      const lObj = lVal as Record<string, JSONValue>;
      const rObj = rVal as Record<string, JSONValue>;
      const lKeysOrg = Object.keys(lObj);
      const rKeysOrg = Object.keys(rObj);

      let lKeys = lKeysOrg;
      let rKeys = rKeysOrg;

      // Handle Key Case and Order Options
      if (options.ignorePropertyOrder) {
        lKeys = [...lKeysOrg].sort();
        rKeys = [...rKeysOrg].sort();
      }

      const lKeyMap = new Map<string, string>();
      const rKeyMap = new Map<string, string>();

      lKeys.forEach(k => lKeyMap.set(options.ignoreKeyCase ? k.toLowerCase() : k, k));
      rKeys.forEach(k => rKeyMap.set(options.ignoreKeyCase ? k.toLowerCase() : k, k));

      const allNormalizedKeys = Array.from(new Set([...lKeyMap.keys(), ...rKeyMap.keys()]));
      if (options.ignorePropertyOrder) {
        allNormalizedKeys.sort();
      }

      let nodeType: 'added' | 'removed' | 'modified' | 'moved' | 'none' = 'none';

      for (const normKey of allNormalizedKeys) {
        const orgLKey = lKeyMap.get(normKey);
        const orgRKey = rKeyMap.get(normKey);

        const childPath = joinPath(path, orgRKey || orgLKey || normKey);

        if (orgLKey !== undefined && orgRKey !== undefined) {
          // Exists in both, compare recursively
          const childType = compare(lObj[orgLKey], rObj[orgRKey], childPath);
          if (childType !== 'none') {
            nodeType = 'modified';
          }
        } else if (orgLKey !== undefined) {
          // Removed
          addDiff(childPath, 'removed', lObj[orgLKey], undefined, `Property '${orgLKey}' was removed.`);
          nodeType = 'modified';
        } else if (orgRKey !== undefined) {
          // Added
          addDiff(childPath, 'added', undefined, rObj[orgRKey], `Property '${orgRKey}' was added.`);
          nodeType = 'modified';
        }
      }
      return nodeType;
    }

    return 'none';
  }

  // Kick off comparison on root objects
  compare(left, right, '');

  // 6. Build Collapsible Difference Tree
  const rootNode: DiffNode = {
    key: 'root',
    path: '',
    type: diffs.length > 0 ? 'modified' : 'none',
    children: []
  };

  // Build tree nodes for every path
  const pathMap = new Map<string, DiffNode>();
  pathMap.set('', rootNode);

  // Helper to ensure parent nodes exist and link children properly
  function getOrCreateNode(path: string): DiffNode {
    if (pathMap.has(path)) return pathMap.get(path)!;

    // Parse out key and parent path
    let parentPath = '';
    let key = path;

    const lastDot = path.lastIndexOf('.');
    const lastBracket = path.lastIndexOf('[');

    if (lastDot > lastBracket && lastDot !== -1) {
      parentPath = path.slice(0, lastDot);
      key = path.slice(lastDot + 1);
    } else if (lastBracket !== -1) {
      parentPath = path.slice(0, lastBracket);
      key = path.slice(lastBracket);
    }

    const parentNode = getOrCreateNode(parentPath);
    const node: DiffNode = {
      key,
      path,
      type: 'none',
      children: []
    };

    parentNode.children = parentNode.children || [];
    parentNode.children.push(node);
    pathMap.set(path, node);
    return node;
  }

  // Populate actual differences into the tree
  diffs.forEach(diff => {
    const node = getOrCreateNode(diff.path);
    node.type = diff.type;
    node.diffItemId = diff.id;

    // Propagate "modified" state upwards for parent branches
    let parentPath = diff.path;
    while (true) {
      const lastDot = parentPath.lastIndexOf('.');
      const lastBracket = parentPath.lastIndexOf('[');
      let nextParent = '';
      if (lastDot > lastBracket && lastDot !== -1) {
        nextParent = parentPath.slice(0, lastDot);
      } else if (lastBracket !== -1) {
        nextParent = parentPath.slice(0, lastBracket);
      } else {
        break;
      }
      const pNode = pathMap.get(nextParent);
      if (pNode && pNode.type === 'none') {
        pNode.type = 'modified';
      }
      parentPath = nextParent;
    }
  });

  // If "differencesOnly" is enabled, clean/prune unchanged branches
  if (options.differencesOnly) {
    function pruneTree(node: DiffNode): boolean {
      if (node.type !== 'none' && node.type !== 'modified') {
        return true; // Keep modified leaves, added, removed, moved
      }
      if (node.children && node.children.length > 0) {
        node.children = node.children.filter(pruneTree);
        return node.children.length > 0;
      }
      return false;
    }
    rootNode.children = rootNode.children?.filter(pruneTree) || [];
  }

  // Sort children alphabetically/numerically for a neat visual display
  function sortTreeNodes(node: DiffNode) {
    if (node.children && node.children.length > 1) {
      node.children.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
    }
    if (node.children) {
      node.children.forEach(sortTreeNodes);
    }
  }
  sortTreeNodes(rootNode);

  // Calculate statistics
  const matchCount = equalCount;
  const similarity = Math.max(0, Math.min(100, Math.round((matchCount / (matchCount + diffs.length || 1)) * 100)));

  const stats: Partial<ComparisonStats> = {
    totalDiffs: diffs.length,
    added: addedCount,
    removed: removedCount,
    modified: modifiedCount,
    moved: movedCount,
    equal: equalCount,
    ignored: ignoredCount,
    similarityPercentage: similarity,
  };

  return { diffs, tree: rootNode, stats };
}
