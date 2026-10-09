import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { csrfGuard, HttpError, rateLimit, requireAdmin } from '@/lib/security';

const maxFileSize = 8 * 1024 * 1024;
const fileTypes = {
  'image/jpeg': {
    extension: 'jpg',
    signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    signature: (bytes: Uint8Array) =>
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  },
  'image/webp': {
    extension: 'webp',
    signature: (bytes: Uint8Array) =>
      Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP',
  },
} as const;

export async function POST(request: Request) {
  try {
    await csrfGuard(request);
    const admin = await requireAdmin();
    await rateLimit('admin:product-image:' + admin.id, 30, 60000);

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > maxFileSize + 64 * 1024)
      throw new HttpError('Choose an image smaller than 8 MB.', 413);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError('Choose a product image to upload.');
    if (file.size === 0 || file.size > maxFileSize)
      throw new HttpError('Choose an image smaller than 8 MB.', 413);

    const type = fileTypes[file.type as keyof typeof fileTypes];
    if (!type) throw new HttpError('Use a JPEG, PNG, or WebP image.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!type.signature(bytes)) throw new HttpError('The selected file is not a valid image.');

    const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const legacyServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageKey = secretKey || legacyServiceKey;
    if (!projectUrl)
      throw new HttpError(
        'Set SUPABASE_URL in the server environment to enable product photo uploads.',
        503,
      );
    if (!storageKey)
      throw new HttpError(
        'Set SUPABASE_SECRET_KEY in the server environment to enable product photo uploads.',
        503,
      );

    const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket))
      throw new HttpError('Product image storage is not configured correctly.', 503);
    const objectName = `products/${randomUUID()}.${type.extension}`;
    const upload = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${objectName}`, {
      method: 'POST',
      headers: {
        apikey: storageKey,
        ...(secretKey
          ? {}
          : legacyServiceKey
            ? { Authorization: `Bearer ${legacyServiceKey}` }
            : {}),
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-upsert': 'false',
      },
      body: bytes,
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    });
    if (!upload.ok) {
      console.error('Supabase product image upload failed:', upload.status);
      throw new HttpError(
        'The image could not be uploaded. Check Supabase Storage setup and try again.',
        502,
      );
    }

    return NextResponse.json({
      url: `${projectUrl}/storage/v1/object/public/${bucket}/${objectName}`,
    });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Product image upload failed:', error);
    return NextResponse.json(
      { error: 'The image could not be uploaded. Please try again.' },
      { status: 502 },
    );
  }
}
