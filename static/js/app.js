// ─── particle background ───
(function(){
  const c=document.getElementById('bg-canvas'),ctx=c.getContext('2d');
  let w,h,pts=[];
  function rs(){w=c.width=innerWidth;h=c.height=innerHeight}
  rs();addEventListener('resize',rs);
  for(let i=0;i<120;i++)pts.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*2.2+.4,o:Math.random()*.15+.05});
  (function draw(){
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);ctx.fillStyle='rgba(139,92,246,'+p.o+')';ctx.fill();
      for(let j=i+1;j<pts.length;j++){
        const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;
        if(d<12000){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='rgba(59,130,246,'+(.02*(1-d/12000))+')';ctx.lineWidth=.4;ctx.stroke()}
      }
    }
    requestAnimationFrame(draw)
  })()
})();

// ─── api helper ───
async function api(method,path,body){
  const opts={method,headers:{},credentials:'same-origin'};
  if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
  const r=await fetch(path,opts);
  if(r.status===401){showPage('landing');throw new Error('unauthorized')}
  const text=await r.text();
  if(!r.ok)throw new Error(text||r.statusText);
  try{return JSON.parse(text)}catch(e){return{}}
}
const get=p=>api('GET',p);
const post=(p,b)=>api('POST',p,b);
const put=(p,b)=>api('PUT',p,b);
const del=p=>api('DELETE',p);

// ─── state ───
const S={
  servers:[],activeId:null,consoleWs:null,installWs:null,
  currentSettings:{},uptimeTick:null,pollTimer:null,
  role:'',username:'',view:'servers'
};
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>el.querySelectorAll(s);

// ─── toasts ───
function toast(m,t='info'){
  const c=$('#toast-container'),el=document.createElement('div');
  el.className='toast toast-'+t;el.textContent=m;el.setAttribute('role','alert');
  el.onclick=()=>{el.classList.add('removing');el.addEventListener('animationend',()=>el.remove(),{once:true})};
  c.appendChild(el);
  setTimeout(()=>{if(el.parentNode){el.classList.add('removing');el.addEventListener('animationend',()=>el.remove(),{once:true})}},4000)
}

// ─── page navigation ───
function showPage(name){
  $$('.page').forEach(p=>p.style.display='none');
  if(name==='landing'){$('#landing-page').style.display='flex'}
  else if(name==='login'){$('#login-page').style.display='flex';setTimeout(()=>($('#login-username')||{}).focus?.(),100)}
  else if(name==='dashboard'){$('#app').style.display='flex'}
}

async function tryAutoLogin(){
  try{const d=await post('/api/auth/login',{username:'',password:''});if(d.ok){S.role=d.role;S.username=d.username;showDashboard();return}}catch(e){}
  showPage('landing')
}

async function doLogin(){
  const u=$('#login-username'),p=$('#login-password'),e=$('#login-error'),b=$('#btn-login');
  if(!u.value.trim()){e.textContent='Enter username';return}
  if(!p.value){e.textContent='Enter password';return}
  b.disabled=true;b.textContent='Signing in...';e.textContent='';
  try{
    const d=await post('/api/auth/login',{username:u.value.trim(),password:p.value});
    if(d.ok){S.role=d.role;S.username=d.username;showDashboard()}
    else e.textContent=d.error||'Invalid credentials'
  }catch(x){e.textContent='Connection failed'}
  b.disabled=false;b.textContent='Sign In'
}

async function doLogout(){
  await post('/api/auth/logout').catch(()=>{});
  S.activeId=null;if(S.consoleWs){S.consoleWs.close();S.consoleWs=null}
  if(S.uptimeTick)clearInterval(S.uptimeTick);
  showPage('landing')
}

function showDashboard(){
  showPage('dashboard');
  const su=$('#sidenav-users');
  su.style.display=S.role==='admin'?'flex':'none';
  $('#sidebar-username').textContent=S.username;
  $('#sidebar-role').textContent=S.role;
  initApp()
}

// ─── app init ───
async function initApp(){
  await loadServers();
  if(S.role==='admin')await loadUsers();
  loadPresets();
  updateSystemInfo();updateConnectionInfo();
  if(S.pollTimer)clearInterval(S.pollTimer);
  S.pollTimer=setInterval(poll,8000)
}
async function poll(){updateSystemInfo();updateConnectionInfo();if(S.view==='servers')await loadServers()}

// ─── servers ───
let _loading=false;
let _lastServerHash='';
async function loadServers(){
  if(_loading)return;
  _loading=true;
  try{S.servers=await get('/api/servers')}catch(e){_loading=false;return}
  _loading=false;
  var hash=S.servers.map(s=>s.id+':'+s.status+':'+s.name).join('|');
  if(hash!==_lastServerHash){_lastServerHash=hash;renderServerList()}
  if(S.activeId){
    const s=S.servers.find(x=>x.id===S.activeId);
    if(s)refreshServerView(s);else{S.activeId=null;showEmptyState()}
  }
}
function renderServerList(){
  const list=$('#server-list');if(S.view!=='servers')return;
  const f=($('#sidebar-search')?.value||'').toLowerCase();
  let shown=f?S.servers.filter(s=>s.name.toLowerCase().includes(f)||s.id.toLowerCase().includes(f)||String(s.port).includes(f)):S.servers;
  if(!shown.length){list.innerHTML='<div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:11px">'+(f?'No match':'No servers<br><small>Press N to create</small>')+'</div>';return}
  list.innerHTML=shown.map(s=>'<li class="'+(s.id===S.activeId?'active':'')+'" data-id="'+s.id+'" tabindex="0"><div class="server-list-info"><div class="server-list-icon">&#9830;</div><div><div class="server-list-name">'+esc(s.name)+'</div><div class="server-list-port">:'+s.port+' \u00B7 '+(s.uptime_seconds>0?fmtUptime(s.uptime_seconds):'offline')+'</div></div></div><span class="server-list-status '+s.status+'">'+s.status+'</span></li>').join('')
}
function selectServer(id){
  S.activeId=id;_lastServerHash='';
  const s=S.servers.find(x=>x.id===id);if(!s)return;
  renderServerList();
  showServerView(s);
  connectConsole(id);
  checkSteamcmd();
  if(s.status==='running')startUptimeTick(s)
}
function showEmptyState(){
  _lastServerHash='';
  document.getElementById('empty-state').classList.remove('hidden');
  $('#server-view').classList.remove('visible');
  if(S.consoleWs){S.consoleWs.close();S.consoleWs=null}
  if(S.uptimeTick)clearInterval(S.uptimeTick)
}
function showServerView(s){
  document.getElementById('empty-state').classList.add('hidden');
  $('#server-view').classList.add('visible');
  refreshServerView(s)
}
function refreshServerView(s){
  $('#server-name').textContent=s.name;
  $('#server-subtitle').textContent='Port '+s.port+' \u00B7 ID '+s.id;
  $('#server-status').textContent=s.status;
  $('#server-status').className='status-badge status-'+s.status;
  var needInstall=!s.installed;
  $('#btn-start').disabled=s.status!=='stopped'||needInstall;
  $('#btn-start').textContent=needInstall?'\u25B6 Install First':'\u25B6 Start';
  $('#btn-stop').disabled=s.status!=='running';
  $('#btn-restart').disabled=s.status!=='running';
  const cols={running:'var(--emerald)',stopped:'var(--rose)',starting:'var(--blue)',stopping:'var(--blue)'};
  $('#ov-status').textContent=s.status.charAt(0).toUpperCase()+s.status.slice(1);
  $('#ov-status').style.color=cols[s.status]||'var(--text)';
  $('#ov-uptime').textContent=s.status==='running'?fmtUptime(0):'--';
  $('#ov-players').textContent=(s.player_count||0)+' / '+(s.settings?.ServerPlayerMaxNum||32);
  $('#ov-memory').textContent=(s.memory_mb||0)>0?s.memory_mb.toFixed(0)+' MB':'--';
  $('#info-id').textContent=s.id;$('#info-port').textContent=s.port;
  $('#info-maxplayers').textContent=s.settings?.ServerPlayerMaxNum||32;
  $('#info-path').textContent=s.install_dir
}
function startUptimeTick(s){
  if(S.uptimeTick)clearInterval(S.uptimeTick);
  if(s.status!=='running')return;
  const startedAt=Date.now();
  S.uptimeTick=setInterval(()=>{
    const sv=S.servers.find(x=>x.id===S.activeId);
    if(!sv||sv.status!=='running'){clearInterval(S.uptimeTick);return}
    animVal('ov-uptime',fmtUptime(Math.floor((Date.now()-startedAt)/1000)));
    animVal('ov-players',(sv.player_count||0)+' / '+(sv.settings?.ServerPlayerMaxNum||32));
    if(sv.memory_mb>0)animVal('ov-memory',sv.memory_mb.toFixed(0)+' MB')
  },1000)
}
function animVal(id,nv){const el=document.getElementById(id);if(!el||el.textContent===nv)return;el.textContent=nv;el.style.animation='none';el.offsetHeight;el.style.animation='numberPop .3s var(--spring)'}
function fmtUptime(s){if(!s||s<=0)return'--';const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);if(d)return d+'d '+h+'h';if(h)return h+'h '+m+'m';return m+'m'}

// ─── settings ───
async function loadPresets(){
  try{
    const p=await get('/api/servers/defaults/presets');
    var sel=$('#settings-preset');
    if(sel)sel.innerHTML='<option value="">Presets</option>'+Object.entries(p).map(([k,v])=>'<option value="'+k+'">'+v.label+'</option>').join('');
    var grid=$('#preset-cards');
    if(grid)grid.innerHTML=Object.entries(p).map(([k,v])=>{
      var keyStats=[];
    var stats=[];
    if(v.settings.ExpRate)stats.push((v.settings.ExpRate*100)+'% XP');
    if(v.settings.PalCaptureRate)stats.push((v.settings.PalCaptureRate*100)+'% Capture');
    if(v.settings.PalEggDefaultHatchingTime!==undefined)stats.push(v.settings.PalEggDefaultHatchingTime===0?'Instant Eggs':v.settings.PalEggDefaultHatchingTime+'h Eggs');
    if(v.settings.DeathPenalty)stats.push(v.settings.DeathPenalty==='None'?'No Drop':'Drop Items');
    return '<div class="preset-card" data-preset="'+k+'" role="button" tabindex="0"><div class="preset-card-icon">'+v.icon+'</div><div class="preset-card-label">'+v.label+'</div><div class="preset-card-desc">'+v.description+'</div><div class="preset-card-stats">'+stats.map(s=>'<span>'+s+'</span>').join('')+'</div></div>';
    }).join('')
  }catch(e){}
}
const CATS={Server:['ServerName','ServerDescription','ServerPassword','AdminPassword','ServerPlayerMaxNum','PublicPort','PublicIP','Region','RCONEnabled','RCONPort','bUseAuth','BanListURL','CoopPlayerMaxNum','bIsMultiplay','bIsPvP','Difficulty'],World:['DayTimeSpeedRate','NightTimeSpeedRate'],Rates:['ExpRate','PalCaptureRate','PalSpawnNumRate','PalDamageRateAttack','PalDamageRateDefense','PlayerDamageRateAttack','PlayerDamageRateDefense','EnemyDropItemRate','CollectionDropRate','CollectionObjectHpRate','CollectionObjectRespawnSpeedRate','BuildObjectDamageRate','BuildObjectDeteriorationDamageRate','WorkSpeedRate'],Player:['PlayerStomachDecreaceRate','PlayerStaminaDecreaceRate','PlayerAutoHPRegeneRate','PlayerAutoHpRegeneRateInSleep','DeathPenalty','bEnablePlayerToPlayerDamage','bEnableFriendlyFire','bEnableNonLoginPenalty','bEnableFastTravel','bIsStartLocationSelectByMap','bExistPlayerAfterLogout','bEnableDefenseOtherGuildPlayer','DropItemMaxNum','DropItemMaxNum_UNKO'],Pal:['PalStomachDecreaceRate','PalStaminaDecreaceRate','PalAutoHPRegeneRate','PalAutoHpRegeneRateInSleep','PalEggDefaultHatchingTime'],Guild:['BaseCampMaxNum','BaseCampWorkerMaxNum','bAutoResetGuildNoOnlinePlayers','AutoResetGuildTimeNoOnlinePlayers','GuildPlayerMaxNum','bCanPickupOtherGuildDeathPenaltyDrop','DropItemAliveMaxHours'],Combat:['bEnableInvaderEnemy','bActiveUNKO','bEnableAimAssistPad','bEnableAimAssistKeyboard']};
function getCat(k){for(const[c,ks]of Object.entries(CATS))if(ks.includes(k))return c;return'Other'}
async function loadSettings(){
  if(!$('#tab-settings')?.classList.contains('active'))return;
  $('#settings-container').innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</div>';
  try{S.currentSettings=await get('/api/servers/'+S.activeId+'/settings');renderSettings(S.currentSettings)}catch(e){toast('Failed to load settings','error')}
}
function renderSettings(settings,filter=''){
  let entries=Object.entries(settings);
  if(filter){const q=filter.toLowerCase();entries=entries.filter(([k])=>k.toLowerCase().includes(q))}
  const grouped={};entries.forEach(([k,v])=>{const c=getCat(k);(grouped[c]??=[]).push([k,v])});
  let html='';
  for(const cat of Object.keys(CATS)){
    if(!grouped[cat]?.length)continue;
    html+='<div class="settings-category"><div class="settings-category-title">'+cat+'</div><div class="settings-section-card">';
    grouped[cat].forEach(([k,v])=>{html+=renderField(k,v)});
    html+='</div></div>'
  }
  if(grouped['Other']?.length){
    html+='<div class="settings-category"><div class="settings-category-title">Other</div><div class="settings-section-card">';
    grouped['Other'].forEach(([k,v])=>{html+=renderField(k,v)});
    html+='</div></div>'
  }
  $('#settings-container').innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--text-muted)">No matches</div>'
}
function renderField(key,value){
  const label=key.replace(/([A-Z])/g,' $1').replace(/^b([A-Z])/,'$1').replace(/^./,s=>s.toUpperCase()).trim();
  if(typeof value==='boolean')return'<div class="setting-field"><span class="setting-field-label">'+label+'</span><label class="toggle-switch"><input type="checkbox" data-key="'+key+'" data-type="bool" '+ (value?'checked':'')+'><span class="toggle-slider"></span></label></div>';
  if(typeof value==='number'){
    var step=Number.isInteger(value)?'1':'any';
    var isFloat=!Number.isInteger(value);
    return'<div class="setting-field"><span class="setting-field-label">'+label+'</span><div class="setting-field-value"><input type="number" class="setting-field-input" data-key="'+key+'" data-type="number" value="'+value+'" step="'+step+'"><div class="setting-field-stepper"><button class="setting-field-step" data-dir="up" data-target="'+key+'">&#9650;</button><button class="setting-field-step" data-dir="down" data-target="'+key+'">&#9660;</button></div></div></div>';
  }
  return'<div class="setting-field"><span class="setting-field-label">'+label+'</span><input type="text" class="setting-field-input" data-key="'+key+'" data-type="string" value="'+esc(String(value||''))+'"></div>'
}
async function saveSettings(){
  const fields=$$('[data-key]'),settings={};
  fields.forEach(f=>{const k=f.dataset.key;if(f.dataset.type==='bool')settings[k]=f.checked;else if(f.dataset.type==='number')settings[k]=f.value===''?0:parseFloat(f.value);else settings[k]=f.value});
  if(!Object.keys(settings).length)return;
  const btn=$('#btn-save-settings');btn.disabled=true;btn.textContent='Saving...';
  try{await put('/api/servers/'+S.activeId+'/settings',{settings});toast('Saved','success')}catch(e){toast('Failed','error')}
  btn.disabled=false;btn.textContent='Save'
}
async function resetSettings(){
  try{S.currentSettings=await get('/api/servers/defaults/settings');renderSettings(S.currentSettings);toast('Reset (unsaved)','info')}catch(e){}
}
async function applyPreset(id){
  if(!id)return;
  try{const presets=await get('/api/servers/defaults/presets'),p=presets[id];if(!p)return;const def=await get('/api/servers/defaults/settings');S.currentSettings={...def,...p.settings};renderSettings(S.currentSettings);$$('.preset-card').forEach(c=>c.classList.remove('active'));var card=document.querySelector('.preset-card[data-preset="'+id+'"]');if(card)card.classList.add('active');toast('Applied "'+p.label+'"','info')}catch(e){}
  $('#settings-preset').value=''
}

// ─── console ───
function connectConsole(serverId,retries=3){
  if(S.consoleWs){S.consoleWs.close();S.consoleWs=null}
  const out=$('#console-output');if(!out)return;
  const proto=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(proto+'//'+location.host+'/ws/console/'+serverId);
  S.consoleWs=ws;
  ws.onmessage=e=>{if(e.data!=='__PING__')appendLog(e.data)};
  ws.onclose=()=>{S.consoleWs=null;if(retries>0)setTimeout(()=>connectConsole(serverId,retries-1),3000)};
  ws.onerror=()=>{S.consoleWs=null}
}
function appendLog(text){
  const out=$('#console-output'),span=document.createElement('span');
  span.className='log-line';const lo=text.toLowerCase();
  if(/error|fail|fatal|critical/.test(lo))span.classList.add('log-error');
  else if(/warn|warning/.test(lo))span.classList.add('log-warn');
  else if(/success|complete|loaded|started/.test(lo))span.classList.add('log-success');
  else if(/debug|trace/.test(lo))span.classList.add('log-debug');
  else if(/pal|creature|spawn/.test(lo))span.classList.add('log-pal');
  span.textContent=text;out.appendChild(span);out.appendChild(document.createTextNode('\n'));
  while(out.children.length>1200)out.removeChild(out.firstChild);
  if($('#console-autoscroll')?.checked)out.scrollTop=out.scrollHeight
}
async function sendCommand(){
  const inp=$('#console-input'),cmd=inp.value.trim();if(!cmd)return;
  appendLog('> '+cmd);
  try{await post('/api/servers/'+S.activeId+'/command',{command:cmd})}catch(e){}
  inp.value='';inp.focus()
}

// ─── install ───
async function checkSteamcmd(){
  try{const r=await get('/api/install/steamcmd/status');$('#steamcmd-status-text').textContent=r.installed?'Installed':'Not Installed';$('#steamcmd-dot').className='install-dot '+(r.installed?'ok':'bad');$('#btn-install-steamcmd').style.display=r.installed?'none':''}catch(e){}
}
async function installSteamcmd(){
  const btn=$('#btn-install-steamcmd');btn.disabled=true;btn.textContent='Installing...';
  try{await post('/api/install/steamcmd');toast('SteamCMD installed','success')}catch(e){toast('Failed','error')}
  btn.disabled=false;btn.textContent='Install';checkSteamcmd()
}
async function installServer(){
  const out=$('#install-output');out.style.display='block';out.textContent='Connecting...\n';
  if(S.installWs)S.installWs.close();
  const proto=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(proto+'//'+location.host+'/ws/install/'+S.activeId);
  S.installWs=ws;
  ws.onmessage=e=>{out.textContent+=e.data+'\n';out.scrollTop=out.scrollHeight;if(e.data.startsWith('__COMPLETE__')){ws.close();toast('Installed','success');loadServers()}};
  ws.onclose=()=>{S.installWs=null;$('#btn-install-server').disabled=false;$('#btn-install-server').textContent='Install / Update PalWorld'};
  ws.onerror=()=>{S.installWs=null;$('#btn-install-server').disabled=false;$('#btn-install-server').textContent='Install / Update PalWorld'};
  $('#btn-install-server').disabled=true;$('#btn-install-server').textContent='Installing...'
}

// ─── system ───
async function updateSystemInfo(){try{const i=await get('/api/system');$('#sys-cpu').textContent='CPU '+(i.cpu_percent||0)+'%';$('#sys-ram').textContent='RAM '+(i.memory_percent||0)+'%'}catch(e){}}
async function updateConnectionInfo(){
  if(!S.activeId)return;
  try{const net=await get('/api/system/network');const port=(S.servers.find(x=>x.id===S.activeId)||{}).port||8211;$('#conn-lan').textContent=net.local_ip+':'+port;$('#conn-wan').textContent=net.public_ip+':'+port}catch(e){}
}

// ─── players ───
async function refreshPlayers(){
  if(!S.activeId)return;
  var el=$('#players-list');if(!el)return;
  el.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px">Scanning...</div>';
  try{
    await post('/api/servers/'+S.activeId+'/command',{command:'ShowPlayers'});
    await new Promise(r=>setTimeout(r,1500));
    var d=await get('/api/servers/'+S.activeId+'/players');
    if(!d.players||!d.players.length){el.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px">No players connected</div>';return}
    el.innerHTML=d.players.map(p=>'<div class="player-row"><div class="player-info"><span class="player-name">'+esc(p.name)+'</span><span class="player-id">'+p.steam_id+'</span></div><button class="btn btn-outline-danger btn-sm" data-kick="'+p.steam_id+'" data-player="'+esc(p.name)+'">Kick</button></div>').join('')
  }catch(e){el.innerHTML='<div style="text-align:center;color:var(--rose);font-size:12px;padding:20px">Failed to scan</div>'}
}
async function kickPlayer(steamId,playerName){
  var reason='';
  var ok=await showModal('Kick '+playerName,'<p>Kick <strong>'+esc(playerName)+'</strong> from the server?</p><div class="modal-body-field" style="margin-top:14px"><label for="modal-kick-reason">Reason (optional)</label><input type="text" id="modal-kick-reason" placeholder="Enter reason..."></div>','Kick','btn-danger',()=>{reason=$('#modal-kick-reason')?.value||''});
  if(!ok)return;
  try{await post('/api/servers/'+S.activeId+'/players/kick',{steam_id:steamId,reason:reason});toast('Kicked '+playerName,'success');refreshPlayers()}catch(e){toast('Failed to kick','error')}
}

// ─── users ───
async function loadUsers(){
  try{const users=await get('/api/users');const el=$('#users-list-section');if(!el)return;
    el.innerHTML=users.map(u=>'<div class="user-list-item"><div class="user-list-name">'+esc(u.username)+'</div><div style="display:flex;align-items:center;gap:6px"><span class="user-list-role '+u.role+'">'+u.role+'</span><div class="user-list-actions"><button class="btn btn-outline btn-sm" data-edit="'+esc(u.username)+'">Edit</button>'+(u.role!=='admin'?'<button class="btn btn-outline-danger btn-sm" data-delete="'+esc(u.username)+'">Del</button>':'')+'</div></div></div>').join('')
  }catch(e){}
}

// ─── modal ───
let _modalResolve=null;
function showModal(title,html,confirmText='Confirm',confirmClass='btn-primary',onConfirm=null){
  return new Promise(resolve=>{
    const overlay=$('#modal-overlay');if(!overlay)return resolve(false);
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    $('#modal-title').textContent=title;$('#modal-body').innerHTML=html;overlay.style.display='flex';
    const cfm=$('#modal-confirm');cfm.className='btn '+confirmClass;cfm.textContent=confirmText;cfm.focus();
    cfm.onclick=()=>{if(onConfirm)onConfirm();overlay.style.display='none';resolve(true)};
    $('#modal-cancel').onclick=()=>{overlay.style.display='none';resolve(false)};
    overlay.onclick=e=>{if(e.target===overlay){overlay.style.display='none';resolve(false)}};
    const onEsc=e=>{if(e.key==='Escape'){overlay.style.display='none';resolve(false);document.removeEventListener('keydown',onEsc)}};
    document.addEventListener('keydown',onEsc);
    setTimeout(()=>{const inp=overlay.querySelector('input');if(inp)inp.focus()},100)
  })
}

async function showNewServerModal(){
  const ok=await showModal('Create Server',
    '<div class="modal-body-field"><label for="modal-name">Name</label><input type="text" id="modal-name" placeholder="My Server"></div>'+
    '<div class="modal-body-field"><label for="modal-port">Port</label><input type="number" id="modal-port" value="8211" min="1024" max="65535"></div>'+
    '<div class="modal-body-field"><label for="modal-players">Max Players</label><input type="number" id="modal-players" value="32" min="1"></div>',
    'Create Server');
  if(!ok)return;
  const name=$('#modal-name').value.trim()||'Unnamed';
  const port=parseInt($('#modal-port').value,10);
  const players=parseInt($('#modal-players').value,10);
  if(isNaN(port)||port<1024||port>65535){toast('Port must be 1024-65535','error');return}
  if(isNaN(players)||players<1){toast('Players must be >= 1','error');return}
  try{
    const s=await post('/api/servers',{name,port});
    if(!s?.id){toast('Failed to create','error');return}
    await put('/api/servers/'+s.id+'/settings',{settings:{ServerPlayerMaxNum:players,ServerName:name,PublicPort:port}});
    await loadServers();
    selectServer(s.id);
    toast('Server created','success')
  }catch(e){toast('Error: '+(e.message||'Unknown'),'error')}
}

async function showRenameModal(){
  const s=S.servers.find(x=>x.id===S.activeId);if(!s)return;
  const ok=await showModal('Rename','<div class="modal-body-field"><label for="modal-rename-input">Name</label><input type="text" id="modal-rename-input" value="'+esc(s.name)+'"></div>','Rename');
  if(!ok)return;
  const name=$('#modal-rename-input').value.trim();if(!name)return toast('Required','error');
  try{await put('/api/servers/'+S.activeId+'/rename',{name});await loadServers();toast('Renamed','success')}catch(e){toast('Failed','error')}
}

async function deleteServer(){
  const s=S.servers.find(x=>x.id===S.activeId);if(!s)return;
  const ok=await showModal('Delete','<p>Delete <strong>'+esc(s.name)+'</strong>?</p><p style="margin-top:8px;color:var(--rose);font-size:11px">Files remain on disk.</p>','Delete','btn-danger');
  if(!ok)return;
  try{await del('/api/servers/'+S.activeId);S.activeId=null;await loadServers();showEmptyState();toast('Deleted','info')}catch(e){toast('Failed','error')}
}

async function showAddUserModal(){
  const ok=await showModal('Add User',
    '<div class="modal-body-field"><label for="modal-uname">Username</label><input type="text" id="modal-uname"></div>'+
    '<div class="modal-body-field"><label for="modal-upass">Password</label><input type="password" id="modal-upass"></div>'+
    '<div class="modal-body-field"><label for="modal-urole">Role</label><select id="modal-urole" style="width:100%;padding:11px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:13px"><option value="user">User</option><option value="admin">Admin</option></select></div>','Add');
  if(!ok)return;
  const u=$('#modal-uname').value.trim(),p=$('#modal-upass').value,r=$('#modal-urole').value;
  if(!u||!p){toast('Fill all fields','error');return}
  try{await post('/api/users',{username:u,password:p,role:r});await loadUsers();toast('User added','success')}catch(e){toast('Failed: '+e.message,'error')}
}

async function showEditUserModal(username){
  const ok=await showModal('Edit '+username,
    '<div class="modal-body-field"><label>New Password (leave blank to keep)</label><input type="password" id="modal-upass"></div>'+
    '<div class="modal-body-field"><label>Role</label><select id="modal-urole" style="width:100%;padding:11px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:13px"><option value="user">User</option><option value="admin">Admin</option></select></div>','Save');
  if(!ok)return;
  const p=$('#modal-upass').value,r=$('#modal-urole').value,body={};if(p)body.password=p;if(r)body.role=r;
  try{await put('/api/users/'+username,body);await loadUsers();toast('Updated','success')}catch(e){toast('Failed','error')}
}

async function deleteUserModal(username){
  const ok=await showModal('Delete','<p>Delete user <strong>'+esc(username)+'</strong>?</p>','Delete','btn-danger');
  if(!ok)return;
  try{await del('/api/users/'+username);await loadUsers();toast('Deleted','info')}catch(e){toast('Cannot delete','error')}
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ─── event bindings ───
function on(id,ev,fn){const el=typeof id==='string'?document.getElementById(id):id;if(el)el.addEventListener(ev,fn)}
on('btn-goto-login','click',()=>showPage('login'));
on('btn-login','click',doLogin);
on('btn-back-landing','click',()=>showPage('landing'));
on('btn-logout','click',doLogout);
on('btn-new-user','click',showAddUserModal);
on('btn-refresh-players','click',refreshPlayers);
on('btn-new-server','click',showNewServerModal);
on('btn-empty-create','click',showNewServerModal);
on('btn-rename','click',showRenameModal);
on('btn-delete','click',deleteServer);
on('btn-save-settings','click',saveSettings);
on('btn-reset-settings','click',resetSettings);
on('btn-send-command','click',sendCommand);
on('btn-clear-console','click',()=>{$('#console-output').innerHTML=''});
on('btn-install-steamcmd','click',installSteamcmd);
on('btn-install-server','click',installServer);
on('console-input','keydown',e=>{if(e.key==='Enter')sendCommand()});

// delegated clicks
document.addEventListener('click',e=>{
  var step=e.target.closest('.setting-field-step');
  if(step){
    var inp=document.querySelector('[data-key="'+step.dataset.target+'"]');
    if(inp){
      var stepVal=parseFloat(inp.step)||1;
      var val=parseFloat(inp.value)||0;
      if(step.dataset.dir==='up')val+=stepVal;else val-=stepVal;
      inp.value=Number.isInteger(parseFloat(inp.step))?Math.round(val):parseFloat(val.toFixed(3));
      inp.dispatchEvent(new Event('input',{bubbles:true}))
    }
    return
  }
  var card=e.target.closest('.preset-card');
  if(card){applyPreset(card.dataset.preset);return}
  if(e.target.classList.contains('tab')){
    const n=e.target.dataset.tab;if(e.target.classList.contains('active'))return;
    $$('.tab').forEach(t=>t.classList.remove('active'));e.target.classList.add('active');
    $$('.tab-pane').forEach(p=>p.classList.remove('active'));
    const pane=$('#tab-'+n);if(pane)pane.classList.add('active');
    if(n==='settings')loadSettings();if(n==='console')connectConsole(S.activeId);if(n==='install')checkSteamcmd()
  }
  if(e.target.classList.contains('sidenav-item')){
    const view=e.target.dataset.view;$$('.sidenav-item').forEach(s=>s.classList.remove('active'));e.target.classList.add('active');
    $('#view-servers').style.display=view==='servers'?'':'none';$('#view-users').style.display=view==='users'?'':'none';
    S.view=view;
    if(view==='servers'){renderServerList();const sv=S.servers.find(x=>x.id===S.activeId);if(sv)showServerView(sv);else showEmptyState()}
    if(view==='users')loadUsers()
  }
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.classList.contains('conn-copy')){const el=document.getElementById(btn.dataset.target);if(el)navigator.clipboard.writeText(el.textContent).then(()=>toast('Copied','success'))}
  if(btn.dataset.edit)showEditUserModal(btn.dataset.edit);
  if(btn.dataset.delete)deleteUserModal(btn.dataset.delete);
  if(btn.dataset.kick)kickPlayer(btn.dataset.kick,btn.dataset.player||'Player');
});
$('#server-list').addEventListener('click',e=>{const li=e.target.closest('li[data-id]');if(li)selectServer(li.dataset.id)});

// start/stop/restart
const makeAction=(action)=>{
  const btn=$('#btn-'+action);if(!btn)return;
  btn.addEventListener('click',async()=>{
    btn.disabled=true;const orig=btn.textContent;btn.innerHTML='<span class="btn-working">&#9679;</span> Working...';
    try{
      await post('/api/servers/'+S.activeId+'/'+action);
      toast(action==='start'?'Starting...':action==='stop'?'Stopped':'Restarting...','success');
      // Update local state immediately so UI reflects new status
      var sv=S.servers.find(x=>x.id===S.activeId);
      if(sv){
        if(action==='start'){sv.status='running';sv.uptime_seconds=0}
        else if(action==='stop'){sv.status='stopped';sv.uptime_seconds=0;sv.player_count=0}
        else if(action==='restart'){sv.status='running';sv.uptime_seconds=0;sv.player_count=0}
      }
    }catch(e){toast('Failed','error')}
    await loadServers();
    var sv2=S.servers.find(x=>x.id===S.activeId);
    if(sv2){refreshServerView(sv2);if(sv2.status==='running'){startUptimeTick(sv2);connectConsole(S.activeId)}}
    btn.disabled=false;btn.textContent=orig
  })
};
makeAction('start');makeAction('stop');makeAction('restart');

// settings search
document.addEventListener('input',e=>{
  if(e.target.id==='sidebar-search'&&S.view==='servers')renderServerList();
  if(e.target.id==='settings-search'){clearTimeout(e.target._t);e.target._t=setTimeout(()=>renderSettings(S.currentSettings,e.target.value),150)}
});
document.addEventListener('change',e=>{if(e.target.id==='settings-preset')applyPreset(e.target.value)});

// keyboard
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.target.id==='login-username'||e.target.id==='login-password'))doLogin();
  if(e.ctrlKey||e.metaKey)return;if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key==='n'||e.key==='N'){e.preventDefault();showNewServerModal()}
  if(e.key==='F2'&&S.activeId){e.preventDefault();showRenameModal()}
});

tryAutoLogin();
