#!/usr/bin/env python3
"""Bundle src/*.js + narration.mp3 (base64) + embedded fonts into episode1.html.
Usage (from after-the-flash/):  python3 tools/build.py"""
import base64, os, re, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ORDER = ['timing.js', 'core.js', 'city.js', 'vehicles.js', 'people.js', 'dog.js', 'station.js', 'ui.js', 'audio.js',
         'scenes_street.js', 'scenes_under.js', 'main.js']
FONT_DIR = os.path.join(HERE, 'fonts')
FONTS = [('Poppins', 700), ('Poppins', 800), ('Roboto Mono', 700)]

def font_css():
    """Download (once) the latin subsets from Google Fonts and embed them as base64 @font-face."""
    os.makedirs(FONT_DIR, exist_ok=True)
    css = []
    for fam, wt in FONTS:
        fn = os.path.join(FONT_DIR, f"{fam.replace(' ', '')}-{wt}.woff2")
        if not os.path.exists(fn):
            q = f"https://fonts.googleapis.com/css2?family={fam.replace(' ', '+')}:wght@{wt}&display=swap"
            req = urllib.request.Request(q, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36'})
            text = urllib.request.urlopen(req, timeout=30).read().decode()
            block = text.split('/* latin */')[1]
            url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
            open(fn, 'wb').write(urllib.request.urlopen(url, timeout=30).read())
        b64 = base64.b64encode(open(fn, 'rb').read()).decode()
        css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:normal;font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return '\n'.join(css)

def main():
    tpl = open(os.path.join(ROOT, 'src', 'template.html')).read()
    code = '\n'.join(f"// ---- {f}\n" + open(os.path.join(ROOT, 'src', f)).read() for f in ORDER)
    narr = base64.b64encode(open(os.path.join(ROOT, 'narration.mp3'), 'rb').read()).decode()
    try: fonts = font_css()
    except Exception as e:
        print('font embed skipped:', e); fonts = ''
    out = tpl.replace('/*FONTS*/', fonts).replace('/*NARRATION*/', f'const NARRATION_B64="{narr}";').replace('/*CODE*/', code)
    open(os.path.join(ROOT, 'episode1.html'), 'w').write(out)
    print('episode1.html', round(len(out) / 1e6, 2), 'MB')

if __name__ == '__main__': main()
