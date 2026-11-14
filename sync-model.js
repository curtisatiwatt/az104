import { defaultState, normalizeState } from './core.js';
const maps=['tasks','lessons','steps','notes'];
const clone=value=>JSON.parse(JSON.stringify(value));
export const stableJSON = value => JSON.stringify(canonical(value));
function canonical(value) { if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const equal=(a,b)=>stableJSON(a)===stableJSON(b);
const allowedPath=p=>!p.split('/').some(k=>['__proto__','constructor','prototype'].includes(k))&&(/^(tasks|lessons|steps|notes|favorites|profile)\/[A-Za-z0-9:_.-]{1,90}$/.test(p)||p==='session');
const compare=(a,b)=>(a?.at||0)-(b?.at||0)||String(a?.device||'').localeCompare(String(b?.device||''));
function fields(state) {
  const result={};for(const group of maps)for(const [id,value]of Object.entries(state[group]||{}))result[`${group}/${id}`]=value;
  for(const id of state.favorites||[])result[`favorites/${id}`]=true;
  for(const [id,value]of Object.entries(state.profile||{}))result[`profile/${id}`]=value;
  result.session=state.session;
  return result;
}
function missing(path){return path.startsWith('notes/')?'':path==='session'?null:false;}
export function emptyEnvelope(){return {v:1,registers:{},attempts:[],exams:[],activity:{}};}
export function legacyEnvelope(state,includeProfile=true) {
  const env=emptyEnvelope();
  for(const [path,value]of Object.entries(fields(state))){if(path.startsWith('profile/')&&!includeProfile)continue;if(path==='session'&&value===null)continue;env.registers[path]={value:clone(value),at:1,device:'legacy'};}
  env.attempts=clone(state.attempts);env.exams=clone(state.exams);env.activity=clone(state.activity);return env;
}
function records(items,max) {const unique=new Map();for(const record of items||[])if(record&&Number.isFinite(record.at))unique.set(stableJSON(record),canonical(record));return [...unique.values()].sort((a,b)=>a.at-b.at||stableJSON(a).localeCompare(stableJSON(b))).slice(-max);}
export function mergeEnvelopes(a,b) {
  const result=emptyEnvelope();
  for(const source of [a,b]) {
    if(!source||source.v!==1)throw new Error('invalid_cloud_data');
    for(const [path,item]of Object.entries(source.registers||{})) {
      if(!allowedPath(path)||!item||!Number.isSafeInteger(item.at)||item.at<0||typeof item.device!=='string'||item.device.length>80)continue;
      const old=result.registers[path],cmp=compare(item,old);
      if(!old||cmp>0||(cmp===0&&stableJSON(item.value)>stableJSON(old.value)))result.registers[path]=clone(item);
    }
    for(const [day,count]of Object.entries(source.activity||{}))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isSafeInteger(count)&&count>=0)result.activity[day]=Math.max(result.activity[day]||0,count);
  }
  result.registers=Object.fromEntries(Object.entries(result.registers).sort(([a],[b])=>a.localeCompare(b)));
  result.activity=Object.fromEntries(Object.entries(result.activity).sort(([a],[b])=>a.localeCompare(b)).slice(-730));
  result.attempts=records([...(a.attempts||[]),...(b.attempts||[])],20000);result.exams=records([...(a.exams||[]),...(b.exams||[])],200);
  return result;
}
export function envelopeState(envelope,catalog) {
  const state=defaultState();
  for(const [path,item]of Object.entries(envelope.registers||{})) {
    if(!allowedPath(path))continue;
    if(path==='session'){state.session=item.value;continue;}
    const [group,id]=path.split('/');if(group==='favorites'){if(item.value===true)state.favorites.push(id);}else state[group][id]=item.value;
  }
  state.attempts=envelope.attempts;state.exams=envelope.exams;state.activity=envelope.activity;
  return normalizeState(state,catalog);
}
export function captureChanges(envelope,previous,next,device,now=Date.now()) {
  const result=clone(envelope),before=fields(previous),after=fields(next);
  const at=Math.max(now,...Object.values(envelope.registers).map(r=>r.at+1),1);
  for(const path of new Set([...Object.keys(before),...Object.keys(after)])) {
    const old=Object.hasOwn(before,path)?before[path]:missing(path),value=Object.hasOwn(after,path)?after[path]:missing(path);
    if(!equal(old,value))result.registers[path]={value:clone(value),at,device};
  }
  result.attempts=records([...result.attempts,...next.attempts],20000);result.exams=records([...result.exams,...next.exams],200);
  for(const [day,count]of Object.entries(next.activity))result.activity[day]=Math.max(result.activity[day]||0,count);
  return mergeEnvelopes(result,emptyEnvelope());
}
