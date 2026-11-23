"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { completeLessonWithReward, setActiveLesson } from "@/modules/curriculum/persistent-progress";
import { LessonCompletion } from "@/components/learning/lesson-completion";
import { LessonFeedback, type LessonFeedbackTone } from "@/components/ui/lesson-feedback";
import { AssessmentComplete, AssessmentProgress } from "@/components/learning/assessment-tools";
import "./notes.css";
import "../lesson-refinement.css";

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
  const [feedback, setFeedback] = useState<{ message: string; tone: LessonFeedbackTone } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [master, setMaster] = useState(0);
  const [assessmentFinished, setAssessmentFinished] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [playing, setPlaying] = useState<number | null>(null);
  const [completion,setCompletion]=useState<{earnedXP:number;totalXP:number}|null>(null);
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
  const go = (n: Stage) => { setStage(n); setFeedback(null); setSelectedAnswer(null); };
  const showFeedback = (message: string, tone: LessonFeedbackTone) => setFeedback({ message, tone });
  function answerQuestion(choice: string) {
    if (feedback?.tone === "success") return;
    setSelectedAnswer(choice);
    if (choice === questions[round].answer) {
      showFeedback(round === 3 ? "Exactly. Apply is complete. The note names follow A through G; continue to the final reflection." : "Exactly. Nice listening. The note names follow a repeating A through G sequence.", "success");
      if (round === 3) mark(3);
    } else showFeedback("Not quite. The note name follows the sequence A through G. Listen again and try another choice.", "error");
  }
  function answerMaster(choice: string) {
    if (feedback?.tone === "success") return;
    setSelectedAnswer(choice);
    const expected = master === 0 ? "7" : "A";
    if (choice === expected) {
      if (master === 0) showFeedback("Yes—seven natural note names. Continue when you’re ready for the final reflection.", "success");
      else { showFeedback("You found the repeating pattern.", "success"); setAssessmentFinished(true); }
    } else showFeedback("Try counting the note names in order: A, B, C, D, E, F, G.", "error");
  }
  const mastered = done.has(0) && done.has(1) && done.has(2) && done.has(3) && done.has(4);
  useEffect(() => { setActiveLesson("notes"); }, []);
  useEffect(() => { if (mastered) { const result=completeLessonWithReward("notes"); setCompletion({earnedXP:result.earnedXP,totalXP:result.progress.totalXP}); } }, [mastered]);
  return <main className="notes-lesson">
    <header className="notes-header"><Link href="/" aria-label="ARPEGGIO home" className="notes-logo"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/learn/foundations" className="notes-back">← Music Foundations</Link></header>
    <section className="notes-intro"><p className="notes-eyebrow">A short listening journey</p><h1>Understanding <em>musical notes.</em></h1><p>Give the sounds around you a shared language.</p></section>
    <nav className="notes-progress" aria-label="Lesson progress"><div><i style={{ width: `${done.size * 20}%` }}/></div><ol>{stages.map((name,i)=><li key={name}><button className={`${stage===i?"current":""} ${done.has(i)?"done":""}`} aria-current={stage===i?"step":undefined} onClick={()=>go(i as Stage)}>{done.has(i)?"✓":`0${i+1}`}<small>{name}</small></button></li>)}</ol></nav>
    <section className="notes-stage" aria-live="polite">
      <p className="notes-eyebrow">Stage 0{stage+1} · {stages[stage]}</p>
      {stage===0&&<><h2>Musicians give musical pitches names.</h2><p>Listen to these sounds. What if each one had a name?</p><button className="notes-button pale" onClick={()=>void sequence()}>Listen to the sounds ↗</button><div className="notes-choice-row">{pitches.slice(0,3).map(({letter,midi})=><button className={`note-tile ${playing===midi?"playing":""}`} key={letter} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}<small>Play sound</small></button>)}</div>{!done.has(0)&&<button className="notes-button" onClick={()=>{mark(0);showFeedback("You have explored these note sounds. Continue to discover their shared names.","success")}}>Let’s find out ↗</button>}</>}
      {stage===1&&<><h2>Seven names, in a repeating sequence.</h2><p>Natural notes use seven letters: A, B, C, D, E, F and G. Then the sequence starts again.</p><div className="notes-sequence">{pitches.map(({letter,midi})=><button key={letter} className={`note-tile ${selected===letter?"selected":""} ${playing===midi?"playing":""}`} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}</button>)}</div>{!done.has(1)&&<button className="notes-button" onClick={()=>{mark(1);showFeedback("You have explored the seven note names. Continue when you are ready.","success")}}>Explore the names ↗</button>}</>}
      {stage===2&&<><h2>Choose a name. Hear its sound.</h2><p>Move through the sequence and notice how each name belongs to a different pitch.</p><div className="notes-explorer">{pitches.map(({letter,midi},i)=><button key={letter} className={`note-tile ${selected===letter?"selected":""} ${playing===midi?"playing":""}`} onClick={()=>{setSelected(letter);void play(midi)}}>{letter}<small>{i===6?"Next: A":"Listen"}</small></button>)}</div><div className="notes-stepper"><button onClick={()=>{const i=letters.indexOf(selected as typeof letters[number]);setSelected(letters[(i+6)%7]);void play(57+(i+6)%7)}}>← Previous</button><button onClick={()=>{const i=letters.indexOf(selected as typeof letters[number]);setSelected(letters[(i+1)%7]);void play(57+(i+1)%7)}}>Next →</button></div>{!done.has(2)&&<button className="notes-button" onClick={()=>{mark(2);showFeedback("You have explored the sequence. Continue to put it into practice.","success")}}>I’m ready ↗</button>}</>}
      {stage===3&&<><AssessmentProgress current={round+1} total={questions.length} completed={round+(feedback?.tone==="success"?1:0)} label="Note question"/><h2 className="assessment-question">{questions[round].prompt}</h2><button className="notes-button pale" onClick={()=>void play(57+letters.indexOf(questions[round].answer as typeof letters[number]))}>Hear a note ↗</button><div className="notes-choice-row assessment-answers">{questions[round].choices.map((c)=><button className={`notes-answer ${selectedAnswer===c?feedback?.tone==="success"?"correct":"incorrect":""}`} key={c} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===c} onClick={()=>answerQuestion(c)}>{c}</button>)}</div>{feedback?.tone==="success"&&round<3&&<button className="notes-button" onClick={()=>{if(feedback?.tone!=="success")return;setRound((current)=>current+1);setSelectedAnswer(null);setFeedback(null)}}>Next question ↗</button>}</>}
      {stage===4&&!mastered&&!assessmentFinished&&<><AssessmentProgress current={master+1} total={2} completed={master+(feedback?.tone==="success"?1:0)} label="Reflection"/><h2 className="assessment-question">{master===0?"How many natural note names are there?":"What comes after G?"}</h2><div className="notes-choice-row assessment-answers">{(master===0?["5","7","8"]:["A","F","C"]).map(c=><button className={`notes-answer ${selectedAnswer===c?feedback?.tone==="success"?"correct":"incorrect":""}`} key={c} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===c} onClick={()=>answerMaster(c)}>{c}</button>)}</div>{master===0&&feedback?.tone==="success"&&<button className="notes-button" onClick={()=>{if(feedback?.tone!=="success")return;setMaster(1);setSelectedAnswer(null);setFeedback(null)}}>Next reflection ↗</button>}</>}
      {stage===4&&assessmentFinished&&!mastered&&<AssessmentComplete title="You know your note names." message="You found the seven-note sequence and discovered how it begins again after G." onContinue={()=>mark(4)}/>}
      {stage===4&&mastered&&completion&&<LessonCompletion lesson="notes" concept="musical notes" {...completion}/>}
      {feedback&&!assessmentFinished&&<LessonFeedback message={feedback.message} tone={feedback.tone}/ >}{soundError&&<p role="status">{soundError}</p>}
      <div className="notes-nav"><button className="notes-button pale" disabled={stage===0} onClick={()=>go(Math.max(0,stage-1) as Stage)}>Back</button>{stage<4&&<button className="notes-button" aria-describedby={!done.has(stage)?"notes-continue-hint":undefined} disabled={!done.has(stage)} onClick={()=>go(Math.min(4,stage+1) as Stage)}>Continue ↗</button>}</div>
      {stage<4&&!done.has(stage)&&<p id="notes-continue-hint" className="lesson-navigation-hint">{stage===3?"Answer all four note questions to continue to the final reflection.":"Complete the exploration above to unlock Continue."}</p>}
    </section><footer className="notes-footer">No instrument. Just your ears.</footer>
  </main>;
}
