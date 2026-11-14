import { newSyncKey, validateSyncKey, deriveKeys, encryptEnvelope, decryptEnvelope } from './sync-crypto.js';
import { localDate } from './core.js';
import { emptyEnvelope, legacyEnvelope, captureChanges, mergeEnvelopes, envelopeState, stableJSON } from './sync-model.js';
export const CLOUD_KEYS={credentials:'az104-sync-key-v1',envelope:'az104-sync-envelope-v1',device:'az104-sync-device-v1',recovery:'az104-sync-pending-key-v1',epoch:'az104-sync-local-epoch-v1'};
const clone=value=>JSON.parse(JSON.stringify(value));
const meaningful=s=>s.attempts.length||s.exams.length||s.favorites.length||s.session||['tasks','lessons','steps','notes'].some(k=>Object.keys(s[k]).length)||s.profile.weeklyHours!==11||s.profile.startDate!==localDate();
export class CloudSync {
  constructor({endpoint,getState,applyState,onStatus=()=>{},catalog,storage=globalThis.localStorage,transport=globalThis.fetch}) {
    this.endpoint=endpoint;this.getState=getState;this.applyState=applyState;this.onStatus=onStatus;this.catalog=catalog;this.storage=storage;this.transport=transport;
    this.disposed=false;this.keys=null;this.key='';this.generation=0;this.flight=null;this.debounce=null;this.poll=null;this.lastSynced=null;this.status='local';this.error='';this.previous=clone(getState());
    this.epoch='initial';
    try {this.epoch=storage.getItem(CLOUD_KEYS.epoch)||'initial';this.device=storage.getItem(CLOUD_KEYS.device)||crypto.randomUUID();storage.setItem(CLOUD_KEYS.device,this.device);const raw=storage.getItem(CLOUD_KEYS.envelope);this.envelope=raw?mergeEnvelopes(JSON.parse(raw),emptyEnvelope()):legacyEnvelope(this.previous,!!meaningful(this.previous));envelopeState(this.envelope,catalog);} catch {this.device=crypto.randomUUID();this.envelope=legacyEnvelope(this.previous,!!meaningful(this.previous));}
  }
  get recoveryKey(){try{return this.storage.getItem(CLOUD_KEYS.recovery)||'';}catch{return '';}}
  get info(){return {connected:!!this.keys,status:this.status,error:this.error,lastSynced:this.lastSynced,available:!!this.endpoint};}
  notify(status,error=''){this.status=status;this.error=error;this.onStatus(this.info);}
  persist(){try{this.storage.setItem(CLOUD_KEYS.envelope,JSON.stringify({...this.envelope,localEpoch:this.epoch}));}catch{this.notify('error','storage_full');}}
  capture(next){this.envelope=captureChanges(this.envelope,this.previous,next,this.device);this.previous=clone(next);this.persist();if(this.keys){this.notify('pending');this.schedule();}}
  resetLocal(next){this.epoch=crypto.randomUUID();try{this.storage.setItem(CLOUD_KEYS.epoch,this.epoch);}catch{this.notify('error','storage_full');}this.previous=clone(next);this.envelope=legacyEnvelope(next,!!meaningful(next));this.persist();}
  accept(envelope){this.envelope=mergeEnvelopes(this.envelope,envelope);const next=envelopeState(this.envelope,this.catalog);this.previous=clone(next);this.persist();if(stableJSON(this.getState())!==stableJSON(next))this.applyState(next);}
  schedule(delay=1200){clearTimeout(this.debounce);this.debounce=setTimeout(()=>{this.sync().catch(()=>{});},delay);}
  async request(method,keys,body){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try {const response=await this.transport(this.endpoint+'/v1/progress',{method,headers:{Authorization:'Bearer '+keys.auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',signal:controller.signal});
      let data;try{data=await response.json();}catch{throw new Error('service_unavailable');}
      if(!response.ok){const error=new Error(data.error||'service_unavailable');error.status=response.status;throw error;}return data;
    } catch(error){if(error.name==='AbortError'||error.name==='TypeError')throw new Error('offline');throw error;}finally{clearTimeout(timeout);}
  }
  async connect(input,{create=false}={}) {
    if(!this.endpoint)throw new Error('not_configured');
    if(this.keys)throw new Error('already_connected');
    const generation=++this.generation;
    this.notify('connecting');
    try {
      const key=validateSyncKey(input),keys=await deriveKeys(key);
      if(generation!==this.generation||this.disposed)return;
      if(create){const payload=await encryptEnvelope(this.envelope,keys.encryption);try{await this.request('POST',keys,{payload});}catch(error){if(error.status!==409)throw error;}}
      const remote=await this.request('GET',keys),decoded=await decryptEnvelope(remote.payload,keys.encryption);
      // Validate before saving credentials or touching the local copy.
      envelopeState(decoded,this.catalog);const merged=mergeEnvelopes(this.envelope,decoded);
      if(generation!==this.generation)return;
      this.storage.setItem(CLOUD_KEYS.credentials,key);this.key=key;this.keys=keys;this.accept(merged);this.lastSynced=remote.updatedAt;this.notify('pending');
      await this.sync();return key;
    }catch(error){if(generation===this.generation)this.notify('error',error.message);throw error;}
  }
  async create(){if(!this.endpoint)throw new Error('not_configured');const key=this.recoveryKey||newSyncKey();this.storage.setItem(CLOUD_KEYS.recovery,key);await this.connect(key,{create:true});if(this.key===key)this.storage.removeItem(CLOUD_KEYS.recovery);return key;}
  disconnect(){this.generation++;this.keys=null;this.key='';this.lastSynced=null;this.storage.removeItem(CLOUD_KEYS.credentials);clearTimeout(this.debounce);this.notify('local');}
  async sync(){
    if(!this.keys||this.disposed||!this.endpoint)return;
    if(this.flight)return this.flight;
    if(globalThis.navigator?.onLine===false){this.notify('offline');return;}
    const generation=this.generation,keys=this.keys;
    const work=async()=>{
      this.notify('syncing');
      try {
        for(let round=0;round<4;round++) {
          const remote=await this.request('GET',keys);
          if(generation!==this.generation)return;
          const decoded=await decryptEnvelope(remote.payload,keys.encryption);envelopeState(decoded,this.catalog);
          if(generation!==this.generation)return;
          const merged=mergeEnvelopes(this.envelope,decoded);
          if(stableJSON(merged)===stableJSON(decoded)) {this.accept(merged);this.lastSynced=Date.now();this.notify('synced');return;}
          const payload=await encryptEnvelope(merged,keys.encryption);
          if(generation!==this.generation)return;
          try {
            await this.request('PUT',keys,{payload,expectedRevision:remote.revision});
            if(generation!==this.generation)return;
            this.accept(merged);this.lastSynced=Date.now();
            if(stableJSON(this.envelope)!==stableJSON(merged)){this.notify('pending');this.schedule();}else this.notify('synced');
            return;
          }catch(error){if(error.status!==409)throw error;}
        }
        this.notify('pending');this.schedule(3000);
      }catch(error){if(generation===this.generation){this.notify(error.message==='offline'?'offline':'error',error.message);this.schedule(30000);}throw error;}
    };
    this.flight=work();try{return await this.flight;}finally{this.flight=null;}
  }
  async start(){
    const generation=this.generation;if(this.disposed)return;
    let saved;try{saved=this.storage.getItem(CLOUD_KEYS.credentials);}catch{}
    if(saved&&this.endpoint){try{const key=validateSyncKey(saved),keys=await deriveKeys(key);if(generation!==this.generation||this.disposed)return;this.key=key;this.keys=keys;await this.sync();}catch(error){if(generation===this.generation)this.notify(error.message==='offline'?'offline':'error',error.message);}}
    if(generation!==this.generation||this.disposed)return;
    if(globalThis.window){
      this.onFocus=()=>this.sync().catch(()=>{});window.addEventListener('focus',this.onFocus);window.addEventListener('online',this.onFocus);
      this.onStorage=event=>{
        if([CLOUD_KEYS.envelope,CLOUD_KEYS.epoch].includes(event.key)){
          try{
            const activeEpoch=this.storage.getItem(CLOUD_KEYS.epoch)||'initial';
            if(activeEpoch!==this.epoch){
              const replacement=JSON.parse(this.storage.getItem(CLOUD_KEYS.envelope));
              if((replacement.localEpoch||'initial')!==activeEpoch)return;
              this.generation++;this.keys=null;this.key='';this.epoch=activeEpoch;
              this.envelope=mergeEnvelopes(replacement,emptyEnvelope());
              const next=envelopeState(this.envelope,this.catalog);this.previous=clone(next);this.applyState(next);this.notify('local');return;
            }
            if(event.key===CLOUD_KEYS.envelope&&event.newValue){const incoming=JSON.parse(event.newValue);if((incoming.localEpoch||'initial')!==this.epoch)return;this.accept(incoming);if(this.keys)this.schedule();}
          }catch{}
        }
        if(event.key===CLOUD_KEYS.credentials){if(!event.newValue){this.generation++;this.key='';this.keys=null;this.notify('local');}else if(event.newValue!==this.key){const generation=++this.generation;this.key=event.newValue;deriveKeys(event.newValue).then(keys=>{if(generation===this.generation&&!this.disposed&&this.key===event.newValue){this.keys=keys;return this.sync();}}).catch(()=>{if(generation===this.generation)this.notify('error','invalid_key');});}}
      };window.addEventListener('storage',this.onStorage);
      this.poll=setInterval(()=>{if(document.visibilityState==='visible')this.sync().catch(()=>{});},20000);
    }
  }
  dispose(){this.disposed=true;this.generation++;this.keys=null;clearTimeout(this.debounce);clearInterval(this.poll);if(globalThis.window){window.removeEventListener('focus',this.onFocus);window.removeEventListener('online',this.onFocus);window.removeEventListener('storage',this.onStorage);}}
}
