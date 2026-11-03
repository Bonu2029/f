#!/usr/bin/env python3
"""Bundle src/*.js + narration.mp3 (base64) + embedded fonts into episode1.html.
Usage (from after-the-flash/):  python3 tools/build.py [ep1..ep5]"""
import base64, os, re, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SHARED = ['src/core.js', 'src/city.js', 'src/vehicles.js', 'src/people.js', 'src/dog.js', 'src/station.js', 'src/ui.js', 'src/audio.js', 'src/scene_kit.js']
EPISODES = {
    'ep1': dict(order=['src/timing.js'] + SHARED + ['src/scenes_street.js', 'src/scenes_under.js', 'src/main.js'],
                narr='narration.mp3', out='episode1.html', title='After the Flash · Episode 1', sub='EPISODE 1 · HARBOR STREET'),
    'ep2': dict(order=['ep2/src/timing.js'] + SHARED + ['src/ui_series.js', 'src/scene_kit2.js', 'ep2/src/ui2.js', 'ep2/src/audio2.js', 'ep2/src/scenes2.js', 'src/main.js'],
                narr='ep2/narration.mp3', out='ep2/episode2.html', title='After the Flash · Episode 2', sub='EPISODE 2 · KEEP IT SHUT'),
    'ep3': dict(order=['ep3/src/timing.js'] + SHARED + ['src/ui_series.js', 'src/scene_kit2.js', 'src/scene_kit3.js', 'src/scenes_street.js', 'ep3/src/cfg3.js', 'ep3/src/audio3.js', 'ep3/src/scenes3.js', 'src/main.js'],
                narr='ep3/narration.mp3', out='ep3/episode3.html', title='After the Flash · Episode 3', sub='EPISODE 3 · WAKE THE MAN'),
    'ep4': dict(order=['ep4/src/timing.js'] + SHARED + ['src/ui_series.js', 'src/scene_kit2.js', 'src/scene_kit3.js', 'ep4/src/cfg4.js', 'ep4/src/audio4.js', 'ep4/src/scenes4.js', 'src/main.js'],
                narr='ep4/narration.mp3', out='ep4/episode4.html', title='After the Flash · Episode 4', sub='EPISODE 4 · LET HIM IN'),
    'ep5': dict(order=['ep5/src/timing.js'] + SHARED + ['src/ui_series.js', 'src/scene_kit2.js', 'src/scene_kit3.js', 'ep5/src/cfg5.js', 'ep5/src/audio5.js', 'ep5/src/scenes5.js', 'src/main.js'],
                narr='ep5/narration.mp3', out='ep5/episode5.html', title='After the Flash · Episode 5', sub='EPISODE 5 · HIDE'),
}
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
    import sys
    ep = sys.argv[1] if len(sys.argv) > 1 else 'ep1'
    E = EPISODES[ep]
    tpl = open(os.path.join(ROOT, 'src', 'template.html')).read()
    code = '\n'.join(f"// ---- {f}\n" + open(os.path.join(ROOT, f)).read() for f in E['order'])
    narr = base64.b64encode(open(os.path.join(ROOT, E['narr']), 'rb').read()).decode()
    try: fonts = font_css()
    except Exception as e:
        print('font embed skipped:', e); fonts = ''
    out = (tpl.replace('/*FONTS*/', fonts).replace('/*TITLE*/', E['title']).replace('/*SUBTITLE*/', E['sub'])
              .replace('/*NARRATION*/', f'const NARRATION_B64="{narr}";').replace('/*CODE*/', code))
    open(os.path.join(ROOT, E['out']), 'w').write(out)
    print(E['out'], round(len(out) / 1e6, 2), 'MB')

if __name__ == '__main__': main()
