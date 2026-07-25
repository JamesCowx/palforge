const API = {
    async get(path) { const r = await fetch(path); return r.json(); },
    async post(path, body) {
        const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json().catch(() => ({}));
    },
    async put(path, body) {
        const r = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json().catch(() => ({}));
    },
    async del(path) {
        const r = await fetch(path, { method: 'DELETE' });
        if (!r.ok) throw new Error(await r.text());
        return r.json().catch(() => ({}));
    }
};

let state = {
    servers: [],
    activeServerId: null,
    consoleWs: null,
    installWs: null,
    currentSettings: {},
    uptimeInterval: null,
    networkInterval: null,
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ════════ TOAST ════════ */
function toast(msg, type = 'info') {
    const c = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    el.onclick = () => { el.classList.add('removing'); el.addEventListener('animationend', () => el.remove(), { once: true }); };
    c.appendChild(el);
    setTimeout(() => { if (el.parentNode) { el.classList.add('removing'); el.addEventListener('animationend', () => el.remove(), { once: true }); } }, 4200);
}

/* ════════ SERVER LIST ════════ */
async function loadServers() {
    try { state.servers = await API.get('/api/servers'); } catch (e) { /* */ }
    renderServerList();
    if (state.activeServerId) {
        const s = state.servers.find(x => x.id === state.activeServerId);
        if (s) renderServerView(s);
        else { state.activeServerId = null; showEmptyState(); }
    }
}

function renderServerList() {
    const list = $('#server-list');
    const filter = ($('#sidebar-search')?.value || '').toLowerCase();
    let shown = filter ? state.servers.filter(s => s.name.toLowerCase().includes(filter) || s.id.toLowerCase().includes(filter)) : state.servers;

    if (!shown.length) {
        list.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:11px;line-height:1.6;">${filter ? `No servers match "${E(filter)}"` : 'No servers yet<br><span style="font-size:10px">Press <b style="color:var(--accent)">N</b> to create one</span>'}</div>`;
        return;
    }
    list.innerHTML = shown.map(s => `
        <li class="${s.id === state.activeServerId ? 'active' : ''}" data-id="${s.id}">
            <div class="server-list-info">
                <div class="server-list-icon">&#9830;</div>
                <div>
                    <div class="server-list-name">${E(s.name)}</div>
                    <div class="server-list-port">:${s.port} &middot; ${s.uptime_seconds > 0 ? fmtUptime(s.uptime_seconds) : 'offline'}</div>
                </div>
            </div>
            <span class="server-list-status ${s.status}">${s.status}</span>
        </li>
    `).join('');
    list.querySelectorAll('li').forEach(li => li.addEventListener('click', () => selectServer(li.dataset.id)));
}

function selectServer(id) {
    state.activeServerId = id;
    const s = state.servers.find(x => x.id === id);
    if (s) {
        renderServerList();
        renderServerView(s);
        connectConsole(id);
        checkSteamcmdStatus();
        startUptimeTick(s);
    }
}

function showEmptyState() {
    $('#empty-state').style.display = 'flex';
    $('#server-view').style.display = 'none';
    if (state.consoleWs) { state.consoleWs.close(); state.consoleWs = null; }
    if (state.uptimeInterval) { clearInterval(state.uptimeInterval); state.uptimeInterval = null; }
}

/* ════════ UPTIME / LIVE STATS ════════ */
function startUptimeTick(s) {
    if (state.uptimeInterval) clearInterval(state.uptimeInterval);
    if (s.status !== 'running') return;
    state.uptimeInterval = setInterval(() => {
        const sv = state.servers.find(x => x.id === state.activeServerId);
        if (!sv || sv.status !== 'running') { clearInterval(state.uptimeInterval); return; }
        animVal('ov-uptime', fmtUptime(sv.uptime_seconds));
        animVal('ov-players', `${sv.player_count || 0} / ${sv.settings.ServerPlayerMaxNum || 32}`);
        if (sv.memory_mb > 0) animVal('ov-memory', sv.memory_mb.toFixed(0) + ' MB');
        if (sv.max_players_seen > 0) $('#ov-peak').textContent = `Peak: ${sv.max_players_seen}`;
    }, 1000);
}

function animVal(id, newVal) {
    const el = document.getElementById(id);
    if (!el || el.textContent === newVal) return;
    el.textContent = newVal;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'numberPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
}

function fmtUptime(s) {
    if (!s || s <= 0) return '--';
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m ${sec}s`;
    return m ? `${m}m ${sec}s` : `${sec}s`;
}

function renderServerView(s) {
    $('#empty-state').style.display = 'none';
    $('#server-view').style.display = 'flex';
    $('#server-name').textContent = s.name;
    $('#server-subtitle').textContent = `Port ${s.port}  &middot;  ID ${s.id}`;
    $('#server-status').textContent = s.status;
    $('#server-status').className = `status-badge status-${s.status}`;

    $('#btn-start').disabled = s.status !== 'stopped' || !s.installed;
    $('#btn-stop').disabled = s.status !== 'running';
    $('#btn-restart').disabled = s.status !== 'running';

    const colors = { running: 'var(--success)', stopped: 'var(--danger)', starting: 'var(--warning)', stopping: 'var(--warning)' };
    const ovStatus = $('#ov-status');
    ovStatus.textContent = s.status.charAt(0).toUpperCase() + s.status.slice(1);
    ovStatus.style.color = colors[s.status] || 'var(--text-primary)';

    $('#ov-uptime').textContent = s.status === 'running' ? fmtUptime(s.uptime_seconds) : '--';
    $('#ov-players').textContent = `${s.player_count || 0} / ${s.settings.ServerPlayerMaxNum || 32}`;
    $('#ov-peak').textContent = s.max_players_seen > 0 ? `Peak: ${s.max_players_seen}` : '';
    const mem = s.memory_mb || 0;
    const memEl = $('#ov-memory');
    memEl.textContent = mem > 0 ? mem.toFixed(0) + ' MB' : '--';
    memEl.style.color = mem > 0 ? 'var(--accent)' : 'var(--text-muted)';

    $('#info-id').textContent = s.id;
    $('#info-port').textContent = s.port;
    $('#info-maxplayers').textContent = s.settings.ServerPlayerMaxNum || 32;
    $('#info-path').textContent = s.install_dir;
}

/* ════════ RENAME ════════ */
async function showRenameModal() {
    const s = state.servers.find(x => x.id === state.activeServerId);
    if (!s) return;
    showModal('Rename Server',
        `<div class="modal-body-field"><label>Server Name</label><input type="text" id="modal-rename-input" value="${E(s.name)}" /></div>`,
        async () => {
            const name = document.getElementById('modal-rename-input').value.trim();
            if (!name) return toast('Name cannot be empty', 'error');
            await API.put(`/api/servers/${state.activeServerId}/rename`, { name });
            await loadServers();
            toast(`Renamed to "${name}"`, 'success');
        }, 'Rename');
}

/* ════════ SETTINGS ════════ */
const CATS = {
    'Server': ['ServerName','ServerDescription','ServerPassword','AdminPassword','ServerPlayerMaxNum','PublicPort','PublicIP','Region','RCONEnabled','RCONPort','bUseAuth','BanListURL','ServerNamePrefix','CoopPlayerMaxNum','bIsMultiplay','bIsPvP','Difficulty'],
    'World': ['DayTimeSpeedRate','NightTimeSpeedRate'],
    'Rates': ['ExpRate','PalCaptureRate','PalSpawnNumRate','PalDamageRateAttack','PalDamageRateDefense','PlayerDamageRateAttack','PlayerDamageRateDefense','EnemyDropItemRate','CollectionDropRate','CollectionObjectHpRate','CollectionObjectRespawnSpeedRate','BuildObjectDamageRate','BuildObjectDeteriorationDamageRate','WorkSpeedRate'],
    'Player': ['PlayerStomachDecreaceRate','PlayerStaminaDecreaceRate','PlayerAutoHPRegeneRate','PlayerAutoHpRegeneRateInSleep','DeathPenalty','bEnablePlayerToPlayerDamage','bEnableFriendlyFire','bEnableNonLoginPenalty','bEnableFastTravel','bIsStartLocationSelectByMap','bExistPlayerAfterLogout','bEnableDefenseOtherGuildPlayer','DropItemMaxNum','DropItemMaxNum_UNKO'],
    'Pal': ['PalStomachDecreaceRate','PalStaminaDecreaceRate','PalAutoHPRegeneRate','PalAutoHpRegeneRateInSleep','PalEggDefaultHatchingTime'],
    'Guild': ['BaseCampMaxNum','BaseCampWorkerMaxNum','bAutoResetGuildNoOnlinePlayers','AutoResetGuildTimeNoOnlinePlayers','GuildPlayerMaxNum','bCanPickupOtherGuildDeathPenaltyDrop','DropItemAliveMaxHours'],
    'Combat': ['bEnableInvaderEnemy','bActiveUNKO','bEnableAimAssistPad','bEnableAimAssistKeyboard'],
};
function getCat(k) { for (const [c, ks] of Object.entries(CATS)) if (ks.includes(k)) return c; return 'Other'; }

async function loadSettings() {
    const s = state.servers.find(x => x.id === state.activeServerId);
    if (!s) return;
    state.currentSettings = await API.get(`/api/servers/${state.activeServerId}/settings`);
    renderSettings(state.currentSettings, $('#settings-search')?.value || '');
}

function renderSettings(settings, filter = '') {
    const container = $('#settings-container');
    let entries = Object.entries(settings);
    if (filter) { const q = filter.toLowerCase(); entries = entries.filter(([k]) => k.toLowerCase().includes(q)); }

    const grouped = {}; entries.forEach(([k, v]) => { const c = getCat(k); (grouped[c] ??= []).push([k, v]); });
    const order = Object.keys(CATS);
    let html = '';
    for (const cat of order) {
        if (!grouped[cat]?.length) continue;
        html += `<div class="settings-category"><div class="settings-category-title">${cat}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">`;
        grouped[cat].forEach(([k, v]) => { html += renderField(k, v); });
        html += `</div></div>`;
    }
    if (grouped['Other']?.length) {
        html += `<div class="settings-category"><div class="settings-category-title">Other</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">`;
        grouped['Other'].forEach(([k, v]) => { html += renderField(k, v); });
        html += `</div></div>`;
    }
    container.innerHTML = html || `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">No settings match filter</div>`;
}

function renderField(key, value) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^b([A-Z])/, '$1').replace(/^./, s => s.toUpperCase()).trim();
    if (typeof value === 'boolean') {
        return `<div class="setting-field"><span class="setting-field-label">${label}</span><label class="toggle-switch"><input type="checkbox" data-key="${key}" data-type="bool" ${value ? 'checked' : ''} /><span class="toggle-slider"></span></label></div>`;
    } else if (typeof value === 'number') {
        const step = Number.isInteger(value) ? '1' : 'any';
        return `<div class="setting-field"><span class="setting-field-label">${label}</span><input type="number" class="setting-field-input" data-key="${key}" data-type="number" value="${value}" step="${step}" /></div>`;
    } else {
        return `<div class="setting-field"><span class="setting-field-label">${label}</span><input type="text" class="setting-field-input" data-key="${key}" data-type="string" value="${E(String(value || ''))}" /></div>`;
    }
}

async function saveSettings() {
    const fields = $$('[data-key]');
    const settings = {};
    fields.forEach(f => {
        const key = f.dataset.key;
        let val;
        if (f.dataset.type === 'bool') val = f.checked;
        else if (f.dataset.type === 'number') val = f.value === '' ? 0 : parseFloat(f.value);
        else val = f.value;
        settings[key] = val;
    });
    if (!Object.keys(settings).length) return;
    const btn = $('#btn-save-settings');
    btn.disabled = true; btn.textContent = 'Saving...';
    try { await API.put(`/api/servers/${state.activeServerId}/settings`, { settings }); await loadServers(); toast('Settings saved', 'success'); }
    catch (e) { toast('Failed to save', 'error'); }
    btn.disabled = false; btn.textContent = 'Save Changes';
}

async function resetSettings() {
    const def = await API.get('/api/servers/defaults/settings');
    state.currentSettings = def;
    renderSettings(def, $('#settings-search')?.value || '');
    toast('Reset to defaults (unsaved)', 'info');
}

async function applyPreset(id) {
    if (!id) return;
    const presets = await API.get('/api/servers/defaults/presets');
    const p = presets[id]; if (!p) return;
    const def = await API.get('/api/servers/defaults/settings');
    state.currentSettings = { ...def, ...p.settings };
    renderSettings(state.currentSettings, $('#settings-search')?.value || '');
    toast(`Applied "${p.label}" preset (unsaved)`, 'info');
    $('#settings-preset').value = '';
}

/* ════════ CONSOLE ════════ */
function connectConsole(serverId) {
    if (state.consoleWs) { state.consoleWs.close(); state.consoleWs = null; }
    const output = $('#console-output');
    if (!output) return;
    output.innerHTML = '';

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/console/${serverId}`);
    state.consoleWs = ws;
    ws.onmessage = e => { if (e.data !== '__PING__') appendLog(e.data); };
    ws.onclose = () => { state.consoleWs = null; };
    ws.onerror = () => { state.consoleWs = null; };
}

function appendLog(text) {
    const output = $('#console-output');
    const span = document.createElement('span');
    span.className = 'log-line';
    const lo = text.toLowerCase();
    if (/error|fail|fatal|critical|exception|traceback/.test(lo)) span.classList.add('log-error');
    else if (/warn|warning/.test(lo)) span.classList.add('log-warn');
    else if (/success|complete|loaded|started|connected|ready/.test(lo)) span.classList.add('log-success');
    else if (/debug|trace|verbose/.test(lo)) span.classList.add('log-debug');
    else if (/pal|creature|spawn|monster|boss/.test(lo)) span.classList.add('log-pal');
    else if (/^\[.*\]\s*$/.test(text) || text.length < 3) span.classList.add('log-dim');
    span.textContent = text;
    output.appendChild(span);
    output.appendChild(document.createTextNode('\n'));
    while (output.children.length > 600) { output.removeChild(output.firstChild); output.removeChild(output.firstChild); }
    if ($('#console-autoscroll')?.checked) output.scrollTop = output.scrollHeight;
}

async function sendCommand() {
    const input = $('#console-input');
    const cmd = input.value.trim();
    if (!cmd) return;
    appendLog(`> ${cmd}`);
    try { await API.post(`/api/servers/${state.activeServerId}/command`, { command: cmd }); }
    catch (e) { toast('Failed to send command', 'error'); }
    input.value = ''; input.focus();
}

/* ════════ INSTALL ════════ */
async function checkSteamcmdStatus() {
    try {
        const r = await API.get('/api/install/steamcmd/status');
        const el = $('#steamcmd-status-text'), dot = $('#steamcmd-dot');
        if (el) { el.textContent = r.installed ? 'Installed & Ready' : 'Not Installed'; el.style.color = r.installed ? 'var(--success)' : 'var(--danger)'; }
        if (dot) dot.className = 'install-dot ' + (r.installed ? 'ok' : 'bad');
        const btn = $('#btn-install-steamcmd');
        if (btn) btn.style.display = r.installed ? 'none' : '';
    } catch (e) { /* */ }
}

async function installSteamcmd() {
    const btn = $('#btn-install-steamcmd');
    btn.disabled = true; btn.textContent = 'Installing...';
    try { await API.post('/api/install/steamcmd'); toast('SteamCMD installed', 'success'); } catch (e) { toast('Failed', 'error'); }
    btn.disabled = false; btn.textContent = 'Install';
    checkSteamcmdStatus();
}

async function installServer() {
    const output = $('#install-output');
    output.style.display = 'block';
    output.textContent = 'Connecting...\n';
    if (state.installWs) state.installWs.close();
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/install/${state.activeServerId}`);
    state.installWs = ws;
    ws.onmessage = e => {
        output.textContent += e.data + '\n';
        output.scrollTop = output.scrollHeight;
        if (e.data.startsWith('__COMPLETE__')) { ws.close(); toast('Server installed', 'success'); loadServers().then(() => { const sv = state.servers.find(x => x.id === state.activeServerId); if (sv) renderServerView(sv); }); }
    };
    ws.onclose = () => { state.installWs = null; $('#btn-install-server').disabled = false; $('#btn-install-server').textContent = 'Install / Update PalWorld Server'; };
    ws.onerror = () => { state.installWs = null; $('#btn-install-server').disabled = false; };
    $('#btn-install-server').disabled = true; $('#btn-install-server').textContent = 'Installing...';
}

/* ════════ SYSTEM ════════ */
async function updateSystemInfo() {
    try {
        const i = await API.get('/api/system');
        $('#sys-cpu').textContent = `CPU ${i.cpu_percent || 0}%`;
        $('#sys-ram').textContent = `RAM ${i.memory_percent || 0}%`;
    } catch (e) { /* */ }
}

async function updateConnectionInfo() {
    if (!state.activeServerId) return;
    try {
        const net = await API.get('/api/system/network');
        const port = state.servers.find(x => x.id === state.activeServerId)?.port || 8211;
        const lanEl = document.getElementById('conn-lan');
        const wanEl = document.getElementById('conn-wan');
        const portEl = document.getElementById('conn-port');
        if (lanEl) lanEl.textContent = `${net.local_ip}:${port}`;
        if (wanEl) wanEl.textContent = `${net.public_ip}:${port}`;
        if (portEl) portEl.textContent = port;
    } catch (e) { /* */ }
}

/* ════════ MODAL ════════ */
function showModal(title, bodyHtml, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary') {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    $('#modal-overlay').style.display = 'flex';
    $('#modal-confirm').className = `btn ${confirmClass}`;
    $('#modal-confirm').textContent = confirmText;
    $('#modal-confirm').onclick = async () => {
        $('#modal-confirm').disabled = true;
        try { await onConfirm(); } catch (e) { /* */ }
        $('#modal-confirm').disabled = false;
        $('#modal-overlay').style.display = 'none';
    };
    $('#modal-cancel').onclick = () => { $('#modal-overlay').style.display = 'none'; };
    $('#modal-overlay').onclick = e => { if (e.target === $('#modal-overlay')) $('#modal-overlay').style.display = 'none'; };
    setTimeout(() => { const inp = document.querySelector('#modal-name, #modal-rename-input'); if (inp) inp.focus(); }, 120);
}

async function showNewServerModal() {
    showModal('Create New Server',
        `<div class="modal-body-field"><label>Server Name</label><input type="text" id="modal-name" placeholder="My PalWorld Server" /></div>
         <div class="modal-body-field"><label>Port</label><input type="number" id="modal-port" value="8211" /></div>
         <div class="modal-body-field"><label>Max Players</label><input type="number" id="modal-players" value="32" /></div>`,
        async () => {
            const name = document.getElementById('modal-name').value.trim() || 'Unnamed Server';
            const port = parseInt(document.getElementById('modal-port').value) || 8211;
            const players = parseInt(document.getElementById('modal-players').value) || 32;
            const s = await API.post('/api/servers', { name, port });
            await API.put(`/api/servers/${s.id}/settings`, { settings: { ServerPlayerMaxNum: players, ServerName: name, PublicPort: port } });
            await loadServers();
            selectServer(s.id);
            toast(`"${name}" created`, 'success');
        }, 'Create Server');
}

async function deleteServer() {
    const s = state.servers.find(x => x.id === state.activeServerId);
    if (!s) return;
    showModal('Delete Server',
        `<p>Permanently delete <strong style="color:var(--text-primary)">${E(s.name)}</strong>?</p><p style="margin-top:8px;color:var(--danger);font-size:11px;">This cannot be undone. Server files remain on disk.</p>`,
        async () => { await API.del(`/api/servers/${state.activeServerId}`); state.activeServerId = null; await loadServers(); showEmptyState(); toast('Server deleted', 'info'); },
        'Delete', 'btn-danger');
}

function E(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }

/* ════════ EVENT BINDINGS ════════ */
document.addEventListener('input', e => {
    if (e.target.id === 'sidebar-search') renderServerList();
    if (e.target.id === 'settings-search') renderSettings(state.currentSettings, e.target.value);
});

document.addEventListener('change', e => {
    if (e.target.id === 'settings-preset') applyPreset(e.target.value);
});

document.addEventListener('click', e => {
    if (e.target.classList.contains('tab')) {
        const name = e.target.dataset.tab;
        $$('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        $$('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(`tab-${name}`);
        if (pane) pane.classList.add('active');
        if (name === 'settings') loadSettings();
        if (name === 'console') connectConsole(state.activeServerId);
        if (name === 'install') checkSteamcmdStatus();
    }
});

$('#btn-new-server').addEventListener('click', showNewServerModal);
$('#btn-rename').addEventListener('click', showRenameModal);

document.addEventListener('click', e => {
    if (e.target.classList.contains('conn-copy')) {
        const key = e.target.dataset.target;
        const el = document.getElementById(key);
        if (!el) return;
        navigator.clipboard.writeText(el.textContent).then(() => toast('Copied to clipboard', 'success'));
    }
});

const withLoading = (btnId, action, label, okMsg, errMsg) => {
    const btn = $(btnId);
    btn.addEventListener('click', async () => {
        btn.disabled = true; const orig = btn.textContent;
        btn.innerHTML = `<span style="display:inline-block;animation:statusBreathe 0.8s ease-in-out infinite;">&#9679;</span> Working...`;
        try { await action(); toast(okMsg, 'success'); } catch (e) { toast(errMsg, 'error'); }
        await loadServers();
        if (state.activeServerId) {
            const s = state.servers.find(x => x.id === state.activeServerId);
            if (s) { renderServerView(s); if (s.status === 'running') { startUptimeTick(s); connectConsole(state.activeServerId); } }
        }
        btn.disabled = false; btn.textContent = label;
    });
};

withLoading('#btn-start', () => API.post(`/api/servers/${state.activeServerId}/start`), 'Start', 'Server starting...', 'Failed to start');
withLoading('#btn-stop', () => API.post(`/api/servers/${state.activeServerId}/stop`), 'Stop', 'Server stopped', 'Failed to stop');
withLoading('#btn-restart', () => API.post(`/api/servers/${state.activeServerId}/restart`), 'Restart', 'Server restarting...', 'Failed to restart');

$('#btn-delete').addEventListener('click', deleteServer);
$('#btn-save-settings').addEventListener('click', saveSettings);
$('#btn-reset-settings').addEventListener('click', resetSettings);
$('#btn-send-command').addEventListener('click', sendCommand);
$('#btn-clear-console').addEventListener('click', () => { $('#console-output').innerHTML = ''; });
$('#btn-install-steamcmd').addEventListener('click', installSteamcmd);
$('#btn-install-server').addEventListener('click', installServer);

$('#console-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendCommand(); });

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); showNewServerModal(); }
    if (e.key === 'F2' && state.activeServerId) { e.preventDefault(); showRenameModal(); }
});

setInterval(loadServers, 6000);
setInterval(() => { updateSystemInfo(); updateConnectionInfo(); }, 10000);

Promise.all([loadServers(), updateSystemInfo(), updateConnectionInfo()]).then(() => {
    if (state.servers.length > 0 && !state.activeServerId) selectServer(state.servers[0].id);
});

// Stop the `> Working...` on the button when server state changes after a few seconds
setInterval(() => {
    if (state.activeServerId) {
        const s = state.servers.find(x => x.id === state.activeServerId);
        if (s) {
            if (s.status === 'stopped') { $('#btn-stop').disabled = true; $('#btn-restart').disabled = true; }
        }
    }
}, 3000);
