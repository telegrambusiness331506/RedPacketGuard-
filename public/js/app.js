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
    elements.backBtn.classList.add('hidden');

    let html = `
        <div class="section">
            <h2>About Red Packet Guard</h2>
            <div class="card">
                <p><strong>Bot Name:</strong> Red Packet Guard</p>
                <p>Monitors groups to filter and remove unauthorized Red Packet codes, ensuring only valid messages pass through.</p>
            </div>
        </div>

        <div class="section">
            <h2>Message Rules</h2>
            <div class="card">
                <ul>
                    <li>Text only messages</li>
                    <li>A–Z and 0–9 characters only</li>
                    <li>Exactly 8 or 10 characters long</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>Enforcement System</h2>
            <div class="card">
                <p><strong>Time Out:</strong> Temporary restriction for repeat violations.</p>
                <p><strong>Ban:</strong> Permanent removal for excessive spamming.</p>
            </div>
        </div>

        <div class="section">
            <h2>Privacy & Help</h2>
            <div class="card">
                <p>We do not store personal data. Only user IDs are used for enforcement.</p>
                <p>For support, contact the group administrator.</p>
            </div>
        </div>
    `;

    if (state.isAdmin) {
        html += `<button class="btn" onclick="renderAdminView()">Admin Controls</button>`;
    }

    elements.content.innerHTML = html;
}

function renderAdminView() {
    state.view = 'admin';
    elements.pageTitle.textContent = 'Admin Settings';
    elements.backBtn.classList.remove('hidden');

    elements.content.innerHTML = `
        <div class="section">
            <h2>Group Configuration</h2>
            <div class="card">
                <label for="group-select">Active Group</label>
                <select id="group-select" style="width:100%; padding:10px; border-radius:8px; margin-bottom:15px;">
                    <option value="default">Current Group</option>
                </select>
                
                <label for="ban-limit">Ban Spamming Limit (1-100)</label>
                <input type="number" id="ban-limit" value="${state.settings.banLimit}" min="1" max="100">
                
                <p style="margin-top:15px;"></p>

                <label for="timeout-limit">Time Out Spamming Limit (1-100)</label>
                <input type="number" id="timeout-limit" value="${state.settings.timeoutLimit}" min="1" max="100">
                
                <button class="btn" id="save-settings">Save Settings</button>
            </div>
        </div>
    `;

    document.getElementById('save-settings').onclick = saveSettings;
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