"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import "./notes.css";

const letters = ["A", "B", "C", "D", "E", "F", "G"] as const;
const stages = ["Discover", "Understand", "Experiment", "Apply", "Master"];
type Stage = 0 | 1 | 2 | 3 | 4;
const questions = [
  { prompt: "Which note comes after C?", answer: "D", choices: ["B", "D", "E"] },
  { prompt: "Which sound matches the note E?", answer: "E", choices: ["C", "E", "G"] },
  { prompt: "Which note comes before G?", answer: "F", choices: ["E", "F", "A"] },
  { prompt: "Which letter is missing? A, B, __, D", answer: "C", choices: ["C", "E", "G"] },
];

export default function NotesLesson() {
  const engine = useRef<PianoAudioEngine | null>(null);
  engine.current ??= new PianoAudioEngine();
  const [stage, setStage] = useState<Stage>(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState("C");
  const [feedback, setFeedback] = useState("");
  const [round, setRound] = useState(0);
  const [master, setMaster] = useState(0);
  const [soundError, setSoundError] = useState("");
  const [playing, setPlaying] = useState<number | null>(null);
  const pitches = useMemo(() => letters.map((letter, i) => ({ letter, midi: 57 + i })), []);

  useEffect(() => () => { void engine.current?.dispose(); }, []);

  async function play(midi: number) {
    try {
      await engine.current!.enable();
      engine.current!.stopVoices();
      const n = midiToNote(midi);
      if (n.midi === undefined || n.frequency === undefined) throw new Error("Unavailable pitch");
      engine.current!.play({ ...n, midi: n.midi, frequency: n.frequency, key: n.spelling, displayName: n.spelling, accidental: "natural" });
      setPlaying(midi); setSoundError("");
      window.setTimeout(() => setPlaying((v) => v === midi ? null : v), 480);
    } catch { setSoundError("Sound couldn’t start. Try again."); }
  }

  async function sequence() {
    try {
      await engine.current!.enable(); engine.current!.stopAll();
      const revision = engine.current!.playbackRevision;
      pitches.forEach(({ midi }, i) => window.setTimeout(() => engine.current?.play({ ...midiToNote(midi), midi, frequency: midiToNote(midi).frequency!, key: letters[i], displayName: letters[i], accidental: "natural" }, .36, "manual", revision), i * 460));
      setSoundError("");
    } catch { setSoundError("Sound couldn’t start. Try again."); }
  }

  const mark = (n: number) => setDone((old) => new Set(old).add(n));
  const go = (n: Stage) => { setStage(n); setFeedback(""); };
  const mastered = done.has(0) && done.has(1) && done.has(2) && done.has(3) && done.has(4);
  return <main className="notes-lesson">
    <header className="notes-header"><Link href="/" aria-label="ARPEGGIO home" className="notes-logo"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/learn/foundations" className="notes-back">← Music Foundations</Link></header>
    <section className="notes-intro"><p className="notes-eyebrow">A short listening journey</p><h1>Understanding <em>musical notes.</em></h1><p>Give the sounds around you a shared language.</p></section>
    <nav className="notes-progress" aria-label="Lesson progress"><div><i style={{ width: `${done.size * 20}%` }}/></div><ol>{stages.map((name,i)=><li key={name}><button className={`${stage===i?"current":""} ${done.has(i)?"done":""}`} aria-current={stage===i?"step":undefined} onClick={()=>go(i as Stage)}>{done.has(i)?"✓":`0${i+1}`}<small>{name}</small></button></li>)}</ol></nav>
    <section className="notes-stage" aria-live="polite">
      <p className="notes-eyebrow">Stage 0{stage+1} · {stages[stage]}</p>
      {stage===0&&<><h2>Musicians give musical pitches names.</h2><p>Listen to these sounds. What if each one had a name?</p><button className="notes-button pale" onClick={()=>void sequence()}>Listen to the sounds ↗</button><div className="notes-choice-row">{pitches.slice(0,3).map(({letter,midi})=><button className={`note-tile ${playing===midi?"playing":""}`} key={letter} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}<small>Play sound</small></button>)}</div><button className="notes-button" onClick={()=>{mark(0);go(1)}}>Let’s find out ↗</button></>}
      {stage===1&&<><h2>Seven names, in a repeating sequence.</h2><p>Natural notes use seven letters: A, B, C, D, E, F and G. Then the sequence starts again.</p><div className="notes-sequence">{pitches.map(({letter,midi})=><button key={letter} className={`note-tile ${selected===letter?"selected":""} ${playing===midi?"playing":""}`} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}</button>)}</div><button className="notes-button" onClick={()=>{mark(1);go(2)}}>Explore the names ↗</button></>}
      {stage===2&&<><h2>Choose a name. Hear its sound.</h2><p>Move through the sequence and notice how each name belongs to a different pitch.</p><div className="notes-explorer">{pitches.map(({letter,midi},i)=><button key={letter} className={`note-tile ${selected===letter?"selected":""} ${playing===midi?"playing":""}`} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}<small>{i===6?"Next: A":"Listen"}</small></button>)}</div><div className="notes-stepper"><button onClick={()=>{const i=letters.indexOf(selected as typeof letters[number]);setSelected(letters[(i+6)%7]);void play(57+(i+6)%7)}}>← Previous</button><button onClick={()=>{const i=letters.indexOf(selected as typeof letters[number]);setSelected(letters[(i+1)%7]);void play(57+(i+1)%7)}}>Next →</button></div><button className="notes-button" onClick={()=>{mark(2);go(3)}}>I’m ready ↗</button></>}
      {stage===3&&<><h2>{questions[round].prompt}</h2><button className="notes-button pale" onClick={()=>void play(57+letters.indexOf(questions[round].answer as typeof letters[number]))}>Hear a note ↗</button><div className="notes-choice-row">{questions[round].choices.map((c)=><button className={`notes-answer ${feedback&&c===questions[round].answer?"correct":""}`} key={c} onClick={()=>{if(c===questions[round].answer){setFeedback("Exactly. Nice listening.");if(round===3)mark(3);else setRound(round+1)}else setFeedback("Not quite. Listen and try again.")}}>{c}</button>)}</div></>}
      {stage===4&&!mastered&&<><h2>{master===0?"How many natural note names are there?":"What comes after G?"}</h2><div className="notes-choice-row">{(master===0?["5","7","8"]:["A","F","C"]).map(c=><button className="notes-answer" key={c} onClick={()=>{const expected=master===0?"7":"A";if(c===expected){if(master===0){setMaster(1);setFeedback("Yes—seven names. One more.")}else{mark(4);setFeedback("You found the repeating pattern.")}}else setFeedback("Try once more.")}}>{c}</button>)}</div></>}
      {stage===4&&mastered&&<div className="notes-finish"><h2>You’ve found the names.</h2><p>A, B, C, D, E, F and G give musicians a shared way to talk about pitches.</p><Link className="notes-button" href="/learn/foundations">Back to Foundations ↗</Link></div>}
      {feedback&&<p className="notes-feedback" role="status">{feedback}</p>}{soundError&&<p role="status">{soundError}</p>}
      <div className="notes-nav"><button className="notes-button pale" disabled={stage===0} onClick={()=>go(Math.max(0,stage-1) as Stage)}>Back</button>{stage<4&&<button className="notes-button" disabled={!done.has(stage)} onClick={()=>go(Math.min(4,stage+1) as Stage)}>Continue ↗</button>}</div>
    </section><footer className="notes-footer">No instrument. Just your ears.</footer>
  </main>;
}
