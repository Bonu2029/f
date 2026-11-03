#!/usr/bin/env python3
"""Sync step: silencedetect on an episode's narration -> speech lines -> scene table -> timing.js
Usage (from after-the-flash/):  python3 tools/timing.py [ep1|ep2]
words.json (word timings from faster-whisper) refines AT-"word" events inside a line."""
import subprocess, re, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

# Caption markup: [g]gold[/g] [r]red[/r] [b]quoted speech[/b]
EP1 = dict(
  mp3='narration.mp3', words='tools/words.json', out='src/timing.js',
  LINES=[
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
  ],
  MERGE=[],
  SCENE_FIRST=[0,2,4,7,10,11,14,16,19,20,21,22,24,25,27,30,31,32,33,34,36,37,39,41,44,46,48,51,53,55,56,58,62],
  TITLES=["Establishing","You and Biscuit","Normal morning","The buzz","Hundreds","The alert","Frozen","Cars stop","Chaos","The bus","Coffee drops","Rule card","15 minutes","Everyone goes right","Biscuit pulls left","Trust","12 minutes","The gate","Wait","Slide under","Slam","The flash","Silent light","Shockwave","Silence","Red lights","Speaker","Hour three","The man and the girl","Please","The key","The growl","Choice"],
)
def ep1_events(L, word, words):
  return {'coffee': L(3), 'leash': word('leash', L(3), L(3)+1.2), 'buzz': word('buzzes', L(8), L(8)+1.5), 'alert': L(11),
          'alertWords': [[round(s,3),x] for s,e,x in words if L(11)-0.1<=s<L(14)],
          'subway': L(29), 'white': word('white', L(38), L(38)+1.0), 'lightsDie': L(43), 'littleGirl': L(61),
          'choiceA': L(64), 'choiceB': L(65)}
EP1['events'] = ep1_events

EP2 = dict(
  mp3='ep2/narration.mp3', words='ep2/words.json', out='ep2/src/timing.js',
  # raw detected lines (49); MERGE joins tiny fragments into one caption (indices of raw lines)
  LINES=[
 "Most of you said [r]keep it shut.[/r]",
 "So Rosa keeps the [g]key[/g] in her fist.", "The gate stays [r]locked.[/r]",
 "The man stops banging.", "He sits down on the stairs.",
 "[b]\"Please,\"[/b] he says.", "Quieter this time.",
 "[g]Fifteen[/g] people.", "[r]One[/r] bottle of water.", "Nobody looks at the gate.",
 "Except [g]Biscuit.[/g]", "He won't stop watching the [r]little girl.[/r]",
 "She hasn't moved.", "She hasn't [r]blinked.[/r]", "Not once.",
 "[g]Hour four.[/g]", "The ash outside is getting thicker.",
 "Rosa sits down next to you.", "[b]\"Twenty-two years on this line,\"[/b]", "she says.", "[b]\"I've never locked this gate.\"[/b]",
 "[g]Rule two:[/g]", "[g]Stay inside for at least 24 hours.[/g]", "The first day is the [r]most dangerous.[/r]",
 "Your phone.", "[r]38%.[/r]", "No signal.",
 "[g]Hour five.[/g]", "The coughing stops.",
 "You look up the stairs.", "The man is [g]asleep[/g] against the bars.",
 "The little girl is [r]gone.[/r]",
 "Her stuffed rabbit is lying on the step.", "[r]Inside[/r] the gate.",
 "Nobody opened it.", "Rosa still has the [g]key.[/g]",
 "Biscuit sniffs the rabbit…", "and backs away.",
 "Then, from the dark tunnel behind you…", "a child [r]laughs.[/r]",
 "Every light on the platform goes [r]out.[/r]", "Except [r]one.[/r]",
 "So… what would [g]you[/g] do?",
 "[b]Follow the laugh into the tunnel…[/b]", "[r]or wake the man at the gate?[/r]",
  ],
  MERGE=[(1,2),(6,7),(40,41),(45,46)],
  SCENE_FIRST=[0,1,3,5,7,10,12,15,17,21,24,27,29,31,32,34,36,38,40,42],
  TITLES=["Recap","The key","The man sits","Please","Fifteen people","Except Biscuit","The girl","Hour four","Rosa sits","Rule card","Phone","Hour five","Man asleep","The girl is gone","The rabbit","Nobody opened it","Biscuit sniffs","The laugh","Lights out","Choice"],
)
def ep2_events(L, word, words):
  return {'rule': L(21), 'ruleLine2': L(22), 'ruleLine3': L(23), 'hour4': L(15), 'hour5': L(27), 'battery': L(25),
          'gone': L(31), 'laugh': word('laughs', L(39), L(39)+0.4), 'lightsOut': L(40), 'exceptOne': L(41),
          'choiceA': L(43), 'choiceB': L(44)}
EP2['events'] = ep2_events

EP3 = dict(
  mp3='ep3/narration.mp3', words='ep3/words.json', out='ep3/src/timing.js',
  LINES=[
 "Most of you said [r]wake the man.[/r]",
 "You turn on your phone light.", "[r]Thirty-five percent.[/r]",
 "You walk up the stairs to the gate.",
 "[b]\"Hey! Hey! Wake up!\"[/b]",
 "You shake the bars.", "He doesn't move.",
 "Then… his eyes [g]open.[/g]",
 "He looks at the [r]empty step[/r] beside him.",
 "[b]\"Where is she?\"[/b]",
 "Rosa holds up the stuffed rabbit.", "[b]\"It was inside the gate,\"[/b] she says.",
 "The man goes [r]pale.[/r]",
 "[b]\"She's not my daughter.\"[/b]",
 "[b]\"I found her on the street.\"[/b]", "[b]\"She grabbed my hand.\"[/b]",
 "[b]\"She said the gate would open for her.\"[/b]",
 "Nobody says a word.",
 "[g]Rule three:[/g]", "[g]If you are outside, take off your outer clothes.[/g]", "[g]Brush off the ash.[/g]", "It removes [g]most of the danger.[/g]",
 "Rosa pushes a trash bag through the bars.", "The man drops his jacket into it.",
 "Something falls out of the pocket.",
 "A child's [g]drawing.[/g]", "The station.", "The tunnel.", "And one letter, circled in [r]red.[/r]",
 "Biscuit turns toward the tunnel…", "and [r]growls.[/r]",
 "The last red light [r]flickers.[/r]",
 "Then… a small voice, from the dark:",
 "[b]\"Biscuit… come here, boy.\"[/b]",
 "She knows his [r]name.[/r]",
 "So… what would [g]you[/g] do?",
 "[b]Open the gate and let the man in…[/b]",
 "[r]or go after the voice?[/r]",
  ],
  MERGE=[(4,6),(13,14),(31,32),(36,38),(39,40),(42,43),(45,46)],
  SCENE_FIRST=[0,1,3,4,5,7,8,9,10,12,13,14,16,17,18,22,24,29,31,32,34,35],
  TITLES=["Recap","Phone light","Up the stairs","Wake up","Shake the bars","Eyes open","Empty step","Where is she","Rosa and the rabbit","Goes pale","Not my daughter","Flashback","The gate would open","Silence","Rule card","Trash bag","The drawing","Biscuit turns","The last light","The voice","Knows his name","Choice"],
)
def ep3_events(L, word, words):
  return {'battery': L(2), 'eyesOpen': word('open', L(7), L(7)+0.9), 'rule': L(18), 'ruleLine2': L(19), 'ruleLine3': L(20), 'ruleLine4': L(21),
          'jacket': L(23), 'falls': L(24), 'drawing': L(25), 'station': L(26), 'tunnel': L(27), 'circled': L(28) + 0.9,
          'growl': L(30), 'flicker': L(31), 'voice': L(33), 'choiceA': L(36), 'choiceB': L(37)}
EP3['events'] = ep3_events

EP4 = dict(
  mp3='ep4/narration.mp3', words='ep4/words.json', out='ep4/src/timing.js',
  LINES=[
 "Most of you said [g]let him in.[/g]",
 "Rosa turns the [g]key.[/g]", "The lock [r]clicks.[/r]",
 "The gate lifts.", "Just a little.",
 "The man crawls under it.", "Ash falls off his back.",
 "The gate [r]slams[/r] down again.",
 "Biscuit walks up to him…", "and sniffs his hand.",
 "No growl. Not at him.",
 "[b]\"Daniel,\"[/b] the man says. [b]\"My name is Daniel.\"[/b]",
 "Rosa hands him the bottle.", "One sip.",
 "Then Daniel says something else.", "[b]\"She told me one more thing.\"[/b]",
 "[b]\"Seven letters.\"[/b]", "[b]\"Then the door opens.\"[/b]",
 "[g]Seven letters.[/g]", "You think about the drawing.", "The letter [r]E.[/r]",
 "[g]Rule four:[/g]", "[g]Only eat and drink what was sealed.[/g]", "Wipe the package before you open it.",
 "Rosa unlocks the ticket booth.",
 "Behind the counter: a case of [g]bottled water.[/g]", "[g]Crackers. Sealed.[/g]",
 "For the first time today… people [g]smile.[/g]",
 "Then Rosa opens the lost and found box.",
 "On top, folded neatly… a little [r]yellow raincoat.[/r]",
 "Dry. Clean. [r]Exactly like hers.[/r]",
 "And pinned to the hood, a gold letter.", "[g]L.[/g]",
 "Then the rails start to [r]hum.[/r]", "Something is coming down the tunnel.",
 "So… what would [g]you[/g] do?",
 "[b]Hide in the ticket booth…[/b]",
 "[r]or shine the light down the tunnel?[/r]",
  ],
  MERGE=[(10,11),(12,14),(28,29),(30,31),(32,33),(35,37),(38,40),(41,42),(46,47)],
  SCENE_FIRST=[0,1,3,5,7,8,10,11,12,14,16,18,21,24,25,27,28,29,31,33,34,35],
  TITLES=["Recap","The key","The gate lifts","Crawls under","Slam","Biscuit sniffs","No growl","Daniel","The bottle","Something else","Seven letters","The drawing","Rule card","Ticket booth","Supplies","Smiles","Lost and found","The raincoat","The gold L","Rails hum","Something coming","Choice"],
)
def ep4_events(L, word, words):
  return {'clicks': L(2), 'lifts': L(3), 'slam': L(7), 'slots': L(16), 'rule': L(21), 'ruleLine2': L(22), 'ruleLine3': L(23),
          'booth': L(24), 'water': L(25), 'crackers': L(26), 'letterL': L(32), 'hum': L(33), 'coming': L(34), 'choiceA': L(36), 'choiceB': L(37)}
EP4['events'] = ep4_events

EP5 = dict(
  mp3='ep5/narration.mp3', words='ep5/words.json', out='ep5/src/timing.js',
  LINES=[
 "Most of you said [g]hide.[/g]",
 "Fifteen people. One ticket booth. It fits [r]six.[/r]",
 "The others lie flat behind the benches.",
 "Rosa reaches over and turns off your phone light.",
 "[r]Total dark.[/r]",
 "The hum becomes a [r]rumble.[/r]", "Wind pushes out of the tunnel.", "Dust in your eyes.",
 "Then a light.", "Slow. Swinging.",
 "It's not a train.", "It's a cart on the rails, pushed by people in [r]white suits and masks.[/r]",
 "They stop at the platform.",
 "One of them climbs up, a flashlight in one hand.",
 "Rosa leans close.", "[b]\"That's not our uniform,\"[/b] she whispers.",
 "The light moves along the wall, bench to bench.",
 "A muffled voice behind the mask:", "[b]\"Fifteen.\"[/b]",
 "Then: [b]\"There should be sixteen.\"[/b]",
 "Biscuit starts to [r]growl.[/r]", "You hold his mouth shut.",
 "[g]Rule five:[/g]", "[g]In the dark, stay quiet.[/g]", "Light and noise tell them [r]where you are.[/r]",
 "The figure kneels at the lost and found box.",
 "He takes the [r]yellow raincoat,[/r] folds it under his arm.",
 "He stands up.", "On his back, a big black letter.", "[g]T.[/g]",
 "Then the radio on the cart crackles.", "A child's voice:", "[b]\"Did you find them?\"[/b]",
 "The figure turns and looks [r]straight at the booth.[/r]",
 "So… what would [g]you[/g] do?",
 "[b]Step out and talk to him…[/b]",
 "[r]or stay hidden?[/r]",
  ],
  MERGE=[(1,3),(11,12),(14,15),(17,18),(20,21),(22,23),(26,27),(31,32),(35,36),(38,39),(44,45),(46,47)],
  SCENE_FIRST=[0,1,2,3,4,5,6,8,10,11,12,13,14,16,17,19,20,22,25,26,27,30,33,34],
  TITLES=["Recap","Six in the booth","Behind the benches","Light off","Total dark","Rumble","Wind","Swinging light","Not a train","White suits","They stop","One climbs up","Rosa whispers","Bench to bench","Fifteen","Sixteen","Biscuit growls","Rule card","Lost and found","Folded raincoat","The letter T","The radio","He turns","Choice"],
)
def ep5_events(L, word, words):
  return {'lightOff': word('light', L(3), L(3) + 2.0), 'rumble': L(5), 'wind': L(6), 'lantern': L(8), 'cart': L(11), 'stop': L(12),
          'fifteen': L(18), 'sixteen': word('sixteen', L(19), L(19) + 1.0), 'rule': L(22), 'ruleLine2': L(23), 'ruleLine3': L(24),
          'letterT': L(29), 'radio': L(30), 'childVoice': L(32), 'turn': L(33), 'choiceA': L(35), 'choiceB': L(36)}
EP5['events'] = ep5_events
EPISODES = {'ep1': EP1, 'ep2': EP2, 'ep3': EP3, 'ep4': EP4, 'ep5': EP5}

def detect(mp3):
    dur = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',mp3],capture_output=True,text=True).stdout)
    log = subprocess.run(['ffmpeg','-hide_banner','-i',mp3,'-af','silencedetect=noise=-38dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
    ev = [(m.group(1), float(m.group(2))) for m in re.finditer(r'silence_(start|end): ([0-9.]+)', log)]
    segs=[]; cur=0.0
    for k,v in ev:
        if k=='start':
            if v-cur>0.05: segs.append([round(cur,3), round(v,3)])
        else: cur=v
    if dur-cur>0.05: segs.append([round(cur,3), round(dur,3)])
    return segs, dur

def main():
    ep = sys.argv[1] if len(sys.argv) > 1 else 'ep1'
    C = EPISODES[ep]
    segs, dur = detect(os.path.join(ROOT, C['mp3']))
    for a, b in sorted(C['MERGE'], reverse=True):       # join fragments (raw indices) into one caption line
        segs[a:b+1] = [[segs[a][0], segs[b][1]]]
    LINES = C['LINES']
    assert len(LINES)==len(segs), f"{len(LINES)} caption lines vs {len(segs)} detected lines"
    wp = os.path.join(ROOT, C['words']); words = json.load(open(wp)) if os.path.exists(wp) else []
    def word(w, after=0.0, default=None):
        for s,e,x in words:
            if s>=after-0.05 and re.sub(r'[^a-z0-9]','',x.lower())==w: return round(s,3)
        return default
    L = lambda i: segs[i][0]
    END = round(dur,3)
    ev = C['events'](L, word, words); ev['narrEnd'] = END
    ev['ring'] = round(END+0.6,3); ev['ep2']=round(ev['ring']+5.4,3); ev['course']=round(ev['ep2']+2.6,3); TOTAL=round(ev['course']+3.0,3)
    SF = C['SCENE_FIRST']; scenes=[]
    for i,f in enumerate(SF):
        st = 0.0 if i==0 else L(f)
        en = L(SF[i+1]) if i+1<len(SF) else TOTAL
        last = (SF[i+1]-1) if i+1<len(SF) else len(segs)-1
        scenes.append({'n':i+1,'title':C['TITLES'][i],'start':st,'end':en,'lines':[f,last]})
    lines=[{'s':a,'e':b,'text':LINES[i]} for i,(a,b) in enumerate(segs)]
    out = f"// AUTO-GENERATED by tools/timing.py {ep} from silencedetect on {C['mp3']} — do not edit by hand\n"
    out += "const NARR_DUR=%s, TOTAL=%s;\n" % (END, TOTAL)
    out += "const LINES=%s;\nconst SCENES_T=%s;\nconst EV=%s;\n" % (json.dumps(lines), json.dumps(scenes), json.dumps(ev))
    os.makedirs(os.path.dirname(os.path.join(ROOT, C['out'])), exist_ok=True)
    open(os.path.join(ROOT, C['out']),'w').write(out)
    print(f"{'#':>3} {'start':>7} {'end':>7}  line text")
    for i,(a,b) in enumerate(segs): print(f"{i:3d} {a:7.2f} {b:7.2f}  {re.sub(r'\\[/?[grb]\\]','',LINES[i])}")
    print("\nScene table:")
    for s in scenes: print(f"S{s['n']:02d} {s['start']:7.2f}-{s['end']:7.2f}  lines {s['lines'][0]}-{s['lines'][1]}  {s['title']}")
    print("\nEvents:", {k:v for k,v in ev.items() if k!='alertWords'}); print("TOTAL", TOTAL)

if __name__ == '__main__': main()
