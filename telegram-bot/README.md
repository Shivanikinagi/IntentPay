# IntentPay Telegram Bot

A Telegram bot that enables natural language cryptocurrency payments with real blockchain transactions.

## Features

- 🤖 Natural language payment parsing
- 📊 Transaction simulation with real gas prices
- ✅ Real blockchain transaction execution
- 💬 Interactive chat-based interface
- 🔗 Integration with web platform for secure transactions

## Setup

1. **Create a Telegram Bot**:
   - Talk to [@BotFather](https://t.me/BotFather) on Telegram
   - Use `/newbot` command to create a new bot
   - Copy the bot token

2. **Configure Environment**:
   - Copy `.env.example` to `.env`:
     ```
     cp .env.example .env
     ```
   - Edit `.env` and add your bot token:
     ```
     BOT_TOKEN=your_actual_bot_token_here
     WEB_APP_URL=https://your-deployed-intentpay-app.com
     ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run the Bot**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

### Commands

- `/start` - Welcome message and instructions
- `/help` - Help information

### Payment Commands

Send natural language payment commands like:

```
Send 0.1 MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
Transfer 0.01 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C
```

### Workflow

1. **Parse**: Bot parses your natural language command
2. **Simulate**: Review transaction details and gas costs
3. **Confirm**: Complete the transaction securely on the web platform
4. **Execute**: Real blockchain transaction is executed

## Security

⚠️ **Important**: Real cryptocurrency transactions are irreversible!

For security, the bot redirects users to the web platform for final transaction confirmation and signing. This ensures:
- Private keys never touch the bot
- Users can review all transaction details
- Secure wallet connection (MetaMask, etc.)

## Supported Networks

- Polygon Mumbai Testnet (MATIC)
- Ethereum Sepolia Testnet (ETH)

## Supported Tokens

- MATIC
- ETH

## Example Interaction

```
User: Send 0.1 MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf

Bot: 
💳 Payment Summary:
Amount: 0.1 MATIC
To: 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
Network: Polygon Mumbai

What would you like to do?

[📊 Simulate] [✅ Confirm] [❌ Cancel]

User: [📊 Simulate]

Bot:
📊 Transaction Simulation:
Amount: 0.1 MATIC
To: 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
Network Fee: 0.000315 MATIC
Total Cost: 0.100315 MATIC

⏰ Timing:
Estimated Confirmation: 10-30 seconds

Would you like to proceed with this transaction?

[✅ Confirm] [❌ Cancel]

User: [✅ Confirm]

Bot:
⚠️ IMPORTANT: Real Transaction Warning ⚠️

You are about to execute a REAL blockchain transaction:
• Sending: 0.1 MATIC
• To: 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
• Network: Polygon Mumbai
• Requires wallet connection and sufficient funds

[🌐 Open Web App] [❌ Cancel]
```