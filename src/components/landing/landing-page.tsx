"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/ui/ui.css";
import { ListeningLine, OpeningListeningLine } from "./listening-line";
import { SoundHalo } from "./sound-halo";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { blackPianoKeys, findPianoNote, whitePianoKeys, type PianoNote } from "@/modules/music/piano";
import "./landing.css";

type PianoProps = {
  autoDemo?: boolean;
  demoStopped?: boolean;
  audioEngine: PianoAudioEngine;
  onNotePlayed: (note: PianoNote, source: "manual" | "demo") => void;
  onDemoResume?: () => void;
};

const demoPhrase = ["C4", "E4", "G4", "E4", "D4", "G4", "C5"];

function Piano({ autoDemo = false, demoStopped = false, audioEngine, onNotePlayed, onDemoResume }: PianoProps) {
  const demoTimer = useRef<number | null>(null);
  const phraseTimer = useRef<number | null>(null);
  const activeTimer = useRef<number | null>(null);
  const demoIndex = useRef(0);
  const phraseRun = useRef(0);
  const phraseStarting = useRef(false);
  const autoAttempted = useRef(false);
  const manualRun = useRef(0);
  const manualInteraction = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState("C");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [phrasePlaying, setPhrasePlaying] = useState(false);
  const [audioPending, setAudioPending] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => () => {
    if (activeTimer.current !== null) window.clearTimeout(activeTimer.current);
  }, []);

  const showNote = useCallback((note: PianoNote, source: "manual" | "demo") => {
    if (activeTimer.current !== null) window.clearTimeout(activeTimer.current);
    setActive(note.key);
    setLastNote(note.displayName);
    onNotePlayed(note, source);
    activeTimer.current = window.setTimeout(() => {
      setActive((current) => current === note.key ? null : current);
      activeTimer.current = null;
    }, 260);
  }, [onNotePlayed]);

  const stopDemo = useCallback(() => {
    manualInteraction.current = true;
    if (demoTimer.current !== null) {
      window.clearTimeout(demoTimer.current);
      demoTimer.current = null;
    }
  }, []);

  const clearPhraseTimer = useCallback(() => {
    if (phraseTimer.current !== null) {
      window.clearTimeout(phraseTimer.current);
      phraseTimer.current = null;
    }
  }, []);

  const cancelPhrase = useCallback((stopAllVoices = false) => {
    phraseRun.current += 1;
    phraseStarting.current = false;
    clearPhraseTimer();
    if (stopAllVoices) audioEngine.stopAll();
    else audioEngine.stopVoices("phrase");
    setPhrasePlaying(false);
    setAudioPending(false);
  }, [audioEngine, clearPhraseTimer]);

  const startPhrase = useCallback(async (autoplay = false) => {
    if (phraseStarting.current && autoplay) return;
    phraseStarting.current = true;
    if (demoTimer.current !== null) {
      window.clearTimeout(demoTimer.current);
      demoTimer.current = null;
    }
    clearPhraseTimer();
    audioEngine.stopAll();
    const run = ++phraseRun.current;
    const audioRevision = audioEngine.playbackRevision;
    setAudioError(null);
    setAudioPending(!autoplay);

    try {
      if (autoplay) {
        if (!await audioEngine.tryAutoplay()) {
          if (run === phraseRun.current) {
            phraseStarting.current = false;
            setAudioPending(false);
          }
          return;
        }
      } else {
        await audioEngine.enable();
      }
    } catch (error) {
      if (run !== phraseRun.current || audioRevision !== audioEngine.playbackRevision) return;
      phraseStarting.current = false;
      setAudioPending(false);
      setPhrasePlaying(false);
      setAudioError(error instanceof Error ? error.message : "Sound could not be started.");
      return;
    }

    if (run !== phraseRun.current || audioRevision !== audioEngine.playbackRevision) return;
    phraseStarting.current = false;
    setAudioEnabled(true);
    setAudioPending(false);
    setPhrasePlaying(true);
    manualInteraction.current = false;
    onDemoResume?.();
    demoIndex.current = 0;

    const playStep = () => {
      if (run !== phraseRun.current) return;
      if (audioRevision !== audioEngine.playbackRevision) return;
      if (document.hidden) {
        cancelPhrase();
        return;
      }

      const note = findPianoNote(demoPhrase[demoIndex.current]);
      if (!note || !audioEngine.play(note, 0.46, "phrase", audioRevision)) {
        audioEngine.stopVoices("phrase");
        setPhrasePlaying(false);
        setAudioError("Sound stopped unexpectedly. Try playing the melody again.");
        return;
      }

      showNote(note, "demo");
      demoIndex.current += 1;
      const phraseComplete = demoIndex.current === demoPhrase.length;
      phraseTimer.current = window.setTimeout(() => {
        phraseTimer.current = null;
        if (run !== phraseRun.current) return;
        if (phraseComplete) demoIndex.current = 0;
        playStep();
      }, phraseComplete ? 1_650 : 520);
    };

    playStep();
  }, [audioEngine, cancelPhrase, clearPhraseTimer, onDemoResume, showNote]);

  const play = useCallback(async (note: PianoNote) => {
    stopDemo();
    cancelPhrase(true);
    const request = ++manualRun.current;
    const audioRevision = audioEngine.playbackRevision;
    setAudioError(null);
    showNote(note, "manual");

    try {
      await audioEngine.enable();
      if (request !== manualRun.current || audioRevision !== audioEngine.playbackRevision) return;
      setAudioEnabled(true);
      if (!audioEngine.play(note, 0.46, "manual", audioRevision)) throw new Error("Sound could not be started.");
    } catch (error) {
      if (request !== manualRun.current || audioRevision !== audioEngine.playbackRevision) return;
      setAudioError(error instanceof Error ? error.message : "Sound could not be started.");
    }
  }, [audioEngine, cancelPhrase, showNote, stopDemo]);

  const togglePhrase = useCallback(() => {
    if (audioPending) return;
    if (phrasePlaying) cancelPhrase();
    else void startPhrase();
  }, [audioPending, cancelPhrase, phrasePlaying, startPhrase]);

  useEffect(() => {
    if (!autoDemo || autoAttempted.current) return;
    autoAttempted.current = true;
    void startPhrase(true);
  }, [autoDemo, startPhrase]);

  useEffect(() => {
    if (!autoDemo || audioEnabled) return;

    const activateOnGesture = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".piano-key, .piano-sound-toggle")) return;
      void startPhrase(false);
    };

    document.addEventListener("pointerdown", activateOnGesture, true);
    document.addEventListener("keydown", activateOnGesture, true);
    return () => {
      document.removeEventListener("pointerdown", activateOnGesture, true);
      document.removeEventListener("keydown", activateOnGesture, true);
    };
  }, [audioEnabled, autoDemo, startPhrase]);

  useEffect(() => {
    if (!autoDemo || !demoStopped || !phrasePlaying) return;
    cancelPhrase();
  }, [autoDemo, cancelPhrase, demoStopped, phrasePlaying]);

  useEffect(() => {
    if (!autoDemo || demoStopped || reducedMotion || phrasePlaying) return;

    let disposed = false;
    const clearTimer = () => {
      if (demoTimer.current !== null) {
        window.clearTimeout(demoTimer.current);
        demoTimer.current = null;
      }
    };
    const schedule = (delay: number) => {
      clearTimer();
      if (disposed || manualInteraction.current || document.hidden) return;
      demoTimer.current = window.setTimeout(() => {
        demoTimer.current = null;
        if (disposed || manualInteraction.current || document.hidden) return;
        const key = demoPhrase[demoIndex.current];
        const note = findPianoNote(key);
        if (!note) return;
        showNote(note, "demo"); // The automatic invitation is visual only; it never creates audio.
        demoIndex.current = (demoIndex.current + 1) % demoPhrase.length;
        schedule(demoIndex.current === 0 ? 1_650 : 520);
      }, delay);
    };
    const onVisibilityChange = () => {
      if (document.hidden) clearTimer();
      else schedule(280);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(700);
    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autoDemo, demoStopped, phrasePlaying, reducedMotion, showNote]);

  useEffect(() => {
    if (!autoDemo || !phrasePlaying) return;
    const stopWhenHidden = () => {
      if (document.hidden) cancelPhrase();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, [autoDemo, cancelPhrase, phrasePlaying]);

  return (
    <div className={`piano-shell ${active ? "has-active-note" : ""}`} data-audio-enabled={audioEnabled} data-phrase-playing={phrasePlaying}>
      <div className="piano-topline">
        <span className="piano-invitation">A note to begin</span>
        {autoDemo && (
          <button
            className="piano-sound-toggle"
            type="button"
            aria-pressed={phrasePlaying}
            aria-busy={audioPending}
            disabled={audioPending}
            aria-label={audioPending ? "Starting piano sound" : !audioEnabled ? "Play melody with sound" : phrasePlaying ? "Pause melody" : "Replay melody"}
            title={!audioEnabled ? "Play melody with sound" : phrasePlaying ? "Pause melody" : "Replay melody"}
            onClick={togglePhrase}
          >
            <span aria-hidden="true">{audioPending ? "…" : phrasePlaying ? "Ⅱ" : audioEnabled ? "↻" : "♫"}</span>
          </button>
        )}
        <span className="now-playing" aria-live="polite"><i /> Playing <b key={lastNote}>{lastNote}</b></span>
      </div>
      <div className="keyboard" role="group" aria-label="Playable piano, one octave">
        <div className="white-keys">
          {whitePianoKeys.map((note) => (
            <button
              key={note.key}
              className={`piano-key piano-key--white ${active === note.key ? "is-active" : ""}`}
              aria-label={`Play ${note.displayName} ${note.key.endsWith("5") ? "5" : "4"}`}
              data-note={note.key}
              data-midi={note.midi}
              data-frequency={note.frequency}
              onClick={() => void play(note)}
            ><span>{note.displayName}</span></button>
          ))}
        </div>
        <div className="black-keys">
          {blackPianoKeys.map((note) => (
            <button
              key={note.key}
              className={`piano-key piano-key--black ${active === note.key ? "is-active" : ""}`}
              style={{ gridColumn: (note.afterWhiteKeyIndex ?? 0) + 1 }}
              aria-label={`Play ${note.displayName.replace("♯", " sharp ")} 4`}
              data-note={note.key}
              data-midi={note.midi}
              data-frequency={note.frequency}
              onClick={() => void play(note)}
            ><span>{note.displayName}</span></button>
          ))}
        </div>
      </div>
      <div className="piano-hint" role={audioError ? "status" : undefined}>
        <span>{audioError ?? (audioPending ? "Starting sound…" : autoDemo && phrasePlaying && audioEnabled ? "Listen to the melody." : autoDemo && !demoStopped && !manualInteraction.current ? "A little phrase, played in silence." : "Tap a key and listen.")}</span>
      </div>
    </div>
  );
}

const stages = [
  ["01", "Discover", "Hear a new sound, with no rules to memorise."],
  ["02", "Understand", "See why it sounds the way it does."],
  ["03", "Experiment", "Move notes around. Follow your curiosity."],
  ["04", "Apply", "Put the idea to work in a musical moment."],
  ["05", "Master", "Let understanding become second nature."],
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoStopped, setDemoStopped] = useState(false);
  const [notePulse, setNotePulse] = useState<{ note: PianoNote; sequence: number } | null>(null);
  const pulseSequence = useRef(0);
  const audioEngineRef = useRef<PianoAudioEngine | null>(null);
  const audioDisposeTimer = useRef<number | null>(null);
  audioEngineRef.current ??= new PianoAudioEngine();
  const audioEngine = audioEngineRef.current;
  const pageRef = useRef<HTMLElement>(null);
  const openingRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLElement>(null);

  const handleNotePlayed = useCallback((note: PianoNote, source: "manual" | "demo") => {
    pulseSequence.current += 1;
    setNotePulse({ note, sequence: pulseSequence.current });
    if (source === "manual") setDemoStopped(true);
  }, []);

  const resumeDemo = useCallback(() => setDemoStopped(false), []);

  useEffect(() => {
    if (audioDisposeTimer.current !== null) {
      window.clearTimeout(audioDisposeTimer.current);
      audioDisposeTimer.current = null;
    }
    return () => {
      audioDisposeTimer.current = window.setTimeout(() => {
        audioDisposeTimer.current = null;
        void audioEngine.dispose();
      }, 0);
    };
  }, [audioEngine]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = page.querySelectorAll<HTMLElement>(".reveal-section");
    if (!("IntersectionObserver" in window)) return;

    page.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const updateVisibility = () => page.classList.toggle("is-document-hidden", document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return <main className="landing-page" id="top" ref={pageRef}>
    <header className="landing-nav wrap"><Link className="landing-wordmark" href="#top" aria-label="ARPEGGIO home"><Image className="landing-logo" src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}><span/><span/></button><nav id="landing-navigation" className={menuOpen ? "landing-links is-open" : "landing-links"} aria-label="Main navigation"><a href="#approach" onClick={() => setMenuOpen(false)}>How it works</a><a href="#paths" onClick={() => setMenuOpen(false)}>Learning paths</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a className="login-link" href="#footer">Log in</a><a className="nav-cta" href="#piano">Start learning <span>↗</span></a></nav></header>

    <div className="opening-composition" ref={openingRef}>
      <section className="landing-hero wrap"><div className="hero-editorial"><h1>Understand<br/>music<span className="hero-comma">,</span><br/><em>naturally.</em></h1><p>Discover the language of music through sound, experimentation and play. No overwhelming theory. Just a better way to learn.</p><div className="hero-ctas"><a className="cta-dark" href="#piano">Start learning <span>↗</span></a><a className="cta-text" href="#approach">Explore how it works <span>↓</span></a></div></div><div className="hero-visual"><SoundHalo pulse={notePulse}/><Piano autoDemo demoStopped={demoStopped} audioEngine={audioEngine} onNotePlayed={handleNotePlayed} onDemoResume={resumeDemo}/><div className="visual-caption"><span>Every note has a feeling.</span><span>Start with one.</span></div><div className="hero-staff" aria-hidden="true"><span/><span/><span/><span/><span/></div></div></section>

      <section className="manifesto" id="about" ref={manifestoRef}><div className="wrap manifesto-inner reveal-section"><span className="eyebrow">A different kind of music theory</span><h2>Music isn’t meant to be memorised.<br/><em>It’s meant to be understood.</em></h2><p>Traditional theory can feel like learning a language from a dictionary. ARPEGGIO lets you hear the idea, see its shape, and discover the words when you’re ready.</p></div></section>
      <OpeningListeningLine containerRef={openingRef} manifestoRef={manifestoRef} pulse={notePulse} />
    </div>

    <section className="approach-section wrap reveal-section" id="approach"><div className="section-intro"><span className="eyebrow">A natural way to learn</span><h2>From first listen<br/>to <em>your own music.</em></h2><p>Every step starts with experience. The theory follows when it makes sense.</p></div><div className="stage-list"><ListeningLine variant="stage-track" className="stage-listening-line" />{stages.map(([number, title, description], index) => <article className={`stage-row stage-row-${index + 1}`} key={number}><span className="stage-number">{number}</span><h3>{title}</h3><p>{description}</p><span className="stage-mark" aria-hidden="true">{index === 0 ? "◖" : index === 1 ? "⌁" : index === 2 ? "＋" : index === 3 ? "↗" : "✳"}</span></article>)}</div></section>

    <section className="try-section reveal-section" id="piano"><div className="wrap try-inner"><div className="try-copy"><span className="eyebrow">Your turn</span><h2>One octave.<br/><em>A thousand ideas.</em></h2><p>No lesson. No wrong answers. Tap a key and notice how it feels. Try a few together in a row.</p></div><div className="try-demo"><ListeningLine variant="piano-bridge" className="piano-listening-line" pulse={notePulse}/><Piano audioEngine={audioEngine} onNotePlayed={handleNotePlayed}/><div className="demo-caption"><span>Listen for the note that feels like home.</span><span>Your ear already knows.</span></div></div></div></section>

    <section className="paths-section wrap reveal-section" id="paths"><div className="paths-heading"><div><span className="eyebrow">Choose a place to begin</span><h2>Three paths.<br/><em>Endless ways in.</em></h2></div><p>Start wherever your curiosity takes you. These first learning worlds are being shaped around listening, discovery and making music.</p></div><div className="path-collection"><ListeningLine variant="path-branch" className="path-listening-line" /><article className="path-panel path-foundations"><div className="path-art foundation-art"><span className="foundation-circle circle-a"/><span className="foundation-circle circle-b"/><span className="foundation-circle circle-c"/><b>1</b></div><div className="path-copy"><h3>Foundations</h3><p>Get to know the notes, hear how they relate, and find your way around the musical landscape.</p><a href="#piano">A good first step <span>↗</span></a></div></article><article className="path-panel path-rhythm"><div className="path-art rhythm-art"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div><div className="path-copy"><h3>Rhythm</h3><p>Explore the patterns that make music move. Find the beat, then make it your own.</p><a href="#piano">Feel the rhythm <span>↗</span></a></div></article><article className="path-panel path-intervals"><div className="path-art interval-art"><span className="interval-dot dot-a"/><span className="interval-dot dot-b"/><span className="interval-line"/><span className="interval-label">↑</span></div><div className="path-copy"><h3>Intervals</h3><p>Notice the space between notes. Learn to recognise the feeling of moving from one to another.</p><a href="#piano">Hear the difference <span>↗</span></a></div></article></div></section>

    <section className="closing-section reveal-section"><div className="wrap closing-inner"><span className="eyebrow">Your musical journey starts here</span><h2>Your next idea<br/>is one note <em>away.</em></h2><a className="cta-dark" href="#piano">Start learning <span>↗</span></a><ListeningLine variant="cta-resolution" className="closing-listening-line" /><div className="closing-note" aria-hidden="true">♪</div></div></section>

    <footer className="landing-footer wrap" id="footer"><div className="footer-top"><Link className="landing-wordmark" href="#top"><Image className="landing-logo" src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" /></Link><p>Understand music.<br/>Don’t just memorise it.</p><nav aria-label="Footer navigation"><a href="#approach">How it works</a><a href="#paths">Learning paths</a><a href="#about">About</a></nav><nav aria-label="Information links"><a href="mailto:hello@arpeggio.example">Contact</a><a href="#footer">Privacy</a><a href="#footer">Terms</a></nav></div><div className="footer-bottom"><span>© ARPEGGIO · MADE FOR THE LOVE OF SOUND</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
