export default function ActivityFeed({ activities }: { activities: any[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tip': return '💰';
      case 'treasury': return '🏦';
      case 'token': return '🪙';
      case 'defi': return '🌊';
      default: return '📊';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'tip': return 'border-blue-500 bg-blue-500/10';
      case 'treasury': return 'border-green-500 bg-green-500/10';
      case 'token': return 'border-purple-500 bg-purple-500/10';
      case 'defi': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Live Activity Feed</h2>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            Waiting for activity...
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={index}
              className={`border-l-4 ${getActivityColor(activity.type)} rounded-lg p-4 animate-fadeIn`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div>
                    {activity.type === 'tip' && (
                      <>
                        <div className="text-white font-semibold">
                          Tipped {activity.creator} on {activity.platform}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Amount: {activity.amount} SEI | Score: {activity.score}/100
                        </div>
                        <div className="text-gray-500 text-xs font-mono mt-1">
                          tx: {activity.tx}
                        </div>
                      </>
                    )}
                    
                    {activity.type === 'treasury' && (
                      <>
                        <div className="text-white font-semibold">
                          Treasury {activity.action}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {activity.details} | APY: {activity.apy}
                        </div>
                      </>
                    )}
                    
                    {activity.type === 'token' && (
                      <>
                        <div className="text-white font-semibold">
                          {activity.action}: {activity.symbol}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Creator: {activity.creator} | Supply: {activity.supply}
                        </div>
                      </>
                    )}
                    
                    {activity.type === 'defi' && (
                      <>
                        <div className="text-white font-semibold">
                          DeFi: {activity.protocol}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Amount: {activity.amount} SEI | APY: {activity.apy}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-gray-500 text-xs">
                  {new Date(activity.time).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}