/**
 * Index pending/failed PDFs into document_chunks (standalone, no Nest server).
 * Usage: node scripts/reindex-rag.mjs [applianceId]
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

config();

const applianceId = process.argv[2];
const CHUNK_SIZE = 1600;
const CHUNK_OVERLAP = 200;
const BATCH = 20;

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required in .env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appliancehub',
});

function chunkText(text) {
  const chunks = [];
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  let start = 0;
  while (start < normalised.length) {
    const end = Math.min(start + CHUNK_SIZE, normalised.length);
    const chunk = normalised.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    if (start >= normalised.length) break;
  }
  return chunks;
}

async function extractPdf(fileUrl) {
  const filePath = path.join('./uploads', path.basename(fileUrl));
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  return result.text ?? '';
}

async function embedBatch(texts) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

const sql = applianceId
  ? `SELECT id, appliance_id, file_url, name FROM documents
     WHERE appliance_id = ? AND mime_type = 'application/pdf'
     AND embedding_status IN ('pending','failed','processing')`
  : `SELECT id, appliance_id, file_url, name FROM documents
     WHERE mime_type = 'application/pdf'
     AND embedding_status IN ('pending','failed','processing')`;

const [docs] = await conn.query(sql, applianceId ? [applianceId] : []);

console.log(`Found ${docs.length} document(s) to index`);

for (const doc of docs) {
  console.log(`\n→ ${doc.name} (${doc.id})`);
  try {
    await conn.query(`UPDATE documents SET embedding_status = 'processing' WHERE id = ?`, [doc.id]);

    const text = await extractPdf(doc.file_url);
    if (text.trim().length < 20) {
      console.log('  skip: no extractable text');
      await conn.query(
        `UPDATE documents SET embedding_status = 'indexed', indexed_at = NOW() WHERE id = ?`,
        [doc.id],
      );
      continue;
    }

    const chunks = chunkText(text);
    console.log(`  chunks: ${chunks.length}`);

    await conn.query(`DELETE FROM document_chunks WHERE document_id = ?`, [doc.id]);

    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const embeddings = await embedBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        await conn.query(
          `INSERT INTO document_chunks (id, document_id, appliance_id, content, embedding, chunk_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            doc.id,
            doc.appliance_id,
            batch[j],
            JSON.stringify(embeddings[j]),
            i + j,
          ],
        );
      }
    }

    await conn.query(
      `UPDATE documents SET embedding_status = 'indexed', indexed_at = NOW() WHERE id = ?`,
      [doc.id],
    );
    console.log('  ✓ indexed');
  } catch (err) {
    console.error('  ✗ failed:', err.message);
    await conn.query(`UPDATE documents SET embedding_status = 'failed' WHERE id = ?`, [doc.id]);
  }
}

const [chunkCount] = await conn.query('SELECT COUNT(*) AS c FROM document_chunks');
console.log(`\nTotal chunks in DB: ${chunkCount[0].c}`);
await conn.end();
