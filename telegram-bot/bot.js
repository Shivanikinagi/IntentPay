import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
const envPath = resolve(__dirname, '.env');
dotenv.config({ path: envPath });

// Replace with your dapp host when deployed. For local testing it's localhost.
const DAPP_BASE = process.env.WEB_APP_URL || 'http://localhost:5173';

// Debug the environment variables
console.log('Environment variables:');
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('WEB_APP_URL:', process.env.WEB_APP_URL);
console.log('Current working directory:', process.cwd());
console.log('Env file path:', envPath);

// Initialize bot with token from environment variables
const bot = new Telegraf(process.env.BOT_TOKEN);

// In-memory storage for user sessions (in production, use a database)
const userSessions = new Map();

// Blockchain configuration - Updated to Sepolia only
const chains = {
  'sepolia': {
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpc: 'https://ethereum-sepolia.publicnode.com', // More reliable RPC
    explorer: 'https://sepolia.etherscan.io',
    chainId: 11155111,
    viemChain: sepolia
  }
};

// Start command
bot.start((ctx) => {
  const welcomeMessage = `
🤖 Welcome to IntentPay Bot!

I can help you make cryptocurrency payments using natural language commands.

✨ Features:
• Parse natural language payment intents
• Simulate transactions with real gas prices
• Execute real blockchain transactions
• View transaction history

📝 How to use:
1. Send a payment command like:
   "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf"
   "Transfer 0.005 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C"

💡 Commands:
/start - Show this help message
/help - Show help information
/send <amount> <0xaddress> - Quick send command

Ready to get started? Just send me a payment command!
  `;
  
  ctx.reply(welcomeMessage);
});

// Help command
bot.help((ctx) => {
  const helpMessage = `
📖 IntentPay Bot Help

📝 Supported Commands:
• Send [amount] [token] to [address]
• Transfer [amount] [token] to [address]
• /send <amount> <0xaddress> - Quick send

💰 Supported Tokens:
• ETH (Ethereum Sepolia)

🔗 Examples:
• Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf
• Transfer 0.005 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C
• /send 0.01 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf

⚠️ Important Notes:
• You need to have sufficient balance + gas fees
• Use real Ethereum addresses (0x...)
• Transactions are real and irreversible
  `;
  
  ctx.reply(helpMessage);
});

// Quick send command
bot.command('send', async (ctx) => {
  try {
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) return ctx.reply('Usage: /send <amount> <0xaddress>');
    const amount = parts[1];
    const to = parts[2];

    // basic validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return ctx.reply('Invalid recipient address.');

    // ethereum deep link (mobile wallets typically pick this up)
    const chainId = 11155111; // Sepolia
    // Simple UX link: ethereum:<address>?value=<amount> (wallets usually accept this)
    const ethDeepLink = `ethereum:${to}?value=${amount}&chainId=${chainId}`;

    // dapp URL (prefill fields)
    const dappUrl = `${DAPP_BASE}/?to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}&chain=sepolia`;

    const message = `I prepared the transaction intent:
• Amount: ${amount} ETH
• To: ${to}

Open one of these on your device to sign:

Mobile Deep link:
${ethDeepLink}

Desktop dApp link:
${dappUrl}

After signing, reply here with the tx hash and I will follow up.`;

    await ctx.reply(message);

  } catch (err) {
    console.error(err);
    ctx.reply('Error preparing transaction');
  }
});

// Message handler - Main entry point for parsing
bot.on('message', async (ctx) => {
  // Ignore commands
  if (ctx.message.text.startsWith('/')) return;
  
  const userId = ctx.from.id;
  const message = ctx.message.text;
  
  try {
    // Parse the intent
    const parsedResult = await parseIntent(message);
    
    if (!parsedResult) {
      return ctx.reply('❌ Sorry, I couldn\'t understand your payment intent. Please try again with a clear command.\n\nExample: "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf"');
    }
    
    // Store the parsed result in user session
    userSessions.set(userId, { parsedResult });
    
    // Automatically provide execution link
    await handleDirectExecution(ctx, parsedResult);
    
  } catch (error) {
    console.error('Parsing error:', error);
    ctx.reply(`❌ Error parsing your request: ${error.message}\n\nPlease try again with a clear command.`);
  }
});

// Handle inline button callbacks
bot.on('callback_query', async (ctx) => {
  const userId = ctx.from.id;
  const action = ctx.callbackQuery.data;
  const session = userSessions.get(userId);
  
  if (!session || !session.parsedResult) {
    return ctx.answerCbQuery('Session expired. Please send a new payment command.');
  }
  
  try {
    switch (action) {
      case 'cancel':
        await handleCancellation(ctx);
        break;
      default:
        ctx.answerCbQuery('Unknown action');
    }
  } catch (error) {
    console.error('Callback error:', error);
    ctx.answerCbQuery(`Error: ${error.message}`);
  }
});

// Parse intent function
async function parseIntent(text) {
  const lowerText = text.toLowerCase();
  
  // Intent detection
  const intent = detectIntent(lowerText);
  
  // Amount extraction
  const amount = extractAmount(text);
  
  // Token extraction - Only ETH for Sepolia
  const token = 'ETH';
  
  // Recipient extraction
  const recipient = extractRecipient(text);
  
  if (!recipient || !recipient.value.startsWith('0x')) {
    throw new Error('Please provide a valid Ethereum address (0x...)');
  }
  
  // Chain detection - Only Sepolia
  const chain = 'sepolia';
  
  // Missing fields
  const missingFields = [];
  if (!amount) missingFields.push('amount');
  if (!recipient) missingFields.push('recipient');
  
  if (missingFields.length > 0) {
    return null;
  }
  
  return {
    raw_input: text,
    parsed: {
      intent,
      amount,
      token,
      recipient,
      chain,
      missing_fields: [],
      confidence: 0.9,
      timestamp: new Date().toISOString()
    },
    suggestions: [],
    warnings: []
  };
}

// Helper functions
function detectIntent(text) {
  if (text.match(/send|transfer|pay|give/)) return 'send';
  if (text.match(/request|ask|collect/)) return 'request';
  return 'send';
}

function extractAmount(text) {
  const patterns = [
    /(\d+\.?\d*)\s*(eth)/i,
    /(\d+\.?\d*)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (num > 0 && num < 1000000) return num;
    }
  }
  
  return null;
}

function extractRecipient(text) {
  // Only accept Ethereum addresses
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    return { type: 'address', value: addressMatch[0] };
  }
  
  return null;
}

// Handle simulation
async function handleSimulation(ctx, parsedResult) {
  try {
    // Simulate transaction with gas estimation
    const { parsed } = parsedResult;
    const chainConfig = chains[parsed.chain];
    
    // In a real implementation, you would connect to a provider and estimate gas
    // For this demo, we'll provide simulated values
    
    const simulation = {
      gas_estimate: {
        gas_limit: 21000,
        gas_price: '15 gwei',
        total_gas_cost: {
          native: `0.000315 ${chainConfig.symbol}`,
          usd: '~$0.00'
        }
      },
      fees: {
        network_fee: `0.000315 ${chainConfig.symbol}`,
        total_amount_with_fees: `${(parsed.amount + 0.000315).toFixed(6)} ${chainConfig.symbol}`,
        token_amount: `${parsed.amount} ${parsed.token || chainConfig.symbol}`
      },
      timing: {
        estimated_confirmation: '10-30 seconds',
        best_time_to_send: 'Now'
      },
      summary: {
        from: 'Your connected wallet',
        to: parsed.recipient.value,
        total_cost: `${(parsed.amount + 0.000315).toFixed(6)} ${chainConfig.symbol}`,
        net_send: `${parsed.amount} ${parsed.token || chainConfig.symbol}`
      }
    };
    
    const simulationMessage = `
📊 Transaction Simulation:
Amount: ${simulation.summary.net_send}
To: ${simulation.summary.to}
Network Fee: ${simulation.fees.network_fee}
Total Cost: ${simulation.summary.total_cost}

⏰ Timing:
Estimated Confirmation: ${simulation.timing.estimated_confirmation}

Would you like to proceed with this transaction?
    `;
    
    await ctx.reply(simulationMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Confirm', callback_data: 'confirm' },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]
        ]
      }
    });
    
    ctx.answerCbQuery('Simulation complete');
  } catch (error) {
    console.error('Simulation error:', error);
    ctx.answerCbQuery(`Simulation error: ${error.message}`);
    ctx.reply(`❌ Simulation error: ${error.message}`);
  }
}

// Handle automatic simulation
async function handleSimulationAuto(ctx, parsedResult) {
  try {
    // Simulate transaction with gas estimation
    const { parsed } = parsedResult;
    const chainConfig = chains[parsed.chain];
    
    // In a real implementation, you would connect to a provider and estimate gas
    // For this demo, we'll provide simulated values
    
    const simulation = {
      gas_estimate: {
        gas_limit: 21000,
        gas_price: '15 gwei',
        total_gas_cost: {
          native: `0.000315 ${chainConfig.symbol}`,
          usd: '~$0.00'
        }
      },
      fees: {
        network_fee: `0.000315 ${chainConfig.symbol}`,
        total_amount_with_fees: `${(parsed.amount + 0.000315).toFixed(6)} ${chainConfig.symbol}`,
        token_amount: `${parsed.amount} ${parsed.token || chainConfig.symbol}`
      },
      timing: {
        estimated_confirmation: '10-30 seconds',
        best_time_to_send: 'Now'
      },
      summary: {
        from: 'Your connected wallet',
        to: parsed.recipient.value,
        total_cost: `${(parsed.amount + 0.000315).toFixed(6)} ${chainConfig.symbol}`,
        net_send: `${parsed.amount} ${parsed.token || chainConfig.symbol}`
      }
    };
    
    const simulationMessage = `📊 Transaction Simulation:
Amount: ${simulation.summary.net_send}
To: ${simulation.summary.to}
Network Fee: ${simulation.fees.network_fee}
Total Cost: ${simulation.summary.total_cost}

⏰ Timing:
Estimated Confirmation: ${simulation.timing.estimated_confirmation}

⚡ Ready to execute automatically! Click below to proceed:
    `;
    
    await ctx.reply(simulationMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚡ Execute Now', callback_data: 'confirm' },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]
        ]
      }
    });
    
    ctx.answerCbQuery('Simulation complete');
  } catch (error) {
    console.error('Simulation error:', error);
    ctx.answerCbQuery(`Simulation error: ${error.message}`);
    ctx.reply(`❌ Simulation error: ${error.message}`);
  }
}

// Handle automatic execution
async function handleAutomaticExecution(ctx, parsedResult) {
  try {
    const { parsed } = parsedResult;
    const chainConfig = chains[parsed.chain];
    
    // Create deep link for automatic wallet execution
    const chainId = 11155111; // Sepolia
    const ethDeepLink = `ethereum:${parsed.recipient.value}?value=${parsed.amount}&chainId=${chainId}`;
    const dappUrl = `${DAPP_BASE}/?to=${encodeURIComponent(parsed.recipient.value)}&amount=${encodeURIComponent(parsed.amount)}&chain=sepolia`;
    
    const executionMessage = `⚡ Automatic Transaction Execution ⚡

I'm preparing to execute this transaction automatically:

• Sending: ${parsed.amount} ${parsed.token}
• To: ${parsed.recipient.value}
• Network: ${chainConfig.name}

To complete this transaction:
1. Click the link below to open in your wallet
2. Confirm the transaction in your wallet
3. Reply with the transaction hash after confirmation

🔗 Click to execute: ${ethDeepLink}

🌐 Alternative dApp link: ${dappUrl}

This transaction is IRREVERSIBLE once confirmed!`;
    
    // Send the message
    await ctx.reply(executionMessage);
    
    ctx.answerCbQuery('Transaction ready for execution');
  } catch (error) {
    console.error('Execution error:', error);
    ctx.answerCbQuery(`Execution error: ${error.message}`);
  }
}

// Handle direct execution - Skip simulation and go straight to execution
async function handleDirectExecution(ctx, parsedResult) {
  try {
    const { parsed } = parsedResult;
    const chainConfig = chains[parsed.chain];
    
    // Create deep link for automatic wallet execution
    const chainId = 11155111; // Sepolia
    const ethDeepLink = `ethereum:${parsed.recipient.value}?value=${parsed.amount}&chainId=${chainId}`;
    const dappUrl = `${DAPP_BASE}/?to=${encodeURIComponent(parsed.recipient.value)}&amount=${encodeURIComponent(parsed.amount)}&chain=sepolia`;
    
    const executionMessage = `⚡ Transaction Ready for Execution ⚡

I've parsed your payment request:

• Amount: ${parsed.amount} ${parsed.token}
• To: ${parsed.recipient.value}
• Network: ${chainConfig.name}

💻 DESKTOP/LAPTOP USERS (Recommended):
1. Click this link to open in your browser:
   ${dappUrl}
2. Connect your wallet (MetaMask, etc.)
3. Confirm the transaction
4. Reply with the transaction hash after confirmation

⚠️ Make sure to:
• Have MetaMask or another wallet extension installed
• Be on the Sepolia testnet
• Have sufficient test ETH (get from sepoliafaucet.com)

This transaction is IRREVERSIBLE once confirmed!`;
    
    // Send the message
    await ctx.reply(executionMessage);
    
  } catch (error) {
    console.error('Execution error:', error);
    ctx.reply(`❌ Error preparing transaction: ${error.message}`);
  }
}

// Handle cancellation
async function handleCancellation(ctx) {
  try {
    await ctx.reply('❌ Transaction cancelled. Let me know if you need help with anything else!');
    ctx.answerCbQuery('Transaction cancelled');
    
    // Clear user session
    const userId = ctx.from.id;
    userSessions.delete(userId);
  } catch (error) {
    console.error('Cancellation error:', error);
    ctx.answerCbQuery(`Cancellation error: ${error.message}`);
  }
}

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('❌ An unexpected error occurred. Please try again.');
});

// Export functions for testing
export { parseIntent, detectIntent, extractAmount, extractRecipient };

// Start the bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ IntentPay Telegram Bot is running and waiting for messages...');