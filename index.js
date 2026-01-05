require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Keep-alive endpoint for Uptime Robot
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const groupSettings = new Map(); // chat_id -> { timeoutLimit, banLimit, timeoutDuration, banDuration, warningLimit, spamControlEnabled }
const spamTracker = new Map(); // user_id -> { count, lastSpam }
const configSessions = new Map();

// Helper to verify Telegram Web App data
function verifyTelegramWebAppData(initData) {
  if (!initData) return false;
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
    
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}

// API Routes
app.post('/api/check-permission', async (req, res) => {
  const { initData, chatId: bodyChatId } = req.body;
  if (!verifyTelegramWebAppData(initData)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));
  const chatStr = urlParams.get('chat');
  
  let targetChatId = bodyChatId;
  let groupName = 'Current Group';
  
  if (chatStr) {
    const chatData = JSON.parse(chatStr);
    targetChatId = chatData.id.toString();
    groupName = chatData.title || groupName;
  }

  console.log('Permission check for user:', user.id, 'on chat:', targetChatId);

  let isBotAdmin = false;
  let isUserAdminOfGroup = false;
  let currentSettings = { banLimit: 10, timeoutLimit: 2, timeoutDuration: '24h', banDuration: '7d', spamControlEnabled: true };

  if (targetChatId) {
    try {
      const botMe = await bot.getMe();
      const botMember = await bot.getChatMember(targetChatId, botMe.id);
      isBotAdmin = ['administrator', 'creator'].includes(botMember.status);
      
      const userMember = await bot.getChatMember(targetChatId, user.id);
      console.log('User status in group:', userMember.status);
      // Include 'creator' and 'administrator'. 'owner' is often aliased to 'creator' in TG API.
      isUserAdminOfGroup = ['administrator', 'creator', 'owner'].includes(userMember.status);
      
      const saved = groupSettings.get(targetChatId.toString());
      if (saved) {
        currentSettings = { ...currentSettings, ...saved };
        groupName = saved.title || groupName;
      }
    } catch (e) {
      console.error('Permission check error:', e.message);
      // If we can't check permissions, we should fallback to checking if it's one of the tracked groups
      // where the user might have been recorded as an admin.
    }
  }

  // Filter groups to only show those where the user is an admin
  const userAdminGroups = [];
  for (const [id, settings] of groupSettings.entries()) {
    try {
      const member = await bot.getChatMember(id, user.id);
      if (['administrator', 'creator', 'owner'].includes(member.status)) {
        userAdminGroups.push({ id, title: settings.title || `Group ${id}` });
      }
    } catch (e) {
      // Log failure but continue
      console.log(`Failed to check membership for group ${id}:`, e.message);
    }
  }
  
  res.json({ 
    isAdmin: isUserAdminOfGroup,
    groupName: groupName,
    isBotAdmin: isBotAdmin,
    settings: currentSettings,
    groups: userAdminGroups
  }); 
});

app.post('/api/settings', async (req, res) => {
  const { initData, settings, chatId } = req.body;
  if (!verifyTelegramWebAppData(initData)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));

  if (!chatId) {
    return res.status(400).json({ error: 'Missing chatId' });
  }

  try {
    const member = await bot.getChatMember(chatId, user.id);
    const isUserAdminOfGroup = ['administrator', 'creator', 'owner'].includes(member.status);
    
    if (!isUserAdminOfGroup) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    console.log('Updating settings for chat:', chatId, settings);
    const existing = groupSettings.get(chatId.toString()) || {};
    groupSettings.set(chatId.toString(), { ...existing, ...settings });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web Mini App server running at http://0.0.0.0:${PORT}`);
});

// Self-ping logic to keep the service alive if needed
const KEEP_ALIVE_URL = process.env.WEB_APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/health`;

setInterval(() => {
  axios.get(KEEP_ALIVE_URL)
    .then(() => console.log('Self-ping successful'))
    .catch((err) => console.error('Self-ping failed:', err.message));
}, 5 * 60 * 1000); // Every 5 minutes

async function isUserAdmin(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (err) {
    return false;
  }
}

function getHelpMessage(chatId) {
  const defaultSettings = { timeoutLimit: 3, banLimit: 5 };
  const savedSettings = groupSettings.get(chatId.toString()) || {};
  const settings = { ...defaultSettings, ...savedSettings };
  
  return `🛡️ *Red Packet Guard – How It Works*

I monitor this group to keep it safe from spam. Here are the rules I enforce:

*Validation Rules:*
• Only messages with *exactly 8 or 10 characters* are allowed.
• Content must be *alphanumeric* (A-Z, 0-9) only.
• Non-text messages (stickers, media, links, etc.) are automatically deleted.

*Enforcement Flow:*
1. ⚠️ *Warning:* Sent for violations until the limit is reached.
2. ⏳ *Time Out:* Triggered after *${settings.timeoutLimit}* violations.
3. 🚫 *Ban:* Triggered after *${settings.banLimit}* violations.

*Configuration:*
Admins can select this group in the Mini App to change these limits or toggle rules.

📢 *Updates:* [✨ Updated News](https://t.me/BotsUpdatedNews)`;
}

function getHelpKeyboard(chatId = null) {
  const prefix = chatId ? `config_${chatId}_` : 'config_group_';
  return {
    inline_keyboard: [
      [{ text: '🔴 Ban Spamming Limit', callback_data: `${prefix}ban` }],
      [{ text: '🟡 Time Out Spamming Limit', callback_data: `${prefix}timeout` }],
      [{ text: '🔙 Back', callback_data: 'back_to_start' }]
    ]
  };
}

async function showLimitSelection(userId, chatId, messageId = null) {
  const session = configSessions.get(userId);
  const text = `🛡️ *Choose Violation Count*\n\nAction: *${session.action === 'timeout' ? 'Time Out' : 'Ban'}*\n\nSelect a preset below or type a custom number:`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '1', callback_data: 'set_limit_1' }, { text: '3', callback_data: 'set_limit_3' }, { text: '5', callback_data: 'set_limit_5' }],
      [{ text: '10', callback_data: 'set_limit_10' }, { text: '50', callback_data: 'set_limit_50' }, { text: '100', callback_data: 'set_limit_100' }],
      [{ text: '⬅️ Back', callback_data: 'back_to_help' }]
    ]
  };

  if (messageId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: keyboard, parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, text, { reply_markup: keyboard, parse_mode: 'Markdown' });
  }
}

async function showConfirmation(userId, chatId, messageId = null) {
  const session = configSessions.get(userId);
  const text = `🛡️ *Confirmation*\n\n*Summary:*\n• Action: *${session.action === 'timeout' ? 'Time Out' : 'Ban'}*\n• Limit: *${session.limit}* violations\n\nConfirm these settings?`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Confirm', callback_data: 'confirm_config' }],
      [{ text: '⬅️ Back', callback_data: 'back_to_limit' }]
    ]
  };

  if (messageId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: keyboard, parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, text, { reply_markup: keyboard, parse_mode: 'Markdown' });
  }
}

bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;

  if (action === 'privacy_policy') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const privacyPolicy = `🛡️ *Privacy Policy – Red Packet Guard*

Red Packet Guard is a Telegram group moderation bot designed to prevent spam.

*Information Collection:*
We do not store personal data. We temporarily process:
• User ID (for warnings/bans)
• Username (for mentions)
• Message content (for validation)

*Enforcement:*
Settings-based (Defaults: 2 for Timeout, 10 for Ban).

*Exemptions:*
Admins and Owners are exempt from all rules.

No data is sold or shared. All processing is automated.

📢 *Stay Updated:*
[✨ Updated News](https://t.me/BotsUpdatedNews)`;
    await bot.sendMessage(chatId, privacyPolicy, { 
      parse_mode: 'Markdown', 
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Back', callback_data: 'back_to_start' }]]
      }
    });
  }

  if (action.startsWith('config_')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const parts = action.split('_');
    const targetChatId = parts[1];
    const configAction = parts[2];

    if (msg.chat.type !== 'private') {
      const isAdmin = await isUserAdmin(chatId, userId);
      if (!isAdmin) {
        await bot.sendMessage(chatId, "❌ You do not have permission to change group settings.");
        return;
      }
      const botMe = await bot.getMe();
      await bot.sendMessage(chatId, "📲 *Private Configuration Required*\n\nPlease continue in private chat to avoid group spam.", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Go to Private Chat', url: `https://t.me/${botMe.username}?start=config_${chatId}_${configAction}` }]]
        }
      });
      return;
    }

    configSessions.set(userId, { step: 'choose_limit', action: configAction, groupId: targetChatId });
    showLimitSelection(userId, chatId);
  }

  if (action.startsWith('set_limit_')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const limit = parseInt(action.replace('set_limit_', ''));
    const session = configSessions.get(userId);
    if (session) {
      session.limit = limit;
      session.step = 'confirmation';
      showConfirmation(userId, chatId);
    }
  }

  if (action === 'confirm_config') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const session = configSessions.get(userId);
    if (session) {
      const gSettings = groupSettings.get(session.groupId.toString()) || { timeoutLimit: 2, banLimit: 10 };
      if (session.action === 'timeout') gSettings.timeoutLimit = session.limit;
      else gSettings.banLimit = session.limit;
      
      groupSettings.set(session.groupId.toString(), gSettings);
      await bot.editMessageText(`✅ *Settings Saved!*\n\n${session.action === 'timeout' ? 'Time Out' : 'Ban'} limit is now set to *${session.limit}* violations.`, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
      configSessions.delete(userId);
    }
  }

  if (action === 'back_to_help') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const session = configSessions.get(userId);
    const gid = session ? session.groupId : null;
    configSessions.delete(userId);
    await bot.editMessageText(getHelpMessage(gid || chatId), {
      chat_id: chatId,
      message_id: msg.message_id,
      parse_mode: 'Markdown',
      reply_markup: getHelpKeyboard(gid)
    });
  }

  if (action === 'back_to_limit') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const session = configSessions.get(userId);
    if (session) {
      session.step = 'choose_limit';
      showLimitSelection(userId, chatId, msg.message_id);
    }
  }

  if (action === 'back_to_start') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const botUser = await bot.getMe();
    const startMsg = `🛡️ *Red Packet Guard*\n\nI monitor your groups and remove spam messages. Only 8 or 10 character alphanumeric codes are allowed.\n\nUse /help to see rules and configuration.`;
    
    const addToGroupUrl = `https://t.me/${botUser.username}?startgroup=true&admin=delete_messages+restrict_members+can_invite_users+pin_messages`;
    const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const finalWebAppUrl = webAppUrl.startsWith('http') ? webAppUrl : `https://${webAppUrl}`;

    await bot.editMessageText(startMsg, {
      chat_id: chatId,
      message_id: msg.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: addToGroupUrl }],
          [{ text: '⚙️ Configure via Mini App', web_app: { url: finalWebAppUrl } }],
          [{ text: '🛡️ Privacy Policy', callback_data: 'privacy_policy' }]
        ]
      }
    }).catch(err => console.error('Error sending start message:', err.message));
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Always track group title whenever we see a message in a group
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    const existing = groupSettings.get(chatId.toString()) || {};
    if (!existing.title || existing.title !== msg.chat.title) {
      groupSettings.set(chatId.toString(), { ...existing, title: msg.chat.title });
    }
  }

  const session = configSessions.get(userId);
  if (session && msg.chat.type === 'private' && session.step === 'choose_limit' && text && !isNaN(text) && !text.startsWith('/')) {
    session.limit = parseInt(text);
    session.step = 'confirmation';
    showConfirmation(userId, chatId);
    return;
  }

  if (text === '/start' || (text && text.startsWith('/start'))) {
    // Record group info if this happens in a group (though usually start is private)
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      const existing = groupSettings.get(chatId.toString()) || {};
      if (!existing.title) {
        groupSettings.set(chatId.toString(), { ...existing, title: msg.chat.title });
      }
    }

    const startParam = text.split(' ')[1];
    if (startParam && startParam.startsWith('config_')) {
      const parts = startParam.split('_');
      const gid = parts[1];
      const action = parts[2];
      configSessions.set(userId, { step: 'choose_limit', action: action, groupId: gid });
      showLimitSelection(userId, chatId);
      return;
    }
    
    // Only send the welcome message if it's not a configuration session start
    const botUser = await bot.getMe();
    const startMsg = `🛡️ *Red Packet Guard*\n\nI monitor your groups and remove spam messages. Only 8 or 10 character alphanumeric codes are allowed.\n\nUse /help to see rules and configuration.`;
    
    const addToGroupUrl = `https://t.me/${botUser.username}?startgroup=true&admin=delete_messages+restrict_members+can_invite_users+pin_messages`;
    const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const finalWebAppUrl = webAppUrl.startsWith('http') ? webAppUrl : `https://${webAppUrl}`;

    await bot.sendMessage(chatId, startMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: addToGroupUrl }],
          [{ text: '⚙️ Configure via Mini App', web_app: { url: finalWebAppUrl } }],
          [{ text: '🛡️ Privacy Policy', callback_data: 'privacy_policy' }]
        ]
      }
    }).catch(err => console.error('Error sending welcome message:', err.message));
    return;
  }

  if (text === '/help') {
    const isAdmin = await isUserAdmin(chatId, userId);
    if (!isAdmin && msg.chat.type !== 'private') {
      await bot.sendMessage(chatId, "❌ You do not have permission to change group settings.");
      return;
    }
    await bot.sendMessage(chatId, getHelpMessage(chatId), {
      parse_mode: 'Markdown',
      reply_markup: getHelpKeyboard(chatId)
    });
    return;
  }

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    // Save group title if we don't have it or it changed
    const existing = groupSettings.get(chatId.toString()) || {};
    if (!existing.title || existing.title !== msg.chat.title) {
      groupSettings.set(chatId.toString(), { ...existing, title: msg.chat.title });
    }

    const isAdmin = await isUserAdmin(chatId, userId);
    if (isAdmin) return;

    // Use specific group settings or defaults
    const defaultSettings = { 
      timeoutLimit: 3, 
      banLimit: 5, 
      spamControlEnabled: true,
      timeoutEnabled: true,
      banEnabled: true,
      timeoutDuration: '1h',
      banDuration: '7d',
      banType: 'temporary',
      timeoutNotify: true,
      banNotify: true
    };
    const savedSettings = groupSettings.get(chatId.toString()) || {};
    const settings = { ...defaultSettings, ...savedSettings };
    
    // Ensure numeric values are integers
    settings.timeoutLimit = parseInt(settings.timeoutLimit) || 3;
    settings.banLimit = parseInt(settings.banLimit) || 5;

    const user = msg.from;
    const name = user.username ? `@${user.username}` : (user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
    let shouldDelete = false;

    if (!text) {
      shouldDelete = true;
    } else {
      const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(text);
      const isValidLength = text.length === 8 || text.length === 10;
      if (!isAlphanumeric || !isValidLength) shouldDelete = true;
    }

    if (shouldDelete) {
      try {
        // Exempt commands from being deleted ONLY if they are from an admin
        const isCommand = text && text.startsWith('/');
        if (isCommand && !isAdmin) {
          await bot.deleteMessage(chatId, msg.message_id);
          
          // Unique tracker key per chat and user for command spam
          const trackerKey = `${chatId}_${userId}`;
          let userSpam = spamTracker.get(trackerKey) || { count: 0, lastSpam: 0 };
          userSpam.count += 1;
          userSpam.lastSpam = Date.now();
          spamTracker.set(trackerKey, userSpam);

          const defaultSettings = { timeoutLimit: 3, banLimit: 5, timeoutEnabled: true, banEnabled: true, timeoutDuration: '1h', banDuration: '7d', banType: 'temporary' };
          const savedSettings = groupSettings.get(chatId.toString()) || {};
          const settings = { ...defaultSettings, ...savedSettings };

          if (settings.banEnabled !== false && userSpam.count >= settings.banLimit) {
            const parseDuration = (dur, custom) => {
              const finalDur = dur === 'custom' ? custom : dur;
              if (!finalDur) return 24 * 60 * 60;
              const unit = finalDur.slice(-1);
              const val = parseInt(finalDur);
              if (unit === 'm') return val * 60;
              if (unit === 'h') return val * 60 * 60;
              if (unit === 'd') return val * 24 * 60 * 60;
              return isNaN(val) ? 24 * 60 * 60 : val * 24 * 60 * 60;
            };
            const banDurSeconds = settings.banType === 'permanent' ? 0 : parseDuration(settings.banDuration, settings.banCustomValue);
            const banUntil = banDurSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) + banDurSeconds;
            await bot.banChatMember(chatId, userId, { until_date: banUntil });
            const banMsg = await bot.sendMessage(chatId, `🚫 *User Banned*\n\n${name} has been banned for excessive command spam.`, { parse_mode: 'Markdown' });
            setTimeout(() => bot.deleteMessage(chatId, banMsg.message_id).catch(() => {}), 10000);
            spamTracker.delete(trackerKey);
          } else if (settings.timeoutEnabled !== false && userSpam.count >= settings.timeoutLimit) {
            const parseDuration = (dur, custom) => {
              const finalDur = dur === 'custom' ? custom : dur;
              if (!finalDur) return 24 * 60 * 60;
              const unit = finalDur.slice(-1);
              const val = parseInt(finalDur);
              if (unit === 'm') return val * 60;
              if (unit === 'h') return val * 60 * 60;
              if (unit === 'd') return val * 24 * 60 * 60;
              return isNaN(val) ? 24 * 60 * 60 : val * 24 * 60 * 60;
            };
            const timeoutDurSeconds = parseDuration(settings.timeoutDuration, settings.timeoutCustomValue);
            const untilDate = Math.floor(Date.now() / 1000) + timeoutDurSeconds;
            await bot.restrictChatMember(chatId, userId, { until_date: untilDate, can_send_messages: false });
            const timeoutMsg = await bot.sendMessage(chatId, `⏳ Warning ${name}!\n\nYou have been timed out for command spam.`);
            setTimeout(() => bot.deleteMessage(chatId, timeoutMsg.message_id).catch(() => {}), 10000);
          } else {
            const warningMsg = await bot.sendMessage(chatId, `⚠️ Warning ${name}!\n\nCommands are not allowed. Only 8 or 10 character alphanumeric codes. (Violation ${userSpam.count}/${settings.timeoutLimit})`);
            setTimeout(() => bot.deleteMessage(chatId, warningMsg.message_id).catch(() => {}), 10000);
          }
          return;
        }

        await bot.deleteMessage(chatId, msg.message_id);
        
        if (settings.spamControlEnabled === false) return;

        // Custom duration parser
        const parseDuration = (dur, custom) => {
          const finalDur = dur === 'custom' ? custom : dur;
          if (!finalDur) return 24 * 60 * 60;
          const unit = finalDur.slice(-1);
          const val = parseInt(finalDur);
          if (unit === 'm') return val * 60;
          if (unit === 'h') return val * 60 * 60;
          if (unit === 'd') return val * 24 * 60 * 60;
          return isNaN(val) ? 24 * 60 * 60 : val * 24 * 60 * 60;
        };

        // Unique tracker key per chat and user
        const trackerKey = `${chatId}_${userId}`;
        let userSpam = spamTracker.get(trackerKey) || { count: 0, lastSpam: 0 };
        userSpam.count += 1;
        userSpam.lastSpam = Date.now();
        spamTracker.set(trackerKey, userSpam);

        if (settings.banEnabled !== false && userSpam.count >= settings.banLimit) {
          const banDurSeconds = settings.banType === 'permanent' ? 0 : parseDuration(settings.banDuration, settings.banCustomValue);
          const banUntil = banDurSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) + banDurSeconds;
          await bot.banChatMember(chatId, userId, { until_date: banUntil });
          
          if (settings.banNotify !== false) {
            const displayDur = settings.banType === 'permanent' ? 'permanently' : 'for ' + (settings.banDuration === 'custom' ? settings.banCustomValue : settings.banDuration);
            const banMsg = await bot.sendMessage(chatId, `🚫 *User Banned*\n\n${name} has been banned ${displayDur} due to excessive violations.`, { parse_mode: 'Markdown' });
            setTimeout(() => bot.deleteMessage(chatId, banMsg.message_id).catch(() => {}), 10000);
          }
          // Reset count after ban
          spamTracker.delete(trackerKey);
        } else if (settings.timeoutEnabled !== false && userSpam.count >= settings.timeoutLimit) {
          const timeoutDurSeconds = parseDuration(settings.timeoutDuration, settings.timeoutCustomValue);
          const untilDate = Math.floor(Date.now() / 1000) + timeoutDurSeconds;
          await bot.restrictChatMember(chatId, userId, { until_date: untilDate, can_send_messages: false });
          
          if (settings.timeoutNotify !== false) {
            const displayDur = settings.timeoutDuration === 'custom' ? settings.timeoutCustomValue : settings.timeoutDuration;
            const timeoutMsg = await bot.sendMessage(chatId, `⏳ Warning ${name}!\n\nYou have been timed out for ${displayDur} due to violations.`);
            setTimeout(() => bot.deleteMessage(chatId, timeoutMsg.message_id).catch(() => {}), 10000);
          }
          // Don't reset count yet, let it continue toward ban
        } else {
          const warningMsg = await bot.sendMessage(chatId, `⚠️ Warning ${name}!\n\nOnly Allowed Red Packet Codes Nothing Else\n(Violation ${userSpam.count}/${settings.timeoutLimit})`);
          setTimeout(() => bot.deleteMessage(chatId, warningMsg.message_id).catch(() => {}), 10000);
        }
      } catch (error) {
        console.error('Error in filter:', error.message);
      }
    }
  }
});

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;
  const botMe = await bot.getMe();
  const isBotAdded = msg.new_chat_members.some(member => member.id === botMe.id);

  if (isBotAdded) {
    const welcomeMsg = `🛡️ *Red Packet Guard Activated!* \n\nI am ready to protect this group. Only 8 or 10 character alphanumeric messages are allowed. \n\n⚠️ *Action Required:* Please ensure I have 'Delete Messages' and 'Ban Users' permissions.`;
    
    // Save group title
    const existing = groupSettings.get(chatId.toString()) || {};
    groupSettings.set(chatId.toString(), { ...existing, title: msg.chat.title });

    await bot.sendMessage(chatId, welcomeMsg, {
      parse_mode: 'Markdown',
      reply_markup: getHelpKeyboard(chatId)
    });
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});