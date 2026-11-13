import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'styles.css', 'app.js', 'core.js', 'favicon.svg', 'data']) await cp(file, `dist/${file}`, { recursive: true });
await cp('index.html', 'dist/404.html');
console.log('Built static website in dist/');
