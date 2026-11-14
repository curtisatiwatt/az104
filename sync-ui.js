import { getLocale } from './i18n.js';
const c=(zh,en)=>getLocale()==='en'?en:zh;
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const errors={
  invalid_key:['密钥格式不正确，请完整复制 AZ104. 开头的密钥。','Copy the complete pairing key, starting with AZ104.'],
  not_found:['没有找到该同步空间，请核对密钥，或先在另一台设备创建。','This sync space was not found. Check the key or create a space on your first device.'],
  decrypt_failed:['无法解密云端记录，请确认使用的是原同步密钥。本机进度仍然保留。','The cloud record could not be decrypted. Check your original key. Local progress is intact.'],
  invalid_cloud_data:['云端数据格式不兼容，本机进度仍然保留。','The cloud data format is incompatible. Local progress is intact.'],
  offline:['暂时无法连接。进度仍保存在本机，连接恢复后自动重试。','Unable to connect. Progress stays on this device and retries automatically.'],
  rate_limited:['创建过于频繁，请一小时后重试。已有密钥可以直接连接。','Too many new spaces. Try again in one hour, or connect with an existing key.'],
  space_unavailable:['暂时无法创建同步空间，请稍后重试。','A new sync space is unavailable. Please try again later.'],
  too_large:['学习记录超过单个同步空间的容量，请导出备份后联系维护者。','This learning record exceeds the sync space limit. Export a backup and contact the maintainer.'],
  storage_full:['浏览器无法保存同步信息，请检查剩余存储空间并导出备份。','Your browser could not save sync information. Check available storage and export a backup.'],
  not_configured:['云同步服务尚未配置，当前进度继续保存在本机。','Cloud sync is not configured yet. Progress is still saved on this device.'],
};
export function createSyncUI({getCloud,toast}) {
  let revealed=false,working=false,wasConnected=false;
  const info=()=>getCloud()?.info||{status:'local',connected:false,available:false};
  const statusLabel=()=>{
    const labels={local:c('本机保存','Saved locally'),connecting:c('连接中…','Connecting…'),pending:c('等待同步','Sync pending'),syncing:c('正在同步…','Syncing…'),synced:c('已同步到云端','Cloud up to date'),offline:c('离线 · 本机已保存','Offline · saved locally'),error:c('同步需要处理','Sync needs attention')};
    return labels[info().status]||labels.local;
  };
  const errorLabel=()=>{const pair=errors[info().error];return pair?c(...pair):c('同步暂时失败，本机记录仍保留。请检查网络后重试。','Sync is temporarily unavailable. Your local record is intact. Check your connection and retry.');};
  function indicator(){return `<a href="#settings" class="save-indicator cloud-indicator" data-cloud-indicator data-status="${esc(info().status)}" title="${esc(c('打开云同步设置','Open cloud sync settings'))}"><i></i><span>${statusLabel()}</span></a>`;}
  function markup(){
    const s=info(),key=getCloud()?.key||getCloud()?.recoveryKey||'';
    return `<section class="panel cloud-section" aria-labelledby="cloud-title"><div class="cloud-heading"><div><div class="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2 id="cloud-title">${c('在每一台设备，接着学','Your progress, on every device')}</h2></div><span class="cloud-badge" data-cloud-status data-status="${esc(s.status)}">${statusLabel()}</span></div>
    <p>${c('电脑上创建同步空间，手机上粘贴同一密钥连接一次。此后完成任务、写笔记和刷题都会自动同步。','Create a sync space on your computer, then paste the same key on your phone once. Tasks, notes and quiz progress then sync automatically.')}</p>
    ${!s.available?`<div class="notice">${c('云同步服务正在等待配置。你可以先继续学习，现有进度会在连接后合并。','Cloud sync is awaiting setup. Keep studying; your existing progress will merge when you connect.')}</div>`:''}
    <div class="cloud-actions">${s.connected?`<button class="button primary" data-cloud-action="sync">${c('立即同步','Sync now')}</button><button class="button secondary" data-cloud-action="reveal">${c('连接另一台设备','Pair another device')}</button><button class="text-button" data-cloud-action="disconnect">${c('断开此设备','Disconnect this device')}</button>`:`<button class="button primary" data-cloud-action="create" ${!s.available?'disabled':''}>${key?c('继续创建同步空间','Resume creating a space'):c('创建同步空间','Create sync space')}</button><span class="muted">${c('或连接已有空间','or connect to an existing space')}</span>`}</div>
    ${!s.connected?`<form id="cloud-connect-form" class="cloud-connect"><label class="field" for="cloud-key">${c('同步密钥','Pairing key')}<input id="cloud-key" name="key" type="password" placeholder="AZ104.…" autocomplete="off" autocapitalize="off" spellcheck="false" required ${!s.available?'disabled':''}></label><button class="button secondary" type="submit" ${!s.available?'disabled':''}>${c('连接并合并进度','Connect & merge progress')}</button></form>`:''}
    ${key&&revealed?`<div class="cloud-key-box"><label class="field">${c('在另一台设备输入这个密钥','Enter this key on your other device')}<textarea id="cloud-share-key" readonly spellcheck="false" aria-label="${c('同步密钥','Pairing key')}">${esc(key)}</textarea></label><div class="cloud-actions"><button class="button secondary" data-cloud-action="copy">${c('复制密钥','Copy key')}</button><button class="text-button" data-cloud-action="hide">${c('隐藏密钥','Hide key')}</button></div><p>${c('密钥等同密码，可读取和修改你的进度。请私下保存；所有设备都丢失密钥后，无法恢复云端记录。','This key works like a password and grants access to your progress. Keep it private. Cloud data cannot be recovered if every device loses the key.')}</p></div>`:''}
    <p class="cloud-message" data-cloud-message role="status"></p><p class="cloud-time" data-cloud-time></p>
    <details class="cloud-details"><summary>${c('同步范围与隐私','What syncs & how it stays private')}</summary><p>${c('任务、课程、实验步骤、笔记、收藏、答题历史、计划设置和当前练习都会同步。语言与中英对照偏好仅保存在当前设备。','Tasks, lessons, lab steps, notes, favorites, answer history, plan settings and your current quiz sync. Language and bilingual-display preferences stay on each device.')}</p><p>${c('记录先在浏览器加密再上传。同步服务不保存原始密钥或解密密钥。在线修改约 1 秒后开始上传，打开页面或回到窗口时会检查更新；活跃页面约每 20 秒检查一次。','Records are encrypted in your browser before upload. The service stores neither the original pairing key nor the decryption key. Changes start syncing after about a second; opening or returning to the page checks for updates, as does an active page roughly every 20 seconds.')}</p><p>${c('离线时先保存在本机，联网后自动合并。不同任务分别保留；同一项目以最后一次修改为准。当前练习整体同步，请避免在两台设备同时作答同一场模考。关闭页面前，请确认顶部显示“已同步到云端”。','Offline changes stay local and merge after reconnecting. Different items are preserved separately; the latest edit wins for the same item. The current quiz syncs as a whole, so avoid taking the same mock on two devices at once. Before closing the page, check that the top bar says “Cloud up to date”.')}</p></details></section>`;
  }
  function refresh(){const panel=document.querySelector('.cloud-section');if(panel){panel.outerHTML=markup();bind();}update();}
  function update(){
    const s=info();
    if(s.connected!==wasConnected){wasConnected=s.connected;const panel=document.querySelector('.cloud-section');if(panel){panel.outerHTML=markup();bind();}}
    document.querySelectorAll('[data-cloud-indicator],[data-cloud-status]').forEach(el=>{el.dataset.status=s.status;const target=el.querySelector('span')||el;target.textContent=statusLabel();});
    const message=document.querySelector('[data-cloud-message]');if(message){message.textContent=s.error?errorLabel():'';message.hidden=!s.error;}
    const time=document.querySelector('[data-cloud-time]');if(time)time.textContent=s.lastSynced?c('最近同步：','Last synced: ')+new Date(s.lastSynced).toLocaleString(getLocale()==='en'?'en-CA':'zh-CN'):'';
    document.querySelectorAll('[data-cloud-action="create"],[data-cloud-action="sync"],#cloud-connect-form button,#cloud-key').forEach(el=>el.disabled=!s.available||working||s.status==='connecting');
  }
  async function run(action,key){
    const cloud=getCloud();if(!cloud||working)return;working=true;update();
    try{if(action==='create'){await cloud.create();revealed=true;toast(c('同步空间已创建。用此密钥连接手机。','Sync space created. Use this key to connect your phone.'));}
      if(action==='connect'){await cloud.connect(key);toast(c('已连接，学习进度会自动同步。','Connected. Your progress syncs automatically.'));}
      if(action==='sync')await cloud.sync();
    }catch{if(action==='create'&&cloud.recoveryKey)revealed=true;toast(errorLabel());}
    finally{working=false;refresh();}
  }
  function bind(){
    const form=document.querySelector('#cloud-connect-form');if(form)form.onsubmit=event=>{event.preventDefault();run('connect',new FormData(form).get('key'));};
    document.querySelectorAll('[data-cloud-action]').forEach(button=>button.onclick=async()=>{
      const action=button.dataset.cloudAction,cloud=getCloud();
      if(['create','sync'].includes(action))return run(action);
      if(action==='disconnect'){cloud.disconnect();revealed=false;refresh();toast(c('已断开。此设备和云端的记录都保留。','Disconnected. Local and cloud records are both preserved.'));}
      if(action==='reveal'||action==='hide'){revealed=action==='reveal';refresh();}
      if(action==='copy'){try{await navigator.clipboard.writeText(cloud.key||cloud.recoveryKey);toast(c('密钥已复制，请私下保存。','Key copied. Keep it private.'));}catch{document.querySelector('#cloud-share-key')?.select();toast(c('请选中密钥并手动复制。','Select the key and copy it manually.'));}}
    });
    update();
  }
  return {markup,indicator,bind,update};
}
