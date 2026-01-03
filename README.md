# Telegram Numeric Filtering Bot

A simple Telegram bot that monitors group chats and only allows messages containing exactly 8 or 10 digits. All other content (text, stickers, images, etc.) is automatically and silently deleted.

## Setup

1. Get a bot token from [@BotFather](https://t.env/BotFather).
2. Add the bot to your group.
3. Promote the bot to **Admin** with **Delete Messages** permission.
4. Set the `TELEGRAM_BOT_TOKEN` environment variable.

## Deployment

This bot is designed to run 24/7. It can be deployed to platforms like Render or hosted on Replit.
