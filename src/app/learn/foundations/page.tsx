"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { emptyProgress, readProgress, type LearnerProgress } from "@/modules/curriculum/persistent-progress";
import "./foundations.css";



const milestones = [
  { title: "Understanding Pitch", lesson: "pitch", href: "/learn/pitch", available: true },
  { title: "Musical Notes", lesson: "notes", href: "/learn/notes", available: true },
  { title: "Note Relationships", state: "Coming soon", available: false },
  { title: "Intervals", state: "Coming soon", available: false },
  { title: "Octaves", lesson: "octaves", href: "/learn/octaves", available: true },
  { title: "Semitones", lesson: "semitones", href: "/learn/semitones", available: true },
  { title: "Basic Scales", state: "Coming soon", available: false },
] as const;

export default function FoundationsPage() {
  const [progress,setProgress]=useState<LearnerProgress>(emptyProgress);
  useEffect(()=>{const update=()=>setProgress(readProgress());update();window.addEventListener("arpeggio-progress",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("arpeggio-progress",update);window.removeEventListener("storage",update)}},[]);
  const completed=milestones.filter(item=>item.available&&"lesson" in item&&Boolean(progress.completedLessons[item.lesson])).length;
  const next=milestones.find(item=>item.available&&"lesson" in item&&!progress.completedLessons[item.lesson]);
  return <main className="foundations-page">
    <header className="foundations-header"><Link href="/" className="foundations-brand" aria-label="ARPEGGIO home"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/#paths" className="foundations-back">← Learning paths</Link></header>
    <section className="foundations-intro"><p className="foundations-eyebrow">Music Foundations</p><h1>Start with the <em>fundamentals.</em></h1><p>Discover the building blocks of music through listening, experimentation and exploration.</p><div className="foundations-progress"><span>{next?`Next: ${next.title}`:"Foundations complete"}</span><span>{completed} of 4 explored</span><div><i style={{width:`${completed/4*100}%`}} /></div></div></section>
    <section className="foundations-journey" aria-labelledby="foundations-journey-title"><div className="foundations-section-heading"><p className="foundations-eyebrow">Your learning journey</p><h2 id="foundations-journey-title">One idea leads to another.</h2></div><ol>{milestones.map((item, index) => {const lesson="lesson" in item?item.lesson:undefined;const href="href" in item?item.href:undefined;const isDone=Boolean(lesson&&progress.completedLessons[lesson]);const isNext=item===next;return <li key={item.title} className={isDone?"completed":item.available?"available":"upcoming"}><span className="milestone-number">0{index + 1}</span><span className="milestone-node" aria-hidden="true"/><div className="milestone-copy"><h3>{item.title}</h3><span>{isDone?"Completed":item.available?isNext?"Next to explore":"Available":"Coming soon"}</span></div>{href ? <Link className="milestone-action" href={href}>{isDone?"Revisit":isNext?"Continue":"Begin"} ↗</Link> : <span className="milestone-lock" aria-label="Not available yet">Soon</span>}</li>})}</ol></section>
    <footer className="foundations-footer">Learning grows one discovery at a time.</footer>
  </main>;
}
