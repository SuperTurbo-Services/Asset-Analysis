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
            一组自用的分析工具。数据在你自己的浏览器里解析，原始文件不会上传到任何服务器。
          </p>
        </header>

        <div className="tools">
          <Link className="tool" href="/xiaohongshu-growth-dashboard">
            <h3>小红书涨粉诊断台</h3>
            <p>
              上传创作者中心的「笔记列表明细表」，得到三项百分制评分、四段漏斗、流量结构分类和逐篇诊断。
              把「为什么不涨粉」定位到具体环节。
            </p>
          </Link>
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
