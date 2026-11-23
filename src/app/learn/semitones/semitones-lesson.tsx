"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { completeLessonWithReward, setActiveLesson } from "@/modules/curriculum/persistent-progress";
import { LessonCompletion } from "@/components/learning/lesson-completion";
import { ChoiceDropdown } from "@/components/ui/choice-dropdown";
import { LessonFeedback, type LessonFeedbackTone } from "@/components/ui/lesson-feedback";
import { AssessmentComplete, AssessmentProgress } from "@/components/learning/assessment-tools";
import "./semitones.css";
import "../lesson-refinement.css";

const stages = ["Discover", "Understand", "Experiment", "Apply", "Master"] as const;
type Stage = 0 | 1 | 2 | 3 | 4;
const keys = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const rounds = [
  { prompt: "Which pair moves by the smallest keyboard step?", pairs: [[64,65],[60,62]], answer: "First pair", options: ["First pair", "Second pair"] },
  { prompt: "How many small steps are between C and D?", pairs: [[60,62]], answer: "Two", options: ["One", "Two"] },
  { prompt: "Which two natural note pairs sit right next to each other?", pairs: [[64,65],[71,72]], answer: "E–F and B–C", options: ["E–F and B–C", "C–D and F–G"] },
  { prompt: "When you move one key to the right, what happens to pitch?", pairs: [[60,61]], answer: "It rises by one small step", options: ["It rises by one small step", "It stays the same"] },
];

function asPianoNote(midi: number) {
  const n = midiToNote(midi);
  return { ...n, midi, frequency: n.frequency!, key: n.spelling, displayName: n.spelling, accidental: n.alteration === 0 ? "natural" as const : "sharp" as const };
}

export default function SemitonesLesson() {
  const engine = useRef<PianoAudioEngine | null>(null);
  engine.current ??= new PianoAudioEngine();
  const [stage,setStage]=useState<Stage>(0); const [done,setDone]=useState<Set<number>>(new Set());
  const [root,setRoot]=useState(64); const [active,setActive]=useState<number|null>(null);
  const [round,setRound]=useState(0); const [master,setMaster]=useState(0); const [feedback,setFeedback]=useState<{message:string;tone:LessonFeedbackTone}|null>(null); const [selectedAnswer,setSelectedAnswer]=useState<string|null>(null); const [error,setError]=useState("");
  const [assessmentFinished,setAssessmentFinished]=useState(false);
  const [completion,setCompletion]=useState<{earnedXP:number;totalXP:number}|null>(null);
  useEffect(()=>()=>{void engine.current?.dispose()},[]);
  async function play(midi:number){try{await engine.current!.enable();engine.current!.stopVoices();engine.current!.play(asPianoNote(midi));setActive(midi);setError("");window.setTimeout(()=>setActive(v=>v===midi?null:v),480)}catch{setError("Sound couldn’t start. Tap a note to try again.")}}
  async function pair(a:number,b:number){try{await engine.current!.enable();engine.current!.stopAll();const revision=engine.current!.playbackRevision;[a,b].forEach((m,i)=>window.setTimeout(()=>{if(engine.current?.play(asPianoNote(m),.5,"manual",revision)){setActive(m);window.setTimeout(()=>setActive(v=>v===m?null:v),520)}},i*650));setError("")}catch{setError("Sound couldn’t start. Try again.")}}
  const mark=(i:number)=>setDone(old=>new Set(old).add(i)); const go=(i:Stage)=>{setStage(i);setFeedback(null);setSelectedAnswer(null)};
  const showFeedback=(message:string,tone:LessonFeedbackTone)=>setFeedback({message,tone});
  const mastered=[0,1,2,3,4].every(i=>done.has(i));
  useEffect(()=>{setActiveLesson("semitones")},[]);
  useEffect(()=>{if(mastered){const result=completeLessonWithReward("semitones");setCompletion({earnedXP:result.earnedXP,totalXP:result.progress.totalXP})}},[mastered]);
  function answer(value:string){if(feedback?.tone==="success")return;setSelectedAnswer(value);if(value===rounds[round].answer){showFeedback(round===3?"That’s it. Apply is complete: adjacent notes move one small step at a time. Continue to the final assessment.":"That’s it. You heard the distance. Compare the sounds, then continue when you’re ready.","success");if(round===3)mark(3)}else showFeedback("Listen again and compare how many keyboard steps separate the sounds.","error")}
  return <main className="semitone-lesson">
    <header className="semi-header"><Link href="/" aria-label="ARPEGGIO home" className="semi-logo"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/learn/foundations" className="semi-back">← Music Foundations</Link></header>
    <section className="semi-intro"><p className="semi-eyebrow">Listen for the smallest step</p><h1>Understanding <em>semitones.</em></h1><p>Move between nearby sounds and discover the space between them.</p></section>
    <nav className="semi-progress" aria-label="Lesson progress"><div><i style={{width:`${done.size*20}%`}}/></div><ol>{stages.map((s,i)=><li key={s}><button aria-current={stage===i?"step":undefined} className={`${stage===i?"current":""} ${done.has(i)?"done":""}`} onClick={()=>go(i as Stage)}>{done.has(i)?"✓":`0${i+1}`}<small>{s}</small></button></li>)}</ol></nav>
    <section className="semi-stage" aria-live="polite"><p className="semi-eyebrow">Stage 0{stage+1} · {stages[stage]}</p>
      {stage===0&&<><h2>Some nearby sounds feel closer than others.</h2><p>Listen to each pair. Which pair takes a smaller step from the first sound to the next?</p><div className="semi-pairs">{[[64,65],[60,62]].map(([a,b],i)=><button key={i} onClick={()=>void pair(a,b)} className="semi-pair"><span>{i===0?"A tiny move":"A slightly wider move"}</span><i style={{width:i===0?"16%":"32%"}}/><b>Listen ↗</b></button>)}</div>{!done.has(0)&&<button className="semi-button" onClick={()=>{mark(0);showFeedback("You’ve heard the smaller step. Continue to give it a name.","success")}}>Explore the keyboard ↗</button>}</>}
      {stage===1&&<><h2>One small step has a name.</h2><p>The smallest standard step between neighboring pitches is called a <strong>semitone</strong>. Two of these steps make a whole tone.</p><div className="semi-distance"><span>One semitone</span><i/><span>Two semitones</span><i/><span>One whole tone</span></div><p>On this keyboard, C to D passes over one key in between: two small steps. E to F and B to C have no key between them, so each is one step.</p>{!done.has(1)&&<button className="semi-button" onClick={()=>{mark(1);showFeedback("Now you’re ready to move one small step yourself.","success")}}>Try moving one step ↗</button>}</>}
      {stage===2&&<><h2>Choose a note, then move next door.</h2><p>Tap any key to hear it. Then compare it with the key beside it.</p><div className="semi-note-name">{keys[(root-60+120)%12]} <span>→</span> {keys[(root-59+120)%12]}</div><div className="semi-keyboard" role="group" aria-label="One octave keyboard"><div className="semi-white-keys">{[0,2,4,5,7,9,11,12].map((step)=>{const midi=root+step;return <button key={step} className={active===midi?"playing":""} onClick={()=>void play(midi)}><span>{midiToNote(midi).spelling.replace(/[#0-9]/g,"")}</span></button>})}</div><div className="semi-black-keys">{[1,3,6,8,10].map((step)=>{const midi=root+step;const left={1:10,3:22.5,6:47.5,8:60,10:72.5}[step];return <button key={step} style={{left:`${left}%`}} className={active===midi?"playing":""} aria-label={`Play ${midiToNote(midi).spelling}`} onClick={()=>void play(midi)}/>})}</div></div><ChoiceDropdown label="Start from" value={String(root)} options={[60,61,62,63,64,65,66,67,68,69,70,71].map((m)=>({value:String(m),label:midiToNote(m).spelling}))} onChange={(value)=>setRoot(Number(value))} className="semi-select" /><div className="semi-actions"><button className="semi-button secondary" onClick={()=>void pair(root,root+1)}>Hear one step ↗</button><button className="semi-button secondary" onClick={()=>void pair(root,root+2)}>Hear two steps ↗</button></div><p className="semi-hint">Natural note pairs E–F and B–C sit one small step apart.</p>{!done.has(2)&&<button className="semi-button" onClick={()=>{mark(2);showFeedback("Experiment complete. Continue to test what you noticed.","success")}}>Try a listening challenge ↗</button>}</>}
      {stage===3&&<><AssessmentProgress current={round+1} total={rounds.length} completed={round+(feedback?.tone==="success"?1:0)} label="Listening question"/><h2 className="assessment-question">{rounds[round].prompt}</h2><div className="semi-actions">{rounds[round].pairs.map(([a,b],i)=><button className="semi-button secondary" key={i} onClick={()=>void pair(a,b)}>Hear pair {i+1} ↗</button>)}</div><div className="semi-answers assessment-answers">{rounds[round].options.map(o=><button className={selectedAnswer===o?feedback?.tone==="success"?"correct":"incorrect":""} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===o} key={o} onClick={()=>answer(o)}>{o}</button>)}</div>{feedback?.tone==="success"&&round<3&&<button className="semi-button" onClick={()=>{if(feedback?.tone!=="success")return;setRound((current)=>current+1);setSelectedAnswer(null);setFeedback(null)}}>Next question ↗</button>}</>}
      {stage===4&&!mastered&&!assessmentFinished&&<><AssessmentProgress current={master+1} total={2} completed={master+(feedback?.tone==="success"?1:0)} label="Reflection"/><h2 className="assessment-question">{master===0?"A semitone is…":"How many semitones make a whole tone?"}</h2><div className="semi-answers assessment-answers">{(master===0?["One small step between neighboring pitches","Two notes played together"]:["One","Two"]).map((o,i)=><button className={selectedAnswer===o?feedback?.tone==="success"?"correct":"incorrect":""} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===o} key={o} onClick={()=>{if(feedback?.tone==="success")return;setSelectedAnswer(o);if(i===0){if(master===0)showFeedback("Correct. A semitone is one small step between neighboring pitches. Continue for one last question.","success");else showFeedback("Count the two small steps that make a whole tone.","error")}else if(master===1){showFeedback("Exactly. Two semitones make a whole tone.","success");setAssessmentFinished(true)}else showFeedback("Listen to the neighboring notes again: a semitone is the smallest step.","error")}}>{o}</button>)}</div>{master===0&&feedback?.tone==="success"&&<button className="semi-button" onClick={()=>{if(feedback?.tone!=="success")return;setMaster(1);setSelectedAnswer(null);setFeedback(null)}}>One last question ↗</button>}</>}
      {stage===4&&assessmentFinished&&!mastered&&<AssessmentComplete title="You understand semitones." message="You found the smallest step between pitches and connected two small steps to a whole tone." onContinue={()=>mark(4)}/>}
      {stage===4&&mastered&&completion&&<LessonCompletion lesson="semitones" concept="semitones" {...completion}/>}
      {feedback&&!assessmentFinished&&<LessonFeedback message={feedback.message} tone={feedback.tone}/ >}{error&&<p role="status">{error}</p>}
      <div className="semi-nav"><button className="semi-button secondary" disabled={!stage} onClick={()=>go(Math.max(0,stage-1) as Stage)}>Back</button>{stage<4&&<button className="semi-button" aria-describedby={!done.has(stage)?"semitones-continue-hint":undefined} disabled={!done.has(stage)} onClick={()=>go(Math.min(4,stage+1) as Stage)}>Continue ↗</button>}</div>
      {stage<4&&!done.has(stage)&&<p id="semitones-continue-hint" className="lesson-navigation-hint">{stage===3?"Answer all four listening questions to unlock Continue.":"Complete the exploration above to unlock Continue."}</p>}
    </section><footer className="semi-footer">One small move can change the feeling.</footer>
  </main>;
}
