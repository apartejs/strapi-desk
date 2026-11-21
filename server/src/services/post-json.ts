import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/**
 * One JSON request, answered as a status and a text. Node's own fetch where it has one (18 and
 * later); Strapi 4.0 runs on Node 12 to 16, which has none, and there it goes through node:http.
 */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<{ ok: boolean; status: number; text: string }> {
  const payload = JSON.stringify(body);
  if (typeof globalThis.fetch === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await globalThis.fetch(url, { method: 'POST', headers, body: payload, signal: controller.signal });
      return { ok: response.ok, status: response.status, text: await response.text() };
    } finally {
      clearTimeout(timer);
    }
  }
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(target, { method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }, timeout: timeoutMs }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (text += chunk));
      res.on('end', () => resolve({ ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300, status: res.statusCode ?? 0, text }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`No answer after ${timeoutMs} ms`)));
    req.on('error', reject);
    req.end(payload);
  });
}
