require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

// Initialize the bot with polling
const bot = new TelegramBot(token, { polling: true });

// Handle callback queries (for inline buttons) globally
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;

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
• 1st violation: Warning
• 2nd violation: 24h Time-out
• 10th violation: Permanent Ban

*Exemptions:*
Admins and Owners are exempt from all rules.

*Permissions:*
Requires admin rights to delete messages and restrict users.

No data is sold or shared. All processing is automated.`;
    await bot.sendMessage(chatId, privacyPolicy, { parse_mode: 'Markdown' });
  }
});

// Simple in-memory storage for spam tracking
// In a production environment, use a database (e.g., Redis or Postgres)
const spamTracker = new Map();

console.log('Numeric filtering bot started...');

// Listen for any message
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const userId = msg.from.id;
  const text = msg.text;

  // Handle /start command
  if (text === '/start') {
    const botUser = await bot.getMe();
    const botUsername = botUser.username;
    
    const startMsg = `🌹 *Hey there! My name is Rose* - I'm here to help you manage your groups! Use /help to find out how to use me to my full potential.\n\n📢 *Join my news channel* to get information on all the latest updates.\n\n🛡️ *Check /privacy* to view the privacy policy, and interact with your data.`;
    
    await bot.sendMessage(chatId, startMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add me to your chat', url: `https://t.me/${botUsername}?startgroup=true` }],
          [
            { text: '📢 Bots Upload News', url: 'https://t.me/BotsUpdatedNews' },
            { text: '🛡️ Privacy Policy', callback_data: 'privacy_policy' }
          ]
        ]
      }
    });
    return;
  }

  // Handle /privacy command
  if (text === '/privacy') {
    const privacyPolicy = `🛡️ *Privacy Policy – Red Packet Guard*

Red Packet Guard is a Telegram group moderation bot designed to prevent spam.

*Information Collection:*
We do not store personal data. We temporarily process:
• User ID (for warnings/bans)
• Username (for mentions)
• Message content (for validation)

*Enforcement:*
• 1st violation: Warning
• 2nd violation: 24h Time-out
• 10th violation: Permanent Ban

*Exemptions:*
Admins and Owners are exempt from all rules.

*Permissions:*
Requires admin rights to delete messages and restrict users.

No data is sold or shared. All processing is automated.`;
    await bot.sendMessage(chatId, privacyPolicy, { parse_mode: 'Markdown' });
    return;
  }

  // We only care about messages in groups/supergroups for filtering
  if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
    return;
  }

  // Check if user is Admin or Owner
  try {
    const member = await bot.getChatMember(chatId, userId);
    if (member.status === 'creator' || member.status === 'administrator') {
      // Admins and Owners have full control and are exempt from filtering
      return;
    }
  } catch (err) {
    console.error('Error checking chat member status:', err.message);
  }

  const user = msg.from;
  const name = user.username ? `@${user.username}` : (user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
  let shouldDelete = false;

  if (!text) {
    shouldDelete = true;
  } else {
    // Check if it's alphanumeric and length is 8 or 10
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(text);
    const isValidLength = text.length === 8 || text.length === 10;

    if (!isAlphanumeric || !isValidLength) {
      shouldDelete = true;
    }
  }

  if (shouldDelete) {
    try {
      await bot.deleteMessage(chatId, messageId);

      // Spam Tracking Logic
      let userSpam = spamTracker.get(userId) || { count: 0, lastSpam: 0 };
      userSpam.count += 1;
      userSpam.lastSpam = Date.now();
      spamTracker.set(userId, userSpam);

      if (userSpam.count >= 10) {
        // Ban user after 10 spams
        await bot.banChatMember(chatId, userId);
        const banMsg = await bot.sendMessage(chatId, `🚫 ${name} has been banned for excessive spamming (10+ violations).`);
        setTimeout(() => bot.deleteMessage(chatId, banMsg.message_id).catch(() => {}), 10000);
        return;
      } else if (userSpam.count === 2) {
        // Timeout for 24 hours after 2 spams
        const untilDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        await bot.restrictChatMember(chatId, userId, {
          until_date: untilDate,
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false
        });
        const timeoutMsg = await bot.sendMessage(chatId, `⏳ Warning ${name}!\n\nYou have been timed out for 24 hours due to spamming.\n\nDon't Spam Anything Else Only Send Red Packet Codes. After Spamming If you spam too much, you will be banned.`);
        setTimeout(() => bot.deleteMessage(chatId, timeoutMsg.message_id).catch(() => {}), 10000);
        return;
      }

      // Default Warning
      const warningMsg = await bot.sendMessage(chatId, `⚠️ Warning ${name}!\n\nDon't Spam Anything Else Only Send Red Packet Codes.\n\nWarning ⚠️ After Spamming If you spam too much, you will be banned and given a time out.`);
      
      // Auto-delete warning after 10 seconds
      setTimeout(async () => {
        try {
          await bot.deleteMessage(chatId, warningMsg.message_id);
        } catch (e) {}
      }, 10000);

    } catch (error) {
      // Common errors: bot is not admin, or message already deleted
      if (error.response && error.response.body && error.response.body.description) {
         console.error(`Failed to delete message: ${error.response.body.description}`);
      } else {
         console.error('An error occurred while trying to delete a message:', error.message);
      }
    }
  }
});

// Basic error handling for polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});
