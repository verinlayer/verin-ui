import React from "react";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  const handleGetStarted = () => {
    if (isConnected) {
      navigate('/dashboard');
    } else {
      // Clear any manual fetch data when going to app
      localStorage.removeItem('fetchedUnclaimedData');
      localStorage.removeItem('fetchedWalletAddress');
      localStorage.removeItem('fetchedNetwork');
      navigate('/app');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-6">
          Turn Your Blockchain History into Value powered by Zero Knowledge Proof
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-8">
          Prove your DeFi activity across multiple chains and unlock the value of your on-chain reputation.
        </p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/30"
        >
          {isConnected ? "Go to Dashboard" : "Get Started"}
        </button>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Zero Knowledge Proof</h3>
          <p className="text-slate-400">
            Prove your DeFi activity without revealing sensitive wallet information. Privacy-first approach using advanced cryptographic proofs.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Multi-Chain Support</h3>
          <p className="text-slate-400">
            Support for Optimism, Base, and Ethereum Mainnet. Aggregate your DeFi activity across multiple protocols and chains.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">DeFi Credit Scores</h3>
          <p className="text-slate-400">
            Build and prove your on-chain reputation. Track your lending, borrowing, and repayment history across Aave, Compound, and Morpho.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-slate-100 text-center mb-8">How It Works</h2>
        <div className="space-y-6">
          <div className="flex items-start gap-6 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-cyan-400">1</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Connect or Enter Wallet</h3>
              <p className="text-slate-400">
                Connect your wallet or manually enter a wallet address to fetch DeFi activity data from supported protocols.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-emerald-400">2</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Generate Zero Knowledge Proof</h3>
              <p className="text-slate-400">
              Our system leverages the Vlayer protocol to generate a cryptographic proof of your DeFi activity without revealing sensitive information, allowing you to privately verify your lending and borrowing history.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-purple-400">3</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Claim Your Proof</h3>
              <p className="text-slate-400">
                Claim your verified DeFi history on-chain. Use your proof to demonstrate your creditworthiness and DeFi reputation across different protocols.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Protocols Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-slate-100 text-center mb-8">Supported Protocols</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-all duration-300">
            <img src="/img/AAVE.png" alt="Aave" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Aave</h3>
            {/* <p className="text-sm text-slate-400">Lending and borrowing protocol</p> */}
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-all duration-300">
            <img src="/img/comp.png" alt="Compound" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Compound</h3>
            {/* <p className="text-sm text-slate-400">Algorithmic money markets</p> */}
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-all duration-300">
            <img src="/img/morpho-logo.png" alt="Morpho" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Morpho</h3>
            {/* <p className="text-sm text-slate-400">Peer-to-peer lending</p> */}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 border border-cyan-500/30 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-slate-100 mb-4">Ready to Get Started?</h2>
        <p className="text-lg text-slate-400 mb-6 max-w-2xl mx-auto">
          Start proving your DeFi activity today and unlock the value of your on-chain reputation.
        </p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/30"
        >
          {isConnected ? "View Dashboard" : "Start Now"}
        </button>
      </div>
    </div>
  );
};

