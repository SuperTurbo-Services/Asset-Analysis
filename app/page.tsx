import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="top">
        <div className="top-in">
          <div className="mark">S</div>
          <div className="top-name">SuperTurbo</div>
          <div className="top-meta mono">superturbo.app</div>
        </div>
      </div>

      <div className="wrap">
        <header className="hero">
          <h1>把后台导出的表，变成能动手的诊断</h1>
          <p className="lead">
            一组自用的分析工具。每个工具只做一件小事，打开就能用。
          </p>
        </header>

        <div className="tools">
          <Link className="tool" href="/xiaohongshu-growth-dashboard">
            <h3>小红书涨粉诊断台</h3>
            <p>
              上传创作者中心的「笔记列表明细表」，得到三项百分制评分、四段漏斗、流量结构分类和逐篇诊断。
              把「为什么不涨粉」定位到具体环节。表格在你自己的浏览器里解析，原始文件不会上传。
            </p>
          </Link>

          <a className="tool" href="/macro-dashboard">
            <h3>宏观影响看板</h3>
            <p>
              美股、现金、黄金、加密四类资产，在当下的宏观环境里是看多还是看跌。
              每天自动重建一次，数字全部来自 FRED 和市场行情，模型只负责打分和写判断。
            </p>
          </a>
        </div>

        <footer style={{ marginTop: 56 }}>
          <dl>
            <dt>关于。</dt>
            <dd>
              SuperTurbo 是 Turbo 的个人工具集。源码在{' '}
              <a href="https://github.com/SuperTurbo-Services" target="_blank" rel="noreferrer">
                github.com/SuperTurbo-Services
              </a>
              。
            </dd>
          </dl>
        </footer>
      </div>
    </>
  );
}
