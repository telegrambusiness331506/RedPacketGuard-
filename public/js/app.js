const tg = window.Telegram.WebApp;
tg.expand();

const state = {
    view: 'public', // 'public' or 'admin'
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
    elements.pageTitle.textContent = 'Bot Information';
    elements.backBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
    elements.backBtn.classList.add('hidden');

    const botUsername = 'RedPacketGuard_Bot'; 
    
    let html = `
        <div class="section">
            <h2><i data-lucide="plus-circle"></i> Add Me To Your Chat</h2>
            <div class="card" style="display: flex; flex-direction: column; gap: 12px; border: none; background: transparent; padding: 0;">
                <button class="btn" style="margin-top: 0; width: 100%;" onclick="tg.openTelegramLink('https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+can_invite_users+pin_messages')">
                    <i data-lucide="users"></i> Add Me To Your Group
                </button>
                <p style="margin: -4px 0 8px 0; font-size: 12px; color: var(--tg-theme-hint-color); text-align: center;">This Forward For Choice Group For Make Bot The Admin</p>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="list"></i> Select Group to Configure</h2>
            <div class="card" style="padding: 12px;">
                ${state.availableGroups.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${state.availableGroups.map(group => `
                            <button class="btn btn-secondary" style="margin: 0; justify-content: flex-start;" onclick="selectGroup('${group.id}', '${group.title}')">
                                <i data-lucide="message-square"></i> ${group.title}
                            </button>
                        `).join('')}
                    </div>
                ` : `
                    <p style="text-align: center; color: var(--tg-theme-hint-color); font-size: 14px;">No groups added yet. Add the bot to a group first.</p>
                `}
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="gavel"></i> User Enforcement Panel</h2>
            <div class="card" style="padding: 0; border: none; background: transparent;">
                <button class="btn" onclick="renderAdminView()" style="margin-top: 0;" ${!state.currentGroupId ? 'disabled' : ''}>
                    <i data-lucide="settings"></i> Configure ${state.groupName || 'Enforcement Rules'}
                </button>
                ${!state.currentGroupId ? '<p style="margin: 8px 0 0 0; font-size: 12px; color: #ef4444; text-align: center;">Please select a group first</p>' : ''}
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="info"></i> Current Rules</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #f59e0b;"><i data-lucide="clock"></i></div>
                    <div>
                        <strong>Time Out:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Triggered after <strong>${state.settings.timeoutLimit}</strong> violations.</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color);">Duration: ${state.settings.timeoutDuration === 'custom' ? state.settings.timeoutCustomValue : state.settings.timeoutDuration}</p>
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #ef4444;"><i data-lucide="ban"></i></div>
                    <div>
                        <strong>Ban:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Triggered after <strong>${state.settings.banLimit}</strong> violations.</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--tg-theme-hint-color);">Type: ${state.settings.banType} (${state.settings.banDuration === 'custom' ? state.settings.banCustomValue : state.settings.banDuration})</p>
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
    elements.pageTitle.textContent = 'USER ENFORCEMENT PANEL';
    elements.backBtn.classList.remove('hidden');

    elements.content.innerHTML = `
        <div class="section-header">
            <p style="color: var(--tg-theme-hint-color); margin-top: -10px; margin-bottom: 20px; font-size: 14px; text-align: center; text-transform: uppercase;">Configure punishments for user violations</p>
        </div>

        <div class="admin-grid">
            <!-- TIMEOUT Card -->
            <div class="section card-rule">
                <h2 class="rule-title">TIMEOUT</h2>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>[ ON / OFF ] Enable Timeout</span>
                        <input type="checkbox" id="timeout-enabled" ${state.settings.timeoutEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Timeout Duration:</label>
                        <div class="segmented-control">
                            <button class="segment-btn ${state.settings.timeoutDuration === '10m' ? 'active' : ''}" onclick="setPreset('timeout', '10m')">10m</button>
                            <button class="segment-btn ${state.settings.timeoutDuration === '1h' ? 'active' : ''}" onclick="setPreset('timeout', '1h')">1h</button>
                            <button class="segment-btn ${state.settings.timeoutDuration === '6h' ? 'active' : ''}" onclick="setPreset('timeout', '6h')">6h</button>
                            <button class="segment-btn ${state.settings.timeoutDuration === '1d' ? 'active' : ''}" onclick="setPreset('timeout', '1d')">1d</button>
                            <button class="segment-btn ${state.settings.timeoutDuration === 'custom' ? 'active' : ''}" onclick="setPreset('timeout', 'custom')">Custom</button>
                        </div>
                        <div id="timeout-custom-box" class="${state.settings.timeoutDuration === 'custom' ? '' : 'hidden'}" style="margin-top: 10px;">
                            <label>Custom Time (min / hr / day):</label>
                            <input type="text" id="timeout-custom" placeholder="e.g. 2h" value="${state.settings.timeoutCustomValue || ''}">
                        </div>
                    </div>
                    <div class="field">
                        <label>Trigger After Violations: [ <span id="timeout-limit-val">${state.settings.timeoutLimit}</span> ]</label>
                        <input type="range" id="timeout-limit" value="${state.settings.timeoutLimit}" min="1" max="20" oninput="document.getElementById('timeout-limit-val').innerText = this.value">
                    </div>
                    <button class="btn btn-save-rule" onclick="saveSubRule('timeout')">Save Timeout Rule</button>
                </div>
            </div>

            <!-- BAN Card -->
            <div class="section card-rule">
                <h2 class="rule-title">BAN</h2>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>[ ON / OFF ] Enable Ban</span>
                        <input type="checkbox" id="ban-enabled" ${state.settings.banEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Ban Type:</label>
                        <div class="segmented-control">
                            <button class="segment-btn ${state.settings.banType === 'temporary' ? 'active' : ''}" onclick="setBanType('temporary')">Temporary</button>
                            <button class="segment-btn ${state.settings.banType === 'permanent' ? 'active' : ''}" onclick="setBanType('permanent')">Permanent</button>
                        </div>
                    </div>
                    <div id="ban-temp-section" class="${state.settings.banType === 'permanent' ? 'hidden' : ''}">
                        <div class="field" style="margin-top: 10px;">
                            <label>Ban Duration:</label>
                            <div class="segmented-control">
                                <button class="segment-btn ${state.settings.banDuration === '1d' ? 'active' : ''}" onclick="setPreset('ban', '1d')">1d</button>
                                <button class="segment-btn ${state.settings.banDuration === '7d' ? 'active' : ''}" onclick="setPreset('ban', '7d')">7d</button>
                                <button class="segment-btn ${state.settings.banDuration === '30d' ? 'active' : ''}" onclick="setPreset('ban', '30d')">30d</button>
                                <button class="segment-btn ${state.settings.banDuration === 'custom' ? 'active' : ''}" onclick="setPreset('ban', 'custom')">Custom</button>
                            </div>
                            <div id="ban-custom-box" class="${state.settings.banDuration === 'custom' ? '' : 'hidden'}" style="margin-top: 10px;">
                                <label>Custom Days:</label>
                                <input type="number" id="ban-custom" placeholder="e.g. 90" value="${state.settings.banCustomValue || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="field">
                        <label>Trigger After Violations: [ <span id="ban-limit-val">${state.settings.banLimit}</span> ]</label>
                        <input type="range" id="ban-limit" value="${state.settings.banLimit}" min="1" max="50" oninput="document.getElementById('ban-limit-val').innerText = this.value">
                    </div>
                    <button class="btn btn-save-rule" onclick="saveSubRule('ban')">Save Ban Rule</button>
                </div>
            </div>

            <!-- SPAM CONTROL Card -->
            <div class="section card-rule">
                <h2 class="rule-title">SPAM CONTROL</h2>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>[ ON / OFF ] Enable Spam Protection</span>
                        <input type="checkbox" id="spam-enabled" ${state.settings.spamControlEnabled ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Max Messages: [ <span id="spam-max-val">${state.settings.spamMax}</span> ]</label>
                        <input type="range" id="spam-max" value="${state.settings.spamMax}" min="1" max="20" oninput="document.getElementById('spam-max-val').innerText = this.value">
                    </div>
                    <div class="field">
                        <label>Time Window: [ <span id="spam-window-val">${state.settings.spamWindow}</span> ] seconds</label>
                        <input type="range" id="spam-window" value="${state.settings.spamWindow}" min="1" max="60" oninput="document.getElementById('spam-window-val').innerText = this.value">
                    </div>
                    <div class="field">
                        <label>Action on Spam:</label>
                        <div class="segmented-control">
                            <button class="segment-btn ${state.settings.spamAction === 'warning' ? 'active' : ''}" onclick="setSpamAction('warning')">Warning</button>
                            <button class="segment-btn ${state.settings.spamAction === 'timeout' ? 'active' : ''}" onclick="setSpamAction('timeout')">Timeout</button>
                            <button class="segment-btn ${state.settings.spamAction === 'ban' ? 'active' : ''}" onclick="setSpamAction('ban')">Ban</button>
                        </div>
                    </div>
                    <div id="spam-timeout-box" class="${state.settings.spamAction === 'timeout' ? '' : 'hidden'}" style="margin-top: 10px;">
                        <label>If Timeout: Duration [ 30m ]</label>
                    </div>
                    <button class="btn btn-save-rule" onclick="saveSubRule('spam')">Save Spam Rule</button>
                </div>
            </div>

            <!-- VIOLATION FLOW Card -->
            <div class="section card-rule">
                <h2 class="rule-title">VIOLATION FLOW (PREVIEW)</h2>
                <div class="preview-logic">
                    <div class="logic-item">Violation 1 → Warning</div>
                    <div class="logic-item">Violation ${state.settings.timeoutLimit} → Timeout (Custom Time)</div>
                    <div class="logic-item">Violation ${state.settings.banLimit} → Ban (Custom Days)</div>
                </div>
            </div>
        </div>

        <div class="sticky-footer">
            <button class="btn" id="save-all" style="flex: 2;">Save All Rules</button>
            <button class="btn btn-secondary" id="reset-rules" style="flex: 1;">Reset</button>
            <button class="btn btn-secondary" id="test-btn" style="flex: 1;">Test</button>
        </div>
    `;

    document.getElementById('save-all').onclick = saveAllSettings;
    document.getElementById('reset-rules').onclick = resetSettings;
    document.getElementById('test-btn').onclick = () => showToast('Simulating user violation...');
    lucide.createIcons();
}

window.setPreset = (type, val) => {
    state.settings[`${type}Duration`] = val;
    renderAdminView();
};

window.setBanType = (val) => {
    state.settings.banType = val;
    renderAdminView();
};

window.setSpamAction = (val) => {
    state.settings.spamAction = val;
    renderAdminView();
};

window.selectGroup = async (id, title) => {
    state.currentGroupId = id;
    state.groupName = title;
    showToast(`Selected group: ${title}`);
    
    // Fetch settings for this group
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

window.saveSubRule = (ruleName) => {
    showToast(`${ruleName.charAt(0).toUpperCase() + ruleName.slice(1)} rule saved locally.`);
};

async function saveAllSettings() {
    const settings = {
        ...state.settings,
        timeoutEnabled: document.getElementById('timeout-enabled').checked,
        timeoutLimit: parseInt(document.getElementById('timeout-limit').value),
        timeoutCustomValue: document.getElementById('timeout-custom') ? document.getElementById('timeout-custom').value : state.settings.timeoutCustomValue,
        banEnabled: document.getElementById('ban-enabled').checked,
        banLimit: parseInt(document.getElementById('ban-limit').value),
        banCustomValue: document.getElementById('ban-custom') ? document.getElementById('ban-custom').value : state.settings.banCustomValue,
        spamControlEnabled: document.getElementById('spam-enabled').checked,
        spamMax: parseInt(document.getElementById('spam-max').value),
        spamWindow: parseInt(document.getElementById('spam-window').value)
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
            showToast('All rules saved successfully!');
            setTimeout(renderPublicView, 1000);
        } else {
            showToast('Failed to save rules');
        }
    } catch (e) {
        showToast('Error connecting to server');
    }
}

function resetSettings() {
    if(confirm('Restore default rules?')) {
        state.settings = {
            banLimit: 5,
            timeoutLimit: 3,
            timeoutDuration: '1h',
            banDuration: '7d',
            banType: 'temporary',
            spamControlEnabled: true,
            spamMax: 5,
            spamWindow: 10,
            spamAction: 'warning'
        };
        renderAdminView();
        showToast('Rules reset to default');
    }
}

init();