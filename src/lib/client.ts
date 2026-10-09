let csrfToken: string | undefined;
let csrfExpires = 0;
let csrfRequest: Promise<string> | undefined;
const pendingReads = new Map<string, Promise<unknown>>();

async function getCsrfToken() {
  if (csrfToken && Date.now() < csrfExpires) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetch('/api/csrf', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to verify your session. Please try again.');
      const { token } = (await response.json()) as { token: string };
      csrfToken = token;
      csrfExpires = Date.now() + 10 * 60000;
      return token;
    })().finally(() => {
      csrfRequest = undefined;
    });
  }
  return csrfRequest;
}

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const options: RequestInit = { cache: 'no-store' };
  options.signal = signal;
  if (body !== undefined) {
    const token = await getCsrfToken();
    options.method = 'POST';
    options.headers = { 'Content-Type': 'application/json', 'x-csrf-token': token };
    options.body = JSON.stringify(body);
  }
  const response = await fetch('/api/store/' + path, options);
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = typeof data === 'object' && data !== null && 'error' in data ? data.error : null;
    if (response.status === 403) {
      csrfToken = undefined;
      csrfExpires = 0;
    }
    throw new Error(typeof error === 'string' ? error : 'Please try again.');
  }
  if (body !== undefined) {
    pendingReads.clear();
    if (path.startsWith('auth/')) {
      csrfToken = undefined;
      csrfExpires = 0;
      window.dispatchEvent(new Event('orven-auth-changed'));
    }
  }
  return data as T;
}

export function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (body !== undefined || signal) return request<T>(path, body, signal);
  const pending = pendingReads.get(path);
  if (pending) return pending as Promise<T>;
  const read = request<T>(path).finally(() => {
    if (pendingReads.get(path) === read) pendingReads.delete(path);
  });
  pendingReads.set(path, read);
  return read;
}

export async function uploadProductImage(file: File): Promise<{ url: string }> {
  const response = await fetch('/api/admin/product-image', {
    method: 'POST',
    headers: { 'x-csrf-token': await getCsrfToken() },
    body: (() => {
      const form = new FormData();
      form.set('file', file);
      return form;
    })(),
    cache: 'no-store',
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    if (response.status === 403) {
      csrfToken = undefined;
      csrfExpires = 0;
    }
    throw new Error(data.error || 'The image could not be uploaded. Please try again.');
  }
  return { url: data.url };
}
