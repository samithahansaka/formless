import { copyFileSync, existsSync } from 'node:fs';

const src = 'dist/index.d.ts';
const dst = 'dist/index.d.cts';

if (!existsSync(src)) {
  console.error(`[dts-to-cts] missing ${src} in ${process.cwd()}`);
  process.exit(1);
}

copyFileSync(src, dst);
