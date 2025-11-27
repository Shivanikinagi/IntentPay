# IntentPay Telegram Bot Setup Guide

## Prerequisites

1. Node.js (v16 or higher)
2. A Telegram account
3. Access to the IntentPay web application

## Step-by-Step Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the prompts to:
   - Choose a name for your bot (e.g., "IntentPay Bot")
   - Choose a username for your bot (must end in "bot", e.g., "MyIntentPayBot")
5. BotFather will provide you with a **Bot Token** - save this securely

### 2. Configure the Bot

1. In the `telegram-bot` directory, copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file:
   ```env
   # Replace with your actual bot token from BotFather
   BOT_TOKEN=your_actual_bot_token_here
   
   # Replace with your deployed IntentPay web app URL
   WEB_APP_URL=https://your-deployed-intentpay-app.com
   ```

### 3. Install Dependencies

```bash
cd telegram-bot
npm install
```

### 4. Run the Bot

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## Bot Commands

- `/start` - Welcome message and instructions
- `/help` - Help information
- Any natural language payment command (see examples below)

## Usage Examples

### Sending Payments

```
Send 0.1 MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
Transfer 0.01 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C
Pay 0.5 USDC to 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
```

### Workflow

1. **Parse**: Bot understands your natural language command
2. **Simulate**: Review transaction details and gas costs
3. **Confirm**: Complete transaction securely on web platform
4. **Execute**: Real blockchain transaction is processed

## Security

⚠️ **Important Security Notes**:

1. **Private Keys Never Exposed**: The bot never handles private keys
2. **Web Platform Confirmation**: All transactions are confirmed on the secure web platform
3. **Irreversible Transactions**: Blockchain transactions cannot be reversed
4. **Review Carefully**: Always review transaction details before confirming

## Supported Networks

- Polygon Mumbai Testnet (MATIC)
- Ethereum Sepolia Testnet (ETH)

## Supported Tokens

- MATIC
- ETH
- USDC
- USDT

## Troubleshooting

### Common Issues

1. **"Bot Token Invalid" Error**:
   - Ensure your BOT_TOKEN in `.env` is correct
   - Verify the token was copied completely from BotFather

2. **"Module not found" Errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check that you're in the `telegram-bot` directory

3. **Port Conflicts**:
   - The bot doesn't use specific ports, but ensure your system allows outgoing connections

### Testing the Parser

You can test the parsing logic without running the full bot:

```bash
cd telegram-bot
node test-parser.js
```

This will run several test cases to verify the parser works correctly.

## Deployment

For production deployment:

1. Set up a production server (AWS, DigitalOcean, etc.)
2. Configure environment variables properly
3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start bot.js
   ```
4. Set up proper logging and monitoring
5. Ensure the server has stable internet connectivity

## Integration with Web Platform

The bot works in conjunction with the IntentPay web platform:

1. Bot handles natural language parsing and initial interaction
2. Web platform handles secure wallet connections and transaction signing
3. Both components share the same underlying payment logic

This architecture ensures security while providing a seamless user experience.