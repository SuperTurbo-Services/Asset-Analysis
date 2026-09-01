const { useMemo, useState } = React;
const PD = window.MACRO_PROTOTYPE_DATA;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreAsset(asset, shocks) {
  const raw = PD.factors.reduce((sum, factor, index) => {
    const shock = Number(shocks[factor.id] || 0);
    const sensitivity = asset.sens[index] || 0;
    if (!shock || !sensitivity) return sum;
    const magnitude = Math.abs(shock) >= factor.largeAt ? 2 : 1;
    return sum + Math.sign(shock) * magnitude * sensitivity;
  }, 0);
  return clamp(raw, -5, 5);
}

function scoreMeta(score) {
  if (score >= 3) return { label: 'Strong tailwind', short: 'TAILWIND', tone: 'up' };
  if (score > 0) return { label: 'Mild tailwind', short: 'POSITIVE', tone: 'up' };
  if (score <= -3) return { label: 'Strong headwind', short: 'HEADWIND', tone: 'down' };
  if (score < 0) return { label: 'Mild headwind', short: 'NEGATIVE', tone: 'down' };
  return { label: 'Balanced', short: 'NEUTRAL', tone: 'flat' };
}

function SuperTurboMark({ compact = false }) {
  return (
    <div className="brand-mark">
      <span className="brand-glyph">ST</span>
      {!compact && <span><b>SuperTurbo</b><small>Macro Workspace</small></span>}
    </div>
  );
}

function MainTabs({ id, active, onChange, vertical = false }) {
  const tabs = [
    ['overview', 'Market Overview', '全局市场'],
    ['asset', 'Asset Analysis', '单项资产'],
    ['portfolio', 'Portfolio', '组合分析']
  ];
  return (
    <nav className={`main-tabs ${vertical ? 'vertical' : ''}`} aria-label={`${id} main views`}>
      {tabs.map(([key, label, zh], index) => (
        <button
          key={key}
          type="button"
          data-testid={`${id}-tab-${key}`}
          className={active === key ? 'active' : ''}
          onClick={() => onChange(key)}
        >
          <span className="tab-index">0{index + 1}</span>
          <span>{label}<small>{zh}</small></span>
        </button>
      ))}
    </nav>
  );
}

function MetricStrip({ dense = false }) {
  return (
    <div className={`metric-strip ${dense ? 'dense' : ''}`}>
      {PD.metrics.map(metric => (
        <div className={`metric ${metric.tone}`} key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.source}</small>
        </div>
      ))}
    </div>
  );
}

function ShockControls({ id, shocks, onChange, compact = false }) {
  return (
    <section className={`shock-controls ${compact ? 'compact' : ''}`}>
      <div className="section-heading">
        <div><small>WHAT-IF ENGINE</small><h3>Shock Atlas</h3></div>
        <button type="button" className="text-button" onClick={() => onChange(PD.initialShocks)}>Reset</button>
      </div>
      <p className="microcopy">拖动滑轨，同时更新全部资产、单项分析和组合天气。</p>
      <div className="shock-list">
        {PD.factors.map(factor => {
          const value = shocks[factor.id];
          return (
            <label className="shock-row" key={factor.id}>
              <span className="shock-name"><b>{factor.label}</b><small>{factor.zh}</small></span>
              <input
                data-testid={`${id}-shock-${factor.id}`}
                aria-label={`${id} ${factor.label} shock`}
                type="range"
                min={factor.min}
                max={factor.max}
                step={factor.step}
                value={value}
                onChange={event => onChange({ ...shocks, [factor.id]: Number(event.target.value) })}
              />
              <output>{value > 0 ? '+' : ''}{value}<small>{factor.unit}</small></output>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function AssetScoreRows({ shocks, mode = 'rows' }) {
  return (
    <div className={`asset-scores ${mode}`}>
      {PD.assets.map(asset => {
        const score = scoreAsset(asset, shocks);
        const meta = scoreMeta(score);
        return (
          <article key={asset.symbol} className={`asset-score ${meta.tone}`}>
            <div className="asset-id"><strong>{asset.symbol}</strong><span>{asset.name}</span></div>
            <div className="score-track"><i style={{ width: `${Math.abs(score) * 10}%`, left: score < 0 ? `${50 - Math.abs(score) * 10}%` : '50%' }} /></div>
            <b className="score-number">{score > 0 ? '+' : ''}{score}</b>
            <small>{meta.short}</small>
          </article>
        );
      })}
    </div>
  );
}

function ScenarioHeadline({ shocks }) {
  const scores = PD.assets.map(asset => ({ asset, score: scoreAsset(asset, shocks) }));
  const best = scores.reduce((a, b) => a.score > b.score ? a : b);
  const worst = scores.reduce((a, b) => a.score < b.score ? a : b);
  return (
    <div className="scenario-headline">
      <span className="status-dot" />
      <div><small>ACTIVE MACRO REGIME</small><h2>Selective risk-on, still rate constrained.</h2></div>
      <p><b>{best.asset.symbol}</b> has the cleanest tailwind. <b>{worst.asset.symbol}</b> carries the largest headwind in this scenario.</p>
    </div>
  );
}

function SourcesNote() {
  return (
    <aside className="sources-note">
      <div><span>LIVE EVIDENCE</span><b>6 / 6 sources fresh</b></div>
      <p>FRED macro series · Yahoo market prices · observation dates preserved</p>
      <a href="https://superturbo.app/macro-dashboard" target="_blank" rel="noreferrer">Open source table ↗</a>
    </aside>
  );
}

function FactorMatrix({ id, selected, onSelect }) {
  return (
    <div className="factor-matrix-wrap">
      <div className="matrix-head"><span>Factor sensitivity</span>{PD.assets.map(asset => <button type="button" className={selected === asset.symbol ? 'selected' : ''} onClick={() => onSelect(asset.symbol)} key={asset.symbol}>{asset.symbol}</button>)}</div>
      {PD.factors.map((factor, row) => (
        <div className="matrix-row" key={factor.id}>
          <span><b>{factor.label}</b><small>{factor.zh}</small></span>
          {PD.assets.map(asset => {
            const value = asset.sens[row];
            return <button type="button" aria-label={`${id} ${asset.symbol} ${factor.label} sensitivity ${value}`} onClick={() => onSelect(asset.symbol)} className={`heat h${value}`} key={asset.symbol}>{value > 0 ? '+' : ''}{value}</button>;
          })}
        </div>
      ))}
    </div>
  );
}

function AssetInspector({ selected, shocks }) {
  const asset = PD.assets.find(item => item.symbol === selected) || PD.assets[0];
  const score = scoreAsset(asset, shocks);
  const drivers = PD.factors.map((factor, index) => ({ factor, value: asset.sens[index] })).sort((a,b) => Math.abs(b.value) - Math.abs(a.value));
  return (
    <aside className="asset-inspector">
      <span className="eyebrow">SELECTED ASSET</span>
      <div className="inspector-title"><div><h2>{asset.symbol}</h2><p>{asset.name}</p></div><strong className={scoreMeta(score).tone}>{score > 0 ? '+' : ''}{score}</strong></div>
      <p className="analysis-copy">当前情景下，{asset.name} 的主要传导来自 <b>{drivers[0].factor.label}</b> 与 <b>{drivers[1].factor.label}</b>。分数表示方向敏感度，不是收益率预测。</p>
      <div className="driver-bars">
        {drivers.slice(0, 5).map(item => (
          <div key={item.factor.id}><span>{item.factor.label}</span><i><b className={item.value > 0 ? 'positive' : item.value < 0 ? 'negative' : ''} style={{ width: `${Math.abs(item.value) * 50}%` }} /></i><strong>{item.value > 0 ? '+' : ''}{item.value}</strong></div>
        ))}
      </div>
      <button type="button" className="primary-button">Ask Codex for cited asset lens</button>
      <small className="evidence-line">Uses SEC filings, price context and cited news evidence.</small>
    </aside>
  );
}

function AssetAnalysis({ id, selected, onSelect, shocks }) {
  return (
    <div className="asset-analysis-view">
      <div className="view-title"><div><span className="eyebrow">CROSS-ASSET FACTOR MAP</span><h2>What moves each asset?</h2></div><label className="asset-search">⌕ <input aria-label={`${id} search asset`} placeholder="Search ticker or asset" /></label></div>
      <div className="asset-analysis-grid">
        <FactorMatrix id={id} selected={selected} onSelect={onSelect} />
        <AssetInspector selected={selected} shocks={shocks} />
      </div>
    </div>
  );
}

function AllocationBar({ portfolio }) {
  const colors = ['#244a67','#7c9b87','#d0a24c','#b44b55','#6f7391','#88715d'];
  return <div className="allocation-bar" aria-label="Portfolio allocation">{portfolio.map((row, index) => <i key={row.symbol} title={`${row.symbol} ${row.weight}%`} style={{ width: `${row.weight}%`, background: colors[index % colors.length] }}><span>{row.weight >= 12 ? row.symbol : ''}</span></i>)}</div>;
}

function PortfolioView({ id, portfolio, setPortfolio, category, setCategory, query, setQuery, shocks }) {
  const candidates = PD.categories[category].filter(symbol => symbol.toLowerCase().includes(query.toLowerCase()));
  const total = portfolio.reduce((sum, row) => sum + row.weight, 0);
  const weighted = portfolio.reduce((sum, row) => {
    const asset = PD.assets.find(item => item.symbol === row.symbol);
    return sum + (asset ? scoreAsset(asset, shocks) * row.weight / 100 : 0);
  }, 0);
  const equalize = () => {
    const base = Math.floor((1000 / portfolio.length)) / 10;
    setPortfolio(portfolio.map((row, index) => ({
      ...row,
      weight: index === portfolio.length - 1 ? Number((100 - base * (portfolio.length - 1)).toFixed(1)) : base
    })));
  };
  const addAsset = symbol => {
    if (portfolio.some(row => row.symbol === symbol)) return;
    setPortfolio([...portfolio, { symbol, weight: 0, group: category }]);
  };
  const setWeight = (symbol, weight) => setPortfolio(portfolio.map(row => row.symbol === symbol ? { ...row, weight } : row));
  return (
    <div className="portfolio-view">
      <div className="view-title"><div><span className="eyebrow">LOCAL-ONLY SCENARIO</span><h2>Build the portfolio you actually hold.</h2></div><div className="portfolio-tools"><button data-testid={`${id}-equalize`} type="button" onClick={equalize}>Equal weight</button><div className={`total-pill ${Math.abs(total - 100) < 0.01 ? 'valid' : 'invalid'}`}>{total}% allocated</div></div></div>
      <AllocationBar portfolio={portfolio} />
      <div className="portfolio-layout">
        <section className="asset-catalog">
          <div className="category-row">{Object.keys(PD.categories).map(name => <button data-testid={`${id}-category-${name}`} type="button" className={category === name ? 'active' : ''} onClick={() => { setCategory(name); setQuery(''); }} key={name}>{name}</button>)}</div>
          <label className="catalog-search"><span>Search in {category}</span><input data-testid={`${id}-portfolio-search`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Ticker in ${category}`} /></label>
          <div className="candidate-row">{candidates.map(symbol => <button type="button" onClick={() => addAsset(symbol)} key={symbol}><b>{symbol}</b><small>{portfolio.some(row => row.symbol === symbol) ? 'Added' : '+ Add'}</small></button>)}</div>
        </section>
        <section className="holdings-panel">
          <div className="holdings-head"><span>Holding</span><span>Weight</span><span>Impact</span></div>
          {portfolio.map(row => {
            const asset = PD.assets.find(item => item.symbol === row.symbol);
            const score = asset ? scoreAsset(asset, shocks) : 0;
            return (
              <label className="holding-row" key={row.symbol}>
                <span><b>{row.symbol}</b><small>{row.group}</small></span>
                <input data-testid={`${id}-weight-${row.symbol}`} aria-label={`${id} ${row.symbol} portfolio weight`} type="range" min="0" max="100" step="1" value={row.weight} onChange={event => setWeight(row.symbol, Number(event.target.value))} />
                <output>{row.weight}%</output>
                <strong className={scoreMeta(score).tone}>{score > 0 ? '+' : ''}{score}</strong>
              </label>
            );
          })}
        </section>
        <aside className="portfolio-analysis">
          <span className="eyebrow">PORTFOLIO WEATHER</span>
          <strong className={scoreMeta(weighted).tone}>{weighted > 0 ? '+' : ''}{weighted.toFixed(1)}</strong>
          <h3>{scoreMeta(weighted).label}</h3>
          <p>Rates and volatility are the largest shared drivers. Gold offsets part of the equity and crypto real-yield sensitivity.</p>
          <button type="button" disabled={Math.abs(total - 100) >= 0.01} className="primary-button">Analyze 100% portfolio</button>
          <small>Private to this browser · no trades placed</small>
        </aside>
      </div>
    </div>
  );
}

function OverviewA({ id, shocks, setShocks }) {
  return <div className="overview-a"><div className="a-primary"><ScenarioHeadline shocks={shocks} /><AssetScoreRows shocks={shocks} /><SourcesNote /></div><div className="a-context"><MetricStrip /></div><ShockControls id={id} shocks={shocks} onChange={setShocks} compact /></div>;
}

function OverviewB({ id, shocks, setShocks }) {
  return <div className="overview-b"><ScenarioHeadline shocks={shocks} /><div className="b-total-grid"><section className="wealth-orbit"><div className="orbit"><span>8</span><small>assets mapped</small></div><h3>One macro picture</h3><p>从总览进入任何资产，使用同一套冲击假设。</p></section><section className="b-asset-panel"><AssetScoreRows shocks={shocks} mode="cards" /></section><ShockControls id={id} shocks={shocks} onChange={setShocks} compact /></div><MetricStrip dense /></div>;
}

function OverviewC({ id, shocks, setShocks }) {
  return <div className="overview-c"><div className="c-ribbon" /><ScenarioHeadline shocks={shocks} /><div className="c-scoreboard"><AssetScoreRows shocks={shocks} /></div><div className="c-lower"><MetricStrip /><ShockControls id={id} shocks={shocks} onChange={setShocks} compact /></div></div>;
}

function DirectionApp({ direction }) {
  const id = direction.toLowerCase();
  const [tab, setTab] = useState('overview');
  const [shocks, setShocks] = useState(PD.initialShocks);
  const [selected, setSelected] = useState('SPY');
  const [portfolio, setPortfolio] = useState(PD.initialPortfolio);
  const [category, setCategory] = useState('Stocks');
  const [query, setQuery] = useState('');
  const content = tab === 'asset'
    ? <AssetAnalysis id={id} selected={selected} onSelect={setSelected} shocks={shocks} />
    : tab === 'portfolio'
      ? <PortfolioView id={id} portfolio={portfolio} setPortfolio={setPortfolio} category={category} setCategory={setCategory} query={query} setQuery={setQuery} shocks={shocks} />
      : direction === 'A'
        ? <OverviewA id={id} shocks={shocks} setShocks={setShocks} />
        : direction === 'B'
          ? <OverviewB id={id} shocks={shocks} setShocks={setShocks} />
          : <OverviewC id={id} shocks={shocks} setShocks={setShocks} />;

  if (direction === 'B') {
    return <div className="prototype-app dir-b" onClick={event => event.stopPropagation()}><aside className="b-sidebar"><SuperTurboMark compact /><MainTabs id={id} active={tab} onChange={setTab} vertical /><div className="agent-ready"><i /><span>WebMCP<br/>Agent ready</span></div></aside><main><header className="b-header"><div><span>MACRO IMPACT</span><b>Monday · Fresh data</b></div><button type="button">中文</button></header>{content}<FooterNote /></main></div>;
  }
  return (
    <div className={`prototype-app dir-${id}`} onClick={event => event.stopPropagation()}>
      <header className="top-header"><SuperTurboMark /><div className="header-meta"><span>AS OF SEP 01 · LIVE</span><span>WEBMCP <i /> READY</span><button type="button">中文</button></div></header>
      <MainTabs id={id} active={tab} onChange={setTab} />
      <main>{content}</main>
      <FooterNote />
    </div>
  );
}

function FooterNote() {
  return <footer><span>Directional research only · not financial advice</span><span>FRED · Yahoo Finance · SEC · News</span></footer>;
}

function PrototypeFrame({ direction, title }) {
  return <div id={`direction-${direction.toLowerCase()}-preview`} className="frame-center"><BrowserWindow title={title} url={`https://superturbo.app/macro-dashboard?ui=${direction.toLowerCase()}`} width={1180} height={700}><DirectionApp direction={direction} /></BrowserWindow></div>;
}

function App() {
  return (
    <DesignCanvas title="SuperTurbo Macro Workspace" subtitle="三套真实可点击方向。点击浏览器顶部边框可放大；每套都可切换三大视图、拖动 Shock Atlas、选择资产类别并调整组合权重。" columns={1}>
      <Variation number="A" label="Functional Signal Desk" description="功能主义网格；最快比较资产和冲击" aspectRatio="16 / 10"><PrototypeFrame direction="A" title="SuperTurbo — Signal Desk" /></Variation>
      <Variation number="B" label="Total View Wealth" description="获奖财富平台逻辑；总览清晰、深挖自然" aspectRatio="16 / 10"><PrototypeFrame direction="B" title="SuperTurbo — Total View" /></Variation>
      <Variation number="C" label="Scenario Flow" description="Stripe 式结构化 Fintech；情景流贯穿三视图" aspectRatio="16 / 10"><PrototypeFrame direction="C" title="SuperTurbo — Scenario Flow" /></Variation>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
