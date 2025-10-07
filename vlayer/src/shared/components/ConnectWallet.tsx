import * as React from 'react'
import { useConnect, useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { useState } from 'react'

// Wallet Options Component following Wagmi guide
function WalletOptions() {
  const { connectors, connect } = useConnect()

  // Debug connectors
  React.useEffect(() => {
    console.log('Available connectors:', connectors.map(c => ({ name: c.name, id: c.id })))
  }, [connectors])

  // Filter out duplicate connectors by name
  const uniqueConnectors = connectors.filter((connector, index, self) => 
    index === self.findIndex(c => c.name === connector.name)
  )

  return (
    <div className="space-y-4">
      {uniqueConnectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => {
            console.log(`Connecting to ${connector.name}...`)
            connect({ connector })
          }}
        />
      ))}
      
      {/* Reset Connection Button */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={() => {
            console.log('Resetting connection state...')
            window.location.reload()
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Reset Connection State
        </button>
      </div>
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
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [connectionError, setConnectionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    ;(async () => {
      try {
        const provider = await connector.getProvider()
        setReady(!!provider)
        setConnectionError(null)
      } catch (error) {
        console.error(`Error checking ${connector.name} provider:`, error)
        setReady(false)
        setConnectionError(`Provider not available: ${error}`)
      }
    })()
  }, [connector])

  const handleClick = async () => {
    setIsConnecting(true)
    setConnectionError(null)
    
    try {
      console.log(`Attempting to connect ${connector.name}...`)
      console.log('Connector details:', {
        name: connector.name,
        id: connector.id,
        uid: connector.uid,
        type: connector.type
      })
      
      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        if (isConnecting) {
          console.error(`${connector.name} connection timeout`)
          setConnectionError('Connection timeout - please try again')
          setIsConnecting(false)
        }
      }, 10000) // 10 second timeout per connector
      
      await onClick()
      
      // Clear timeout if connection succeeds quickly
      clearTimeout(connectionTimeout)
      
      // For WalletConnect, check if QR modal should appear
      if (connector.name === "WalletConnect") {
        console.log('WalletConnect clicked - QR modal should appear')
        // Give some time for the modal to appear
        setTimeout(() => {
          console.log('Checking if WalletConnect modal appeared...')
          // Check if any WalletConnect modal elements exist in DOM
          const wcModal = document.querySelector('[data-testid="wallet-connect-modal"]') || 
                         document.querySelector('.walletconnect-modal') ||
                         document.querySelector('[id*="walletconnect"]')
          if (wcModal) {
            console.log('WalletConnect modal found in DOM')
          } else {
            console.log('WalletConnect modal NOT found in DOM - may be an issue')
          }
        }, 1000)
      }
    } catch (error) {
      console.error(`Error connecting ${connector.name}:`, error)
      setConnectionError(`Connection failed: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Special handling for WalletConnect to ensure QR code shows
  const isWalletConnect = connector.name === "WalletConnect"
  
  return (
    <div className="space-y-2">
      <button 
        disabled={!ready || isConnecting} 
        onClick={handleClick}
        className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">WC</span>
            </div>
          ) : (
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"></div>
          )}
        </div>
        <span className="font-medium text-gray-900">
          {connector.name === "Injected" ? "Browser Wallet" : connector.name}
        </span>
        {isWalletConnect && (
          <span className="text-xs text-blue-600">(QR Code)</span>
        )}
        {!ready && <span className="text-xs text-gray-500">(Not Available)</span>}
        {isConnecting && <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>}
      </button>
      
      {/* Error Display */}
      {connectionError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <div className="font-medium">Connection Error:</div>
          <div>{connectionError}</div>
          <button
            onClick={() => {
              setConnectionError(null)
              setIsConnecting(false)
            }}
            className="mt-1 text-blue-600 hover:text-blue-800 underline"
          >
            Clear Error
          </button>
        </div>
      )}
    </div>
  )
}

// Account Component following Wagmi guide
function Account() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleDisconnect = async () => {
    try {
      console.log('Attempting to disconnect wallet...');
      setIsDisconnecting(true);
      
      // Close dropdown immediately for better UX
      setShowDropdown(false);
      
      // Call disconnect
      await disconnect();
      
      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Reopen dropdown if disconnect failed
      setShowDropdown(true);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors max-w-xs"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {ensAvatar && (
            <img 
              alt="ENS Avatar" 
              src={ensAvatar} 
              className="w-6 h-6 rounded-full"
            />
          )}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {ensName || 'Connected Wallet'}
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-sm text-gray-700 border-b">
              <div className="font-medium">{ensName ? `${ensName}` : 'Connected Wallet'}</div>
              <div className="text-xs text-gray-500 font-mono break-all">{address}</div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Disconnect</span>
              {isDisconnecting && (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Main ConnectWallet Component following Wagmi guide
export const ConnectWallet = () => {
  const { isConnected, isConnecting, connector } = useAccount()
  const [connectionTimeout, setConnectionTimeout] = React.useState(false)

  // Add timeout for connection attempts
  React.useEffect(() => {
    if (isConnecting) {
      console.log('Connection started, setting timeout...')
      const timeout = setTimeout(() => {
        console.log('Connection timeout reached')
        setConnectionTimeout(true)
      }, 15000) // 15 second timeout

      return () => {
        clearTimeout(timeout)
        setConnectionTimeout(false)
      }
    } else {
      setConnectionTimeout(false)
    }
  }, [isConnecting])

  // Debug connection state
  React.useEffect(() => {
    console.log('Connection state:', { isConnected, isConnecting, connector: connector?.name })
  }, [isConnected, isConnecting, connector])

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {connectionTimeout ? 'Connection Timeout' : 'Connecting Wallet...'}
          </h2>
          <p className="text-gray-600 mb-4">
            {connectionTimeout 
              ? 'Connection is taking longer than expected. Please try again.'
              : 'Please approve the connection in your wallet.'
            }
          </p>
          {connectionTimeout && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  // Following Wagmi guide pattern: if connected show Account, else show WalletOptions
  if (isConnected) return <Account />
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 mb-8">
          Connect your wallet to view your DeFi activity and generate proofs
        </p>
        
        <WalletOptions />
        
        {/* <p className="text-xs text-gray-500 mt-4">
          Supports MetaMask, WalletConnect, Safe, and other browser wallets
        </p> */}
      </div>
    </div>
  );
}
