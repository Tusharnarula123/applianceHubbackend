/**
 * Catalogue import helpers: a small RFC 4180 CSV parser and column-mapping
 * guesses for Scana's canonical product fields.
 */

export type CatalogField = 'name' | 'model' | 'sku' | 'category' | 'description' | 'image_url' | 'ean' | 'aliases' | 'region';

export const CATALOG_FIELDS: Array<{ key: CatalogField; label: string; required: boolean; hint: string }> = [
  { key: 'name',        label: 'Product name',  required: true,  hint: 'e.g. Front Load Washer 8kg' },
  { key: 'model',       label: 'Model number',  required: true,  hint: 'Manufacturer model, used for matching' },
  { key: 'sku',         label: 'SKU',           required: false, hint: 'Defaults to the model number' },
  { key: 'category',    label: 'Category',      required: false, hint: 'Refrigerator, Washing Machine…' },
  { key: 'description', label: 'Description',   required: false, hint: '' },
  { key: 'image_url',   label: 'Image URL',     required: false, hint: 'Product photo' },
  { key: 'ean',         label: 'EAN / UPC',     required: false, hint: 'Barcode number' },
  { key: 'aliases',     label: 'Other model codes', required: false, hint: 'Separate with ; — regional or retailer variants' },
  { key: 'region',      label: 'Region',        required: false, hint: 'e.g. IN, EU, US' },
];

const SYNONYMS: Record<CatalogField, string[]> = {
  name:        ['name', 'product name', 'product', 'title', 'product title', 'description short'],
  model:       ['model', 'model number', 'model no', 'model_no', 'model_number', 'mpn', 'manufacturer part number', 'model code'],
  sku:         ['sku', 'item code', 'article', 'article number', 'item number'],
  category:    ['category', 'product category', 'type', 'product type', 'family'],
  description: ['description', 'long description', 'details', 'summary'],
  image_url:   ['image', 'image url', 'image_url', 'photo', 'picture', 'thumbnail'],
  ean:         ['ean', 'upc', 'gtin', 'barcode', 'ean13'],
  aliases:     ['aliases', 'alias', 'other models', 'alternate models', 'variants'],
  region:      ['region', 'market', 'country'],
};

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function guessMapping(headers: string[]): Partial<Record<CatalogField, string>> {
  const out: Partial<Record<CatalogField, string>> = {};
  const used = new Set<string>();
  for (const field of Object.keys(SYNONYMS) as CatalogField[]) {
    const hit = headers.find((h) => !used.has(h) && SYNONYMS[field].includes(simplify(h)));
    if (hit) { out[field] = hit; used.add(hit); }
  }
  return out;
}

/** "WF45T-6000AW " → "WF45T6000AW" */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Parses CSV with quoted fields, escaped quotes and CRLF line endings. Detects ; and tab delimiters. */
export function parseCsv(text: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((v) => v.trim() !== '')) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((v) => v.trim() !== '')) records.push(record);

  const [head = [], ...body] = records;
  const headers = head.map((h, i) => h.trim() || `Column ${i + 1}`);
  const rows = body.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}
