// Opt-in production smoke test. Creates one isolated, encrypted synthetic space.
// No pairing key or bearer token is printed or written to disk.
import assert from 'node:assert/strict';
import {CloudSync} from '../cloud-sync.js';
import {defaultState} from '../core.js';
import {questions} from '../data/questions.js';
import {lessons,weeks} from '../data/curriculum.js';
import {labs} from '../data/labs.js';
if(!process.argv.includes('--create-test-space'))throw new Error('Pass --create-test-space to authorize one synthetic cloud space.');
const endpoint=process.argv.find(s=>s.startsWith('https://'));
if(!endpoint)throw new Error('Pass the deployed HTTPS API URL.');
const origin='https://curtisatiwatt.github.io';
const transport=(url,options={})=>fetch(url,{...options,headers:{...options.headers,Origin:origin}});
const health=await transport(endpoint+'/health');assert.equal(health.status,200);assert.equal((await health.json()).service,'az104-progress-sync');
const preflight=await transport(endpoint+'/v1/progress',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const denied=await fetch(endpoint+'/v1/progress',{headers:{Origin:'https://untrusted.example'}});assert.equal(denied.status,403);
function device(){let state=defaultState();const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};const client=new CloudSync({endpoint,transport,storage,catalog:{questions,lessons,weeks,labs},getState:()=>state,applyState:next=>{state=next;}});return {client,get state(){return state;},edit(fn){fn(state);client.capture(state);}};}
const a=device(),b=device();
try{
  const key=await a.client.create();await b.client.connect(key);
  const first=weeks[0].tasks[0].id,second=weeks[0].tasks[1].id;
  a.edit(s=>{s.tasks[first]=true;s.notes[lessons[0].id]='Synthetic sync verification · 双语同步验证';});
  b.edit(s=>{s.tasks[second]=true;s.steps[labs[0].id+':0']=true;});
  await Promise.all([a.client.sync(),b.client.sync()]);await a.client.sync();await b.client.sync();
  for(const d of [a,b]){assert.equal(d.state.tasks[first],true);assert.equal(d.state.tasks[second],true);assert.equal(d.state.steps[labs[0].id+':0'],true);assert.match(d.state.notes[lessons[0].id],/双语同步/);}
  a.edit(s=>{s.tasks[first]=false;});await a.client.sync();await b.client.sync();assert.equal(b.state.tasks[first],false);assert.equal(b.state.tasks[second],true);
  const payload=await (await transport(endpoint+'/v1/progress',{headers:{Authorization:'Bearer '+a.client.keys.auth}})).json();
  assert.equal(payload.payload.v,1);assert.equal(JSON.stringify(payload).includes('Synthetic sync'),false);assert.ok(payload.revision>=3);
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(a.client.keys.auth))),b=>b.toString(16).padStart(2,'0')).join('');
  console.log(JSON.stringify({passed:true,checks:['health','CORS preflight','rejected origin','create and pair','concurrent two-device merge','Chinese and English note roundtrip','uncheck propagation','opaque encrypted storage'],revision:payload.revision,syntheticSpaceId:id},null,2));
}finally{a.client.dispose();b.client.dispose();}
