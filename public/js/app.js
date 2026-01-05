const tg = window.Telegram.WebApp;
tg.expand();

const state = {
    view: 'public',
    isAdmin: false,
    settings: {
        banLimit: 5,
        timeoutLimit: 3,
        timeoutDuration: '1h',
        banDuration: '7d',
        banType: 'temporary',
        spamControlEnabled: true,
        spamMax: 5,
        spamWindow: 10,
        spamAction: 'warning'
    },
    currentGroupId: null,
    availableGroups: []
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
        state.availableGroups = data.groups || [];
        if (data.settings) {
            state.settings = { ...state.settings, ...data.settings };
        }
        renderPublicView();
    } catch (e) {
        console.error(e);
        renderPublicView();
    }
}

function renderPublicView() {
    state.view = 'public';
    elements.pageTitle.textContent = 'Red Packet Guard';
    elements.backBtn.classList.add('hidden');

    const botUsername = 'RedPacketGuard_Bot'; 
    
    let html = `
        <div class="section">
            <h2><i data-lucide="plus-circle" class="icon-sm"></i> Add Me To Your Chat</h2>
            <div class="card">
                <p class="card-desc">Protect your group from spam and unauthorized codes.</p>
                <button class="btn btn-primary" onclick="tg.openTelegramLink('https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+can_invite_users+pin_messages')">
                    <i data-lucide="users"></i> Add Bot to Group
                </button>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="list" class="icon-sm"></i> Choice Group</h2>
            <div class="card">
                <div class="select-wrapper">
                    <select id="group-selector" class="tg-select" onchange="selectGroup(this.value, this.options[this.selectedIndex].text)">
                        <option value="">Choose a group...</option>
                        ${state.availableGroups.map(group => `
                            <option value="${group.id}" ${state.currentGroupId === group.id ? 'selected' : ''}>${group.title}</option>
                        `).join('')}
                    </select>
                    <div class="select-arrow">
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
                <p class="hint-text">Select the group where you have administrator privileges.</p>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="shield" class="icon-sm"></i> Enforcement Panel</h2>
            <div class="card">
                <button class="btn ${!state.currentGroupId ? 'btn-disabled' : 'btn-primary'}" onclick="renderAdminView()" ${!state.currentGroupId ? 'disabled' : ''}>
                    <i data-lucide="settings"></i> Configure Rules
                </button>
                ${!state.currentGroupId ? '<p class="error-text">Please select a group first</p>' : `<p class="success-text">Active: ${state.groupName}</p>`}
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="info" class="icon-sm"></i> Current Rules</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-circle warning"><i data-lucide="clock"></i></div>
                    <div class="card-info">
                        <strong>Time Out</strong>
                        <span>After ${state.settings.timeoutLimit} violations</span>
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-circle error"><i data-lucide="ban"></i></div>
                    <div class="card-info">
                        <strong>Ban</strong>
                        <span>After ${state.settings.banLimit} violations</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    elements.content.innerHTML = html;
    lucide.createIcons();
}

function renderAdminView() {
    state.view = 'admin';
    elements.pageTitle.textContent = 'CONFIGURE RULES';
    elements.backBtn.classList.remove('hidden');

    elements.content.innerHTML = \`
        <div class="admin-grid">
            <div class="section card">
                <h2 class="rule-title">TIMEOUT</h2>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>Enable Timeout</span>
                        <input type="checkbox" id="timeout-enabled" \${state.settings.timeoutEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Duration:</label>
                        <div class="segmented-control">
                            <button class="segment-btn \${state.settings.timeoutDuration === '10m' ? 'active' : ''}" onclick="setPreset('timeout', '10m')">10m</button>
                            <button class="segment-btn \${state.settings.timeoutDuration === '1h' ? 'active' : ''}" onclick="setPreset('timeout', '1h')">1h</button>
                            <button class="segment-btn \${state.settings.timeoutDuration === '1d' ? 'active' : ''}" onclick="setPreset('timeout', '1d')">1d</button>
                            <button class="segment-btn \${state.settings.timeoutDuration === 'custom' ? 'active' : ''}" onclick="setPreset('timeout', 'custom')">Custom</button>
                        </div>
                    </div>
                    <div class="field">
                        <label>Trigger After: [ <span id="timeout-limit-val">\${state.settings.timeoutLimit}</span> ]</label>
                        <input type="range" id="timeout-limit" value="\${state.settings.timeoutLimit}" min="1" max="20" oninput="document.getElementById('timeout-limit-val').innerText = this.value">
                    </div>
                </div>
            </div>

            <div class="section card">
                <h2 class="rule-title">BAN</h2>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>Enable Ban</span>
                        <input type="checkbox" id="ban-enabled" \${state.settings.banEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Type:</label>
                        <div class="segmented-control">
                            <button class="segment-btn \${state.settings.banType === 'temporary' ? 'active' : ''}" onclick="setBanType('temporary')">Temp</button>
                            <button class="segment-btn \${state.settings.banType === 'permanent' ? 'active' : ''}" onclick="setBanType('permanent')">Perm</button>
                        </div>
                    </div>
                    <div class="field">
                        <label>Trigger After: [ <span id="ban-limit-val">\${state.settings.banLimit}</span> ]</label>
                        <input type="range" id="ban-limit" value="\${state.settings.banLimit}" min="1" max="50" oninput="document.getElementById('ban-limit-val').innerText = this.value">
                    </div>
                </div>
            </div>
        </div>

        <div class="sticky-footer">
            <button class="btn btn-primary" id="save-all">Save All Changes</button>
        </div>
    \`;

    document.getElementById('save-all').onclick = saveAllSettings;
    lucide.createIcons();
}

window.setPreset = (type, val) => {
    state.settings[\`\${type}Duration\`] = val;
    renderAdminView();
};

window.setBanType = (val) => {
    state.settings.banType = val;
    renderAdminView();
};

window.selectGroup = async (id, title) => {
    if (!id) return;
    state.currentGroupId = id;
    state.groupName = title;
    showToast(\`Selected: \${title}\`);
    
    try {
        const response = await fetch('/api/check-permission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg.initData,
                chatId: id 
            })
        });
        const data = await response.json();
        if (data.settings) {
            state.settings = { ...state.settings, ...data.settings };
        }
        renderPublicView();
    } catch (e) {
        console.error(e);
    }
};

async function saveAllSettings() {
    const settings = {
        ...state.settings,
        timeoutEnabled: document.getElementById('timeout-enabled').checked,
        timeoutLimit: parseInt(document.getElementById('timeout-limit').value),
        banEnabled: document.getElementById('ban-enabled').checked,
        banLimit: parseInt(document.getElementById('ban-limit').value)
    };

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
            showToast('Settings saved!');
            setTimeout(renderPublicView, 1000);
        }
    } catch (e) {
        showToast('Error saving settings');
    }
}

init();