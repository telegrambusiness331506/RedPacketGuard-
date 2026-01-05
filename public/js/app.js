const tg = window.Telegram.WebApp;
tg.expand();

const state = {
    view: 'public', // 'public' or 'admin'
    isAdmin: false,
    settings: {
        banLimit: 10,
        timeoutLimit: 2,
        timeoutDuration: 24,
        banDuration: 7,
        spamControlEnabled: true
    },
    currentGroupId: null
};

const elements = {
    content: document.getElementById('content'),
    pageTitle: document.getElementById('page-title'),
    backBtn: document.getElementById('back-btn'),
    toast: document.getElementById('toast')
};

function showToast(msg) {
    elements.toast.textContent = msg;
    elements.toast.classList.remove('hidden');
    setTimeout(() => elements.toast.classList.add('hidden'), 3000);
}

function init() {
    // Check if we have initData from Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        if (tg.initDataUnsafe.chat) {
            state.currentGroupId = tg.initDataUnsafe.chat.id;
        }
        checkPermissions();
    } else {
        renderPublicView();
    }

    elements.backBtn.onclick = () => {
        renderPublicView();
    };
}

async function checkPermissions() {
    try {
        const response = await fetch('/api/check-permission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData })
        });
        const data = await response.json();
        state.isAdmin = data.isAdmin;
        state.groupName = data.groupName || 'Current Group';
        state.isBotAdmin = data.isBotAdmin;
        if (data.settings) {
            state.settings = data.settings;
        }
        renderPublicView();
    } catch (e) {
        console.error(e);
        renderPublicView();
    }
}

function renderPublicView() {
    state.view = 'public';
    elements.pageTitle.textContent = 'Bot Information';
    elements.backBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
    elements.backBtn.classList.add('hidden');

    const botUsername = 'RedPacketGuardBot'; 
    
    let html = `
        <div class="section">
            <h2><i data-lucide="plus-circle"></i> Add Me To Your Chat</h2>
            <div class="card" style="display: flex; flex-direction: column; gap: 12px; border: none; background: transparent; padding: 0;">
                <button class="btn" style="margin-top: 0; width: 100%;" onclick="tg.openTelegramLink('https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+can_invite_users+pin_messages')">
                    <i data-lucide="users"></i> Add Me To Your Group
                </button>
                <p style="margin: -4px 0 8px 0; font-size: 12px; color: var(--tg-theme-hint-color); text-align: center;">This Forward For Choice Group For Make Bot The Admin</p>
                
                <button class="btn btn-secondary" style="margin-top: 0; width: 100%;" onclick="tg.openTelegramLink('https://t.me/${botUsername}?startchannel=true&admin=post_messages+edit_messages+delete_messages+invite_users')">
                    <i data-lucide="megaphone"></i> Add Me To Your Channel
                </button>
                <p style="margin: -4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color); text-align: center;">Change With Only Updated News</p>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="info"></i> About Red Packet Guard</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-wrapper"><i data-lucide="shield"></i></div>
                    <div>
                        <strong>Bot Name:</strong>
                        <p style="margin: 4px 0 0 0;">Red Packet Guard</p>
                    </div>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: var(--tg-theme-hint-color);">Monitors groups to filter and remove unauthorized Red Packet codes, ensuring only valid messages pass through.</p>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="gavel"></i> Current Enforcement</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #f59e0b;"><i data-lucide="clock"></i></div>
                    <div>
                        <strong>Time Out:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Triggered after <strong>${state.settings.timeoutLimit}</strong> violations.</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color);">Duration: ${state.settings.timeoutDuration} hours</p>
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #ef4444;"><i data-lucide="ban"></i></div>
                    <div>
                        <strong>Ban:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Triggered after <strong>${state.settings.banLimit}</strong> violations.</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color);">Duration: ${state.settings.banDuration} days</p>
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper" style="color: ${state.settings.spamControlEnabled ? '#10b981' : '#6b7280'};"><i data-lucide="shield-check"></i></div>
                    <div>
                        <strong>Spam Control:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">${state.settings.spamControlEnabled ? 'Active' : 'Disabled'}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="list-checks"></i> Message Rules</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-wrapper"><i data-lucide="type"></i></div>
                    <span>Text only messages</span>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper"><i data-lucide="regex"></i></div>
                    <span>A–Z and 0–9 characters only</span>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper"><i data-lucide="ruler"></i></div>
                    <span>Exactly 8 or 10 characters long</span>
                </div>
            </div>
        </div>
    `;

    if (state.isAdmin) {
        html += `<button class="btn" onclick="renderAdminView()"><i data-lucide="settings"></i> Admin Controls</button>`;
    }

    elements.content.innerHTML = html;
    lucide.createIcons();
}

function renderAdminView() {
    state.view = 'admin';
    elements.pageTitle.textContent = 'Admin Settings';
    elements.backBtn.classList.remove('hidden');

    const adminStatusHtml = state.isBotAdmin 
        ? `<span class="status-badge status-admin"><i data-lucide="check-circle" style="width:12px; height:12px;"></i> Bot is Admin</span>`
        : `<span class="status-badge status-public" style="background:#ffebee; color:#c62828;"><i data-lucide="alert-circle" style="width:12px; height:12px;"></i> Bot NOT Admin</span>`;

    elements.content.innerHTML = `
        <div class="section">
            <h2><i data-lucide="sliders"></i> Group Configuration</h2>
            <div class="card">
                <label for="group-select" style="justify-content: space-between;">
                    <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="users"></i> Active Group</span>
                    ${adminStatusHtml}
                </label>
                <select id="group-select" style="margin-bottom:20px;">
                    <option value="default">${state.groupName}</option>
                </select>
                
                <div class="card" style="padding: 12px; margin-bottom: 20px; border: 1.5px solid var(--tg-theme-secondary-bg-color);">
                    <label><i data-lucide="clock" style="color: #f59e0b;"></i> Timeout Settings</label>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-size: 14px; flex: 1;">Violations:</span>
                            <input type="number" id="timeout-limit" value="${state.settings.timeoutLimit}" min="1" max="100" style="width: 80px;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-size: 14px; flex: 1;">Duration (hours):</span>
                            <input type="number" id="timeout-duration" value="${state.settings.timeoutDuration}" min="1" max="168" style="width: 80px;">
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 12px; margin-bottom: 20px; border: 1.5px solid var(--tg-theme-secondary-bg-color);">
                    <label><i data-lucide="ban" style="color: #ef4444;"></i> Ban Settings</label>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-size: 14px; flex: 1;">Violations:</span>
                            <input type="number" id="ban-limit" value="${state.settings.banLimit}" min="1" max="100" style="width: 80px;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-size: 14px; flex: 1;">Duration (days):</span>
                            <input type="number" id="ban-duration" value="${state.settings.banDuration}" min="1" max="365" style="width: 80px;">
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 12px; margin-bottom: 24px; border: 1.5px solid var(--tg-theme-secondary-bg-color);">
                    <label style="justify-content: space-between;">
                        <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="shield-check"></i> Spam Control</span>
                        <input type="checkbox" id="spam-control" ${state.settings.spamControlEnabled ? 'checked' : ''} style="width: auto;">
                    </label>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color);">Enable automatic warnings and restrictions.</p>
                </div>
                
                <button class="btn" id="save-settings"><i data-lucide="save"></i> Save Settings</button>
                <button class="btn btn-secondary" onclick="renderPublicView()" style="margin-top:12px;"><i data-lucide="x"></i> Cancel</button>
            </div>
        </div>
    `;

    document.getElementById('save-settings').onclick = saveSettings;
    lucide.createIcons();
}

async function saveSettings() {
    const banLimit = parseInt(document.getElementById('ban-limit').value);
    const banDuration = parseInt(document.getElementById('ban-duration').value);
    const timeoutLimit = parseInt(document.getElementById('timeout-limit').value);
    const timeoutDuration = parseInt(document.getElementById('timeout-duration').value);
    const spamControlEnabled = document.getElementById('spam-control').checked;

    const settings = { banLimit, banDuration, timeoutLimit, timeoutDuration, spamControlEnabled };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: tg.initData,
                chatId: state.currentGroupId,
                settings: settings
            })
        });
        
        if (response.ok) {
            state.settings = settings;
            showToast('Settings saved successfully!');
            setTimeout(renderPublicView, 1000);
        } else {
            showToast('Failed to save settings');
        }
    } catch (e) {
        showToast('Error connecting to server');
    }
}

init();