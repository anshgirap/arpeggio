import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./foundations.css";

export const metadata: Metadata = { title: "Music Foundations" };

const milestones = [
  { title: "Understanding Pitch", state: "Available", href: "/learn/pitch", available: true },
  { title: "Musical Notes", state: "Available", href: "/learn/notes", available: true },
  { title: "Note Relationships", state: "Coming soon", available: false },
  { title: "Intervals", state: "Coming soon", available: false },
  { title: "Octaves", state: "Available", href: "/learn/octaves", available: true },
  { title: "Basic Scales", state: "Coming soon", available: false },
] as const;

export default function FoundationsPage() {
  return <main className="foundations-page">
    <header className="foundations-header"><Link href="/" className="foundations-brand" aria-label="ARPEGGIO home"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority /></Link><Link href="/#paths" className="foundations-back">← Learning paths</Link></header>
    <section className="foundations-intro"><p className="foundations-eyebrow">Music Foundations</p><h1>Start with the <em>fundamentals.</em></h1><p>Discover the building blocks of music through listening, experimentation and exploration.</p><div className="foundations-progress"><span>First steps</span><span>0 of 6 explored</span><div><i /></div></div></section>
    <section className="foundations-journey" aria-labelledby="foundations-journey-title"><div className="foundations-section-heading"><p className="foundations-eyebrow">Your learning journey</p><h2 id="foundations-journey-title">One idea leads to another.</h2></div><ol>{milestones.map((item, index) => <li key={item.title} className={item.available ? "available" : "upcoming"}><span className="milestone-number">0{index + 1}</span><span className="milestone-node" aria-hidden="true"/><div className="milestone-copy"><h3>{item.title}</h3><span>{item.state}</span></div>{item.available ? <Link className="milestone-action" href={item.href}>Begin ↗</Link> : <span className="milestone-lock" aria-label="Not available yet">Soon</span>}</li>)}</ol></section>
    <footer className="foundations-footer">Learning grows one discovery at a time.</footer>
  </main>;
}
