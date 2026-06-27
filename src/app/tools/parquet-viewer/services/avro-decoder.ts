/* eslint-disable @typescript-eslint/no-explicit-any */
class BinaryReader {
  private view: DataView;
  public pos = 0;

  constructor(public buf: Uint8Array) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  hasMore(): boolean {
    return this.pos < this.buf.length;
  }

  readBytes(len: number): Uint8Array {
    const res = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return res;
  }

  readLong(): number {
    let value = 0;
    let shift = 0;
    while (true) {
      if (this.pos >= this.buf.length) {
        break;
      }
      const b = this.buf[this.pos++];
      value |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
      if (shift >= 64) throw new Error('Varint too long');
    }
    // Decode zigzag
    return (value >>> 1) ^ -(value & 1);
  }

  readFloat(): number {
    const res = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return res;
  }

  readDouble(): number {
    const res = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return res;
  }

  readString(): string {
    const len = this.readLong();
    const bytes = this.readBytes(len);
    return new TextDecoder().decode(bytes);
  }
}

function decodeType(type: any, reader: BinaryReader): any {
  if (type === 'null') {
    return null;
  }
  if (type === 'boolean') {
    return reader.readBytes(1)[0] !== 0;
  }
  if (type === 'int' || type === 'long') {
    return reader.readLong();
  }
  if (type === 'float') {
    return reader.readFloat();
  }
  if (type === 'double') {
    return reader.readDouble();
  }
  if (type === 'bytes') {
    const len = reader.readLong();
    const bytes = reader.readBytes(len);
    return `[Binary: ${bytes.length} bytes]`;
  }
  if (type === 'string') {
    return reader.readString();
  }

  // Handle union types: e.g., ["null", "string"] or ["null", {"type": "record", ...}]
  if (Array.isArray(type)) {
    const unionIndex = reader.readLong();
    const selectedType = type[unionIndex];
    return decodeType(selectedType, reader);
  }

  // Handle complex types
  if (typeof type === 'object' && type !== null) {
    if (type.type === 'record') {
      const rec: any = {};
      for (const field of type.fields) {
        rec[field.name] = decodeType(field.type, reader);
      }
      return rec;
    }
    if (type.type === 'array') {
      const arr: any[] = [];
      let blockCount = reader.readLong();
      while (blockCount !== 0) {
        if (blockCount < 0) {
          blockCount = -blockCount;
          reader.readLong(); // ignore block size
        }
        for (let i = 0; i < blockCount; i++) {
          arr.push(decodeType(type.items, reader));
        }
        blockCount = reader.readLong();
      }
      return arr;
    }
    if (type.type === 'map') {
      const map: Record<string, any> = {};
      let blockCount = reader.readLong();
      while (blockCount !== 0) {
        if (blockCount < 0) {
          blockCount = -blockCount;
          reader.readLong(); // ignore block size
        }
        for (let i = 0; i < blockCount; i++) {
          const key = reader.readString();
          map[key] = decodeType(type.values, reader);
        }
        blockCount = reader.readLong();
      }
      return map;
    }
    if (type.type === 'enum') {
      const index = reader.readLong();
      return type.symbols[index] || index;
    }
    if (type.type === 'fixed') {
      const bytes = reader.readBytes(type.size);
      return `[Fixed: ${bytes.length} bytes]`;
    }
    
    // Wrapped or aliased types
    if (type.type) {
      return decodeType(type.type, reader);
    }
  }

  return null;
}

export function parseAvroOCF(arrayBuffer: ArrayBuffer): any[] {
  const buf = new Uint8Array(arrayBuffer);
  const reader = new BinaryReader(buf);

  // 1. Verify Magic: 'Obj\x01'
  const magic = reader.readBytes(4);
  if (magic[0] !== 0x4f || magic[1] !== 0x62 || magic[2] !== 0x6a || magic[3] !== 0x01) {
    throw new Error('Not a valid Apache Avro Object Container File (OCF)');
  }

  // 2. Read Metadata Map
  const metadata: Record<string, string> = {};
  let blockCount = reader.readLong();
  while (blockCount !== 0) {
    if (blockCount < 0) {
      blockCount = -blockCount;
      reader.readLong(); // ignore length in bytes
    }
    for (let i = 0; i < blockCount; i++) {
      const key = reader.readString();
      const len = reader.readLong();
      const valBytes = reader.readBytes(len);
      metadata[key] = new TextDecoder().decode(valBytes);
    }
    blockCount = reader.readLong();
  }

  const schemaStr = metadata['avro.schema'];
  if (!schemaStr) {
    throw new Error('Avro schema not found in file header');
  }

  const codec = metadata['avro.codec'] || 'null';
  if (codec !== 'null') {
    throw new Error(`Avro codec "${codec}" is not supported in this client-side parser. Only uncompressed Avro is supported.`);
  }

  // 3. Sync Marker
  const syncMarker = reader.readBytes(16);

  // 4. Read Data Blocks
  const schema = JSON.parse(schemaStr);
  const records: any[] = [];

  while (reader.hasMore()) {
    const objectCount = reader.readLong();
    const blockSize = reader.readLong();

    const blockBytes = reader.readBytes(blockSize);
    const blockReader = new BinaryReader(blockBytes);

    for (let i = 0; i < objectCount; i++) {
      records.push(decodeType(schema, blockReader));
    }

    // Read and verify block sync marker
    const marker = reader.readBytes(16);
    let syncMatches = true;
    for (let k = 0; k < 16; k++) {
      if (marker[k] !== syncMarker[k]) {
        syncMatches = false;
        break;
      }
    }
    if (!syncMatches) {
      console.warn('Warning: sync marker mismatch at end of Avro block');
    }
  }

  return records;
}
