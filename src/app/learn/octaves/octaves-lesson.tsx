"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { completeLessonWithReward, setActiveLesson } from "@/modules/curriculum/persistent-progress";
import { LessonCompletion } from "@/components/learning/lesson-completion";
import { LessonFeedback, type LessonFeedbackTone } from "@/components/ui/lesson-feedback";
import { AssessmentComplete, AssessmentProgress } from "@/components/learning/assessment-tools";
import "./octaves.css";
import "../lesson-refinement.css";

const names = ["C", "D", "E", "F", "G", "A", "B"] as const;
const naturalSemitones = [0, 2, 4, 5, 7, 9, 11] as const;
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
  const [assessmentFinished, setAssessmentFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: LessonFeedbackTone } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [completion,setCompletion]=useState<{earnedXP:number;totalXP:number}|null>(null);
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
  const go = (index: Stage) => { setStage(index); setFeedback(null); setSelectedAnswer(null); };
  const showFeedback = (message: string, tone: LessonFeedbackTone) => setFeedback({ message, tone });
  const complete = [0, 1, 2, 3, 4].every((n) => done.has(n));
  useEffect(() => { setActiveLesson("octaves"); }, []);
  useEffect(() => { if (complete) { const result=completeLessonWithReward("octaves"); setCompletion({earnedXP:result.earnedXP,totalXP:result.progress.totalXP}); } }, [complete]);
  const challengeCorrect = (answer: string) => {
    if (feedback?.tone === "success") return;
    setSelectedAnswer(answer);
    if (answer === challenges[challenge].answer) {
      showFeedback(challenge===3?"Exactly. Apply is complete: the matching note name returns at a different pitch. Continue to the final assessment.":"You heard the connection. The matching note name returns at a different pitch.", "success");
      if (challenge === 3) mark(3);
    } else showFeedback("Listen once more. An octave keeps the note name the same while the pitch moves.", "error");
  };

  return <main className="octave-lesson">
    <header className="octave-header"><Link href="/" aria-label="ARPEGGIO home" className="octave-logo"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/learn/foundations" className="octave-back">← Music Foundations</Link></header>
    <section className="octave-intro"><p className="octave-eyebrow">Listen, compare, discover</p><h1>Understanding <em>octaves.</em></h1><p>Why does the same note name come around again?</p></section>
    <nav className="octave-progress" aria-label="Lesson progress"><div><i style={{ width: `${done.size * 20}%` }}/></div><ol>{stages.map((name,index)=><li key={name}><button aria-current={stage===index?"step":undefined} className={`${stage===index?"current":""} ${done.has(index)?"done":""}`} onClick={()=>go(index as Stage)}>{done.has(index)?"✓":`0${index+1}`}<small>{name}</small></button></li>)}</ol></nav>
    <section className="octave-stage" aria-live="polite">
      <p className="octave-eyebrow">Stage 0{stage+1} · {stages[stage]}</p>
      {stage===0&&<><AssessmentProgress current={1} total={1} completed={done.has(0)?1:0} label="Listening discovery"/><h2 className="assessment-question">Two sounds. Same name, or different?</h2><p>Listen to the pair. What feels familiar, and what feels changed?</p><div className="octave-compare"><button className={active===60?"playing":""} onClick={()=>void play(60)}>C · lower</button><button className={active===72?"playing":""} onClick={()=>void play(72)}>C · higher</button></div><button className="octave-button pale" onClick={()=>void playPair(60,72)}>Hear them together ↗</button><p>What stayed alike? What moved?</p><div className="octave-actions assessment-answers">{["They feel related, but one is higher","They sound completely unrelated"].map((answer,index)=><button key={answer} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===answer} className={`octave-answer ${selectedAnswer===answer?feedback?.tone==="success"?"correct":"incorrect":""}`} onClick={()=>{if(feedback?.tone==="success")return;setSelectedAnswer(answer);showFeedback(index===0?"Yes—the note name feels related, while the second sound is higher.":"The sounds are related: both are C, though the second is higher.",index===0?"success":"error")}}>{answer}</button>)}</div>{!done.has(0)&&<button className="octave-button" disabled={selectedAnswer!=="They feel related, but one is higher"} onClick={()=>{if(feedback?.tone!=="success")return;mark(0);showFeedback("Discovery complete. Continue when you’re ready to learn why the names repeat.","success")}}>Explore why ↗</button>}</>}
      {stage===1&&<><h2>The names come around again.</h2><p>As pitches rise, the note names repeat. C is followed by another C higher up. That span between matching names is called an <strong>octave</strong>.</p><div className="octave-visual"><span>C</span><i/><span>C</span><small>same name · higher sound</small></div><p>Try listening: the higher C has double the frequency of the lower C. That’s why it sounds brighter and higher while keeping its name.</p>{!done.has(1)&&<button className="octave-button" onClick={()=>{mark(1);showFeedback("You’ve met the octave. Continue to compare it with other notes.","success")}}>Try it yourself ↗</button>}</>}
      {stage===2&&<><h2>Move the same name through registers.</h2><p>Choose a note, then compare it with the same note above or below.</p><div className="octave-note-controls" role="group" aria-label="Choose a note name">{names.map((name,index)=>{const midi=60+naturalSemitones[index];return <button key={name} aria-pressed={root%12===midi%12} className={root%12===midi%12?"selected":""} onClick={()=>setRoot(midi)}>{name}</button>})}</div><div className="octave-keyboard" role="group" aria-label={`Natural notes across three octaves, highlighting ${midiToNote(root).spelling.replace(/\d+$/g, "")}`}>{[0,1,2].flatMap((oct)=>names.map((name,index)=>{const midi=60+12*oct+naturalSemitones[index];const matching=root%12===midi%12;return <button key={`${oct}-${name}`} aria-pressed={matching} className={`${matching?"octave-match":""} ${midi===root?"selected-register":""} ${active===midi?"playing":""}`} onClick={()=>void play(midi)}><span>{name}</span><small>{4+oct}</small></button>}))}</div><div className="octave-actions"><button className="octave-button pale" onClick={()=>void playPair(root,root+12)}>Hear lower then higher ↗</button><button className="octave-button pale" onClick={()=>void playPair(root+12,root)}>Hear higher then lower ↗</button></div>{!done.has(2)&&<button className="octave-button" onClick={()=>{mark(2);showFeedback("Experiment complete. Continue to test what you heard.","success")}}>Ready for a challenge ↗</button>}</>}
      {stage===3&&<><AssessmentProgress current={challenge+1} total={challenges.length} completed={challenge+(feedback?.tone==="success"?1:0)} label="Listening challenge"/><h2 className="assessment-question">{challenges[challenge].prompt}</h2><div className="octave-actions">{challenges[challenge].pairs.map((pair,index)=><button className="octave-button pale" key={index} onClick={()=>void playPair(pair[0],pair[1])}>Play pair {index+1} ↗</button>)}</div><div className="octave-actions assessment-answers">{challenges[challenge].options.map((answer)=><button className={`octave-answer ${selectedAnswer===answer?feedback?.tone==="success"?"correct":"incorrect":""}`} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===answer} key={answer} onClick={()=>challengeCorrect(answer)}>{answer}</button>)}</div>{feedback?.tone==="success"&&challenge<3&&<button className="octave-button" onClick={()=>{if(feedback?.tone!=="success")return;setChallenge((current)=>current+1);setSelectedAnswer(null);setFeedback(null)}}>Next challenge ↗</button>}</>}
      {stage===4&&!complete&&!assessmentFinished&&<><AssessmentProgress current={masterAnswer+1} total={2} completed={masterAnswer+(feedback?.tone==="success"?1:0)} label="Reflection"/><h2 className="assessment-question">Bring the idea together.</h2><p>{masterAnswer===0?"An octave is…":"An octave above has what relationship to the starting note’s frequency?"}</p><div className="octave-actions assessment-answers">{(masterAnswer===0?["The same note name at a higher or lower pitch","Any two notes played together"]:["Double the frequency","Half the volume"]).map((answer,index)=><button className={`octave-answer ${selectedAnswer===answer?feedback?.tone==="success"?"correct":"incorrect":""}`} disabled={feedback?.tone==="success"} aria-pressed={selectedAnswer===answer} key={answer} onClick={()=>{if(feedback?.tone==="success")return;setSelectedAnswer(answer);if(index===0){if(masterAnswer===0)showFeedback("Right. An octave keeps the note name while changing its pitch. Continue for one last thought.","success");else{showFeedback("Exactly. Doubling the frequency gives the octave above.","success");setAssessmentFinished(true)}}else showFeedback("Think about what changed in the sound: the pitch rises while the note name remains the same.","error")}}>{answer}</button>)}</div>{masterAnswer===0&&feedback?.tone==="success"&&<button className="octave-button" onClick={()=>{if(feedback?.tone!=="success")return;setMasterAnswer(1);setSelectedAnswer(null);setFeedback(null)}}>One last thought ↗</button>}</>}
      {stage===4&&assessmentFinished&&!complete&&<AssessmentComplete title="You understand octaves." message="You connected the repeating note names with their higher and lower sounds, including the doubled frequency above." onContinue={()=>mark(4)}/>}
      {stage===4&&complete&&completion&&<LessonCompletion lesson="octaves" concept="octaves" {...completion}/>}
      {feedback&&!assessmentFinished&&<LessonFeedback message={feedback.message} tone={feedback.tone}/ >}{error&&<p role="status">{error}</p>}
      <div className="octave-nav"><button className="octave-button pale" disabled={!stage} onClick={()=>go(Math.max(0,stage-1) as Stage)}>Back</button>{stage<4&&<button className="octave-button" aria-describedby={!done.has(stage)?"octaves-continue-hint":undefined} disabled={!done.has(stage)} onClick={()=>go(Math.min(4,stage+1) as Stage)}>Continue ↗</button>}</div>
      {stage<4&&!done.has(stage)&&<p id="octaves-continue-hint" className="lesson-navigation-hint">{stage===0?"Choose the answer that best describes the pair to unlock the discovery step.":stage===3?"Complete all four listening challenges to unlock Continue.":"Complete the exploration above to unlock Continue."}</p>}
    </section><footer className="octave-footer">No instrument. Just your ears.</footer>
  </main>;
}
