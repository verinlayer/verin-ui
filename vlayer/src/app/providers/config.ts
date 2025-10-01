import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { getChainSpecs } from "@vlayer/sdk";
import { Chain } from "viem";
import { createAppKit } from "@reown/appkit/react";
import { injected, metaMask, walletConnect, safe } from "wagmi/connectors";
import { mainnet, optimism, base, optimismSepolia } from '@reown/appkit/networks'


const appKitProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || `88cd40e876a44270a55cd4e034d55478`;


let chain = null;

try {
  chain = getChainSpecs(import.meta.env.VITE_CHAIN_NAME);
} catch {
  // In case of wrong chain name in env, we set chain variable to whatever.
  // Thanks to this, the app does not crash here, but later with a proper error handling.
  console.error("Wrong chain name in env: ", import.meta.env.VITE_CHAIN_NAME);
  chain = {
    id: "wrongChain",
    name: "Wrong chain",
    nativeCurrency: {},
    rpcUrls: { default: { http: [] } },
  } as unknown as Chain;
}
const chains: [Chain, ...Chain[]] = [chain];
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
      name: 'Teleport DeFi',
      description: 'DeFi Activity Proof Generator',
      url: 'https://vlayer.xyz',
      icons: ['https://avatars.githubusercontent.com/u/179229932']
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
    defaultNetwork: chain,
    metadata: {
      name: "vlayer-time-travel-proof-example",
      description: "vlayer Time Travel Example",
      url: "https://vlayer.xyz",
      icons: ["https://avatars.githubusercontent.com/u/179229932"],
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
