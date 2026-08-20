import { COPY, HOME_PATH, HREF_LANG, HTML_LANG, LANGS, LANG_LABEL, TOOLS, type Lang } from '@/lib/site/home';

/** 首页正文，中英共用一份结构，只有文案按 lang 取。 */
export default function HomePage({ lang }: { lang: Lang }) {
  return (
    <>
      <div className="top">
        <div className="top-in">
          <div className="mark">S</div>
          <div className="top-name">SuperTurbo</div>
          <div className="top-meta mono hide-sm">superturbo.app</div>
          <nav className="top-lang" aria-label={COPY.langNav[lang]}>
            {LANGS.map((l) =>
              l === lang ? (
                <span key={l} className="lang-on" aria-current="true">
                  {LANG_LABEL[l]}
                </span>
              ) : (
                // 两种语言是两个根布局，跨过去必须整页导航，所以用原生 a
                <a key={l} href={HOME_PATH[l]} hrefLang={HREF_LANG[l]} lang={HTML_LANG[l]}>
                  {LANG_LABEL[l]}
                </a>
              ),
            )}
          </nav>
        </div>
      </div>

      <div className="wrap">
        <header className="hero">
          <h1>{COPY.headline[lang]}</h1>
          <p className="lead">{COPY.lead[lang]}</p>
        </header>

        <div className="tools">
          {TOOLS.map((tool) => (
            <a className="tool" key={tool.name.en} href={tool.href[lang]}>
              <h3>
                {tool.name[lang]}
                {tool.zhOnly && lang === 'en' ? (
                  <span className="tool-note">{COPY.zhOnly[lang]}</span>
                ) : null}
              </h3>
              <p>{tool.blurb[lang]}</p>
            </a>
          ))}
        </div>

        <footer style={{ marginTop: 56 }}>
          <dl>
            <dt>{COPY.aboutTerm[lang]}</dt>
            <dd>{COPY.about[lang]}</dd>
          </dl>
        </footer>
      </div>
    </>
  );
}
