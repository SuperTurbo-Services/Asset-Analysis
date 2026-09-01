window.MACRO_PROTOTYPE_DATA = {
  factors: [
    { id: 'growth_pp', label: 'Growth', zh: '增长', unit: 'pp', min: -5, max: 5, step: 0.1, largeAt: 1.5 },
    { id: 'inflation_bps', label: 'Inflation', zh: '通胀', unit: 'bp', min: -300, max: 300, step: 5, largeAt: 75 },
    { id: 'policy_rate_bps', label: 'Policy rate', zh: '政策利率', unit: 'bp', min: -300, max: 300, step: 5, largeAt: 75 },
    { id: 'real_yield_bps', label: 'Real yield', zh: '实际利率', unit: 'bp', min: -300, max: 300, step: 5, largeAt: 60 },
    { id: 'credit_spread_bps', label: 'Credit spreads', zh: '信用利差', unit: 'bp', min: -500, max: 1000, step: 10, largeAt: 150 },
    { id: 'dollar_pct', label: 'US dollar', zh: '美元', unit: '%', min: -20, max: 20, step: 0.5, largeAt: 5 },
    { id: 'oil_pct', label: 'Crude oil', zh: '原油', unit: '%', min: -50, max: 100, step: 1, largeAt: 20 },
    { id: 'vix_points', label: 'VIX', zh: '波动率', unit: 'pt', min: -20, max: 80, step: 1, largeAt: 10 }
  ],
  assets: [
    { symbol: 'SPY', name: 'US equities', group: 'Stocks', sens: [2,-1,-1,-1,-2,-1,-1,-2] },
    { symbol: 'QQQ', name: 'Growth equities', group: 'Stocks', sens: [2,-1,-2,-2,-2,-1,-1,-2] },
    { symbol: 'TLT', name: 'Long Treasuries', group: 'Bonds', sens: [-1,-2,-1,-2,1,1,-1,1] },
    { symbol: 'CASH', name: 'US cash', group: 'Cash', sens: [-1,-1,2,1,1,1,0,1] },
    { symbol: 'DXY', name: 'US dollar', group: 'FX', sens: [0,1,2,2,1,2,-1,1] },
    { symbol: 'XAU', name: 'Gold', group: 'Commodities', sens: [-1,2,-1,-2,1,-2,1,1] },
    { symbol: 'WTI', name: 'Crude oil', group: 'Commodities', sens: [2,1,-1,-1,-1,-1,2,-1] },
    { symbol: 'BTC-USD', name: 'Bitcoin', group: 'Crypto', sens: [1,0,-2,-2,-2,-2,0,-2] }
  ],
  metrics: [
    { label: '10Y real yield', value: '2.34%', tone: 'negative', source: 'FRED' },
    { label: '10Y nominal', value: '4.67%', tone: 'neutral', source: 'FRED' },
    { label: 'Breakeven', value: '2.31%', tone: 'neutral', source: 'FRED' },
    { label: 'HY OAS', value: '263 bp', tone: 'positive', source: 'FRED' },
    { label: 'Fed funds', value: '3.63%', tone: 'neutral', source: 'FRED' },
    { label: 'VIX', value: '14.43', tone: 'positive', source: 'Yahoo' }
  ],
  categories: {
    Stocks: ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT'],
    Bonds: ['TLT', 'IEF', 'HYG', 'LQD'],
    Cash: ['CASH', 'BIL', 'SGOV'],
    FX: ['DXY', 'EURUSD', 'USDJPY'],
    Commodities: ['XAU', 'WTI', 'COPPER'],
    Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD']
  },
  initialShocks: {
    growth_pp: 0.8,
    inflation_bps: 35,
    policy_rate_bps: 25,
    real_yield_bps: 20,
    credit_spread_bps: 35,
    dollar_pct: 1.5,
    oil_pct: 8,
    vix_points: 5
  },
  initialPortfolio: [
    { symbol: 'SPY', weight: 45, group: 'Stocks' },
    { symbol: 'TLT', weight: 25, group: 'Bonds' },
    { symbol: 'XAU', weight: 20, group: 'Commodities' },
    { symbol: 'BTC-USD', weight: 10, group: 'Crypto' }
  ]
};
