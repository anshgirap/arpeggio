"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { PianoAudioEngine } from "@/modules/music/audio-engine";
import { midiToNote } from "@/modules/music/notes/note";
import { getMusicInsights, interpretProgram, validateProgram, durationSeconds } from "@/modules/music-sandbox/interpreter";
import { readSavedProjects, writeSavedProjects } from "@/modules/music-sandbox/persistence";
import { BLOCK_DEFINITIONS, CATEGORIES, createBlock, createStarterProjects, type BlockDefinition, type SandboxBlock, type SandboxBlockConfig, type SandboxBlockType, type SandboxCategory, type SandboxProject } from "@/modules/music-sandbox/types";
import type { PianoNote } from "@/modules/music/piano";
import "./sandbox.css";

type DragPayload = { kind: "new"; type: SandboxBlockType } | { kind: "move"; id: string; parentId: string | null };
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const DURATION_OPTIONS = [0.25, 1 / 3, 0.5, 2 / 3, 1, 1.5, 2, 3, 4];
const SCALE_OPTIONS = [{ id: "major", name: "Major" }, { id: "naturalMinor", name: "Natural minor" }, { id: "majorPentatonic", name: "Major pentatonic" }, { id: "minorPentatonic", name: "Minor pentatonic" }, { id: "blues", name: "Blues" }] as const;
const CHORD_OPTIONS = [{ id: "major", name: "Major" }, { id: "minor", name: "Minor" }, { id: "diminished", name: "Diminished" }, { id: "augmented", name: "Augmented" }] as const;

function noteObject(midi: number): PianoNote {
  const note = midiToNote(midi);
  return { ...note, midi, frequency: note.frequency!, key: note.spelling, displayName: note.spelling.replace(/-?\d+$/, "").replace("#", "♯"), accidental: note.alteration === 0 ? "natural" : "sharp" };
}

function updateBlock(blocks: SandboxBlock[], id: string, update: (block: SandboxBlock) => SandboxBlock): SandboxBlock[] {
  return blocks.map((block) => block.id === id ? update(block) : { ...block, ...(block.children ? { children: updateBlock(block.children, id, update) } : {}) });
}

function removeBlock(blocks: SandboxBlock[], id: string): { blocks: SandboxBlock[]; found?: SandboxBlock } {
  for (let index = 0; index < blocks.length; index += 1) {
    if (blocks[index]?.id === id) return { blocks: blocks.filter((_, itemIndex) => itemIndex !== index), found: blocks[index] };
    const block = blocks[index];
    if (block?.children) {
      const result = removeBlock(block.children, id);
      if (result.found) return { blocks: blocks.map((item, itemIndex) => itemIndex === index ? { ...item, children: result.blocks } : item), found: result.found };
    }
  }
  return { blocks };
}

function insertBlock(blocks: SandboxBlock[], parentId: string | null, index: number, block: SandboxBlock): SandboxBlock[] {
  if (!parentId) { const next = [...blocks]; next.splice(Math.max(0, Math.min(index, next.length)), 0, block); return next; }
  return blocks.map((item) => item.id === parentId ? { ...item, children: [...(item.children ?? []).slice(0, index), block, ...(item.children ?? []).slice(index)] } : { ...item, ...(item.children ? { children: insertBlock(item.children, parentId, index, block) } : {}) });
}

function containsId(block: SandboxBlock, id: string): boolean { return block.id === id || Boolean(block.children?.some((child) => containsId(child, id))); }
function indexOfBlock(blocks: SandboxBlock[], id: string): number | undefined { const found = blocks.findIndex((block) => block.id === id); if (found >= 0) return found; for (const block of blocks) { if (block.children) { const child = indexOfBlock(block.children, id); if (child !== undefined) return child; } } return undefined; }
function countBlocks(blocks: SandboxBlock[]): number { return blocks.reduce((sum, block) => sum + 1 + countBlocks(block.children ?? []), 0); }

function durationLabel(beats: number): string { return beats === 1 / 3 ? "⅓ beat" : beats === 2 / 3 ? "⅔ beat" : `${beats} ${beats === 1 ? "beat" : "beats"}`; }

function Control({ label, value, options, onChange, disabled }: { label: string; value: string | number; options: readonly { id: string | number; name: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="sandbox-control"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

function BlockConfiguration({ block, update, disabled }: { block: SandboxBlock; update: (config: SandboxBlockConfig) => void; disabled: boolean }) {
  const config = block.config;
  const noteControl = <Control label="Note" value={config.note ?? "C"} disabled={disabled} options={NOTES.map((note) => ({ id: note, name: note.replace("#", "♯") }))} onChange={(note) => update({ ...config, note })} />;
  const octaveControl = <Control label="Octave" value={config.octave ?? 4} disabled={disabled} options={OCTAVES.map((octave) => ({ id: octave, name: `${octave}` }))} onChange={(octave) => update({ ...config, octave: Number(octave) })} />;
  const durationControl = <Control label="Length" value={config.beats ?? 1} disabled={disabled} options={DURATION_OPTIONS.map((beats) => ({ id: beats, name: durationLabel(beats) }))} onChange={(beats) => update({ ...config, beats: Number(beats) })} />;
  if (["play-note", "play-chord", "custom-chord", "ascending", "descending", "scale"].includes(block.type)) return <div className="sandbox-block-controls">{noteControl}{octaveControl}{block.type === "play-chord" ? <Control label="Sound" value={config.quality ?? "major"} disabled={disabled} options={CHORD_OPTIONS} onChange={(quality) => update({ ...config, quality: quality as SandboxBlockConfig["quality"] })} /> : null}{block.type === "custom-chord" ? [0, 1].map((toneIndex) => <Control key={toneIndex} label={`Tone ${toneIndex + 2}`} value={config.customIntervals?.[toneIndex] ?? (toneIndex === 0 ? 4 : 7)} disabled={disabled} options={Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `${index + 1} higher` }))} onChange={(value) => { const intervals = [...(config.customIntervals ?? [4, 7])]; intervals[toneIndex] = Number(value); update({ ...config, customIntervals: intervals }); }} />) : null}{["ascending", "descending", "scale"].includes(block.type) ? <Control label="Pattern" value={config.scale ?? "major"} disabled={disabled} options={SCALE_OPTIONS} onChange={(scale) => update({ ...config, scale: scale as SandboxBlockConfig["scale"] })} /> : null}</div>;
  if (block.type === "random-note") return <div className="sandbox-block-controls">{octaveControl}</div>;
  if (block.type === "change-octave") return <div className="sandbox-block-controls">{octaveControl}</div>;
  if (["wait", "note-duration"].includes(block.type)) return <div className="sandbox-block-controls">{durationControl}</div>;
  if (block.type === "repeat") return <div className="sandbox-block-controls"><Control label="Times" value={config.count ?? 2} disabled={disabled} options={[2, 3, 4, 6, 8, 12, 16].map((count) => ({ id: count, name: `${count} times` }))} onChange={(count) => update({ ...config, count: Number(count) })} /></div>;
  return null;
}

function BlockCard({ block, index, siblingCount, parentId, activeId, disabled, onUpdate, onDelete, onDuplicate, onMove, onAdd, onDrop, onDragStart, onDragOver, onDragLeave, draggingOver }: {
  block: SandboxBlock; index: number; siblingCount: number; parentId: string | null; activeId: string | null; disabled: boolean;
  onUpdate: (id: string, config: SandboxBlockConfig) => void; onDelete: (id: string) => void; onDuplicate: (block: SandboxBlock, parentId: string | null, index: number) => void;
  onMove: (id: string, parentId: string | null, direction: -1 | 1) => void;
  onAdd: (type: SandboxBlockType, parentId: string | null, index?: number) => void;
  onDrop: (event: DragEvent, parentId: string | null, index: number) => void; onDragStart: (event: DragEvent, block: SandboxBlock, parentId: string | null) => void;
  onDragOver: (event: DragEvent, targetId: string) => void; onDragLeave: () => void; draggingOver: string | null;
}) {
  const definition = BLOCK_DEFINITIONS.find((item) => item.type === block.type)!;
  const container = block.type === "repeat" || block.type === "forever" || block.type === "sequence";
  const childTarget = `${block.id}:children`;
  return <div className={`sandbox-block-shell ${draggingOver === block.id ? "is-drop-target" : ""}`} data-active={activeId === block.id ? "true" : undefined}>
    <div className={`sandbox-block sandbox-block--${definition.color} ${activeId === block.id ? "is-playing" : ""}`} draggable={!disabled} onDragStart={(event) => onDragStart(event, block, parentId)} onDragOver={(event) => onDragOver(event, block.id)} onDragLeave={onDragLeave} onDrop={(event) => onDrop(event, parentId, index)}>
      <div className="sandbox-block-heading"><span className="sandbox-block-grip" aria-hidden="true">⠿</span><div><strong>{definition.label}</strong><p>{definition.description}</p></div><div className="sandbox-block-actions"><button type="button" disabled={disabled || index === 0} aria-label={`Move ${definition.label} up`} onClick={() => onMove(block.id, parentId, -1)}>↑</button><button type="button" disabled={disabled || index === siblingCount - 1} aria-label={`Move ${definition.label} down`} onClick={() => onMove(block.id, parentId, 1)}>↓</button><button type="button" disabled={disabled} aria-label={`Duplicate ${definition.label}`} onClick={() => onDuplicate(block, parentId, index + 1)}>＋</button><button type="button" disabled={disabled} aria-label={`Remove ${definition.label}`} onClick={() => onDelete(block.id)}>×</button></div></div>
      <BlockConfiguration block={block} update={(config) => onUpdate(block.id, config)} disabled={disabled} />
      {container ? <div className={`sandbox-nested ${draggingOver === childTarget ? "is-drop-target" : ""}`} onDragOver={(event) => onDragOver(event, childTarget)} onDragLeave={onDragLeave} onDrop={(event) => onDrop(event, block.id, block.children?.length ?? 0)}>
        <span className="sandbox-nested-label">{block.type === "sequence" ? "Run these blocks when you press Play" : "Repeat these blocks"}</span>
        {block.children?.length ? block.children.map((child, childIndex) => <BlockCard key={child.id} block={child} index={childIndex} siblingCount={block.children!.length} parentId={block.id} activeId={activeId} disabled={disabled} onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate} onMove={onMove} onAdd={onAdd} onDrop={onDrop} onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} draggingOver={draggingOver} />) : <p className="sandbox-nested-empty">Drop blocks here, or add one from the library.</p>}
        <button type="button" className="sandbox-nested-add" disabled={disabled} onClick={() => onAdd("play-note", block.id, block.children?.length ?? 0)}>＋ Add a note inside</button>
      </div> : null}
    </div>
    <span className="sandbox-connector" aria-hidden="true" />
  </div>;
}

export function Sandbox() {
  const idCounter = useRef(0);
  const newId = useCallback((prefix = "block") => `${prefix}-${++idCounter.current}`, []);
  const starters = useMemo(() => createStarterProjects((type) => newId(`starter-${type}`)), [newId]);
  const [project, setProject] = useState<SandboxProject>({ version: 1, name: "My music", bpm: 100, blocks: [] });
  const [saved, setSaved] = useState<SandboxProject[]>([]);
  const [category, setCategory] = useState<SandboxCategory>("Notes");
  const [saveName, setSaveName] = useState("My music");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [position, setPosition] = useState(0);
  const [positionLabel, setPositionLabel] = useState("Ready when you are");
  const audioRef = useRef<PianoAudioEngine | null>(null);
  const runIdRef = useRef(0);
  const timersRef = useRef<Set<number>>(new Set());
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const pendingRef = useRef(false);
  const activeEventRef = useRef(0);

  useEffect(() => { setSaved(readSavedProjects()); }, []);
  useEffect(() => () => { runIdRef.current += 1; timersRef.current.forEach((timer) => window.clearTimeout(timer)); if (intervalRef.current !== null) window.clearInterval(intervalRef.current); void audioRef.current?.dispose(); }, []);

  const validation = useMemo(() => validateProgram(project.blocks), [project.blocks]);
  const plan = useMemo(() => { try { return validation.valid && project.blocks.length ? interpretProgram(project.blocks, { random: () => 0.5 }) : undefined; } catch { return undefined; } }, [project.blocks, validation.valid]);
  const insights = useMemo(() => getMusicInsights(project.blocks, plan), [project.blocks, plan]);
  const definitions = BLOCK_DEFINITIONS.filter((definition) => definition.category === category);
  const updateConfig = (id: string, config: SandboxBlockConfig) => setProject((current) => ({ ...current, blocks: updateBlock(current.blocks, id, (block) => ({ ...block, config })) }));
  const addNew = (type: SandboxBlockType, parentId: string | null = null, index?: number) => {
    setProject((current) => ({ ...current, blocks: insertBlock(current.blocks, parentId, index ?? (parentId ? findBlock(current.blocks, parentId)?.children?.length ?? 0 : current.blocks.length), createBlock(type, newId())) }));
    setNotice("Block added"); setError("");
  };
  const onDragStart = (event: DragEvent, payload: DragPayload) => { event.dataTransfer.setData("application/x-arpeggio-block", JSON.stringify(payload)); event.dataTransfer.effectAllowed = payload.kind === "move" ? "move" : "copy"; };
  const handleBlockDrag = (event: DragEvent, block: SandboxBlock, parentId: string | null) => onDragStart(event, { kind: "move", id: block.id, parentId });
  const onDragOver = (event: DragEvent, target: string) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; setDraggingOver(target); };
  const handleDrop = (event: DragEvent, targetParentId: string | null, targetIndex: number) => {
    event.preventDefault(); event.stopPropagation(); setDraggingOver(null);
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/x-arpeggio-block")) as DragPayload;
      if (payload.kind === "new") {
        if (targetParentId) {
          const destination = findBlock(project.blocks, targetParentId);
          if (!destination || !["repeat", "forever", "sequence"].includes(destination.type)) { setError("Blocks can only nest inside a sequence or repeat block."); return; }
        }
        setProject({ ...project, blocks: insertBlock(project.blocks, targetParentId, targetIndex, createBlock(payload.type, newId())) });
        setError(""); setNotice("Block connected"); return;
      }
      const source = findBlock(project.blocks, payload.id);
      if (!source) return;
      if (source.id === targetParentId || (targetParentId && containsId(source, targetParentId))) { setError("That block cannot connect there."); return; }
      const sourceIndex = indexOfBlock(project.blocks, payload.id);
      const adjustedTargetIndex = payload.parentId === targetParentId && sourceIndex !== undefined && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const removed = removeBlock(project.blocks, payload.id);
      if (!removed.found) return;
      const destination = targetParentId ? findBlock(removed.blocks, targetParentId) : undefined;
      if (targetParentId && (!destination || !["repeat", "forever", "sequence"].includes(destination.type))) { setError("Blocks can only nest inside a sequence or repeat block."); return; }
      setProject({ ...project, blocks: insertBlock(removed.blocks, targetParentId, adjustedTargetIndex, removed.found) });
      setError(""); setNotice("Blocks connected");
    } catch { setError("That block could not be connected. Try dropping it in the workspace again."); }
  };
  const deleteBlock = (id: string) => setProject((current) => ({ ...current, blocks: removeBlock(current.blocks, id).blocks }));
  const duplicateBlock = (block: SandboxBlock, parentId: string | null, index: number) => {
    const clone = (source: SandboxBlock): SandboxBlock => ({ ...source, id: newId(), config: { ...source.config }, ...(source.children ? { children: source.children.map(clone) } : {}) });
    setProject((current) => ({ ...current, blocks: insertBlock(current.blocks, parentId, index, clone(block)) }));
  };
  const moveBlock = (id: string, parentId: string | null, direction: -1 | 1) => setProject((current) => {
    const list = parentId ? findBlock(current.blocks, parentId)?.children : current.blocks;
    if (!list) return current;
    const from = list.findIndex((block) => block.id === id); const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return current;
    const removed = removeBlock(current.blocks, id);
    const moved = removed.found ? insertBlock(removed.blocks, parentId, to, removed.found) : current.blocks;
    return { ...current, blocks: moved };
  });
  const addTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { timersRef.current.delete(timer); callback(); }, delay);
    timersRef.current.add(timer);
  };
  const clearTimers = () => { timersRef.current.forEach((timer) => window.clearTimeout(timer)); timersRef.current.clear(); if (intervalRef.current !== null) window.clearInterval(intervalRef.current); intervalRef.current = null; };
  const stop = () => { runIdRef.current += 1; pendingRef.current = false; clearTimers(); audioRef.current?.stopVoices("phrase"); setRunning(false); setStarting(false); setActiveId(null); setPositionLabel("Stopped"); };
  const schedule = (events: readonly { blockId: string; startTick: number; durationTicks: number; midis: readonly number[]; label: string }[], baseTime: number, runId: number, bpm: number, loopDuration?: number) => {
    for (const event of events) {
      const delay = Math.max(0, baseTime + durationSeconds(event.startTick, bpm) * 1000 - performance.now());
      addTimer(() => {
        if (runId !== runIdRef.current) return;
        const duration = durationSeconds(event.durationTicks, bpm);
        const activeEvent = ++activeEventRef.current;
        setActiveId(event.blockId); setPositionLabel(event.label); setPosition(event.startTick / 12);
        const audio = audioRef.current;
        event.midis.forEach((midi) => audio?.play(noteObject(midi), duration, "phrase"));
        addTimer(() => { if (runId === runIdRef.current && activeEventRef.current === activeEvent) setActiveId(null); }, duration * 1000);
      }, delay);
    }
    if (loopDuration) {
      const nextDelay = Math.max(0, baseTime + durationSeconds(loopDuration, bpm) * 1000 - performance.now());
      addTimer(() => { if (runId === runIdRef.current) schedule(events, baseTime + durationSeconds(loopDuration, bpm) * 1000, runId, bpm, loopDuration); }, nextDelay);
    }
  };
  const play = async () => {
    if (running || pendingRef.current) return;
    if (!project.blocks.length) { setError("Add a few blocks first, then press Play."); return; }
    if (!validation.valid || !plan) { setError(validation.errors[0] ?? "Check the blocks in your sequence."); return; }
    setError(""); setNotice("");
    const runId = ++runIdRef.current; pendingRef.current = true; setStarting(true);
    try {
      const playbackPlan = interpretProgram(project.blocks);
      audioRef.current ??= new PianoAudioEngine();
      await audioRef.current.enable();
      if (runId !== runIdRef.current) return;
      clearTimers(); audioRef.current.stopVoices("phrase");
      const bpm = project.bpm; const startTime = performance.now() + 80;
      startedAtRef.current = startTime; setRunning(true); setStarting(false); setPosition(0); setPositionLabel("Starting…");
      schedule(playbackPlan.events, startTime, runId, bpm);
      if (playbackPlan.loop) {
        const loopStart = startTime + durationSeconds(playbackPlan.loop.startTick, bpm) * 1000;
        schedule(playbackPlan.loop.events, loopStart, runId, bpm, playbackPlan.loop.durationTicks);
      } else {
        const finish = Math.max(playbackPlan.totalTicks, ...playbackPlan.events.map((event) => event.startTick + event.durationTicks));
        addTimer(() => { if (runId === runIdRef.current) { clearTimers(); setRunning(false); setActiveId(null); setPosition(finish / 12); setPositionLabel("Your composition is complete"); } }, Math.max(80, startTime + durationSeconds(finish, bpm) * 1000 - performance.now()));
      }
      intervalRef.current = window.setInterval(() => { if (runId !== runIdRef.current) return; const elapsed = Math.max(0, (performance.now() - startedAtRef.current) / 1000); const beats = elapsed * bpm / 60; setPosition(playbackPlan.loop ? playbackPlan.loop.startTick / 12 + Math.max(0, beats - playbackPlan.loop.startTick / 12) % (playbackPlan.loop.durationTicks / 12) : Math.min(beats, playbackPlan.totalTicks / 12)); }, 80);
    } catch { if (runId === runIdRef.current) { setError("Audio could not start. Check your browser’s sound settings and press Play again."); setRunning(false); setStarting(false); } }
    finally { if (runId === runIdRef.current) pendingRef.current = false; }
  };
  const loadProject = (next: SandboxProject) => { stop(); setProject({ ...next, blocks: structuredClone(next.blocks) }); setSaveName(next.name); setError(""); setNotice(`${next.name} loaded`); };
  const saveProject = () => {
    const name = saveName.trim() || "My music";
    const next = { ...project, name };
    const projects = [...saved.filter((item) => item.name !== name), next];
    if (writeSavedProjects(projects)) { setProject(next); setSaved(projects); setNotice("Saved on this device"); setError(""); }
    else setError("This browser could not save the project. Check its local storage settings.");
  };
  const resetWorkspace = () => { stop(); setProject((current) => ({ ...current, name: "My music", blocks: [] })); setSaveName("My music"); setNotice("Workspace cleared"); };
  const loadStarter = (starter: SandboxProject) => loadProject({ ...starter, blocks: starter.blocks.map((block) => remapIds(block, newId)) });

  return <main className="sandbox-page">
    <header className="sandbox-header"><Link href="/" aria-label="ARPEGGIO home"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><nav aria-label="Sandbox navigation"><Link href="/play">Play</Link><Link href="/playground">Playground</Link><Link href="/">Back to ARPEGGIO</Link></nav></header>
    <section className="sandbox-intro"><div><p className="sandbox-eyebrow">ARPEGGIO BLOCKS</p><h1>Build music.<br/><em>Discover how it works.</em></h1><p>Connect a few ideas, press play, and hear what you made.</p></div><div className="sandbox-project-name"><label htmlFor="sandbox-project-title">Your composition</label><input id="sandbox-project-title" value={saveName} maxLength={48} onChange={(event) => setSaveName(event.target.value)} /></div></section>

    <section className="sandbox-starters" aria-label="Starter projects"><div><strong>Start with an idea</strong><span>Choose an example, then make it yours.</span></div>{starters.map((starter) => <button type="button" key={starter.name} onClick={() => loadStarter(starter)}>{starter.name}<span>↗</span></button>)}</section>

    <section className="sandbox-transport" aria-label="Composition controls"><div className="sandbox-transport-actions"><button type="button" className="sandbox-play-button" onClick={() => void play()} disabled={running || starting}>▶ <span>{starting ? "Starting" : running ? "Playing" : "Play"}</span></button><button type="button" className="sandbox-stop-button" onClick={stop} disabled={!running && !starting}>■ Stop</button><button type="button" className="sandbox-reset-button" onClick={resetWorkspace}>Reset</button></div><label className="sandbox-bpm">Tempo <input aria-label="Tempo in beats per minute" type="range" min="40" max="200" step="1" value={project.bpm} disabled={running || starting} onChange={(event) => setProject((current) => ({ ...current, bpm: Number(event.target.value) }))}/><output>{project.bpm} <small>BPM</small></output></label><div className="sandbox-position" aria-live="polite"><span className={running ? "sandbox-live-dot" : ""}/><strong>{starting ? "Starting audio…" : positionLabel}</strong><small>{running ? `Beat ${Math.floor(position) + 1}` : `${Math.round(position * 100) / 100} beats`}</small></div><div className="sandbox-save"><button type="button" onClick={saveProject}>Save</button><select aria-label="Open a saved composition" value="" onChange={(event) => { const next = saved.find((item) => item.name === event.target.value); if (next) loadProject(next); }}><option value="">Open saved…</option>{saved.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></div></section>

    <div className="sandbox-workbench">
      <aside className="sandbox-library" aria-label="Block library"><div className="sandbox-panel-heading"><div><p className="sandbox-eyebrow">Block library</p><h2>Choose an idea</h2></div><span>Drag or add</span></div><div className="sandbox-category-tabs" role="tablist" aria-label="Block categories">{CATEGORIES.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "is-selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="sandbox-library-list">{definitions.map((definition) => <LibraryBlock key={definition.type} definition={definition} onDragStart={onDragStart} onAdd={() => addNew(definition.type)} />)}</div><p className="sandbox-library-note">Blocks snap into a sequence. Repeat blocks hold their own smaller sequence.</p></aside>
      <section className="sandbox-workspace" aria-label="Music composition workspace"><div className="sandbox-panel-heading"><div><p className="sandbox-eyebrow">Your workspace</p><h2>Put the pieces together</h2></div><span>{countBlocks(project.blocks)} blocks</span></div><div className="sandbox-stack" onDragOver={(event) => onDragOver(event, "workspace-end")} onDragLeave={() => setDraggingOver(null)} onDrop={(event) => handleDrop(event, null, project.blocks.length)}>
        {project.blocks.length ? project.blocks.map((block, index) => <BlockCard key={block.id} block={block} index={index} siblingCount={project.blocks.length} parentId={null} activeId={activeId} disabled={running} onUpdate={updateConfig} onDelete={deleteBlock} onDuplicate={duplicateBlock} onMove={moveBlock} onAdd={addNew} onDrop={handleDrop} onDragStart={handleBlockDrag} onDragOver={onDragOver} onDragLeave={() => setDraggingOver(null)} draggingOver={draggingOver} />) : <div className="sandbox-empty"><span className="sandbox-empty-wave" aria-hidden="true">⌁</span><h3>Your first music starts here</h3><p>Drag a block from the library or add one below. Try a note, then leave a little space after it.</p><button type="button" onClick={() => addNew("play-note")}>＋ Add your first note</button></div>}
        {project.blocks.length ? <button className={`sandbox-add-here ${draggingOver === "workspace-end" ? "is-drop-target" : ""}`} type="button" onClick={() => addNew("play-note")}>＋ Add a block to the end</button> : null}
      </div>{error ? <p className="sandbox-message sandbox-message--error" role="alert">{error}</p> : !validation.valid ? <p className="sandbox-message sandbox-message--error" role="status">{validation.errors[0]}</p> : null}{notice ? <p className="sandbox-message" role="status">{notice}</p> : null}
      </section>
    </div>

    <section className="sandbox-insights" aria-live="polite"><div><p className="sandbox-eyebrow">Music insights</p><h2>What are you discovering?</h2></div>{insights.length ? <ul>{insights.map((insight) => <li key={insight}><span>♪</span>{insight}</li>)}</ul> : <p>As you combine notes and patterns, musical discoveries will appear here.</p>}</section>
    <footer className="sandbox-footer"><span>Build music. Discover how it works.</span><Link href="/">Back to ARPEGGIO ↑</Link></footer>
  </main>;
}

function LibraryBlock({ definition, onDragStart, onAdd }: { definition: BlockDefinition; onDragStart: (event: DragEvent, payload: DragPayload) => void; onAdd: () => void }) {
  return <article className={`sandbox-library-block sandbox-block--${definition.color}`} data-block-type={definition.type} draggable onDragStart={(event) => onDragStart(event, { kind: "new", type: definition.type })}><div className="sandbox-library-card"><span className="sandbox-library-plus" aria-hidden="true">＋</span><div><strong>{definition.label}</strong><p>{definition.description}</p></div></div><button type="button" className="sandbox-add-block" onClick={onAdd}>Add</button></article>;
}

function findBlock(blocks: SandboxBlock[], id: string): SandboxBlock | undefined { for (const block of blocks) { if (block.id === id) return block; const child = block.children && findBlock(block.children, id); if (child) return child; } return undefined; }
function remapIds(block: SandboxBlock, newId: (prefix?: string) => string): SandboxBlock { return { ...block, id: newId(block.type), config: { ...block.config }, ...(block.children ? { children: block.children.map((child) => remapIds(child, newId)) } : {}) }; }
