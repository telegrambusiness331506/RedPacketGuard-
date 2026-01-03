const tg = window.Telegram.WebApp;
tg.expand();

const state = {
    view: 'public', // 'public' or 'admin'
    isAdmin: false,
    settings: {
        banLimit: 10,
        timeoutLimit: 2
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
        // In a real app, we would verify this on the backend
        // For this demo/task, we'll assume admin if certain conditions are met
        // or provide a toggle for testing
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

    const botUsername = 'RedPacketGuardBot'; // In production, get this from bot.getMe() or via API
    const newsChannelLink = 'https://t.me/RedPacketGuardNews'; // Replace with actual news channel link

    let html = `
        <div class="section">
            <h2><i data-lucide="plus-circle"></i> Add Me To Your Chat</h2>
            <div class="card" style="display: flex; flex-direction: column; gap: 12px; border: none; background: transparent; padding: 0;">
                <button class="btn" style="margin-top: 0; width: 100%;" onclick="window.open('https://t.me/${botUsername}?startgroup=true')">
                    <i data-lucide="users"></i> Add Me To Your Group
                </button>
                <button class="btn btn-secondary" style="margin-top: 0; width: 100%;" onclick="window.open('${newsChannelLink}')">
                    <i data-lucide="megaphone"></i> Bots Updated News
                </button>
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
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #ef4444;"><i data-lucide="ban"></i></div>
                    <div>
                        <strong>Ban:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Triggered after <strong>${state.settings.banLimit}</strong> violations.</p>
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

        <div class="section">
            <h2><i data-lucide="gavel"></i> Enforcement System</h2>
            <div class="card">
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #f59e0b;"><i data-lucide="clock"></i></div>
                    <div>
                        <strong>Time Out:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Temporary restriction for repeat violations.</p>
                    </div>
                </div>
                <div class="card-item">
                    <div class="icon-wrapper" style="color: #ef4444;"><i data-lucide="ban"></i></div>
                    <div>
                        <strong>Ban:</strong>
                        <p style="margin: 4px 0 0 0; font-size: 14px;">Permanent removal for excessive spamming.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2><i data-lucide="help-circle"></i> Privacy & Help</h2>
            <div class="card">
                <p style="font-size: 14px; margin: 0 0 12px 0;">We do not store personal data. Only user IDs are used for enforcement.</p>
                <p style="font-size: 14px; margin: 0;">For support, contact the group administrator.</p>
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

    elements.content.innerHTML = `
        <div class="section">
            <h2><i data-lucide="sliders"></i> Group Configuration</h2>
            <div class="card">
                <label for="group-select"><i data-lucide="users"></i> Active Group</label>
                <select id="group-select" style="margin-bottom:20px;">
                    <option value="default">Current Group</option>
                </select>
                
                <label for="ban-limit"><i data-lucide="user-x" style="color: #ef4444;"></i> Ban Spamming Limit</label>
                <input type="number" id="ban-limit" value="${state.settings.banLimit}" min="1" max="100" style="margin-bottom:20px;">
                
                <label for="timeout-limit"><i data-lucide="timer" style="color: #f59e0b;"></i> Time Out Spamming Limit</label>
                <input type="number" id="timeout-limit" value="${state.settings.timeoutLimit}" min="1" max="100" style="margin-bottom:24px;">
                
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
    const timeoutLimit = parseInt(document.getElementById('timeout-limit').value);

    if (isNaN(banLimit) || banLimit < 1 || banLimit > 100) {
        showToast('Ban limit must be 1-100');
        return;
    }
    if (isNaN(timeoutLimit) || timeoutLimit < 1 || timeoutLimit > 100) {
        showToast('Time out limit must be 1-100');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: tg.initData,
                settings: { banLimit, timeoutLimit }
            })
        });
        
        if (response.ok) {
            state.settings = { banLimit, timeoutLimit };
            showToast('Settings saved successfully!');
        } else {
            showToast('Failed to save settings');
        }
    } catch (e) {
        showToast('Error connecting to server');
    }
}

init();