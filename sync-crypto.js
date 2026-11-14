// Web Crypto only: the master pairing key and encryption key never leave the browser.
const encoder = new TextEncoder();
export function toBase64(bytes) { let binary=''; for (const b of new Uint8Array(bytes)) binary+=String.fromCharCode(b); return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function fromBase64(text) { return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)); }
export function newSyncKey() { return 'AZ104.'+toBase64(crypto.getRandomValues(new Uint8Array(32))); }
export function validateSyncKey(input) { const key=String(input).trim(); if(!/^AZ104\.[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('invalid_key'); const bytes=fromBase64(key.slice(6)); if(bytes.length!==32 || toBase64(bytes)!==key.slice(6)) throw new Error('invalid_key'); return key; }
export async function deriveKeys(input) {
  const master=fromBase64(validateSyncKey(input).slice(6));
  const hkdf=await crypto.subtle.importKey('raw',master,'HKDF',false,['deriveBits','deriveKey']);
  const params=info=>({name:'HKDF',hash:'SHA-256',salt:encoder.encode('AZ104 cloud sync v1'),info:encoder.encode(info)});
  const auth=toBase64(await crypto.subtle.deriveBits(params('authentication'),hkdf,256));
  const encryption=await crypto.subtle.deriveKey(params('encryption'),hkdf,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return {auth,encryption};
}
export async function encryptEnvelope(envelope, key) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=encoder.encode(JSON.stringify(envelope));
  if(plaintext.byteLength>1300000) throw new Error('too_large');
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('AZ104 sync envelope v1')},key,plaintext);
  return {v:1,iv:toBase64(iv),data:toBase64(data)};
}
export async function decryptEnvelope(payload, key) {
  if(payload?.v!==1 || typeof payload.iv!=='string' || typeof payload.data!=='string' || payload.data.length>1800000) throw new Error('invalid_cloud_data');
  try { const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(payload.iv),additionalData:encoder.encode('AZ104 sync envelope v1')},key,fromBase64(payload.data));return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('decrypt_failed'); }
}
