// Test script for IntentPay parser logic
import { parseIntent } from './bot.js';

async function testParser() {
  console.log('Testing IntentPay Parser...\n');
  
  // Test cases
  const testCases = [
    'Send 0.1 MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf',
    'Transfer 0.01 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C',
    'Pay 0.5 USDC to 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    'Send 1.5 ETH',
    'Transfer MATIC to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf'
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Input: "${testCase}"`);
      const result = await parseIntent(testCase);
      
      if (result) {
        console.log('✅ Parsed successfully:');
        console.log(`   Intent: ${result.parsed.intent}`);
        console.log(`   Amount: ${result.parsed.amount}`);
        console.log(`   Token: ${result.parsed.token}`);
        console.log(`   Recipient: ${result.parsed.recipient?.value}`);
        console.log(`   Chain: ${result.parsed.chain}`);
      } else {
        console.log('❌ Failed to parse');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

// Run the test
testParser().catch(console.error);