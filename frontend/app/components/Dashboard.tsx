export default function Dashboard({ data }: { data: any }) {
  if (!data) return <div className="text-white">Loading...</div>;

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Agent Dashboard</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Agent State</div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              data.state === 'MONITORING' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`} />
            <span className="text-white font-semibold">{data.state || 'MONITORING'}</span>
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Health Score</div>
          <div className="flex items-center">
            <div className="text-white font-semibold text-xl">{data.treasury?.healthScore || 95}/100</div>
            <div className="ml-2 text-green-400">●</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Daily Budget Usage</span>
            <span className="text-white">{data.performance?.utilizationRate || 45}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${data.performance?.utilizationRate || 45}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Treasury APY</span>
            <span className="text-green-400 font-bold">{data.treasury?.totalAPY || 15.2}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
              style={{ width: `${Math.min((data.treasury?.totalAPY || 15.2) * 5, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Daily Revenue</div>
            <div className="text-white font-bold text-lg">{data.treasury?.dailyRevenue || 0.002} SEI</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Total Invested</div>
            <div className="text-white font-bold text-lg">{data.investments?.totalAmount || 0.512} SEI</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">ROI</div>
            <div className="text-green-400 font-bold text-lg">+{data.performance?.roi || 15.2}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}