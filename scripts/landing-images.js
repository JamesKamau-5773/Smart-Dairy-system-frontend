// Writes the landing page's responsive photo variants (AVIF, WebP, JPEG at each width)
// from public/images/<name>.jpg to public/images/landing/. Needs ImageMagick 6.9.12+ or 7
// with AVIF and WebP support. Run with `npm run images` after adding or replacing a photo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PHOTOS } from '../src/landing/content.js';
import { photoVariants } from '../src/landing/parts/picture.js';

const root = path.resolve(import.meta.dirname, '..');
const QUALITY = { avif: '50', webp: '72', jpg: '78' };

for (const photo of Object.values(PHOTOS)) {
  const source = path.join(root, 'public/images', `${photo.name}.jpg`);
  for (const { width, format, url } of photoVariants(photo)) {
    const target = path.join(root, 'public', url);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const args = [source, '-auto-orient', '-strip', '-resize', `${width}x>`, '-quality', QUALITY[format]];
    if (format === 'jpg') args.push('-interlace', 'Plane');
    execFileSync('convert', [...args, target]);
    console.log(`${url} ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
  }
}
