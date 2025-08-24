export default function LiveMetrics({ data }: { data: any }) {
  const metrics = [
    {
      label: 'Tips Today',
      value: '12',
      change: '+3',
      trend: 'up',
      icon: '💰'
    },
    {
      label: 'Active Creators',
      value: '23',
      change: '+2',
      trend: 'up',
      icon: '👥'
    },
    {
      label: 'Avg Quality',
      value: '85',
      change: '+5',
      trend: 'up',
      icon: '⭐'
    },
    {
      label: 'Gas Spent',
      value: '0.011',
      unit: 'SEI',
      trend: 'stable',
      icon: '⛽'
    }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Live Metrics</h2>
      
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{metric.label}</span>
              <span className="text-2xl">{metric.icon}</span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                {metric.unit && <span className="text-gray-400 text-sm">{metric.unit}</span>}
              </div>
              
              {metric.change && (
                <span className={`text-sm font-semibold ${
                  metric.trend === 'up' ? 'text-green-400' : 
                  metric.trend === 'down' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {metric.change}
                </span>
              )}
            </div>
            
            {/* Mini sparkline */}
            <div className="mt-2 flex items-end space-x-1 h-8">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t"
                  style={{ 
                    height: `${Math.random() * 100}%`,
                    opacity: 0.3 + (i / 10)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-green-400 text-sm font-semibold">System Status</div>
            <div className="text-white">All Systems Operational</div>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}