const MAX_BODY = 1800100;
const MAX_SPACES = 128;
const json = (value,status=200,headers={}) => Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
async function readBody(request) {
  if(Number(request.headers.get('content-length'))>MAX_BODY) throw new Error('too_large');
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json') throw new Error('invalid_body');
  const reader=request.body?.getReader(); if(!reader) throw new Error('invalid_body');
  let total=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_BODY){await reader.cancel();throw new Error('too_large');}parts.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('invalid_body');}
  const p=body?.payload;
  if(!p || p.v!==1 || typeof p.iv!=='string' || !/^[A-Za-z0-9_-]{16}$/.test(p.iv) || typeof p.data!=='string' || p.data.length<22 || p.data.length>1800000 || p.data.length%4===1 || !/^[A-Za-z0-9_-]+$/.test(p.data)) throw new Error('invalid_body');
  return body;
}
async function handle(request, env) {
  const url=new URL(request.url);
  if(url.pathname==='/health' && request.method==='GET') return json({service:'az104-progress-sync',version:1});
  if(url.pathname!=='/v1/progress') return json({error:'not_found'},404);
  if(!['GET','POST','PUT'].includes(request.method)) return json({error:'method_not_allowed'},405,{'Allow':'GET,POST,PUT,OPTIONS'});
  const authorization=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) return json({error:'unauthorized'},401);
  // Only the SHA-256 hash of the independent authentication key is used as an index.
  const id=await hash(authorization.slice(7));
  const db=env.DB;
  if(request.method==='GET') {
    const row=await db.prepare('SELECT payload,revision,updated_at FROM progress_spaces WHERE id=?').bind(id).first();
    if(!row)return json({error:'not_found'},404);
    return json({payload:JSON.parse(row.payload),revision:row.revision,updatedAt:row.updated_at});
  }
  const body=await readBody(request),now=Date.now(),payload=JSON.stringify({v:1,iv:body.payload.iv,data:body.payload.data});
  if(request.method==='POST') {
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const limitId=await hash('az104-create:'+ip),window=Math.floor(now/3600000);
    const allowed=await db.prepare('INSERT INTO creation_limits (id,window,count) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET window=excluded.window,count=CASE WHEN creation_limits.window=excluded.window THEN creation_limits.count+1 ELSE 1 END WHERE creation_limits.window<>excluded.window OR creation_limits.count<3 RETURNING count').bind(limitId,window).first();
    if(!allowed)return json({error:'rate_limited'},429,{'Retry-After':'3600'});
    const result=await db.prepare('INSERT OR IGNORE INTO progress_spaces (id,payload,revision,created_at,updated_at) SELECT ?,?,1,?,? WHERE (SELECT COUNT(*) FROM progress_spaces) < ?').bind(id,payload,now,now,MAX_SPACES).run();
    if(!result.meta.changes)return json({error:'space_unavailable'},409);
    // Expire rate-limit entries without retaining raw client addresses.
    await db.prepare('DELETE FROM creation_limits WHERE window < ?').bind(window-24).run();
    return json({revision:1,updatedAt:now},201);
  }
  if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<1)return json({error:'invalid_revision'},400);
  const result=await db.prepare('UPDATE progress_spaces SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(payload,now,id,body.expectedRevision).run();
  if(!result.meta.changes) {
    const exists=await db.prepare('SELECT revision FROM progress_spaces WHERE id=?').bind(id).first();
    return json({error:exists?'conflict':'not_found'},exists?409:404);
  }
  return json({revision:body.expectedRevision+1,updatedAt:now});
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin');
    const origins=(env.ALLOWED_ORIGINS||'https://curtisatiwatt.github.io').split(',');
    if(origin&&!origins.includes(origin))return json({error:'origin_not_allowed'},403);
    const cors=origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}:{};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    let response;
    try {response=await handle(request,env);}
    catch(error){const known=['invalid_body','invalid_revision','too_large'].includes(error.message);if(!known)console.error(JSON.stringify({event:'sync_request_failed',type:error.name}));response=json({error:known?error.message:'service_unavailable'},error.message==='too_large'?413:known?400:503);}
    const headers=new Headers(response.headers);for(const [name,value] of Object.entries(cors))headers.set(name,value);
    return new Response(response.body,{status:response.status,headers});
  }
};
