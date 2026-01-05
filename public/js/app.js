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
    elements.pageTitle.textContent = 'User Enforcement Panel';
    elements.backBtn.classList.remove('hidden');

    const adminStatusHtml = state.isBotAdmin 
        ? `<span class="status-badge status-admin"><i data-lucide="check-circle" style="width:12px; height:12px;"></i> Bot is Admin</span>`
        : `<span class="status-badge status-public" style="background:#ffebee; color:#c62828;"><i data-lucide="alert-circle" style="width:12px; height:12px;"></i> Bot NOT Admin</span>`;

    elements.content.innerHTML = `
        <div class="section-header">
            <p style="color: var(--tg-theme-hint-color); margin-top: -10px; margin-bottom: 20px; font-size: 14px; text-align: center;">Configure how users are punished for violations</p>
        </div>

        <div class="admin-grid">
            <!-- Timeout Rules Card -->
            <div class="section card-rule">
                <h2><i data-lucide="clock" style="color: #f59e0b;"></i> Timeout Rules</h2>
                <p class="rule-desc">Temporarily restrict users after violations</p>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>Enable Timeout</span>
                        <input type="checkbox" id="timeout-enabled" ${state.settings.timeoutEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Timeout Duration</label>
                        <select id="timeout-duration-select" onchange="toggleCustom('timeout')">
                            <option value="10m" ${state.settings.timeoutDuration === '10m' ? 'selected' : ''}>10 Minutes</option>
                            <option value="1h" ${state.settings.timeoutDuration === '1h' ? 'selected' : ''}>1 Hour</option>
                            <option value="6h" ${state.settings.timeoutDuration === '6h' ? 'selected' : ''}>6 Hours</option>
                            <option value="1d" ${state.settings.timeoutDuration === '1d' ? 'selected' : ''}>1 Day</option>
                            <option value="custom" ${state.settings.timeoutDuration && !['10m','1h','6h','1d'].includes(state.settings.timeoutDuration) ? 'selected' : ''}>Custom ⌨️</option>
                        </select>
                        <input type="text" id="timeout-custom" class="hidden" placeholder="e.g. 2h" value="${state.settings.timeoutDuration || ''}">
                    </div>
                    <div class="field">
                        <label>Trigger After X Violations</label>
                        <input type="number" id="timeout-limit" value="${state.settings.timeoutLimit}" min="1">
                    </div>
                    <label class="toggle-label">
                        <span>Notify User</span>
                        <input type="checkbox" id="timeout-notify" ${state.settings.timeoutNotify !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                </div>
            </div>

            <!-- Ban Rules Card -->
            <div class="section card-rule">
                <h2><i data-lucide="ban" style="color: #ef4444;"></i> Ban Rules</h2>
                <p class="rule-desc">Ban users after repeated violations</p>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>Enable Ban</span>
                        <input type="checkbox" id="ban-enabled" ${state.settings.banEnabled !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Ban Type</label>
                        <select id="ban-type" onchange="toggleBanType()">
                            <option value="temporary" ${state.settings.banType === 'temporary' ? 'selected' : ''}>Temporary</option>
                            <option value="permanent" ${state.settings.banType === 'permanent' ? 'selected' : ''}>Permanent</option>
                        </select>
                    </div>
                    <div class="field" id="ban-duration-field">
                        <label>Ban Duration</label>
                        <select id="ban-duration-select" onchange="toggleCustom('ban')">
                            <option value="1d" ${state.settings.banDuration === '1d' ? 'selected' : ''}>1 Day</option>
                            <option value="7d" ${state.settings.banDuration === '7d' ? 'selected' : ''}>7 Days</option>
                            <option value="30d" ${state.settings.banDuration === '30d' ? 'selected' : ''}>30 Days</option>
                            <option value="custom" ${state.settings.banDuration && !['1d','7d','30d'].includes(state.settings.banDuration) ? 'selected' : ''}>Custom ⌨️</option>
                        </select>
                        <input type="text" id="ban-custom" class="hidden" placeholder="e.g. 90d" value="${state.settings.banDuration || ''}">
                    </div>
                    <div class="field">
                        <label>Trigger After X Violations</label>
                        <input type="number" id="ban-limit" value="${state.settings.banLimit}" min="1">
                    </div>
                    <label class="toggle-label">
                        <span>Notify User</span>
                        <input type="checkbox" id="ban-notify" ${state.settings.banNotify !== false ? 'checked' : ''} class="tg-toggle">
                    </label>
                </div>
            </div>

            <!-- Spam Control Card -->
            <div class="section card-rule">
                <h2><i data-lucide="shield-alert" style="color: #3b82f6;"></i> Spam Control</h2>
                <p class="rule-desc">Control message spam automatically</p>
                <div class="field-group">
                    <label class="toggle-label">
                        <span>Enable Spam Detection</span>
                        <input type="checkbox" id="spam-enabled" ${state.settings.spamControlEnabled ? 'checked' : ''} class="tg-toggle">
                    </label>
                    <div class="field">
                        <label>Max Messages</label>
                        <input type="number" id="spam-max" value="${state.settings.spamMax || 5}" min="1">
                    </div>
                    <div class="field">
                        <label>Time Window (seconds)</label>
                        <input type="number" id="spam-window" value="${state.settings.spamWindow || 10}" min="1">
                    </div>
                    <div class="field">
                        <label>Action on Spam</label>
                        <select id="spam-action">
                            <option value="warning" ${state.settings.spamAction === 'warning' ? 'selected' : ''}>Warning</option>
                            <option value="timeout" ${state.settings.spamAction === 'timeout' ? 'selected' : ''}>Timeout</option>
                            <option value="ban" ${state.settings.spamAction === 'ban' ? 'selected' : ''}>Ban</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Violation Summary Card -->
            <div class="section card-rule">
                <h2><i data-lucide="bar-chart-3"></i> Violation Logic Preview</h2>
                <p class="rule-desc">How enforcement escalates</p>
                <div class="preview-logic">
                    <div class="logic-item">Violation 1 → Warning</div>
                    <div class="logic-item">Violation ${state.settings.timeoutLimit} → Timeout</div>
                    <div class="logic-item">Violation ${state.settings.banLimit} → Ban</div>
                </div>
                <button class="btn btn-secondary btn-small" style="margin-top: 10px;">Edit Escalation Order</button>
            </div>
        </div>

        <div class="sticky-footer">
            <button class="btn" id="save-settings"><i data-lucide="save"></i> Save Changes</button>
            <button class="btn btn-secondary" id="reset-rules"><i data-lucide="rotate-ccw"></i> Reset Rules</button>
            <button class="btn btn-secondary" id="preview-btn"><i data-lucide="eye"></i> Preview</button>
        </div>
    `;

    document.getElementById('save-settings').onclick = saveSettings;
    document.getElementById('reset-rules').onclick = () => {
        if(confirm('Restore default rules?')) {
            // Restore defaults logic
            showToast('Rules reset to default');
        }
    };
    
    toggleCustom('timeout');
    toggleCustom('ban');
    toggleBanType();
    lucide.createIcons();
}

function toggleCustom(type) {
    const select = document.getElementById(`${type}-duration-select`);
    const customInput = document.getElementById(`${type}-custom`);
    if (select.value === 'custom') {
        customInput.classList.remove('hidden');
    } else {
        customInput.classList.add('hidden');
    }
}

function toggleBanType() {
    const type = document.getElementById('ban-type').value;
    const field = document.getElementById('ban-duration-field');
    if (type === 'permanent') {
        field.classList.add('hidden');
    } else {
        field.classList.remove('hidden');
    }
}

async function saveSettings() {
    const settings = {
        timeoutEnabled: document.getElementById('timeout-enabled').checked,
        timeoutDuration: document.getElementById('timeout-duration-select').value === 'custom' 
            ? document.getElementById('timeout-custom').value 
            : document.getElementById('timeout-duration-select').value,
        timeoutLimit: parseInt(document.getElementById('timeout-limit').value),
        timeoutNotify: document.getElementById('timeout-notify').checked,
        
        banEnabled: document.getElementById('ban-enabled').checked,
        banType: document.getElementById('ban-type').value,
        banDuration: document.getElementById('ban-duration-select').value === 'custom' 
            ? document.getElementById('ban-custom').value 
            : document.getElementById('ban-duration-select').value,
        banLimit: parseInt(document.getElementById('ban-limit').value),
        banNotify: document.getElementById('ban-notify').checked,
        
        spamControlEnabled: document.getElementById('spam-enabled').checked,
        spamMax: parseInt(document.getElementById('spam-max').value),
        spamWindow: parseInt(document.getElementById('spam-window').value),
        spamAction: document.getElementById('spam-action').value
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