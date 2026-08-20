/** 两个根布局共用的 <head> 内容，字体只在这里写一次。 */
export default function SiteHead() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />
    </>
  );
}
