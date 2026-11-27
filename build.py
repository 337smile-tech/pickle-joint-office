#!/usr/bin/env python3
"""index.html + styles.css + app.js -> standalone.html (한 파일 배포용)

사용:  python3 build.py
결과:  standalone.html  (CSS/JS가 모두 인라인된 한 파일)
"""
import pathlib, re, sys

root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")
js = (root / "app.js").read_text(encoding="utf-8")

html = re.sub(r'<link rel="stylesheet" href="styles\.css[^"]*">', lambda m: "<style>\n" + css + "\n</style>", html)
html = re.sub(r'<script src="app\.js[^"]*"></script>', lambda m: "<script>\n" + js + "\n</script>", html)

if 'href="styles.css"' in html or 'src="app.js"' in html:
    sys.exit("인라인 실패: 남아 있는 외부 참조가 있습니다.")

out = root / "standalone.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({len(html)/1024:.1f} KB)")
