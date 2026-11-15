"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { SCALE_DEFINITIONS, CHORD_DEFINITIONS, constructChord, constructScale, createRhythmicValue, createTempo, createTimeSignature, identifyInterval, midiToNote, parseNote, secondsForRhythm, beatsForRhythm, type ChordQuality, type Note, type PianoNote } from "@/modules/music";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALE_IDS = Object.keys(SCALE_DEFINITIONS) as (keyof typeof SCALE_DEFINITIONS)[];
const CHORD_IDS = Object.keys(CHORD_DEFINITIONS) as ChordQuality[];
const GUITAR_STRINGS = [64, 59, 55, 50, 45, 40];

function asPianoNote(note: Note): PianoNote {
  if (note.midi === undefined || note.frequency === undefined) throw new RangeError("Playback needs an absolute pitch.");
  const accidental = note.alteration === 0 ? "natural" : "sharp";
  return { ...note, midi: note.midi, frequency: note.frequency, key: note.spelling, displayName: note.spelling.replace(/\d+$/, "").replace("#", "♯"), accidental };
}

function NoteSelector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <label className="pg-field">{label}<select value={value} onChange={(e) => onChange(e.target.value)}>{ROOTS.map((n) => <option key={n}>{n}</option>)}</select></label>;
}

function Piano({ notes, active, onPlay }: { notes: readonly Note[]; active: number | null; onPlay: (note: Note) => void }) {
  const keys = Array.from({ length: 13 }, (_, i) => midiToNote(60 + i));
  const pitchClasses = new Set(notes.map((n) => n.pitchClass));
  const whiteKeys = keys.filter((note) => ![1, 3, 6, 8, 10].includes(note.midi! % 12));
  const blackKeys = keys.filter((note) => [1, 3, 6, 8, 10].includes(note.midi! % 12));
  return <div className="pg-piano" role="group" aria-label="Piano note representation"><div className="pg-piano-whites">{whiteKeys.map((note) => <button key={note.midi} aria-label={`Play ${note.spelling}`} aria-pressed={pitchClasses.has(note.pitchClass)} className={`${pitchClasses.has(note.pitchClass) ? "selected" : ""} ${active === note.midi ? "active" : ""}`} onClick={() => onPlay(note)}><span>{note.spelling.replace(/\d+$/, "")}</span></button>)}</div>{blackKeys.map((note) => { const keyIndex = keys.indexOf(note); const whitesBefore = keys.slice(0, keyIndex).filter((key) => ![1, 3, 6, 8, 10].includes(key.midi! % 12)).length; return <button key={note.midi} aria-label={`Play ${note.spelling}`} aria-pressed={pitchClasses.has(note.pitchClass)} className={`pg-piano-black ${pitchClasses.has(note.pitchClass) ? "selected" : ""} ${active === note.midi ? "active" : ""}`} style={{ left: `${(whitesBefore / whiteKeys.length) * 100}%` }} onClick={() => onPlay(note)}><span>{note.spelling.replace(/\d+$/, "")}</span></button>; })}</div>;
}

function Guitar({ notes, active, onPlay }: { notes: readonly Note[]; active: number | null; onPlay: (note: Note) => void }) {
  const frets = Array.from({ length: 13 }, (_, i) => i);
  const pitchClasses = new Set(notes.map((n) => n.pitchClass));
  return <div className="pg-instrument-scroll"><div className="pg-fretboard" role="group" aria-label="Guitar fretboard note representation">{GUITAR_STRINGS.map((open, string) => <div className="pg-string" key={open}>{frets.map((fret) => { const midi = open + fret; const note = midiToNote(midi); const selected = pitchClasses.has(note.pitchClass); return <button key={fret} aria-label={`Play ${note.spelling} on string ${6-string+1}, fret ${fret}`} aria-pressed={selected} className={`${selected ? "selected" : ""} ${active === midi ? "active" : ""}`} style={{ gridColumn: fret + 1, gridRow: string + 1 }} onClick={() => onPlay(note)}>{selected ? note.spelling.replace(/\d+$/, "") : ""}</button>; })}</div>)}</div></div>;
}

export function Playground() {
  const audio = useRef<PianoAudioEngine | null>(null);
  audio.current ??= new PianoAudioEngine();
  const [sound, setSound] = useState(false);
  const [message, setMessage] = useState("");
  const [octave, setOctave] = useState(4);
  const [root, setRoot] = useState("C");
  const [toRoot, setToRoot] = useState("E");
  const [scaleId, setScaleId] = useState<keyof typeof SCALE_DEFINITIONS>("major");
  const [chordId, setChordId] = useState<ChordQuality>("major");
  const [inversion, setInversion] = useState<0|1|2|3>(0);
  const [bpm, setBpm] = useState(96);
  const [meter, setMeter] = useState("4/4");
  const [active, setActive] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [representation, setRepresentation] = useState<"piano" | "guitar">("piano");
  const [noteRepresentation, setNoteRepresentation] = useState<"piano" | "guitar">("piano");
  const [pattern, setPattern] = useState([true, false, true, false, true, false, true, false]);
  const patternRef = useRef(pattern);
  const bpmRef = useRef(bpm);
  const playbackRun = useRef(0);
  const playbackTimers = useRef<number[]>([]);
  const activeTimer = useRef<number | null>(null);
  const activeNoteRun = useRef(0);
  const tonic = useMemo(() => parseNote(`${root}${octave}`), [root, octave]);
  const noteList = useMemo(() => Array.from({ length: 25 }, (_, i) => midiToNote(48 + i)), []);
  const from = useMemo(() => parseNote(`${root}${octave}`), [root, octave]);
  const interval = useMemo(() => parseNote(`${toRoot}${octave}`), [toRoot, octave]);
  const intervalInfo = useMemo(() => identifyInterval(from, interval), [from, interval]);
  const scale = useMemo(() => constructScale(tonic, SCALE_DEFINITIONS[scaleId]), [tonic, scaleId]);
  const chord = useMemo(() => constructChord(tonic, chordId, inversion), [tonic, chordId, inversion]);
  const chordNotes = chord.tones.map((t) => t.note);
  const [num, den] = meter.split("/").map(Number);
  const signature = useMemo(() => createTimeSignature(num, den as 1|2|4|8|16|32), [num, den]);
  const rhythm = createRhythmicValue("note", "eighth");
  const tempo = createTempo(bpm, "quarter");

  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  function clearPlayback() {
    playbackRun.current += 1;
    playbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimers.current = [];
    if (activeTimer.current !== null) window.clearTimeout(activeTimer.current);
    activeTimer.current = null;
    activeNoteRun.current += 1;
    setActive(null);
    setActiveStep(null);
  }

  function schedule(run: number, callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      playbackTimers.current = playbackTimers.current.filter((pending) => pending !== timer);
      if (playbackRun.current === run) callback();
    }, delay);
    playbackTimers.current.push(timer);
  }

  function activateNote(note: PianoNote, duration: number) {
    if (activeTimer.current !== null) window.clearTimeout(activeTimer.current);
    const noteRun = ++activeNoteRun.current;
    setActive(note.midi);
    activeTimer.current = window.setTimeout(() => {
      if (activeNoteRun.current === noteRun) {
        setActive(null);
        activeTimer.current = null;
      }
    }, duration * 1000);
  }

  useEffect(() => () => {
    playbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    if (activeTimer.current !== null) window.clearTimeout(activeTimer.current);
    void audio.current?.dispose();
  }, []);

  async function play(notes: readonly Note[], duration = .42) {
    clearPlayback();
    const run = playbackRun.current;
    try {
      await audio.current!.enable();
      if (playbackRun.current !== run) return;
      setSound(true); setMessage("");
      notes.forEach((note, i) => schedule(run, () => { const n = asPianoNote(note); audio.current?.play(n, duration); activateNote(n, duration); }, i * (duration * 650)));
    } catch { setMessage("Sound is unavailable right now. You can keep exploring the notes visually."); }
  }
  async function playRhythm() {
    clearPlayback();
    const run = playbackRun.current;
    try {
      await audio.current!.enable();
      if (playbackRun.current !== run) return;
      setSound(true); setMessage("");
      let step = 0;
      const playStep = () => {
        if (playbackRun.current !== run) return;
        setActiveStep(step);
        const stepDuration = 60 / bpmRef.current / 2;
        if (patternRef.current[step]) {
          const note = asPianoNote(midiToNote(60));
          audio.current?.play(note, Math.min(.2, stepDuration));
          activateNote(note, Math.min(.2, stepDuration));
        }
        if (step === patternRef.current.length - 1) {
          schedule(run, () => setActiveStep(null), stepDuration * 1000);
          return;
        }
        step += 1;
        schedule(run, playStep, stepDuration * 1000);
      };
      playStep();
    } catch { setMessage("Sound is unavailable right now."); }
  }
  function toggleStep(index: number) { setPattern((p) => p.map((v, i) => i === index ? !v : v)); }

  return <main className="playground-page"><header className="pg-header"><Link href="/" className="pg-brand"><Image src="/brand/arpeggio-logo.png" alt="ARPEGGIO" width={204} height={68} priority /></Link><Link href="/" className="pg-back">Back to ARPEGGIO ↗</Link></header><section className="pg-intro"><span className="pg-kicker">A space to experiment</span><h1>Follow your <em>curiosity.</em></h1><p>Choose a sound, notice what changes, and explore the patterns your ear already recognises.</p><div className="pg-status"><span className={sound ? "on" : ""}/>{sound ? "Sound is on" : "Sound starts with your first play"}</div></section>
  {message && <p className="pg-message" role="status">{message}</p>}
  <section className="pg-workspace"><div className="pg-section-head"><div><span className="pg-kicker">01 · Explore Notes</span><h2>Pick a note. Hear its colour.</h2></div><NoteSelector label="Note" value={root} onChange={setRoot}/></div><div className="pg-note-controls"><label className="pg-field">Octave<select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>{[2,3,4,5,6].map((o)=><option key={o}>{o}</option>)}</select></label><div className="pg-note-strip">{noteList.slice((octave-2)*2,(octave-2)*2+13).map((note)=><button key={note.midi} className={note.pitchClass===tonic.pitchClass?"chosen":""} onClick={()=>{setRoot(note.spelling.replace(/\d+$/, ""));setOctave(note.octave!);}} aria-label={`Select ${note.spelling}`}><b>{note.spelling.replace(/\d+$/, "")}</b></button>)}</div></div><div className="pg-note-facts"><button className="pg-play" onClick={()=>void play([tonic])}>Hear {tonic.spelling} <span aria-hidden="true">↗</span></button><div className="pg-instrument-toggle" aria-label="Choose note display"><button aria-pressed={noteRepresentation==="piano"} onClick={()=>setNoteRepresentation("piano")}>Piano</button><button aria-pressed={noteRepresentation==="guitar"} onClick={()=>setNoteRepresentation("guitar")}>Guitar</button></div></div>{noteRepresentation==="piano"?<Piano notes={[tonic]} active={active} onPlay={(n)=>void play([n])}/>:<Guitar notes={[tonic]} active={active} onPlay={(n)=>void play([n])}/>}<details className="pg-details"><summary>Note details</summary><p>{tonic.spelling} · also {midiToNote(tonic.midi!, "sharp").spelling} or {midiToNote(tonic.midi!, "flat").spelling}</p><p>MIDI {tonic.midi} · {tonic.frequency?.toFixed(2)} Hz · Equal-tempered tuning (A4 = 440 Hz)</p></details></section>
  <section className="pg-workspace"><div className="pg-section-head"><div><span className="pg-kicker">02 · Discover Distances</span><h2>How far apart do they feel?</h2></div></div><div className="pg-controls"><NoteSelector label="First note" value={root} onChange={setRoot}/><span className="pg-between" aria-hidden="true">to</span><NoteSelector label="Second note" value={toRoot} onChange={setToRoot}/></div><div className="pg-interval-visual"><div><small>FIRST</small><strong>{from.spelling}</strong></div><div className="pg-distance"><span/>{intervalInfo.semitones} semitones<span/></div><div><small>SECOND</small><strong>{interval.spelling}</strong></div><button className="pg-play" onClick={()=>void play([from,interval])}>Hear the distance ↗</button></div><p className="pg-context">{intervalInfo.name} · Listen for the space between the notes.</p></section>
  <section className="pg-workspace"><div className="pg-section-head"><div><span className="pg-kicker">03 · Explore Patterns</span><h2>Follow a pattern of notes.</h2></div><NoteSelector label="Root note" value={root} onChange={setRoot}/></div><label className="pg-field">Pattern<select value={scaleId} onChange={(e)=>setScaleId(e.target.value as keyof typeof SCALE_DEFINITIONS)}>{SCALE_IDS.map((id)=><option key={id} value={id}>{SCALE_DEFINITIONS[id].name}</option>)}</select></label><div className="pg-tones">{scale.degrees.map((degree,i)=><div className={`pg-tone ${degree.degree===1?"root":""} ${active===degree.note.midi?"active":""}`} key={`${i}-${degree.note.spelling}`}><b>{degree.note.spelling.replace(/\d+$/, "")}</b></div>)}</div><button className="pg-play" onClick={()=>void play(scale.notes)}>Play the pattern ↗</button><details className="pg-details"><summary>Show scale degrees</summary><div className="pg-degree-list">{scale.degrees.map((d)=><span key={`${d.degree}-${d.note.spelling}`}>{d.degree === 1 ? "Root" : `Degree ${d.degree}`} · {d.name}</span>)}</div></details></section>
  <section className="pg-workspace"><div className="pg-section-head"><div><span className="pg-kicker">04 · Build Sounds</span><h2>Bring notes together.</h2></div><NoteSelector label="Root note" value={root} onChange={setRoot}/></div><div className="pg-controls"><label className="pg-field">Sound<select value={chordId} onChange={(e)=>{const next=e.target.value as ChordQuality;setChordId(next);setInversion(0);}}>{CHORD_IDS.map((id)=><option key={id} value={id}>{CHORD_DEFINITIONS[id].quality}</option>)}</select></label></div><div className="pg-chord-line"><strong>{chord.symbol}</strong><button className="pg-play" onClick={()=>void play(chord.voicing)}>Hear this sound ↗</button></div><div className="pg-instrument-toggle"><button aria-pressed={representation==="piano"} onClick={()=>setRepresentation("piano")}>Piano</button><button aria-pressed={representation==="guitar"} onClick={()=>setRepresentation("guitar")}>Guitar</button></div>{representation==="piano"?<Piano notes={chordNotes} active={active} onPlay={(n)=>void play([n])}/>:<Guitar notes={chordNotes} active={active} onPlay={(n)=>void play([n])}/>}<p className="pg-note">The highlighted notes are the same sound, shown in two ways.</p><details className="pg-details"><summary>Explore chord shape</summary><label className="pg-field">Position<select value={inversion} onChange={(e)=>setInversion(Number(e.target.value) as 0|1|2|3)}>{Array.from({length:CHORD_DEFINITIONS[chordId].tones.length},(_,i)=><option key={i} value={i}>{["Root position","First inversion","Second inversion","Third inversion"][i]}</option>)}</select></label><p>{chord.tones.map((t)=>t.interval.name).join(" · ")}</p></details></section>
  <section className="pg-workspace pg-rhythm"><div className="pg-section-head"><div><span className="pg-kicker">05 · Play with Rhythm</span><h2>Make a pulse your own.</h2></div></div><div className="pg-sequencer" role="group" aria-label="Eight-step rhythm sequencer">{pattern.map((on,i)=><button key={i} className={`${on?"hit":""} ${activeStep===i?"current":""}`} aria-pressed={on} aria-current={activeStep===i?"step":undefined} aria-label={`Step ${i+1}`} onClick={()=>toggleStep(i)}><small>{i+1}</small></button>)}</div><div className="pg-rhythm-info"><button className="pg-play" onClick={()=>void playRhythm()}>Play your rhythm ↗</button><span>{meter} · {bpm} BPM</span></div><details className="pg-details"><summary>Adjust the beat</summary><div className="pg-controls"><label className="pg-field">Tempo · {bpm} BPM<input type="range" min="50" max="180" value={bpm} onChange={(e)=>setBpm(Number(e.target.value))}/></label><label className="pg-field">Time signature<select value={meter} onChange={(e)=>setMeter(e.target.value)}>{["2/4","3/4","4/4","6/8","9/8","12/8"].map((m)=><option key={m}>{m}</option>)}</select></label></div><p>{signature.beatGrouping} subdivision per beat · Eighth note: {beatsForRhythm(rhythm,signature).toFixed(2)} beats / {secondsForRhythm(rhythm,tempo).toFixed(3)} sec</p></details></section><footer className="pg-footer">A good place to begin is wherever you’re curious.</footer></main>;
}
