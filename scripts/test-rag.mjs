/**
 * Quick RAG smoke test: PDF extract
 * Usage: node scripts/test-rag.mjs [documentId]
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import mysql from 'mysql2/promise';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

config();

const documentId = process.argv[2];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appliancehub',
});

const [docs] = await conn.query(
  documentId
    ? 'SELECT id, name, file_url, embedding_status FROM documents WHERE id = ?'
    : 'SELECT id, name, file_url, embedding_status FROM documents WHERE mime_type = ? ORDER BY created_at DESC LIMIT 1',
  documentId ? [documentId] : ['application/pdf'],
);

if (!docs.length) {
  console.log('No PDF documents found.');
  await conn.end();
  process.exit(1);
}

const doc = docs[0];
const filePath = path.join('./uploads', path.basename(doc.file_url));

console.log('Document:', doc.id, doc.name, 'status:', doc.embedding_status);
console.log('File:', filePath, 'exists:', fs.existsSync(filePath));

if (!fs.existsSync(filePath)) {
  console.error('PDF file missing on disk');
  await conn.end();
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const result = await pdfParse(buffer);
const text = result.text ?? '';

console.log('Extracted chars:', text.length);
console.log('Sample:', text.slice(0, 200).replace(/\s+/g, ' '));

if (text.length < 20) {
  console.error('RAG extract: FAIL');
  await conn.end();
  process.exit(1);
}

console.log('RAG extract: OK');
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY missing — indexing will fail until set');
} else {
  console.log('Next: npm run rag:reindex');
}

await conn.end();
