# Approved direction

User selection, recorded verbatim:

> 我要a，但是点击中间就是current macro，然后四周变成圆圈，然后变成就是中间一个大圆，旁边先圆，如果点击旁边的小圆（scenario）就会挪到中间变成大圆，右上角有个按钮可以随时切换成current，然后下面一行字，提醒，ask codex to give you customzied scenario analysis

Implementation interpretation:

- Use Direction A's event compass.
- The current macro setting starts in the large center circle.
- Preset scenarios sit around it as smaller circles.
- Clicking a small scenario moves that scenario into the large center position; the previously active scenario returns to the ring.
- Keep a persistent top-right action that returns to the current macro setting.
- Add a line below the selector inviting the user to ask Codex for a customized scenario analysis.
- The four large asset verdict cards update to reflect the active scenario.
