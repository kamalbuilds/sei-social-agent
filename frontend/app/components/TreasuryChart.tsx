'use client';

export default function TreasuryChart({ data }: { data: any }) {
  if (!data) return null;

  const positions = data.positions || [
    { protocol: 'Tipping Reserve', value: 1.996, apy: 0, risk: 'low' },
    { protocol: 'Takara Lending', value: 0.998, apy: 8, risk: 'low' },
    { protocol: 'Silo Staking', value: 0.998, apy: 12, risk: 'medium' },
    { protocol: 'Liquidity', value: 0.499, apy: 0, risk: 'low' },
    { protocol: 'Citrex Trading', value: 0.498, apy: 25, risk: 'high' }
  ];

  const total = positions.reduce((sum: number, p: any) => sum + p.value, 0);

  const colors = {
    'Tipping Reserve': 'bg-blue-500',
    'Takara Lending': 'bg-green-500',
    'Silo Staking': 'bg-purple-500',
    'Liquidity': 'bg-gray-500',
    'Citrex Trading': 'bg-yellow-500'
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Treasury Allocation</h2>
      
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* Simple pie chart visualization */}
          <svg className="w-full h-full transform -rotate-90">
            {positions.reduce((acc: any, position: any, index: number) => {
              const percentage = (position.value / total) * 100;
              const previousPercentage = positions
                .slice(0, index)
                .reduce((sum: number, p: any) => sum + (p.value / total) * 100, 0);
              
              const startAngle = (previousPercentage / 100) * 360;
              const endAngle = ((previousPercentage + percentage) / 100) * 360;
              
              return [...acc, (
                <circle
                  key={position.protocol}
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke={getColor(position.protocol)}
                  strokeWidth="32"
                  strokeDasharray={`${percentage * 5.03} 503`}
                  strokeDashoffset={-previousPercentage * 5.03}
                  className="transition-all duration-500"
                />
              )];
            }, [])}
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{total.toFixed(3)}</div>
              <div className="text-gray-400 text-sm">SEI</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {positions.map((position: any) => (
          <div key={position.protocol} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${colors[position.protocol as keyof typeof colors] || 'bg-gray-500'}`} />
              <div>
                <div className="text-white font-medium">{position.protocol}</div>
                <div className="text-gray-400 text-sm">
                  {position.apy > 0 ? `${position.apy}% APY` : 'No yield'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">{position.value.toFixed(3)} SEI</div>
              <div className="text-gray-400 text-sm">
                {((position.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Weighted APY</span>
          <span className="text-green-400 font-bold text-xl">{data.totalAPY || 15.2}%</span>
        </div>
      </div>
    </div>
  );
}

function getColor(protocol: string): string {
  const colors: { [key: string]: string } = {
    'Tipping Reserve': '#3B82F6',
    'Takara Lending': '#10B981',
    'Silo Staking': '#8B5CF6',
    'Liquidity': '#6B7280',
    'Citrex Trading': '#EAB308'
  };
  return colors[protocol] || '#6B7280';
}