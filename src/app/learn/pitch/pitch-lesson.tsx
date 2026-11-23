"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { midiToNote } from "@/modules/music";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { completeLessonWithReward, setActiveLesson } from "@/modules/curriculum/persistent-progress";
import { LessonCompletion } from "@/components/learning/lesson-completion";
import { LessonFeedback, type LessonFeedbackTone } from "@/components/ui/lesson-feedback";
import { AssessmentComplete, AssessmentProgress } from "@/components/learning/assessment-tools";
import "./pitch-lesson.css";
import "../lesson-refinement.css";

const stages = ["Discover", "Understand", "Experiment", "Apply", "Master"] as const;
type StageIndex = 0 | 1 | 2 | 3 | 4;
type Exercise = { readonly prompt: string; readonly options: readonly string[]; readonly answer: string; readonly notes: readonly number[] };

function note(midi: number) {
  const result = midiToNote(midi);
  if (result.midi === undefined || result.frequency === undefined) throw new RangeError("Pitch playback requires an absolute note.");
  return {
    ...result,
    midi: result.midi,
    frequency: result.frequency,
    key: result.spelling,
    displayName: result.spelling.replace(/\d+$/, "").replace("#", "♯"),
    accidental: result.alteration === 0 ? "natural" as const : "sharp" as const,
  };
}

export default function PitchLesson() {
  const audio = useRef<PianoAudioEngine | null>(null);
  audio.current ??= new PianoAudioEngine();
  const [stage, setStage] = useState<StageIndex>(0);
  const [completed, setCompleted] = useState<Set<StageIndex>>(new Set());
  const [answer, setAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: LessonFeedbackTone } | null>(null);
  const [pitch, setPitch] = useState(60);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [masterAnswers, setMasterAnswers] = useState<string[]>([]);
  const [assessmentFinished, setAssessmentFinished] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [playing, setPlaying] = useState<number | null>(null);
  const [completion,setCompletion]=useState<{earnedXP:number;totalXP:number}|null>(null);
  const timers = useRef<number[]>([]);
  const exercises = useMemo<readonly Exercise[]>(() => [
    { prompt: "Which sound is higher?", options: ["First sound", "Second sound"], answer: "Second sound", notes: [53, 65] },
    { prompt: "Which sound is lower?", options: ["First sound", "Second sound"], answer: "First sound", notes: [58, 70] },
    { prompt: "Listen to all three. Which is highest?", options: ["First", "Second", "Third"], answer: "Second", notes: [60, 72, 65] },
    { prompt: "Which position matches the sound you hear?", options: ["Low", "Middle", "High"], answer: "High", notes: [76] },
  ], []);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    void audio.current?.dispose();
  }, []);

  async function playMidi(midi: number, duration = 0.48) {
    const engine = audio.current;
    if (!engine) return;
    try {
      await engine.enable();
      engine.stopVoices();
      const pianoNote = note(midi);
      engine.play(pianoNote, duration);
      setPlaying(midi);
      const timer = window.setTimeout(() => setPlaying((active) => active === midi ? null : active), duration * 1000);
      timers.current.push(timer);
      setSoundError("");
    } catch {
      setSoundError("Sound couldn’t start. Try pressing play again.");
    }
  }

  async function playSequence(notes: readonly number[]) {
    const engine = audio.current;
    if (!engine) return;
    try {
      await engine.enable();
      engine.stopAll();
      const revision = engine.playbackRevision;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      notes.forEach((midi, index) => {
        const timer = window.setTimeout(() => {
          if (engine.play(note(midi), 0.42, "manual", revision)) {
            setPlaying(midi);
            window.setTimeout(() => setPlaying((active) => active === midi ? null : active), 430);
          }
        }, index * 600);
        timers.current.push(timer);
      });
      setSoundError("");
    } catch {
      setSoundError("Sound couldn’t start. Try pressing play again.");
    }
  }

  function markComplete() {
    setCompleted((previous) => new Set(previous).add(stage));
  }

  function showFeedback(message: string, tone: LessonFeedbackTone) {
    setFeedback({ message, tone });
  }

  function submitAnswer(value: string, expected: string) {
    if (feedback?.tone === "success") return;
    setAnswer(value);
    if (value === expected) {
      showFeedback("That’s it. You heard the difference: the second sound is higher.", "success");
      markComplete();
    } else {
      showFeedback("Give it another listen. Compare the two sounds and try again.", "error");
    }
  }

  function chooseExercise(value: string) {
    if (feedback?.tone === "success") return;
    setAnswer(value);
    if (value === exercises[exerciseIndex].answer) {
      showFeedback(exerciseIndex===exercises.length-1?"Exactly right. Apply is complete. You compared every sound; continue to the final reflection.":"Exactly right. Notice how the sound position matches what you heard.", "success");
      if (exerciseIndex === exercises.length - 1) setCompleted((previous) => new Set(previous).add(3));
    } else showFeedback("Not quite. Listen again and compare the sounds before choosing.", "error");
  }

  function answerMaster(value: string) {
    if (feedback?.tone === "success") return;
    setAnswer(value);
    const expected = masterAnswers.length === 0 ? "How high or low a sound feels" : "Goes higher";
    if (value !== expected) {
      showFeedback("Not quite. Pitch describes how high or low a sound feels, not how loud it is.", "error");
      return;
    }
    if (masterAnswers.length === 0) {
      showFeedback("Exactly. Pitch describes how high or low a sound feels. Continue for one last reflection.", "success");
      return;
    }
    const next = [...masterAnswers, value];
    setMasterAnswers(next);
    setAnswer(null);
    showFeedback("Exactly. You’ve got it: when frequency rises, pitch rises too.", "success");
    if (next.length === 2) setAssessmentFinished(true);
  }

  const completedAll = stages.every((_, index) => completed.has(index as StageIndex));
  useEffect(() => { setActiveLesson("pitch"); }, []);
  useEffect(() => { if (completedAll) { const result=completeLessonWithReward("pitch"); setCompletion({earnedXP:result.earnedXP,totalXP:result.progress.totalXP}); } }, [completedAll]);
  const stageDone = completed.has(stage);

  function goTo(next: StageIndex) {
    setStage(next);
    setAnswer(null);
    setFeedback(null);
  }

  return <main className="pitch-lesson">
    <header className="pitch-header">
      <Link href="/" className="pitch-wordmark" aria-label="ARPEGGIO home"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link>
      <Link className="pitch-back" href="/playground">Back to exploring ↗</Link>
    </header>
    <section className="pitch-intro">
      <p className="pitch-eyebrow">A short listening journey</p>
      <h1>Understanding <em>pitch.</em></h1>
      <p>Discover how sounds move from low to high. No instrument needed.</p>
    </section>
    <nav className="pitch-progress" aria-label="Lesson progress">
      <div className="pitch-progress-track"><span style={{ width: `${((completed.size + (stageDone ? 0 : 0)) / stages.length) * 100}%` }} /></div>
      <ol>{stages.map((label, index) => <li key={label}><button aria-current={stage === index ? "step" : undefined} aria-label={`${label}${completed.has(index as StageIndex) ? ", complete" : ""}`} className={`${stage === index ? "current" : ""} ${completed.has(index as StageIndex) ? "done" : ""}`} onClick={() => goTo(index as StageIndex)}><span>{completed.has(index as StageIndex) ? "✓" : `0${index + 1}`}</span><small>{label}</small></button></li>)}</ol>
    </nav>

    <section className={`pitch-stage pitch-stage--${stage}`} key={stage} aria-live="polite">
      <div className="pitch-stage-heading"><p className="pitch-eyebrow">Stage 0{stage + 1} · {stages[stage]}</p>
        {stage === 0 && <><h2>Listen closely. Do these two sounds feel the same?</h2><p>Play them as many times as you like. Notice how they feel.</p></>}
        {stage === 1 && <><h2>Some sounds feel high. Others feel low.</h2><p>This quality of sound is called <strong>pitch</strong>.</p></>}
        {stage === 2 && <><h2>Now make the sound move.</h2><p>Slide either way. Higher, lower—this space is yours to explore.</p></>}
        {stage === 3 && <><h2>Let’s listen for what you’ve discovered.</h2><p>Compare the sounds. You can replay each question whenever you need.</p></>}
        {stage === 4 && <><h2>{completedAll ? "You understand pitch." : "One last moment of listening."}</h2><p>{completedAll ? "You’ve discovered how sound can move from low to high." : "A couple of quick reflections to bring it together."}</p></>}
      </div>

      {stage === 0 && <div className="pitch-discover"><AssessmentProgress current={1} total={1} completed={completed.has(0) ? 1 : 0} label="Listening discovery"/>
        <button className="pitch-button secondary" onClick={() => void playSequence([53, 65])}>Listen to both sounds</button>
        <div className="pitch-sound-pair">{[53, 65].map((midi, index) => <button key={midi} className={`pitch-sound ${playing === midi ? "playing" : ""}`} onClick={() => void playMidi(midi)}><span className="pitch-orbit" style={{ "--pitch-size": `${index === 0 ? 36 : 64}%` } as React.CSSProperties} /><span className="pitch-sound-label">{index === 0 ? "Sound one" : "Sound two"}</span><span className="pitch-play-icon" aria-hidden="true">▶</span></button>)}</div>
        <p className="pitch-question">Which sound feels higher?</p>
        <div className="pitch-answer-row assessment-answers">{["First sound", "Second sound"].map((option) => <button key={option} disabled={feedback?.tone === "success"} aria-pressed={answer === option} className={`pitch-choice ${answer === option ? feedback?.tone === "success" ? "correct" : feedback?.tone === "error" ? "incorrect" : "selected" : ""}`} onClick={() => submitAnswer(option, "Second sound")}>{option}</button>)}</div>
      </div>}

      {stage === 1 && <div className="pitch-understand"><div className="pitch-wave" style={{ "--wave-height": `${35 + (pitch - 48) * 1.4}px` } as React.CSSProperties} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><label className="pitch-slider-label" htmlFor="pitch-understand-slider"><span>Lower</span><span>Higher</span></label><input id="pitch-understand-slider" className="pitch-slider" type="range" min="48" max="72" value={pitch} onChange={(event) => { const next = Number(event.target.value); setPitch(next); void playMidi(next, 0.22); }} /><button className="pitch-button secondary" onClick={() => void playMidi(pitch)}>Hear this sound</button></div>}

      {stage === 2 && <div className="pitch-experiment"><div className="pitch-experiment-visual" style={{ "--pitch-size": `${18 + (pitch - 48) * 2.1}px`, "--pitch-y": `${50 - (pitch - 48) * 1.55}%` } as React.CSSProperties}><span className="pitch-dot" /><span className="pitch-visual-line" /></div><label className="pitch-slider-label" htmlFor="pitch-experiment-slider"><span>Lower</span><span>Higher</span></label><input id="pitch-experiment-slider" className="pitch-slider" type="range" min="48" max="72" value={pitch} onChange={(event) => { const next = Number(event.target.value); setPitch(next); void playMidi(next, 0.2); }} /><button className="pitch-button secondary" onClick={() => void playMidi(pitch)}>Play this pitch</button></div>}

      {stage === 3 && <div className="pitch-exercise"><AssessmentProgress current={exerciseIndex + 1} total={exercises.length} completed={exerciseIndex + (feedback?.tone === "success" ? 1 : 0)} label="Listening question"/><p className="pitch-question">{exercises[exerciseIndex].prompt}</p><button className="pitch-button secondary" onClick={() => void playSequence(exercises[exerciseIndex].notes)}>Listen to all</button><div className="pitch-exercise-sounds">{exercises[exerciseIndex].notes.map((midi, index) => <button key={`${exerciseIndex}-${midi}-${index}`} className={`pitch-sound compact ${playing === midi ? "playing" : ""}`} onClick={() => void playMidi(midi)}><span className="pitch-orbit" style={{ "--pitch-size": `${28 + (midi - 48) * 1.3}%` } as React.CSSProperties} /><span>{exercises[exerciseIndex].notes.length > 1 ? `Sound ${index + 1}` : "Play sound"}</span><span className="pitch-play-icon" aria-hidden="true">▶</span></button>)}</div><div className="pitch-answer-row assessment-answers">{exercises[exerciseIndex].options.map((option) => <button key={option} disabled={feedback?.tone === "success"} aria-pressed={answer === option} className={`pitch-choice ${answer === option ? feedback?.tone === "success" ? "correct" : feedback?.tone === "error" ? "incorrect" : "selected" : ""}`} onClick={() => chooseExercise(option)}>{option}</button>)}</div>{feedback?.tone === "success" && exerciseIndex < exercises.length - 1 && <button className="pitch-button" onClick={() => { if (feedback?.tone !== "success") return; setExerciseIndex((index) => index + 1); setAnswer(null); setFeedback(null); }}>Next listening question ↗</button>}</div>}

      {stage === 4 && !completedAll && !assessmentFinished && <div className="pitch-mastery"><AssessmentProgress current={Math.min(masterAnswers.length + 1, 2)} total={2} completed={masterAnswers.length + (feedback?.tone === "success" ? 1 : 0)} label="Reflection"/><p className="pitch-question">{masterAnswers.length === 0 ? "Pitch helps us describe…" : "When a sound’s frequency goes up, its pitch…"}</p><div className="pitch-answer-row assessment-answers">{(masterAnswers.length === 0 ? ["How high or low a sound feels", "How loud a sound is"] : ["Goes higher", "Gets louder"]).map((option) => <button key={option} disabled={feedback?.tone === "success"} aria-pressed={answer === option} className={`pitch-choice ${answer === option ? feedback?.tone === "success" ? "correct" : feedback?.tone === "error" ? "incorrect" : "" : ""}`} onClick={() => answerMaster(option)}>{option}</button>)}</div>{masterAnswers.length === 0&&answer==="How high or low a sound feels"&&feedback?.tone==="success"&&<button className="pitch-button" onClick={()=>{if(feedback?.tone!=="success")return;setMasterAnswers([answer]);setAnswer(null);setFeedback(null)}}>One last reflection ↗</button>}</div>}
      {stage === 4 && assessmentFinished && !completedAll && <AssessmentComplete title="You understand pitch." message="You brought together what you heard about high and low sounds, and how pitch changes." onContinue={() => setCompleted((previous) => new Set(previous).add(4))}/>}

      {stage === 4 && completedAll && completion && <LessonCompletion lesson="pitch" concept="pitch" {...completion} />}

      {feedback && !assessmentFinished && <div className="pitch-feedback"><LessonFeedback message={feedback.message} tone={feedback.tone}/></div>}
      {soundError && <p className="pitch-audio-error" role="status">{soundError}</p>}
      {(stage === 1 || stage === 2) && !stageDone && <button className="pitch-button" onClick={markComplete}>{stage === 1 ? "I understand ↗" : "I’m ready to continue ↗"}</button>}
      {(stage === 1 || stage === 2) && stageDone && <p className="lesson-stage-ready">Stage complete. Continue when you’re ready.</p>}
      {stage !== 4 && <div className="pitch-navigation"><button className="pitch-button secondary" onClick={() => goTo(Math.max(0, stage - 1) as StageIndex)} disabled={stage === 0}>Back</button><button className="pitch-button" aria-describedby={!stageDone?"pitch-continue-hint":undefined} onClick={() => goTo(Math.min(4, stage + 1) as StageIndex)} disabled={!stageDone}>Continue ↗</button></div>}
      {stage !== 4 && !stageDone && <p id="pitch-continue-hint" className="lesson-navigation-hint">{stage===0?"Choose the higher sound to unlock Continue.":stage===3?"Answer all four listening questions to unlock Continue.":"Complete the action above to unlock Continue."}</p>}
    </section>
    <p className="pitch-footer">No instrument. Just your ears.</p>
  </main>;
}
