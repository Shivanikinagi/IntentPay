// Parsing utility functions for IntentPay

import { TOKENS, CHAINS } from '../constants/tokens';
import { ethers } from 'ethers';

// Detect the intent from user input
export const detectIntent = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('send') || lowerText.includes('transfer') || lowerText.includes('pay')) {
    return 'send';
  }
  
  if (lowerText.includes('receive') || lowerText.includes('get') || lowerText.includes('request')) {
    return 'receive';
  }
  
  if (lowerText.includes('swap') || lowerText.includes('exchange') || lowerText.includes('trade')) {
    return 'swap';
  }
  
  return 'unknown';
};

// Extract amount from user input
export const extractAmount = (text) => {
  const amountRegex = /(?:\$)?(\d+(?:\.\d+)?)|(?:\b(\d+(?:\.\d+)?)\s*(?:dollars?|usd|usdc|usdt)\b)/gi;
  const matches = [...text.matchAll(amountRegex)];
  
  if (matches.length > 0) {
    // Return the first matched amount
    const match = matches[0];
    return match[1] || match[2];
  }
  
  return null;
};

// Extract cryptocurrency token from user input
export const extractToken = (text) => {
  const lowerText = text.toLowerCase();
  
  for (const [key, value] of Object.entries(TOKENS)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  
  return null;
};

// Extract blockchain network from user input
export const extractChain = (text) => {
  const lowerText = text.toLowerCase();
  
  for (const [key, value] of Object.entries(CHAINS)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  
  return null;
};

// Extract recipient address from user input
export const extractAddress = (text) => {
  // Simple regex for wallet addresses (this is a simplified version)
  const ethAddressRegex = /\b0x[a-fA-F0-9]{40}\b/;
  const solAddressRegex = /\b[A-Za-z0-9]{32,44}\b/;
  
  const ethMatch = text.match(ethAddressRegex);
  if (ethMatch) {
    const address = ethMatch[0];
    // Validate and fix checksum with more robust approach
    try {
      return ethers.getAddress(address);
    } catch (error) {
      console.warn('Invalid address checksum, attempting to fix:', address);
      // Try to fix the checksum by converting to lowercase and then checksumming
      try {
        const cleanAddr = address.trim().replace(/[^0-9a-fA-Fx]/g, '');
        if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
          // Create a new address from the hex value
          const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
          return ethers.getAddress(hexAddr);
        }
      } catch (fixError) {
        console.error('Failed to fix address checksum:', fixError);
      }
      // If all else fails, return the original address
      return address;
    }
  }
  
  const solMatch = text.match(solAddressRegex);
  if (solMatch) return solMatch[0];
  
  return null;
};