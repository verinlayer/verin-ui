import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { getChainSpecs } from "@vlayer/sdk";
import { Chain } from "viem";
import { createAppKit } from "@reown/appkit/react";
import { injected, metaMask, walletConnect, safe } from "wagmi/connectors";
import { mainnet, optimism, base, optimismSepolia, baseSepolia } from '@reown/appkit/networks'


const appKitProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || `88cd40e876a44270a55cd4e034d55478`;

// Configure all supported chains
const chains: [Chain, ...Chain[]] = [
  base,            // Base Mainnet
  optimism,        // Optimism Mainnet
  mainnet,         // Ethereum Mainnet
  optimismSepolia, // Optimism Sepolia (testnet)
  baseSepolia,     // Base Sepolia (testnet)
];

// Determine default chain from environment variable
let defaultChain: Chain = base; // Default to Base

try {
  const envChainName = import.meta.env.VITE_CHAIN_NAME;
  if (envChainName) {
    const envChain = getChainSpecs(envChainName);
    // Check if the env chain is in our supported chains
    const foundChain = chains.find(c => c.id === envChain.id);
    if (foundChain) {
      defaultChain = foundChain;
      console.log(`Using default chain from env: ${envChainName} (ID: ${defaultChain.id})`);
    } else {
      console.warn(`Chain ${envChainName} from env not in supported chains, using Base as default`);
    }
  }
} catch (error) {
  console.error("Error getting chain from env:", error);
  console.log("Using Base as default chain");
}

const networks = chains;

// Create connectors array following Wagmi guide
const connectors = [
  // injected(), // Supports MetaMask, Rabby, and other injected wallets
  walletConnect({ 
    projectId: appKitProjectId,
    showQrModal: true,
    qrModalOptions: {
      themeMode: 'light'
    },
    metadata: {
      name: 'Verin Layer',
      description: 'Claim your DeFi Activity Proof',
      url: 'https://verinlayer.xyz',
      icons: ['https://raw.githubusercontent.com/luandt/simple-teleport/refs/heads/main/vlayer/public/favicon.svg?token=GHSAT0AAAAAADIU3PJY6DVLOEFADC7SLGHQ2G7VE6Q']
    }
  }),
  // metaMask(), // Explicit MetaMask connector
  // safe(), // Safe wallet support
];

const wagmiAdapter = new WagmiAdapter({
  projectId: appKitProjectId,
  chains,
  networks,
  connectors,
});

// Only create AppKit if we have a valid project ID
if (appKitProjectId && appKitProjectId !== '88cd40e876a44270a55cd4e034d55478') {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: appKitProjectId,
    networks,
    defaultNetwork: defaultChain,
    metadata: {
      name: "verinlayer",
      description: "Claim your DeFi Activity Proof",
      url: "https://verinlayer.xyz",
      icons: ["https://raw.githubusercontent.com/luandt/simple-teleport/refs/heads/main/vlayer/public/favicon.svg?token=GHSAT0AAAAAADIU3PJY6DVLOEFADC7SLGHQ2G7VE6Q"],
    },
    themeVariables: {
      "--w3m-color-mix": "#551fbc",
      "--w3m-color-mix-strength": 40,
    },
  });
} else {
  console.warn("WalletConnect Project ID not configured. Only injected wallets will be available.");
}

const proverConfig = {
  proverUrl: import.meta.env.VITE_PROVER_URL,
  token: import.meta.env.VITE_VLAYER_API_TOKEN,
};

const { wagmiConfig } = wagmiAdapter;

export { wagmiConfig, proverConfig };
