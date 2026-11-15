"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import "./octaves.css";

const names = ["C", "D", "E", "F", "G", "A", "B"] as const;
const stages = ["Discover", "Understand", "Experiment", "Apply", "Master"];
type Stage = 0 | 1 | 2 | 3 | 4;
const challenges = [
  { prompt: "Which pair shares the same note name?", pairs: [[60, 67], [60, 72]], answer: "Second pair", options: ["First pair", "Second pair"] },
  { prompt: "The second sound is C again, but higher. What changed?", pairs: [[60, 72]], answer: "Same note name, higher pitch", options: ["Same note name, higher pitch", "Different note names"] },
  { prompt: "Which sound is the higher version of G?", pairs: [[55, 67], [55, 65]], answer: "First sound", options: ["First sound", "Second sound"] },
  { prompt: "If a note’s frequency doubles, what do we hear?", pairs: [[57, 69]], answer: "Its octave above", options: ["Its octave above", "A louder version"] },
];

function pianoNote(midi: number) {
  const note = midiToNote(midi);
  if (note.midi === undefined || note.frequency === undefined) throw new RangeError("A playable pitch is required.");
  return { ...note, midi: note.midi, frequency: note.frequency, key: note.spelling, displayName: note.spelling, accidental: "natural" as const };
}

export default function OctavesLesson() {
  const engine = useRef<PianoAudioEngine | null>(null);
  engine.current ??= new PianoAudioEngine();
  const [stage, setStage] = useState<Stage>(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [root, setRoot] = useState(60);
  const [active, setActive] = useState<number | null>(null);
  const [challenge, setChallenge] = useState(0);
  const [masterAnswer, setMasterAnswer] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { void engine.current?.dispose(); }, []);

  async function play(midi: number) {
    try {
      await engine.current!.enable();
      engine.current!.stopVoices();
      engine.current!.play(pianoNote(midi));
      setActive(midi); setError("");
      window.setTimeout(() => setActive((value) => value === midi ? null : value), 480);
    } catch { setError("Sound couldn’t start. Tap the note to try again."); }
  }
  async function playPair(low: number, high: number) {
    try {
      await engine.current!.enable(); engine.current!.stopAll();
      const revision = engine.current!.playbackRevision;
      [low, high].forEach((midi, index) => window.setTimeout(() => {
        const ok = engine.current?.play(pianoNote(midi), .55, "manual", revision);
        if (ok) { setActive(midi); window.setTimeout(() => setActive((n) => n === midi ? null : n), 560); }
      }, index * 700));
      setError("");
    } catch { setError("Sound couldn’t start. Tap play to try again."); }
  }
  const mark = (index: number) => setDone((previous) => new Set(previous).add(index));
  const go = (index: Stage) => { setStage(index); setFeedback(""); };
  const complete = [0, 1, 2, 3, 4].every((n) => done.has(n));
  const challengeCorrect = (answer: string) => {
    if (answer === challenges[challenge].answer) {
      setFeedback("You heard the connection.");
      if (challenge === 3) mark(3); else setChallenge((n) => n + 1);
    } else setFeedback("Listen once more and compare the pair.");
  };

  return <main className="octave-lesson">
    <header className="octave-header"><Link href="/" aria-label="ARPEGGIO home" className="octave-logo"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/learn/foundations" className="octave-back">← Music Foundations</Link></header>
    <section className="octave-intro"><p className="octave-eyebrow">Listen, compare, discover</p><h1>Understanding <em>octaves.</em></h1><p>Why does the same note name come around again?</p></section>
    <nav className="octave-progress" aria-label="Lesson progress"><div><i style={{ width: `${done.size * 20}%` }}/></div><ol>{stages.map((name,index)=><li key={name}><button aria-current={stage===index?"step":undefined} className={`${stage===index?"current":""} ${done.has(index)?"done":""}`} onClick={()=>go(index as Stage)}>{done.has(index)?"✓":`0${index+1}`}<small>{name}</small></button></li>)}</ol></nav>
    <section className="octave-stage" aria-live="polite">
      <p className="octave-eyebrow">Stage 0{stage+1} · {stages[stage]}</p>
      {stage===0&&<><h2>Two sounds. Same name, or different?</h2><p>Listen to the pair. What feels familiar, and what feels changed?</p><div className="octave-compare"><button className={active===60?"playing":""} onClick={()=>void play(60)}>C · lower</button><button className={active===72?"playing":""} onClick={()=>void play(72)}>C · higher</button></div><button className="octave-button pale" onClick={()=>void playPair(60,72)}>Hear them together ↗</button><p>What stayed alike? What moved?</p><div className="octave-actions"><button className="octave-answer" onClick={()=>setFeedback("Yes—the note name feels related, while the second sound is higher.")}>They feel related, but one is higher</button><button className="octave-answer" onClick={()=>setFeedback("Listen again: the name feels familiar, while the pitch moves higher.")}>They sound completely unrelated</button></div><button className="octave-button" onClick={()=>{mark(0);go(1)}}>Explore why ↗</button></>}
      {stage===1&&<><h2>The names come around again.</h2><p>As pitches rise, the note names repeat. C is followed by another C higher up. That span between matching names is called an <strong>octave</strong>.</p><div className="octave-visual"><span>C</span><i/><span>C</span><small>same name · higher sound</small></div><p>Try listening: the higher C has double the frequency of the lower C. That’s why it sounds brighter and higher while keeping its name.</p><button className="octave-button" onClick={()=>{mark(1);go(2)}}>Try it yourself ↗</button></>}
      {stage===2&&<><h2>Move the same name through registers.</h2><p>Choose a note, then compare it with the same note above or below.</p><div className="octave-note-controls">{names.map((name,index)=>{const midi=60+index*2;return <button key={name} className={root===midi?"selected":""} onClick={()=>setRoot(midi)}>{name}</button>})}</div><div className="octave-keyboard" aria-label="Keyboard illustration showing repeated note names">{[0,1,2].map((oct)=>names.map((name,index)=>{const midi=root+12*oct+index;return <button key={`${oct}-${name}`} className={`${name===names[0]?"home-note":""} ${active===midi?"playing":""}`} onClick={()=>void play(midi)}><span>{name}</span>{name===names[0]&&<small>C</small>}</button>}))}</div><div className="octave-actions"><button className="octave-button pale" onClick={()=>void playPair(root,root+12)}>Hear lower then higher ↗</button><button className="octave-button pale" onClick={()=>void playPair(root+12,root)}>Hear higher then lower ↗</button></div><button className="octave-button" onClick={()=>{mark(2);go(3)}}>Ready for a challenge ↗</button></>}
      {stage===3&&<><h2>{challenges[challenge].prompt}</h2><div className="octave-actions">{challenges[challenge].pairs.map((pair,index)=><button className="octave-button pale" key={index} onClick={()=>void playPair(pair[0],pair[1])}>Play pair {index+1} ↗</button>)}</div><div className="octave-actions">{challenges[challenge].options.map((answer)=><button className="octave-answer" key={answer} onClick={()=>challengeCorrect(answer)}>{answer}</button>)}</div></>}
      {stage===4&&!complete&&<><h2>Bring the idea together.</h2><p>{masterAnswer===0?"An octave is…":"An octave above has what relationship to the starting note’s frequency?"}</p><div className="octave-actions">{(masterAnswer===0?["The same note name at a higher or lower pitch","Any two notes played together"]:["Double the frequency","Half the volume"]).map((answer,index)=><button className="octave-answer" key={answer} onClick={()=>{if(index===0){if(masterAnswer===0){setMasterAnswer(1);setFeedback("Right. One last thought.")}else{mark(4);setFeedback("Exactly. You understand the connection.")}}else setFeedback("Think about what changed in the sound comparison.")}}>{answer}</button>)}</div></>}
      {stage===4&&complete&&<div className="octave-finish"><h2>You found the repeating note.</h2><p>Same name, higher sound—and a frequency twice as fast.</p><Link className="octave-button" href="/learn/foundations">Back to Music Foundations ↗</Link></div>}
      {feedback&&<p className="octave-feedback" role="status">{feedback}</p>}{error&&<p role="status">{error}</p>}
      <div className="octave-nav"><button className="octave-button pale" disabled={!stage} onClick={()=>go(Math.max(0,stage-1) as Stage)}>Back</button>{stage<4&&<button className="octave-button" disabled={!done.has(stage)} onClick={()=>go(Math.min(4,stage+1) as Stage)}>Continue ↗</button>}</div>
    </section><footer className="octave-footer">No instrument. Just your ears.</footer>
  </main>;
}
