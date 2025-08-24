export default function CreatorTokens({ creators }: { creators: any[] }) {
  const defaultCreators = [
    { username: 'alice_creator', platform: 'Twitter', score: 92, totalReceived: 0.125, hasToken: true, symbol: 'ALICE' },
    { username: 'bob_builder', platform: 'Discord', score: 88, totalReceived: 0.098, hasToken: true, symbol: 'BOB' },
    { username: 'carol_dev', platform: 'LinkedIn', score: 85, totalReceived: 0.087, hasToken: false }
  ];

  const displayCreators = creators || defaultCreators;

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Top Creators</h2>
      
      <div className="space-y-4">
        {displayCreators.map((creator, index) => (
          <div key={creator.username} className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-semibold">{creator.username}</div>
                  <div className="text-gray-400 text-sm">{creator.platform}</div>
                </div>
              </div>
              
              {creator.hasToken && (
                <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-semibold">
                  ${creator.symbol}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-xs">Quality Score</div>
                <div className="flex items-center">
                  <div className="text-white font-semibold">{creator.score}/100</div>
                  <div className="ml-2 flex-1">
                    <div className="w-full bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${creator.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs">Total Received</div>
                <div className="text-white font-semibold">{creator.totalReceived} SEI</div>
              </div>
            </div>
            
            {creator.hasToken && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Token Contract</span>
                  <span className="text-blue-400 text-xs font-mono">0xFd13...cC6D</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-400 text-sm">Market Cap</span>
                  <span className="text-green-400 text-sm font-semibold">~${(creator.totalReceived * 1000).toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">
          Deploy Creator Token
        </button>
      </div>
    </div>
  );
}