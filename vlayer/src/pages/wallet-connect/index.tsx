import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useChainId, useConnect, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { wagmiConfig } from '../../app/providers/config'

const queryClient = new QueryClient()

// Wallet Options Component
function WalletOptions() {
  const { connectors, connect } = useConnect()

  // Filter out duplicate connectors by name
  const uniqueConnectors = connectors.filter((connector, index, self) => 
    index === self.findIndex(c => c.name === connector.name)
  )

  return (
    <div className="space-y-3">
      {uniqueConnectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => connect({ connector })}
        />
      ))}
    </div>
  )
}

function WalletOption({
  connector,
  onClick,
}: {
  connector: any
  onClick: () => void
}) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      const provider = await connector.getProvider()
      setReady(!!provider)
    })()
  }, [connector])

  return (
    <button 
      disabled={!ready} 
      onClick={onClick}
      className="w-full flex items-center justify-center space-x-3 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
    >
      <div className="w-6 h-6">
        {connector.name === "MetaMask" ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path fill="#F6851B" d="M22.56 2.44L12.3 8.8l-1.97-3.4L22.56 2.44z"/>
            <path fill="#F6851B" d="M1.44 2.44l9.89 6.36-1.97 3.4L1.44 2.44z"/>
            <path fill="#F6851B" d="M18.8 17.2l-2.4 3.9 5.2 1.4 1.5-5.1-4.3-.2z"/>
            <path fill="#F6851B" d="M1.2 17.2l4.3.2L4 22.5l5.2-1.4-2.4-3.9-5.6-.2z"/>
            <path fill="#F6851B" d="M7.2 10.4l-1.4 2.1 5 2.2.2-2.8-3.8-1.5z"/>
            <path fill="#F6851B" d="M16.8 10.4l-3.8 1.5.2 2.8 5-2.2-1.4-2.1z"/>
          </svg>
        ) : connector.name === "Safe" ? (
          <div className="w-6 h-6 bg-green-600 rounded"></div>
        ) : connector.name === "WalletConnect" ? (
          <div className="w-6 h-6 bg-blue-600 rounded"></div>
        ) : (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"></div>
        )}
      </div>
      <span className="font-medium text-slate-200">
        {connector.name === "Injected" ? "Browser Wallet" : connector.name}
      </span>
      {!ready && <span className="text-xs text-slate-400">(Not Available)</span>}
    </button>
  )
}

// Account Component
function Account() {
  const { address } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  // Auto-redirect after connection
  React.useEffect(() => {
    if (address) {
      console.log('Wallet connected successfully, redirecting...')
      // Check if manual fetch data exists - if so, go to dashboard
      const manualFetchData = localStorage.getItem('fetchedUnclaimedData')
      if (manualFetchData) {
        // Redirect to dashboard if user had manually fetched data
        window.location.href = '/dashboard'
      } else {
        // Otherwise redirect to home
        window.location.href = '/'
      }
    }
  }, [address])

  return (
    <div className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {ensAvatar ? (
            <img 
              alt="ENS Avatar" 
              src={ensAvatar} 
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          ✅ Wallet Connected Successfully!
        </h3>
        
        {address && (
          <div className="mb-4">
            <div className="text-sm font-medium text-slate-200">
              {ensName ? `${ensName}` : 'Connected Wallet'}
            </div>
            <div className="text-xs text-slate-400 font-mono break-all mt-1">
              {address}
            </div>
          </div>
        )}
        
        <div className="flex justify-center">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors"
          >
            Go to Main App Now
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Connect Wallet Component
function ConnectWallet() {
  const { isConnected } = useAccount()
  if (isConnected) return <Account />
  return <WalletOptions />
}

// Wallet Connect Content
function WalletConnectContent() {
  const { address, chain, isConnecting } = useAccount()
  const chainId = useChainId()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/*
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Wallet Connection
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            This follows the{' '}
            <a 
              href="https://wagmi.sh/react/guides/connect-wallet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Wagmi Connect Wallet Guide
            </a>
          </p>
        </div>
        */}

        {/* Connection Status */}
        {/*
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${isConnecting ? 'text-yellow-600' : address ? 'text-green-600' : 'text-red-600'}`}>
                {isConnecting ? 'Connecting...' : address ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {address && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-mono text-sm text-gray-900">{address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID:</span>
                  <span className="font-mono text-sm text-gray-900">{chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-medium text-gray-900">{chain?.name || 'Unknown'}</span>
                </div>
              </>
            )}
          </div>
        </div>
        */}

        {/* Wallet Connection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl shadow-slate-950/50 border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            {address ? 'Connected Account' : 'Connect Wallet'}
          </h2>
          <ConnectWallet />
        </div>

        {/* Supported Networks */}
        {/*
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supported Networks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">Ethereum Mainnet</div>
              <div className="text-sm text-blue-600">Chain ID: 1</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-green-900">Base</div>
              <div className="text-sm text-green-600">Chain ID: 8453</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-900">Optimism</div>
              <div className="text-sm text-purple-600">Chain ID: 10</div>
            </div>
          </div>
        </div>
        */}

        {/* Features */}
        {/*
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Multiple wallet connectors (MetaMask, WalletConnect, Safe, Injected)
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              ENS name and avatar support
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Multi-chain support
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Built with Wagmi v2 and Viem
            </li>
          </ul>
        </div>
        */}
      </div>
    </div>
  )
}

// Main Export
export default function WalletConnect() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
