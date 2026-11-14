import { mkdir, cp, writeFile, rm } from 'node:fs/promises';
await rm('dist-sync', {recursive:true,force:true});
await mkdir('dist-sync');
await cp('sync-service/worker.js','dist-sync/_worker.js');
await writeFile('dist-sync/_routes.json', JSON.stringify({version:1,include:['/*'],exclude:[]}));
await writeFile('dist-sync/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>AZ-104 Progress Sync API</title><p>Encrypted progress API for <a href="https://curtisatiwatt.github.io/az104/">Azure Path</a>.</p></html>');
console.log('Built the real sync Worker for Cloudflare Pages advanced mode in dist-sync/');
