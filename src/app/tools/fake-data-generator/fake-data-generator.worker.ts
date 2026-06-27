/// <reference lib="webworker" />

import { faker } from '@faker-js/faker';

addEventListener('message', ({ data }) => {
  const { schema, count } = data;
  if (!schema || !count) {
    postMessage({ error: 'Missing schema or record count.' });
    return;
  }

  try {
    faker.seed(schema.seed || 12345);
    const records: Record<string, unknown>[] = [];
    const fields = schema.fields || [];

    // Generate in batches and post progress
    const batchSize = Math.min(1000, count);
    for (let i = 0; i < count; i++) {
      const record: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.nullable && Math.random() * 100 < (f.properties?.nullPercentage || 0)) {
          record[f.name] = null;
          continue;
        }

        // Mock simple worker generator values
        let val: string | number | boolean | null = '';
        if (f.type === 'UUID') val = faker.string.uuid();
        else if (f.type === 'Email') val = faker.internet.email();
        else if (f.type === 'Username') val = faker.internet.username();
        else if (f.type === 'Phone') val = faker.phone.number();
        else if (f.type === 'Country') val = faker.location.country();
        else if (f.type === 'Price') val = parseFloat(faker.commerce.price({ min: f.properties?.min || 1, max: f.properties?.max || 1000 }));
        else if (f.type === 'Integer') val = faker.number.int({ min: f.properties?.min || 1, max: f.properties?.max || 1000 });
        else if (f.type === 'Boolean') val = faker.datatype.boolean({ probability: f.properties?.probability || 0.5 });
        else val = faker.string.alphanumeric(8);

        record[f.name] = val;
      }
      records.push(record);

      if ((i + 1) % batchSize === 0 || i === count - 1) {
        postMessage({
          progress: Math.round(((i + 1) / count) * 100),
          partialRecords: records.slice(-batchSize)
        });
      }
    }

    postMessage({ done: true, records });
  } catch (err) {
    postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
});
