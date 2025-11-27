// Demo script showing the complete IntentPay Telegram Bot workflow
import { parseIntent } from './bot.js';

async function demoWorkflow() {
  console.log('🚀 IntentPay Telegram Bot - Demo Workflow\n');
  
  // Simulate a user message
  const userMessage = "Send 0.1 MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf";
  console.log(`👤 User: ${userMessage}\n`);
  
  try {
    // Step 1: Parse the intent
    console.log('🤖 Bot: Parsing your payment intent...');
    const parsedResult = await parseIntent(userMessage);
    
    if (!parsedResult) {
      console.log('❌ Bot: Sorry, I couldn\'t understand your payment intent.');
      return;
    }
    
    // Step 2: Create human-readable summary
    console.log('\n✅ Bot: Payment Summary');
    console.log(`   Amount: ${parsedResult.parsed.amount} ${parsedResult.parsed.token}`);
    console.log(`   To: ${parsedResult.parsed.recipient.value}`);
    console.log(`   Network: ${parsedResult.parsed.chain}`);
    
    // Step 3: Show inline button options (simulated)
    console.log('\n❓ Bot: What would you like to do?');
    console.log('   [📊 Simulate] [✅ Confirm] [❌ Cancel]');
    
    // Simulate user selecting "Simulate"
    console.log('\n👤 User: [📊 Simulate]');
    
    // Step 4: Simulate transaction
    console.log('\n🤖 Bot: Simulating transaction...');
    console.log('📊 Transaction Simulation:');
    console.log(`   Amount: ${parsedResult.parsed.amount} ${parsedResult.parsed.token}`);
    console.log(`   To: ${parsedResult.parsed.recipient.value}`);
    console.log(`   Network Fee: 0.000315 ${parsedResult.parsed.token}`);
    console.log(`   Total Cost: ${(parsedResult.parsed.amount + 0.000315).toFixed(6)} ${parsedResult.parsed.token}`);
    console.log('\n   ⏰ Timing:');
    console.log('   Estimated Confirmation: 10-30 seconds');
    
    // Step 5: Show confirmation options
    console.log('\n❓ Bot: Would you like to proceed with this transaction?');
    console.log('   [✅ Confirm] [❌ Cancel]');
    
    // Simulate user selecting "Confirm"
    console.log('\n👤 User: [✅ Confirm]');
    
    // Step 6: Redirect to web app for secure transaction
    console.log('\n🔐 Bot: For security, please complete this transaction on our web platform:');
    console.log('   🔗 https://your-intentpay-url.com');
    console.log('\n   This ensures your private keys remain secure and you can review all transaction details.');
    
  } catch (error) {
    console.log(`❌ Bot: Error - ${error.message}`);
  }
}

// Run the demo
demoWorkflow().catch(console.error);