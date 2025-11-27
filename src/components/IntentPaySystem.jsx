import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { 
  Wallet, 
  Send, 
  RefreshCw, 
  Search, 
  Activity, 
  Key,
  Copy,
  ExternalLink,
  Check,
  Zap,
  Calculator,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const IntentPaySystem = () => {
  // Parser States
  const [input, setInput] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  // Real Wallet States
  const [userWallet, setUserWallet] = useState(null);
  const [walletBalance, setWalletBalance] = useState('0');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Viem clients
  const [publicClient, setPublicClient] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  
  // Simulation States
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState([]);

  // Real Blockchain Config
  const chains = {
    'sepolia': {
      name: 'Ethereum Sepolia',
      symbol: 'ETH',
      rpc: 'https://ethereum-sepolia.publicnode.com', // Trying a different RPC endpoint
      explorer: 'https://sepolia.etherscan.io',
      faucet: 'https://sepoliafaucet.com',
      chainId: 11155111,
      color: 'blue',
      viemChain: sepolia
    }
  };

  const [selectedChain, setSelectedChain] = useState('sepolia');

  // New state for handling query parameters
  const [queryParams, setQueryParams] = useState({});

  // Connect to Real Wallet
  const connectWallet = async () => {
    setWalletLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask!');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const address = accounts[0];
      setConnectedAddress(address);

      // Create ethers provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      setUserWallet(signer);
      
      // Create viem clients
      const chainConfig = chains[selectedChain];
      const publicClientInstance = createPublicClient({
        chain: chainConfig.viemChain,
        transport: http(chainConfig.rpc),
        batch: {
          multicall: true
        },
        pollingInterval: 1000,
        retryCount: 3,
        timeout: 20000 // 20 second timeout
      });
      
      const walletClientInstance = createWalletClient({
        chain: chainConfig.viemChain,
        transport: http(chainConfig.rpc),
        pollingInterval: 1000,
        retryCount: 3,
        timeout: 20000 // 20 second timeout
      });

      setPublicClient(publicClientInstance);
      setWalletClient(walletClientInstance);
      
      // Get initial balance
      await updateBalance(signer, selectedChain);
      
      showNotification('Wallet connected successfully!', 'success');
      
    } catch (error) {
      showNotification(`Connection failed: ${error.message}`, 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  // Update balance from blockchain using both ethers and viem
  const updateBalance = async (signer = userWallet, chain = selectedChain) => {
    if (!signer) return;
    
    try {
      // Using ethers (primary method)
      const provider = signer.provider;
      
      // Get address from both sources for debugging
      const signerAddress = await signer.getAddress();
      const connectedAddr = connectedAddress;
      
      console.log('Signer address:', signerAddress);
      console.log('Connected address:', connectedAddr);
      console.log('Addresses match:', signerAddress.toLowerCase() === connectedAddr.toLowerCase());
      
      // Check network
      const network = await provider.getNetwork();
      console.log('Current network:', network);
      console.log('Expected chain ID:', chains[selectedChain].chainId);
      const networkMatches = network.chainId === BigInt(chains[selectedChain].chainId);
      console.log('Network matches:', networkMatches);
      
      // Warn user if network doesn't match
      if (!networkMatches) {
        showNotification(`Warning: Wallet connected to wrong network. Expected ${chains[selectedChain].name} (Chain ID: ${chains[selectedChain].chainId}), but connected to Chain ID: ${network.chainId}`, 'error');
      }
      
      const addressToCheck = signerAddress; // Use signer address as primary
      
      // Try multiple times with delays
      let balance;
      let attempts = 0;
      while (attempts < 3) {
        try {
          balance = await provider.getBalance(addressToCheck);
          break;
        } catch (error) {
          // If it's a network change error, try to reconnect
          if (error.message.includes('network changed')) {
            showNotification('Network changed, reconnecting wallet...', 'info');
            await connectWallet();
            return;
          }
          attempts++;
          if (attempts >= 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Wait 1-2 seconds between retries
        }
      }
      
      const formattedBalance = ethers.formatEther(balance);
      setWalletBalance(parseFloat(formattedBalance).toFixed(4));
      
      console.log('Balance updated successfully:', formattedBalance);
      console.log('Raw balance:', balance.toString());
      
    } catch (error) {
      console.error('Balance update failed:', error);
      showNotification(`Balance update failed: ${error.message}`, 'error');
    }
  };

  // Real transaction simulation with live gas prices using viem
  const simulateRealTransaction = async (parsedData) => {
    if (!userWallet) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    setSimulating(true);

    try {
      const { parsed } = parsedData;
      const provider = userWallet.provider;
      
      // Validate recipient
      if (!parsed.recipient || !parsed.recipient.value) {
        throw new Error('Recipient address is missing or invalid');
      }
      
      // Use the helper to extract and normalize the address
      const rawRecipient = parsed.recipient?.value;
      const extracted = extractAddress(rawRecipient);

      if (!extracted) {
        throw new Error('No valid 0x... address found in recipient field.');
      }

      // If it's an ENS name we need to resolve it via provider
      let recipientAddress = null;
      if (extracted.startsWith('0x')) {
        // try checksum/normalize with additional cleaning
        const cleanAddr = extracted.trim().replace(/[^0-9a-fA-Fx]/g, '');
        console.log('Original address (ethers):', extracted);
        console.log('Cleaned address (ethers):', cleanAddr);
        console.log('Cleaned address length (ethers):', cleanAddr.length);
        console.log('Starts with 0x (ethers):', cleanAddr.startsWith('0x'));
        
        if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
          try {
            recipientAddress = ethers.getAddress(cleanAddr);
            console.log('Checksummed address (ethers):', recipientAddress);
          } catch (checksumError) {
            console.error('Checksum error details (ethers):', checksumError);
            // If checksum fails, try to create a new address with proper checksum
            try {
              // Create a new address from the hex value
              const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
              recipientAddress = ethers.getAddress(hexAddr);
              console.log('Fallback checksummed address (ethers):', recipientAddress);
            } catch (fallbackError) {
              console.error('Fallback checksum error (ethers):', fallbackError);
              throw new Error(`Invalid address format: ${extracted}`);
            }
          }
        }
      } else {
        // ENS-like string: resolve it
        recipientAddress = await userWallet.provider.resolveName(extracted);
        if (recipientAddress) {
          const cleanAddr = recipientAddress.trim().replace(/[^0-9a-fA-Fx]/g, '');
          if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
            try {
              recipientAddress = ethers.getAddress(cleanAddr);
            } catch (checksumError) {
              // If checksum fails, try to create a new address with proper checksum
              try {
                const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
                recipientAddress = ethers.getAddress(hexAddr);
              } catch (fallbackError) {
                throw new Error(`Invalid address format after ENS resolution: ${recipientAddress}`);
              }
            }
          }
        }
      }

      // Final validation
      if (!recipientAddress) {
        throw new Error(`Recipient address invalid or could not be resolved: "${rawRecipient}"`);
      }
      
      // Get live gas price using ethers
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      
      // Also demonstrate viem gas estimation
      let viemGasEstimate = null;
      if (publicClient) {
        try {
          viemGasEstimate = await publicClient.estimateGas({
            account: connectedAddress,
            to: recipientAddress, // Use the checksummed address
            value: parseEther(parsed.amount.toString())
          });
          console.log('Viem gas estimate:', viemGasEstimate.toString());
        } catch (viemError) {
          console.log('Viem gas estimation error:', viemError);
        }
      }
      
      // Estimate gas for the transaction
      const gasLimit = viemGasEstimate ? Number(viemGasEstimate) : 21000; // Use viem estimate if available
      
      // Calculate costs
      const gasCost = gasPrice * BigInt(gasLimit);
      const gasCostEther = ethers.formatEther(gasCost);
      
      const totalCost = parsed.amount + parseFloat(gasCostEther);

      // Check if user has enough balance
      if (totalCost > parseFloat(walletBalance)) {
        throw new Error(`Insufficient balance. Need ${totalCost} ${chains[selectedChain].symbol}, have ${walletBalance}`);
      }

      const simulation = {
        parsed_data: parsed,
        simulation: {
          gas_estimate: {
            gas_limit: gasLimit,
            gas_price: `${ethers.formatUnits(gasPrice, 'gwei')} gwei`,
            total_gas_cost: {
              native: `${gasCostEther} ${chains[selectedChain].symbol}`,
              usd: '~$0.00' // Would need price feed
            }
          },
          fees: {
            network_fee: `${gasCostEther} ${chains[selectedChain].symbol}`,
            total_amount_with_fees: `${totalCost.toFixed(6)} ${chains[selectedChain].symbol}`,
            token_amount: `${parsed.amount} ${parsed.token || chains[selectedChain].symbol}`
          },
          timing: {
            estimated_confirmation: '10-30 seconds',
            best_time_to_send: 'Now'
          },
          summary: {
            from: connectedAddress,
            to: recipientAddress, // Use the checksummed address
            total_cost: `${totalCost.toFixed(6)} ${chains[selectedChain].symbol}`,
            net_send: `${parsed.amount} ${parsed.token || chains[selectedChain].symbol}`
          },
          warnings: [],
          errors: []
        }
      };

      setSimulationResult(simulation);
      
      // Show notification
      showNotification('Transaction simulated successfully', 'success');

    } catch (error) {
      console.error('Simulation error:', error);
      showNotification(`Simulation error: ${error.message}`, 'error');
      throw error; // Re-throw to be caught by parseAndExecuteTransaction
    } finally {
      setSimulating(false);
    }
  };

  // Execute real blockchain transaction using both ethers and viem
  const executeRealTransaction = async () => {
    if (!simulationResult || !userWallet) return;

    setWalletLoading(true);

    try {
      // Debug: Log the simulation result structure
      console.log('Simulation result:', simulationResult);
      
      // Fix: Access the correct property name
      const parsed = simulationResult.parsed_data;
      
      // Validate that we have parsed data
      if (!parsed) {
        throw new Error('No parsed data available. Please parse intent first.');
      }
      
      // Validate recipient
      if (!parsed.recipient || !parsed.recipient.value) {
        throw new Error('Recipient address is missing or invalid');
      }
      
      // Debug logs
      console.log('raw recipient:', parsed.recipient && parsed.recipient.value);
      console.log('type:', typeof parsed.recipient?.value);
      console.log('length:', parsed.recipient?.value?.length);
      console.log('chars (hex only):', parsed.recipient?.value?.replace(/\s/g, '').slice(0,60));
      console.log('regex match:', parsed.recipient?.value?.match(/0x[a-fA-F0-9]{40}/));
      
      // Use the helper to extract and normalize the address
      const rawRecipient = parsed.recipient?.value;
      const extracted = extractAddress(rawRecipient);

      if (!extracted) {
        throw new Error('No valid 0x... address found in recipient field.');
      }

      // If it's an ENS name we need to resolve it via provider
      let recipientAddress = null;
      if (extracted.startsWith('0x')) {
        // try checksum/normalize with additional cleaning
        const cleanAddr = extracted.trim().replace(/[^0-9a-fA-Fx]/g, '');
        console.log('Original address (ethers):', extracted);
        console.log('Cleaned address (ethers):', cleanAddr);
        console.log('Cleaned address length (ethers):', cleanAddr.length);
        console.log('Starts with 0x (ethers):', cleanAddr.startsWith('0x'));
        
        if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
          try {
            recipientAddress = ethers.getAddress(cleanAddr);
            console.log('Checksummed address (ethers):', recipientAddress);
          } catch (checksumError) {
            console.error('Checksum error details (ethers):', checksumError);
            // If checksum fails, try to create a new address with proper checksum
            try {
              // Create a new address from the hex value
              const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
              recipientAddress = ethers.getAddress(hexAddr);
              console.log('Fallback checksummed address (ethers):', recipientAddress);
            } catch (fallbackError) {
              console.error('Fallback checksum error (ethers):', fallbackError);
              throw new Error(`Invalid address format: ${extracted}`);
            }
          }
        }
      } else {
        // ENS-like string: resolve it
        recipientAddress = await userWallet.provider.resolveName(extracted);
        if (recipientAddress) {
          const cleanAddr = recipientAddress.trim().replace(/[^0-9a-fA-Fx]/g, '');
          if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
            try {
              recipientAddress = ethers.getAddress(cleanAddr);
            } catch (checksumError) {
              // If checksum fails, try to create a new address with proper checksum
              try {
                const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
                recipientAddress = ethers.getAddress(hexAddr);
              } catch (fallbackError) {
                throw new Error(`Invalid address format after ENS resolution: ${recipientAddress}`);
              }
            }
          }
        }
      }

      // Final validation
      if (!recipientAddress) {
        throw new Error(`Recipient address invalid or could not be resolved: "${rawRecipient}"`);
      }
      
      // Validate amount
      if (!parsed.amount || isNaN(parsed.amount)) {
        throw new Error('Amount is missing or invalid');
      }
      
      showNotification('Sending real transaction to blockchain...', 'info');

      // Option 1: Using ethers (existing approach)
      const tx = {
        to: recipientAddress, // Use the checksummed address
        value: ethers.parseEther(parsed.amount.toString()),
        gasLimit: simulationResult.simulation.gas_estimate.gas_limit
      };

      const transaction = await userWallet.sendTransaction(tx);
      
      showNotification('Transaction submitted! Waiting for confirmation...', 'info');

      const receipt = await transaction.wait();
      
      // Add to pending transactions
      const newTransaction = {
        hash: receipt.hash,
        from: receipt.from,
        to: receipt.to,
        amount: parsed.amount,
        token: parsed.token,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

      setPendingTransactions(prev => [newTransaction, ...prev]);
      
      // Update balance
      await updateBalance();
      
      showNotification('✅ Real transaction confirmed on blockchain!', 'success');

    } catch (error) {
      console.error('Transaction failed:', error);
      showNotification(`❌ Transaction failed: ${error.message}`, 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  // New function to demonstrate viem transaction sending
  const executeViemTransaction = async () => {
    if (!simulationResult || !window.ethereum) return;

    setWalletLoading(true);

    try {
      // Debug: Log the simulation result structure
      console.log('Simulation result (Viem):', simulationResult);
      
      // Fix: Access the correct property name
      const parsed = simulationResult.parsed_data;
      
      // Validate that we have parsed data
      if (!parsed) {
        throw new Error('No parsed data available. Please parse intent first.');
      }
      
      // Validate recipient
      if (!parsed.recipient || !parsed.recipient.value) {
        throw new Error('Recipient address is missing or invalid');
      }
      
      // Debug logs
      console.log('raw recipient:', parsed.recipient && parsed.recipient.value);
      console.log('type:', typeof parsed.recipient?.value);
      console.log('length:', parsed.recipient?.value?.length);
      console.log('chars (hex only):', parsed.recipient?.value?.replace(/\s/g, '').slice(0,60));
      console.log('regex match:', parsed.recipient?.value?.match(/0x[a-fA-F0-9]{40}/));
      
      // Use the helper to extract and normalize the address
      const rawRecipient = parsed.recipient?.value;
      const extracted = extractAddress(rawRecipient);

      if (!extracted) {
        throw new Error('No valid 0x... address found in recipient field.');
      }

      // If it's an ENS name we need to resolve it via provider
      let recipientAddress = null;
      if (extracted.startsWith('0x')) {
        // try checksum/normalize with additional cleaning
        const cleanAddr = extracted.trim().replace(/[^0-9a-fA-Fx]/g, '');
        console.log('Original address (Viem):', extracted);
        console.log('Cleaned address (Viem):', cleanAddr);
        console.log('Cleaned address length (Viem):', cleanAddr.length);
        console.log('Starts with 0x (Viem):', cleanAddr.startsWith('0x'));
        
        if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
          try {
            recipientAddress = ethers.getAddress(cleanAddr);
            console.log('Checksummed address (Viem):', recipientAddress);
          } catch (checksumError) {
            console.error('Checksum error details (Viem):', checksumError);
            // If checksum fails, try to create a new address with proper checksum
            try {
              // Create a new address from the hex value
              const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
              recipientAddress = ethers.getAddress(hexAddr);
              console.log('Fallback checksummed address (Viem):', recipientAddress);
            } catch (fallbackError) {
              console.error('Fallback checksum error (Viem):', fallbackError);
              throw new Error(`Invalid address format: ${extracted}`);
            }
          }
        }
      } else {
        // ENS-like string: resolve it
        recipientAddress = await userWallet.provider.resolveName(extracted);
        if (recipientAddress) {
          const cleanAddr = recipientAddress.trim().replace(/[^0-9a-fA-Fx]/g, '');
          if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
            try {
              recipientAddress = ethers.getAddress(cleanAddr);
            } catch (checksumError) {
              // If checksum fails, try to create a new address with proper checksum
              try {
                const hexAddr = '0x' + cleanAddr.substring(2).toLowerCase();
                recipientAddress = ethers.getAddress(hexAddr);
              } catch (fallbackError) {
                throw new Error(`Invalid address format after ENS resolution: ${recipientAddress}`);
              }
            }
          }
        }
      }

      // Final validation
      if (!recipientAddress) {
        throw new Error(`Recipient address invalid or could not be resolved: "${rawRecipient}"`);
      }
      
      // Validate amount
      if (!parsed.amount || isNaN(parsed.amount)) {
        throw new Error('Amount is missing or invalid');
      }
      
      showNotification('Sending transaction using Viem...', 'info');

      // Using viem for transaction
      if (walletClient && publicClient) {
        // Request account access
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Send transaction using viem
        const txHash = await walletClient.sendTransaction({
          account,
          to: recipientAddress, // Use the checksummed address
          value: parseEther(parsed.amount.toString()),
        });
        
        showNotification('Transaction submitted with Viem! Waiting for confirmation...', 'info');
        
        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        // Add to pending transactions
        const newTransaction = {
          hash: receipt.transactionHash || txHash,
          from: receipt.from,
          to: receipt.to,
          amount: parsed.amount,
          token: parsed.token,
          timestamp: new Date().toISOString(),
          status: 'confirmed'
        };

        setPendingTransactions(prev => [newTransaction, ...prev]);
        
        // Update balance
        await updateBalance();
        
        showNotification('✅ Viem transaction confirmed on blockchain!', 'success');
      }
    } catch (error) {
      console.error('Viem transaction failed:', error);
      showNotification(`❌ Viem transaction failed: ${error.message}`, 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  // Manual balance check function
  const checkBalanceForAddress = async (address) => {
    if (!userWallet) return;
    
    try {
      const provider = userWallet.provider;
      let balance;
      let attempts = 0;
      
      while (attempts < 3) {
        try {
          balance = await provider.getBalance(address);
          break;
        } catch (error) {
          // If it's a network change error, try to reconnect
          if (error.message.includes('network changed')) {
            showNotification('Network changed, reconnecting wallet...', 'info');
            await connectWallet();
            return;
          }
          attempts++;
          if (attempts >= 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      const formattedBalance = ethers.formatEther(balance);
      
      console.log(`Balance for ${address}:`, formattedBalance);
      showNotification(`Balance for ${address}: ${formattedBalance} ETH`, 'info');
      
      return formattedBalance;
    } catch (error) {
      console.error('Manual balance check failed:', error);
      showNotification(`Balance check failed: ${error.message}`, 'error');
    }
  };

  // Manual balance check with alternative provider
  const checkBalanceWithAlternativeProvider = async (address) => {
    try {
      // Create a new provider with a different RPC endpoint
      const alternativeProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
      
      // Check network
      const network = await alternativeProvider.getNetwork();
      console.log('Alternative provider network:', network);
      
      const balance = await alternativeProvider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      console.log(`Alternative provider balance for ${address}:`, formattedBalance);
      showNotification(`Alternative balance for ${address}: ${formattedBalance} ETH`, 'success');
      
      // If this provider shows a balance and the main one doesn't, suggest switching networks
      if (parseFloat(formattedBalance) > 0) {
        showNotification('Your wallet might be connected to the wrong network. Please click "Switch Network" to fix this.', 'warning');
      }
      
      return formattedBalance;
    } catch (error) {
      console.error('Alternative provider balance check failed:', error);
      showNotification(`Alternative balance check failed: ${error.message}`, 'error');
    }
  };

  // Function to switch MetaMask to the correct network
  const switchToCorrectNetwork = async () => {
    if (!window.ethereum) {
      showNotification('MetaMask not found!', 'error');
      return;
    }
    
    try {
      // Try to switch to the correct network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chains[selectedChain].chainId.toString(16)}` }], // Convert to hex
      });
      
      showNotification('Network switched successfully! Reconnecting wallet...', 'success');
      // Reconnect wallet after switching to recreate providers
      setTimeout(() => connectWallet(), 2000);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          // Add the network to MetaMask
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chains[selectedChain].chainId.toString(16)}`,
                chainName: chains[selectedChain].name,
                rpcUrls: [chains[selectedChain].rpc],
                nativeCurrency: {
                  name: chains[selectedChain].symbol,
                  symbol: chains[selectedChain].symbol,
                  decimals: 18,
                },
                blockExplorerUrls: [chains[selectedChain].explorer],
              },
            ],
          });
          showNotification('Network added and switched successfully! Reconnecting wallet...', 'success');
          // Reconnect wallet after switching to recreate providers
          setTimeout(() => connectWallet(), 2000);
        } catch (addError) {
          showNotification(`Failed to add network: ${addError.message}`, 'error');
        }
      } else {
        showNotification(`Failed to switch network: ${switchError.message}`, 'error');
      }
    }
  };

  // Parse query parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    setQueryParams(params);
    
    // If we have query parameters, prefill the form
    if (params.to && params.amount) {
      setInput(`Send ${params.amount} ETH to ${params.to}`);
    }
  }, []);

  // Function to sign transaction with MetaMask
  const signWithMetaMask = async (to, amount) => {
    if (!window.ethereum) {
      showNotification('Please install MetaMask', 'error');
      return;
    }
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      
      // Create transaction parameters
      const txParams = {
        from,
        to,
        value: ethers.parseEther(amount).toString(), // Convert to wei
      };
      
      // Send transaction
      showNotification('Sending transaction...', 'info');
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      showNotification(`Transaction submitted: ${txHash}`, 'success');
      
      // Update balance after transaction
      setTimeout(() => updateBalance(), 5000);
      
      return txHash;
    } catch (error) {
      console.error('MetaMask error:', error);
      showNotification(`MetaMask error: ${error.message}`, 'error');
    }
  };

  // Function to parse intent and automatically execute transaction
  const parseAndExecuteTransaction = async (text) => {
    setParsing(true);
    setWalletLoading(true);
    setError(null);
    
    try {
      // Parse the intent
      const parsedResult = await intelligentParse(text);
      
      if (!parsedResult) {
        throw new Error('Failed to parse payment intent');
      }
      
      setParsedResult(parsedResult);
      
      // Simulate the transaction to get gas estimates
      await simulateRealTransaction(parsedResult);
      
      // Automatically execute the transaction after a short delay to show the simulation results
      setTimeout(() => {
        executeRealTransaction();
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setParsing(false);
      setWalletLoading(false);
    }
  };

  const parseIntent = async (text) => {
    setParsing(true);
    setError(null);
    setSimulationResult(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const parsed = await intelligentParse(text);
      setParsedResult(parsed);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const intelligentParse = async (text) => {
    const lowerText = text.toLowerCase();
    
    // Intent detection
    const intent = detectIntent(lowerText);
    
    // Amount extraction
    const amount = extractAmount(text);
    
    // Token extraction
    const token = extractToken(lowerText);
    
    // Recipient extraction - NOW REQUIRES REAL ADDRESS
    const recipient = extractRecipient(text);
    
    if (!recipient || !recipient.value.startsWith('0x')) {
      throw new Error('Please provide a valid Ethereum address (0x...)');
    }

    // Chain detection
    const chain = detectChain(lowerText, token) || selectedChain;
    
    // Missing fields
    const missingFields = [];
    if (!amount) missingFields.push('amount');
    if (!token) missingFields.push('token');
    if (!recipient) missingFields.push('recipient');
    
    if (missingFields.length > 0) {
      return {
        raw_input: text,
        parsed: {
          intent,
          amount,
          token,
          recipient,
          chain,
          missing_fields: missingFields,
          confidence: 0.7,
          timestamp: new Date().toISOString()
        },
        suggestions: generateSuggestions(missingFields),
        warnings: []
      };
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
  };

  // Update recipient extraction to require real addresses
  const extractRecipient = (text) => {
    // Only accept Ethereum addresses
    const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      return { type: 'address', value: addressMatch[0] };
    }
    
    return null;
  };

  // Keep all your existing helper functions (detectIntent, extractAmount, etc.)
  const detectIntent = (text) => {
    if (text.match(/send|transfer|pay|give/)) return 'send';
    if (text.match(/request|ask|collect/)) return 'request';
    return 'send';
  };

  const extractAmount = (text) => {
    const patterns = [
      /(\d+\.?\d*)\s*(eth|usdc|usdt)/i,
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
  };

  const extractToken = (text) => {
    const tokens = {
      'eth': 'ETH',
      'usdc': 'USDC',
      'usdt': 'USDT'
    };
    
    for (const [key, value] of Object.entries(tokens)) {
      if (text.includes(key)) return value;
    }
    
    // Default to ETH for Sepolia
    return chains[selectedChain].symbol;
  };

  const detectChain = (text, token) => {
    if (token === 'ETH') return 'sepolia';
    if (text.includes('ethereum') || text.includes('eth')) return 'sepolia';
    return null;
  };

  const generateSuggestions = (missingFields) => {
    const suggestions = [];
    if (missingFields.includes('amount')) suggestions.push('How much would you like to send?');
    if (missingFields.includes('token')) suggestions.push('Which token? (MATIC, ETH, USDC)');
    if (missingFields.includes('recipient')) suggestions.push('Please provide a valid Ethereum address (0x...)');
    return suggestions;
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showNotification(`${label} copied!`, 'success');
  };

  // Helpers for address extraction and normalization
  const extractAddress = (input = '') => {
    if (!input || typeof input !== 'string') return null;

    // Trim and remove zero-width / invisible characters
    const cleaned = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

    // If it contains an on-screen address somewhere, pull the first match
    const match = cleaned.match(/0x[a-fA-F0-9]{40}/);
    if (match) return match[0];

    // If the user passed an ENS name (example.eth), return it so you can resolve later
    if (/^[\w-]+(\.[\w-]+)+$/.test(cleaned)) return cleaned;

    return null;
  };

  const normalizeAndChecksum = async (addr, provider) => {
    // If ENS (non-0x), resolve to address (returns null if not resolvable)
    if (!addr) return null;
    if (!addr.startsWith('0x')) {
      if (!provider) throw new Error('ENS name provided but no provider to resolve it.');
      return await provider.resolveName(addr); // returns checksummed address if resolves
    }
    // if it starts with 0x, try to checksum it
    try {
      // Additional cleaning to remove any hidden characters
      const cleanAddr = addr.trim().replace(/[^0-9a-fA-Fx]/g, '');
      if (cleanAddr.length === 42 && cleanAddr.startsWith('0x')) {
        return ethers.getAddress(cleanAddr);
      }
      return null;
    } catch (e) {
      // return null to indicate invalid address
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wallet className="w-12 h-12 text-purple-300" />
            <h1 className="text-4xl font-bold text-white">IntentPay Real-Time</h1>
          </div>
          <p className="text-purple-200 text-lg">Real Blockchain Transactions with Ethers & Viem</p>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg border ${
            notification.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' :
            notification.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
            'bg-blue-500/20 border-blue-500/50 text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Parser & Wallet */}
          <div className="space-y-6">
            {/* Wallet Connection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Real Wallet Connection
              </h2>

              {!userWallet ? (
                <div className="text-center py-8">
                  <p className="text-purple-200 mb-4">Connect your MetaMask wallet to start</p>
                  <button
                    onClick={connectWallet}
                    disabled={walletLoading}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 mx-auto"
                  >
                    {walletLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        Connect MetaMask
                      </>
                    )}
                  </button>
                  <p className="text-purple-300 text-sm mt-4">
                    Make sure MetaMask is installed and unlocked
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Address */}
                  <div>
                    <label className="text-purple-300 text-sm">Connected Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-white/5 rounded-lg p-3 text-white font-mono text-sm break-all">
                        {connectedAddress}
                      </div>
                      <button
                        onClick={() => copyToClipboard(connectedAddress, 'Address')}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <Copy className="w-4 h-4 text-purple-300" />
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                    <div className="text-purple-200 text-sm mb-1">Live Balance</div>
                    <div className="text-white text-2xl font-bold">
                      {walletBalance} {chains[selectedChain].symbol}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => updateBalance()}
                        className="flex items-center gap-2 text-purple-300 hover:text-white text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Balance
                      </button>
                      <button
                        onClick={() => checkBalanceForAddress(connectedAddress)}
                        className="flex items-center gap-2 text-blue-300 hover:text-white text-sm"
                      >
                        <Search className="w-4 h-4" />
                        Check Address
                      </button>
                      <button
                        onClick={() => checkBalanceWithAlternativeProvider(connectedAddress)}
                        className="flex items-center gap-2 text-green-300 hover:text-white text-sm"
                      >
                        <Activity className="w-4 h-4" />
                        Alt Provider
                      </button>
                      <button
                        onClick={switchToCorrectNetwork}
                        className="flex items-center gap-2 text-yellow-300 hover:text-white text-sm"
                      >
                        <Key className="w-4 h-4" />
                        Switch Network
                      </button>
                    </div>
                  </div>

                  {/* Chain Selection */}
                  <div>
                    <label className="text-purple-300 text-sm mb-2 block">Select Network</label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setSelectedChain('sepolia')}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedChain === 'sepolia'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-white font-semibold">ETH</div>
                        <div className="text-purple-200 text-xs">Ethereum Sepolia</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Parser Input */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <label className="block text-white font-semibold mb-3">Enter Payment Intent:</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf"
                className="w-full h-32 bg-white/20 text-white placeholder-purple-200 rounded-lg p-4 border border-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => parseAndExecuteTransaction(input)}
                  disabled={!input || parsing || !userWallet || walletLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {parsing || walletLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Execute Transaction
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4">
                <p className="text-purple-200 text-sm mb-2">Real transaction examples:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setInput("Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9E7595f0bEEf")}
                    className="text-xs bg-white/10 text-purple-200 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"
                  >
                    Send 0.1 ETH
                  </button>
                  <button
                    onClick={() => setInput("Transfer 0.01 ETH to 0x4f6cA5E2eD6E8de8e8C1e2d5b915B582E318c44C")}
                    className="text-xs bg-white/10 text-purple-200 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"
                  >
                    Send 0.01 ETH
                  </button>
                </div>
              </div>
            </div>

            {/* Parser Results */}
            {false && parsedResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  Parsed Intent
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Amount</div>
                    <div className="text-white font-semibold">{parsedResult.parsed.amount}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Token</div>
                    <div className="text-white font-semibold">{parsedResult.parsed.token}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Recipient</div>
                    <div className="text-white font-semibold text-xs font-mono break-all">
                      {parsedResult.parsed.recipient.value}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Network</div>
                    <div className="text-white font-semibold">{parsedResult.parsed.chain}</div>
                  </div>
                </div>

                <button
                  onClick={() => simulateRealTransaction(parsedResult)}
                  disabled={simulating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {simulating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5" />
                      Real Transaction Simulation
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Simulation & Execution */}
          <div className="space-y-6">
            {/* Simulation Results */}
            {false && simulationResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-blue-400" />
                  Real Transaction Ready
                </h3>

                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                    <h4 className="text-purple-300 text-sm mb-3">Transaction Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-purple-200">Sending:</span>
                        <span className="text-white">{simulationResult.simulation.summary.net_send}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-200">To:</span>
                        <span className="text-white text-xs font-mono">{simulationResult.simulation.summary.to}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-200">Network Fee:</span>
                        <span className="text-white">{simulationResult.simulation.fees.network_fee}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/20 pt-2">
                        <span className="text-purple-200 font-semibold">Total Cost:</span>
                        <span className="text-white font-semibold">{simulationResult.simulation.summary.total_cost}</span>
                      </div>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={executeRealTransaction}
                      disabled={walletLoading}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                    >
                      {walletLoading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Executing on Blockchain...
                        </>
                      ) : (
                        <>
                          <Send className="w-6 h-6" />
                          Execute with Ethers
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={executeViemTransaction}
                      disabled={walletLoading || !walletClient}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                    >
                      {walletLoading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Executing with Viem...
                        </>
                      ) : (
                        <>
                          <Send className="w-6 h-6" />
                          Execute with Viem
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-purple-200 text-sm text-center">
                    This will create a real transaction on the {chains[selectedChain].name} blockchain
                  </p>
                </div>
              </div>
            )}

            {/* Transaction Success Message */}
            {pendingTransactions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  Transaction Successful!
                </h3>
                
                <div className="space-y-4">
                  {pendingTransactions.slice(0, 3).map((tx, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-white font-semibold">
                          {tx.amount} {tx.token}
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-200 rounded-full text-xs">
                          Confirmed
                        </span>
                      </div>
                      <div className="text-purple-200 text-sm mb-2">
                        To: <span className="font-mono text-xs">{tx.to}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <a
                          href={`${chains[selectedChain].explorer}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Explorer
                        </a>
                        <div className="text-purple-300 text-xs">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-500/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-white font-semibold text-xl mb-4">🚀 Real Transaction Guide</h3>
              <div className="space-y-3 text-blue-100 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
                  <div>Connect MetaMask wallet</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
                  <div>Get test tokens from faucet (see links below)</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
                  <div>Use real Ethereum addresses (0x...)</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mt-0.5">4</div>
                  <div>Parse → Simulate → Execute real transaction with either Ethers or Viem</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-500/30">
                <p className="text-blue-200 text-sm mb-2">Testnet Faucets:</p>
                <div className="space-y-1 text-xs">
                  <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 block">
                    🔷 Ethereum Sepolia Faucet
                  </a>
                  <a href="https://sepolia-faucet.pk910.de/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 block">
                    🔧 Sepolia PoW Faucet (No Mainnet ETH Required)
                  </a>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-500/30">
                <p className="text-blue-200 text-sm mb-2">Web3 Libraries:</p>
                <div className="flex gap-2">
                  <span className="bg-purple-500/20 text-purple-200 px-2 py-1 rounded text-xs">Ethers.js v6</span>
                  <span className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded text-xs">Viem v2</span>
                </div>
                <p className="text-blue-200 text-xs mt-2">
                  Both libraries are integrated for real blockchain transactions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-purple-200 text-sm">
          <p>✨ Real Blockchain Transactions Active</p>
          <p className="mt-2">Connected to {chains[selectedChain].name} • Live Balance: {walletBalance} {chains[selectedChain].symbol}</p>
        </div>
      </div>
    </div>
  );
};

export default IntentPaySystem;