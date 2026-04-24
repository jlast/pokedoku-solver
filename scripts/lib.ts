import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry<T>(url: string, retries: number = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) { await delay(2000); continue; }
      return await r.json() as T;
    } catch { await delay(500); }
  }
  return null;
}

export function loadJson<T>(dir: string, id: number): T | null {
  const f = path.join(dir, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

export function saveJson<T>(dir: string, id: number, data: T) {
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(data));
}

export async function ensureFileExists(dir: string, fileName: string, fileDownloadUrl: string) {
  const filePath = path.join(dir, fileName);
  if(fs.existsSync(filePath) || !fileDownloadUrl) { return; }
  ensureDir(dir);
  const response = await fetch(fileDownloadUrl);
  const stream = fs.createWriteStream(filePath);
  await finished(Readable.fromWeb(response.body).pipe(stream));
}