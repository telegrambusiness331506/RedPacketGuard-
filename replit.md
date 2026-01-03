# Telegram Numeric Filtering Bot

## Overview

A Telegram bot that monitors group chats and enforces strict message filtering rules. The bot only allows messages containing exactly 8 or 10 alphanumeric characters - all other content (non-text messages, messages with invalid length, or messages with special characters) is automatically deleted.

The bot is designed to run 24/7 and requires admin privileges with "Delete Messages" permission in the target Telegram groups.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Runtime Environment
- **Platform**: Node.js
- **Entry Point**: `index.js`
- **Execution**: Long-running process using `node index.js`

### Bot Framework
- **Library**: `node-telegram-bot-api` - A popular Node.js wrapper for the Telegram Bot API
- **Connection Method**: Polling mode (continuously polls Telegram servers for updates)
- **Rationale**: Polling is simpler to set up than webhooks and works well for most deployment scenarios without requiring SSL certificates or public URLs

### Message Processing Logic
1. Bot listens for all incoming messages via the `message` event
2. Filters only apply to group and supergroup chats (private messages are ignored)
3. Validation rules:
   - Must be text (no stickers, images, or other media)
   - Must be alphanumeric only (a-z, A-Z, 0-9)
   - Length must be exactly 8 or 10 characters
4. Messages failing validation are deleted silently

### Configuration Management
- **Library**: `dotenv` for loading environment variables from `.env` files
- **Required Variables**: `TELEGRAM_BOT_TOKEN` - obtained from Telegram's BotFather

### Error Handling
- Exits with error code 1 if bot token is not configured
- Logs startup confirmation to console

## External Dependencies

### Third-Party Services
| Service | Purpose | Authentication |
|---------|---------|----------------|
| Telegram Bot API | Core bot functionality | Bot token from @BotFather |

### NPM Packages
| Package | Version | Purpose |
|---------|---------|---------|
| `node-telegram-bot-api` | ^0.66.0 | Telegram Bot API wrapper |
| `dotenv` | ^16.4.7 | Environment variable management |

### Required Telegram Permissions
The bot must be added as an admin to target groups with:
- **Delete Messages** permission (required for removing non-compliant messages)