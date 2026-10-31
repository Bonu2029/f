#!/usr/bin/env python3
"""Sync step: silencedetect on narration.mp3 -> speech lines -> scene table -> src/timing.js
Usage: python3 tools/timing.py   (run from after-the-flash/)
words.json (optional word timings from faster-whisper) refines AT-"word" events inside a line."""
import subprocess, re, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
mp3 = os.path.join(ROOT, 'narration.mp3')
dur = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',mp3],capture_output=True,text=True).stdout)
log = subprocess.run(['ffmpeg','-hide_banner','-i',mp3,'-af','silencedetect=noise=-38dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
ev = [(m.group(1), float(m.group(2))) for m in re.finditer(r'silence_(start|end): ([0-9.]+)', log)]
# speech = gaps between silences
segs=[]; cur=0.0
for k,v in ev:
    if k=='start':
        if v-cur>0.05: segs.append([round(cur,3), round(v,3)])
    else: cur=v
if dur-cur>0.05: segs.append([round(cur,3), round(dur,3)])

# Caption text per detected line. Markup: [g]gold[/g] [r]red[/r] [b]quoted speech[/b]
LINES = [
 "[g]8:14 AM.[/g]", "A Tuesday in [g]New Harbor.[/g]",
 "You're walking [g]Biscuit.[/g]", "[g]Coffee[/g] in one hand. [g]Leash[/g] in the other.",
 "Taxis honking.", "A food cart guy yelling prices.", "A normal morning.",
 "Then…", "every phone on the street [r]buzzes.[/r]", "At the exact same time.",
 "[r]Hundreds[/r] of them.",
 "[r]Emergency alert.[/r]", "[r]Incoming missile.[/r] Seek shelter immediately.", "[r]This is not a drill.[/r]",
 "For one second…", "nobody moves.",
 "Then a taxi stops in the middle of the road.", "Then another.", "Then [g]all[/g] of them.",
 "Doors fly open. People run. [r]Every direction.[/r]",
 "A bus driver jumps out and leaves the bus running.",
 "Your coffee hits the sidewalk.",
 "[g]Rule one:[/g]", "[g]Get inside. Get down. Stay inside.[/g]",
 "You have [r]fifteen minutes.[/r]",
 "Everyone is running [g]right.[/g]", "Toward the tall glass buildings.",
 "But Biscuit pulls you [g]left.[/g]", "[r]Hard.[/r]", "Toward the [g]subway.[/g]",
 "You trust the dog.",
 "[r]Twelve minutes.[/r]",
 "At the bottom of the stairs, a transit worker is pulling the [g]steel gate[/g] down.",
 "[b]\"Wait!\"[/b]",
 "You slide under it.", "Biscuit right behind you.",
 "The gate [r]slams shut.[/r]",
 "You look back up the stairs…", "and the sky turns [g]white.[/g]",
 "No sound.", "Just light.",
 "Then the ground [r]jumps.[/r]", "Dust falls from the ceiling.", "The lights [r]die.[/r]",
 "Then…", "silence.",
 "The emergency lights flicker on.", "[r]Red.[/r]",
 "A voice on the station speaker.", "[b]\"Stay underground. Do not go up.[/b]", "[b]The fallout is coming.\"[/b]",
 "[g]Hour three.[/g]", "Someone is [r]banging[/r] on the gate.",
 "A man in a torn suit.", "Holding a little girl in a [g]yellow raincoat.[/g]",
 "[b]\"Please! Open it!\"[/b]",
 "The transit worker has the [g]key.[/g]", "She looks at you.",
 "And Biscuit…", "is [r]growling.[/r]", "Not at the man.", "At the [r]little girl.[/r]",
 "So…", "what would [g]you[/g] do?", "[b]Open the gate…[/b]", "[r]or keep it shut?[/r]",
]
assert len(LINES)==len(segs), (len(LINES),len(segs))
# scene -> index of first line
SCENE_FIRST=[0,2,4,7,10,11,14,16,19,20,21,22,24,25,27,30,31,32,33,34,36,37,39,41,44,46,48,51,53,55,56,58,62]
TITLES=["Establishing","You and Biscuit","Normal morning","The buzz","Hundreds","The alert","Frozen","Cars stop","Chaos","The bus","Coffee drops","Rule card","15 minutes","Everyone goes right","Biscuit pulls left","Trust","12 minutes","The gate","Wait","Slide under","Slam","The flash","Silent light","Shockwave","Silence","Red lights","Speaker","Hour three","The man and the girl","Please","The key","The growl","Choice"]
words=json.load(open(os.path.join(HERE,'words.json'))) if os.path.exists(os.path.join(HERE,'words.json')) else []
def word(w, after=0.0, default=None):
    for s,e,x in words:
        if s>=after-0.05 and re.sub(r'[^a-z0-9]','',x.lower())==w: return round(s,3)
    return default
L=lambda i: segs[i][0]
END = round(dur,3)
ev = {
 'coffee': L(3), 'leash': word('leash', L(3), L(3)+1.2),
 'buzz': word('buzzes', L(8), L(8)+1.5), 'alert': L(11),
 'alertWords': [[round(s,3),x] for s,e,x in words if L(11)-0.1<=s<L(14)],
 'subway': L(29), 'white': word('white', L(38), L(38)+1.0),
 'lightsDie': L(43), 'littleGirl': L(61),
 'choiceA': L(64), 'choiceB': L(65), 'narrEnd': END,
}
# post-narration cards
ev['ring'] = round(END+0.6,3); ev['ep2']=round(ev['ring']+5.4,3); ev['course']=round(ev['ep2']+2.6,3); TOTAL=round(ev['course']+3.0,3)
scenes=[]
for i,f in enumerate(SCENE_FIRST):
    st = 0.0 if i==0 else L(f)
    en = L(SCENE_FIRST[i+1]) if i+1<len(SCENE_FIRST) else TOTAL
    last = (SCENE_FIRST[i+1]-1) if i+1<len(SCENE_FIRST) else len(segs)-1
    scenes.append({'n':i+1,'title':TITLES[i],'start':st,'end':en,'lines':[f,last]})
lines=[{'s':a,'e':b,'text':LINES[i]} for i,(a,b) in enumerate(segs)]
out = "// AUTO-GENERATED by tools/timing.py from silencedetect on narration.mp3 — do not edit by hand\n"
out += "const NARR_DUR=%s, TOTAL=%s;\n" % (END, TOTAL)
out += "const LINES=%s;\nconst SCENES_T=%s;\nconst EV=%s;\n" % (json.dumps(lines), json.dumps(scenes), json.dumps(ev))
open(os.path.join(ROOT,'src','timing.js'),'w').write(out)
print(f"{'#':>3} {'start':>7} {'end':>7}  line text")
for i,(a,b) in enumerate(segs): print(f"{i:3d} {a:7.2f} {b:7.2f}  {re.sub(r'\[/?[grb]\]','',LINES[i])}")
print("\nScene table:")
for s in scenes: print(f"S{s['n']:02d} {s['start']:7.2f}-{s['end']:7.2f}  lines {s['lines'][0]}-{s['lines'][1]}  {s['title']}")
print("\nEvents:", {k:v for k,v in ev.items() if k!='alertWords'}); print("TOTAL", TOTAL)
