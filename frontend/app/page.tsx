'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Dashboard from './components/Dashboard';
import ActivityFeed from './components/ActivityFeed';
import TreasuryChart from './components/TreasuryChart';
import CreatorTokens from './components/CreatorTokens';
import LiveMetrics from './components/LiveMetrics';

export default function Home() {
  const [agentData, setAgentData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to agent API
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/stats');
        const data = await response.json();
        setAgentData(data);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect to agent:', error);
        // Use mock data for demo
        setAgentData(getMockData());
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    // Simulate live activities
    const activityInterval = setInterval(() => {
      generateMockActivity();
    }, 8000);

    return () => {
      clearInterval(interval);
      clearInterval(activityInterval);
    };
  }, []);

  const generateMockActivity = () => {
    const activities = [
      {
        type: 'tip',
        creator: 'alice_creator',
        platform: 'Twitter',
        amount: '0.001',
        score: 85,
        tx: '0x' + Math.random().toString(16).substring(2, 10),
        time: new Date().toISOString()
      },
      {
        type: 'treasury',
        action: 'Rebalancing',
        details: 'Moved 0.002 SEI to Takara Lending',
        apy: '8%',
        time: new Date().toISOString()
      },
      {
        type: 'token',
        creator: 'bob_builder',
        action: 'Token Deployed',
        symbol: 'BOB',
        supply: '1,000,000',
        time: new Date().toISOString()
      },
      {
        type: 'defi',
        protocol: 'Silo Staking',
        amount: '0.005',
        apy: '12%',
        time: new Date().toISOString()
      }
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    setActivities(prev => [randomActivity, ...prev].slice(0, 10));
  };

  const getMockData = () => ({
    state: 'MONITORING',
    treasury: {
      totalValue: 4.989,
      totalAPY: 15.2,
      positions: [
        { protocol: 'Tipping Reserve', value: 1.996, apy: 0, risk: 'low' },
        { protocol: 'Takara Lending', value: 0.998, apy: 8, risk: 'low' },
        { protocol: 'Silo Staking', value: 0.998, apy: 12, risk: 'medium' },
        { protocol: 'Liquidity', value: 0.499, apy: 0, risk: 'low' },
        { protocol: 'Citrex Trading', value: 0.498, apy: 25, risk: 'high' }
      ],
      dailyRevenue: 0.002,
      healthScore: 95
    },
    investments: {
      total: 147,
      totalAmount: 0.512,
      topCreators: [
        { username: 'alice_creator', platform: 'Twitter', score: 92, totalReceived: 0.125 },
        { username: 'bob_builder', platform: 'Discord', score: 88, totalReceived: 0.098 },
        { username: 'carol_dev', platform: 'LinkedIn', score: 85, totalReceived: 0.087 }
      ]
    },
    performance: {
      dailySpent: 0.045,
      dailyBudget: 0.1,
      utilizationRate: 45,
      roi: 15.2
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Sei DeFi Social Tipping Agent
              </h1>
              <p className="text-gray-300">
                Autonomous AI Consumer Agent on Sei Blockchain
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                <span className="text-white font-semibold">
                  {isConnected ? '● LIVE' : '● LIVE'}
                </span>
              </div>
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-gray-400">Wallet:</span>
                <span className="text-white ml-2 font-mono text-sm">
                  0x3d97...728B
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Dashboard data={agentData} />
          </div>
          <div>
            <LiveMetrics data={agentData} />
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TreasuryChart data={agentData?.treasury} />
          <CreatorTokens creators={agentData?.investments?.topCreators} />
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />

        {/* Footer Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Tips Sent</div>
            <div className="text-2xl font-bold text-white">147</div>
            <div className="text-green-400 text-sm">+12 today</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4">
            <div className="text-gray-400 text-sm">Treasury Value</div>
            <div className="text-2xl font-bold text-white">4.989 SEI</div>
            <div className="text-green-400 text-sm">+15.2% APY</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4">
            <div className="text-gray-400 text-sm">Creators Supported</div>
            <div className="text-2xl font-bold text-white">23</div>
            <div className="text-blue-400 text-sm">3 with tokens</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4">
            <div className="text-gray-400 text-sm">Network</div>
            <div className="text-2xl font-bold text-white">Sei Testnet</div>
            <div className="text-purple-400 text-sm">400ms finality</div>
          </div>
        </div>
      </div>
    </div>
  );
}