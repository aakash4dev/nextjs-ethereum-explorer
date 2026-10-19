import { HttpError } from './validation.js';

/** Bound request memory before parsing JSON or multipart form fields. */
export async function readBody(req, { maxBytes = 6_000_000 } = {}) {
  const declared = Number(req.headers.get('content-length'));
  if (declared > maxBytes) throw new HttpError(413, 'Request body too large');
  const reader = req.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new HttpError(413, 'Request body too large');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new HttpError(400, 'Invalid JSON body');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'JSON body must be an object');
    return data;
  }
  if (type.includes('form')) {
    try {
      const buffered = new Request(req.url, { method: 'POST', headers: req.headers, body: bytes });
      return Object.fromEntries((await buffered.formData()).entries());
    } catch {
      throw new HttpError(400, 'Invalid form body');
    }
  }
  throw new HttpError(415, 'Use application/json or form data');
}
