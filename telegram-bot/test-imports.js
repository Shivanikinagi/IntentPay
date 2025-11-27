import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';

console.log('All imports successful!');
console.log('Telegraf:', !!Telegraf);
console.log('ethers:', !!ethers);
console.log('sepolia:', !!sepolia);
console.log('dotenv:', !!dotenv);