# IntentPay

IntentPay is a revolutionary cryptocurrency payment platform that enables users to make blockchain transactions using natural language commands. The system combines AI-powered natural language processing with real Web3 blockchain integration to create a seamless payment experience.

## Features

### Natural Language Payment Processing
- Parse human-readable payment commands like "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf"
- Intelligent intent detection for send, transfer, and payment requests
- Support for multiple cryptocurrencies and blockchain networks

### Real Blockchain Integration
- Direct integration with Ethereum Sepolia testnet
- Real transaction execution on actual blockchain networks
- Live balance checking and gas price fetching
- Wallet connectivity via MetaMask and other Web3 wallets

### Dual Interface System
- **Web Application**: React + Vite frontend with Tailwind CSS styling
- **Telegram Bot**: Natural language processing interface via Telegram

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Blockchain Libraries**: ethers.js, viem
- **Backend**: Node.js with Telegraf for Telegram bot
- **Network**: Ethereum Sepolia testnet
- **Wallet Integration**: MetaMask and other Web3 wallets

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── IntentPaySystem.jsx     # Main React component for the web interface
│   │   └── IntentPayParser.jsx     # Parser component for natural language processing
│   ├── utils/
│   │   └── parser.js              # Utility functions for parsing payment intents
│   ├── constants/
│   │   └── tokens.js              # Token definitions and constants
│   ├── App.jsx                    # Main application component
│   ├── main.jsx                   # Application entry point
│   └── package.json               # Frontend dependencies
├── telegram-bot/
│   ├── bot.js                     # Main Telegram bot implementation
│   ├── package.json               # Bot dependencies
│   └── .env.example              # Example environment variables
├── package.json                   # Root project dependencies
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask wallet (for testing)
- Telegram account (for bot interaction)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd intentpay
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install Telegram bot dependencies:
   ```bash
   cd telegram-bot
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env` in the telegram-bot directory
   - Add your Telegram bot token to the `.env` file

### Running the Application

1. Start the web application:
   ```bash
   # From the root directory
   npm run dev
   ```

2. Start the Telegram bot:
   ```bash
   # From the telegram-bot directory
   npm start
   ```

3. Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal)

4. Connect your MetaMask wallet and switch to the Sepolia testnet

5. Interact with the Telegram bot by sending natural language payment commands

## Usage

### Web Interface

1. Connect your MetaMask wallet
2. Enter a natural language payment command in the text area (e.g., "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf")
3. Click "Parse Intent" to analyze the command
4. Review the parsed details and click "Execute Transaction"
5. Confirm the transaction in your MetaMask wallet
6. View the transaction on given explorer link

### Telegram Bot

1. Start a chat with your bot on Telegram
2. Send a natural language payment command:
   ```
   Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
   ```
3. Follow the bot's instructions to complete the transaction via the web interface

## Development

### Key Components

1. **IntentPaySystem.jsx**: Main React component handling the web interface
2. **parser.js**: Functions for extracting payment details from natural language text
3. **bot.js**: Telegram bot implementation for natural language processing
4. **tokens.js**: Constants and definitions for supported tokens

### Adding New Features

1. For frontend enhancements, modify files in the `src/` directory
2. For Telegram bot improvements, modify files in the `telegram-bot/` directory
3. For new token support, update `src/constants/tokens.js`
4. For parsing improvements, update `src/utils/parser.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to the Ethereum community for the Web3 ecosystem
- Inspired by the need to make cryptocurrency transactions more accessible to non-technical users
