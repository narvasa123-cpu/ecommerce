type SupabaseAuthErrorBody = {
  msg?: string;
  message?: string;
  error_description?: string;
  error?: string;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: { name?: string };
  identities?: Array<unknown> | null;
  user?: SupabaseAuthUser;
  access_token?: string;
};

export class SupabaseAuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new SupabaseAuthError('Email confirmation is not configured yet.', 503);
  return { url, key };
}

export async function supabaseAuth<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    body?: unknown;
    accessToken?: string;
  } = {},
): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    cache: 'no-store',
    headers: {
      apikey: key,
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = (await response.json().catch(() => ({}))) as SupabaseAuthErrorBody;
  if (!response.ok) {
    throw new SupabaseAuthError(
      payload.msg ||
        payload.message ||
        payload.error_description ||
        payload.error ||
        'Auth request failed.',
      response.status,
    );
  }
  return payload as T;
}

export function supabaseAuthRedirect(path: string) {
  return `${process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}${path}`;
}
