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
  const maxFileSize = 8 * 1024 * 1024;
  if (!file.size || file.size > maxFileSize) throw new Error('Choose an image smaller than 8 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Use a JPEG, PNG, or WebP image.');

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
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  const data = contentType.includes('application/json')
    ? ((await response.json().catch(() => null)) as { url?: string; error?: string } | null)
    : null;
  if (!response.ok || !data?.url) {
    if (response.status === 403) {
      csrfToken = undefined;
      csrfExpires = 0;
    }
    const fallback = response.ok
      ? 'The upload service returned an unexpected response. Refresh the page and try again.'
      : response.status === 403
        ? 'Your session needs refreshing. Reload the page and try again.'
        : response.status === 413
          ? 'The server rejected this image as too large. Choose a smaller file and try again.'
          : response.status === 404 || response.status === 405
            ? 'The image upload service is unavailable. Refresh the page and try again.'
            : `Image upload failed (HTTP ${response.status}). Check the storage setup and try again.`;
    throw new Error(data?.error || fallback);
  }
  return { url: data.url };
}
