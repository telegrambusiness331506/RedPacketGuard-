require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const spamTracker = new Map();
const groupSettings = new Map();
const configSessions = new Map();

async function isUserAdmin(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (err) {
    return false;
  }
}

function getHelpMessage(chatId) {
  const settings = groupSettings.get(chatId.toString()) || { timeoutLimit: 2, banLimit: 10 };
  return `🛡️ *Red Packet Guard – Help & Rules*

*Rules:*
• Only messages with *exactly 8 or 10 characters* are allowed.
• Content must be *alphanumeric* (A-Z, 0-9).
• All other messages (stickers, media, links, invalid length) will be *deleted*.

*Enforcement Status:*
• 🟡 *Time Out:* Triggered after *${settings.timeoutLimit}* violations.
• 🔴 *Ban:* Triggered after *${settings.banLimit}* violations.

*How it works:*
• *Time Out:* User is muted for 24 hours.
• *Ban:* User is permanently removed from the group.

⚠️ *Admins Only:* Use the buttons below to change these limits in private chat.`;
}

function getHelpKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🔴 Ban Spamming Limit', callback_data: 'config_ban' }],
      [{ text: '🟡 Time Out Spamming Limit', callback_data: 'config_timeout' }]
    ]
  };
}

async function showGroupSelection(userId, chatId, messageId = null) {
  const text = "🛡️ *Step 2: Choose Group*\n\nPlease enter the *Group ID* you wish to configure.\n\n_Note: You must be an admin of the group for changes to take effect._";
  const keyboard = {
    inline_keyboard: [
      [{ text: '⬅️ Back', callback_data: 'back_to_action' }]
    ]
  };
  
  if (messageId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: keyboard, parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, text, { reply_markup: keyboard, parse_mode: 'Markdown' });
  }
}

async function showLimitSelection(userId, chatId, messageId = null) {
  const session = configSessions.get(userId);
  const text = `🛡️ *Step 3: Choose Violation Count*\n\nAction: *${session.action === 'timeout' ? 'Time Out' : 'Ban'}*\n\nSelect a preset below or type a custom number:`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '1', callback_data: 'set_limit_1' }, { text: '3', callback_data: 'set_limit_3' }, { text: '5', callback_data: 'set_limit_5' }],
      [{ text: '10', callback_data: 'set_limit_10' }, { text: '50', callback_data: 'set_limit_50' }, { text: '100', callback_data: 'set_limit_100' }],
      [{ text: '⬅️ Back', callback_data: 'back_to_group' }]
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
  const text = `🛡️ *Step 4: Confirmation*\n\n*Summary:*\n• Group ID: \`${session.groupId}\`\n• Action: *${session.action === 'timeout' ? 'Time Out' : 'Ban'}*\n• Limit: *${session.limit}* violations\n\nConfirm these settings?`;
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

No data is sold or shared. All processing is automated.`;
    await bot.sendMessage(chatId, privacyPolicy, { parse_mode: 'Markdown' });
  }

  if (action.startsWith('config_')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const configAction = action.split('_')[1];
    
    // Check permission if in group
    if (msg.chat.type !== 'private') {
      const isAdmin = await isUserAdmin(chatId, userId);
      if (!isAdmin) {
        await bot.sendMessage(chatId, "❌ You do not have permission to change group settings.");
        return;
      }
    }

    configSessions.set(userId, { step: 'choose_group', action: configAction });
    
    if (msg.chat.type !== 'private') {
      const botMe = await bot.getMe();
      await bot.sendMessage(chatId, "📲 *Private Configuration Required*\n\nPlease continue in private chat to avoid group spam.", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Go to Private Chat', url: `https://t.me/${botMe.username}?start=config` }]]
        }
      });
      return;
    }
    showGroupSelection(userId, chatId);
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
      await bot.editMessageText(`✅ *Settings Saved!*\n\n${session.action === 'timeout' ? 'Time Out' : 'Ban'} limit for group \`${session.groupId}\` is now set to *${session.limit}* violations.`, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
      configSessions.delete(userId);
    }
  }

  if (action === 'back_to_action') {
    await bot.answerCallbackQuery(callbackQuery.id);
    configSessions.delete(userId);
    await bot.editMessageText(getHelpMessage(chatId), {
      chat_id: chatId,
      message_id: msg.message_id,
      parse_mode: 'Markdown',
      reply_markup: getHelpKeyboard()
    });
  }

  if (action === 'back_to_group') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const session = configSessions.get(userId);
    if (session) {
      session.step = 'choose_group';
      showGroupSelection(userId, chatId, msg.message_id);
    }
  }

  if (action === 'back_to_limit') {
    await bot.answerCallbackQuery(callbackQuery.id);
    const session = configSessions.get(userId);
    if (session) {
      session.step = 'choose_limit';
      showLimitSelection(userId, chatId, msg.message_id);
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  const session = configSessions.get(userId);
  if (session && msg.chat.type === 'private') {
    if (session.step === 'choose_group' && text && !text.startsWith('/')) {
      const isAdmin = await isUserAdmin(text, userId);
      if (isAdmin) {
        session.groupId = text;
        session.step = 'choose_limit';
        showLimitSelection(userId, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ *Access Denied*\n\nYou must be an admin of the group to change its settings. Please check the ID and try again.", { parse_mode: 'Markdown' });
      }
      return;
    }
    if (session.step === 'choose_limit' && text && !isNaN(text)) {
      session.limit = parseInt(text);
      session.step = 'confirmation';
      showConfirmation(userId, chatId);
      return;
    }
  }

  if (text === '/start' || (text && text.startsWith('/start'))) {
    const startParam = text.split(' ')[1];
    if (startParam === 'config' && session) {
      showGroupSelection(userId, chatId);
      return;
    }
    const botUser = await bot.getMe();
    const startMsg = `🛡️ *Red Packet Guard*\n\nI monitor your groups and remove spam messages. Only 8 or 10 character alphanumeric codes are allowed.\n\nUse /help to see rules and configuration.`;
    
    await bot.sendMessage(chatId, startMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: `https://t.me/${botUser.username}?startgroup=true` }],
          [{ text: '🛡️ Privacy Policy', callback_data: 'privacy_policy' }]
        ]
      }
    });
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
      reply_markup: getHelpKeyboard()
    });
    return;
  }

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    const isAdmin = await isUserAdmin(chatId, userId);
    if (isAdmin) return;

    const settings = groupSettings.get(chatId.toString()) || { timeoutLimit: 2, banLimit: 10 };
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
        await bot.deleteMessage(chatId, msg.message_id);
        let userSpam = spamTracker.get(userId) || { count: 0, lastSpam: 0 };
        userSpam.count += 1;
        userSpam.lastSpam = Date.now();
        spamTracker.set(userId, userSpam);

        if (userSpam.count >= settings.banLimit) {
          await bot.banChatMember(chatId, userId);
          const banMsg = await bot.sendMessage(chatId, `🚫 ${name} has been banned for excessive spamming (${settings.banLimit}+ violations).`);
          setTimeout(() => bot.deleteMessage(chatId, banMsg.message_id).catch(() => {}), 10000);
        } else if (userSpam.count >= settings.timeoutLimit) {
          const untilDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
          await bot.restrictChatMember(chatId, userId, { until_date: untilDate, can_send_messages: false });
          const timeoutMsg = await bot.sendMessage(chatId, `⏳ Warning ${name}!\n\nYou have been timed out for 24 hours due to spamming.`);
          setTimeout(() => bot.deleteMessage(chatId, timeoutMsg.message_id).catch(() => {}), 10000);
        } else {
          const warningMsg = await bot.sendMessage(chatId, `⚠️ Warning ${name}!\n\nOnly 8 or 10 character alphanumeric codes are allowed.`);
          setTimeout(() => bot.deleteMessage(chatId, warningMsg.message_id).catch(() => {}), 10000);
        }
      } catch (error) {
        console.error('Error in filter:', error.message);
      }
    }
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});
