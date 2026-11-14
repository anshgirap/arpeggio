import Link from "next/link";
import { Badge, Button, Card, ProgressBar } from "@/components/ui/primitives";
import "@/components/ui/ui.css";
import "./showcase.css";

const swatches = [
  { name: "Warm ivory", hex: "#F8F7F2", className: "swatch--ivory" },
  { name: "Deep charcoal", hex: "#202020", className: "swatch--charcoal" },
  { name: "Electric lime", hex: "#D7F36A", className: "swatch--lime" },
  { name: "Soft lavender", hex: "#B9A7F5", className: "swatch--lavender" },
  { name: "Coral", hex: "#FF927E", className: "swatch--coral" },
  { name: "White", hex: "#FFFFFF", className: "swatch--white" },
];

function Section({ id, label, title, children }: { id: string; label: string; title: string; children: React.ReactNode }) {
  return <section className="showcase-section" id={id}><div className="section-heading"><span className="eyebrow">{label}</span><h2 className="section-title">{title}</h2></div>{children}</section>;
}

export default function DesignSystemPage() {
  return <main className="showcase-shell">
    <header className="showcase-nav"><Link className="wordmark" href="/">ARPEGGIO<span className="wordmark-dot">.</span></Link><nav aria-label="Design system sections"><a href="#palette">Palette</a><a href="#type">Type</a><a href="#components">Components</a></nav><span className="nav-note">DESIGN SYSTEM · 01</span></header>
    <div className="showcase-hero"><div className="hero-copy"><span className="eyebrow">A visual language for curious ears</span><h1 className="display-title">Feel the<br />theory<span className="hero-period">.</span></h1><p className="body-copy hero-description">A warm, expressive foundation for learning music by listening, exploring and finding your own way in.</p><div className="hero-actions"><Button size="large">Explore the system <span aria-hidden="true">↘</span></Button><span className="hero-caption">VERSION 0.1 · FOUNDATION</span></div></div><div className="hero-art" aria-label="Abstract musical motif"><div className="art-disc disc-one"/><div className="art-disc disc-two"/><div className="art-disc disc-three"/><span className="art-note">♪</span><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-caption">SOUND FIRST<br/>ALWAYS</span></div></div>
    <Section id="palette" label="01 · Colour" title="A little warmth. A little spark."><div className="swatch-grid">{swatches.map((swatch) => <div className="swatch-item" key={swatch.name}><div className={`swatch ${swatch.className}`}><span>{swatch.hex}</span></div><strong>{swatch.name}</strong></div>)}</div></Section>
    <Section id="type" label="02 · Type" title="Clear, human, full of character."><Card className="type-specimen"><div><span className="eyebrow">Display · 96 / Semibold</span><p className="type-display">Hear the<br/>difference.</p></div><div className="type-details"><span className="eyebrow">Body · 16 / Regular</span><p className="body-copy">Music theory becomes intuitive when you can feel what changes. Listen closely, try something new, and let your ear lead the way.</p><div className="type-labels"><span>Letter spacing <b>−0.075em</b></span><span>Line height <b>0.94 / 1.65</b></span></div></div></Card></Section>
    <Section id="components" label="03 · Components" title="Small details, considered." ><div className="component-grid"><Card className="component-panel"><div className="panel-title"><h3>Buttons</h3><span className="eyebrow">Three ways in</span></div><div className="button-stack"><div className="button-row"><Button>Start exploring <span aria-hidden="true">→</span></Button><Button variant="secondary">Take a closer listen</Button><Button variant="quiet">Maybe later</Button></div><div className="button-row"><Button size="small">Compact</Button><Button size="large">Big moment <span aria-hidden="true">↗</span></Button><Button disabled>Unavailable</Button></div></div></Card>
      <Card className="component-panel progress-panel" surface="lavender"><div className="panel-title"><h3>Progress</h3><span className="eyebrow">Gentle momentum</span></div><div className="progress-samples"><ProgressBar value={68} label="Today’s practice"/><ProgressBar value={35} label="Intervals explored"/></div><div className="streak-strip"><span className="streak-flame" aria-hidden="true">✳</span><div><strong>4 day streak</strong><span className="streak-caption">You’re finding your rhythm</span></div><span className="streak-days">M T W <b>T</b> F S S</span></div></Card>
      <Card className="component-panel reward-panel" surface="coral"><div className="panel-title"><h3>Little rewards</h3><span className="eyebrow">Progress, made visible</span></div><div className="badge-row"><Badge>✦ 240 XP</Badge><Badge tone="lavender">♬ EAR EXPLORER</Badge><Badge tone="coral">✳ 4 DAYS</Badge><Badge tone="dark">LEVEL 02</Badge></div></Card>
      <Card className="lesson-card" surface="lime"><div className="lesson-graphic"><span className="lesson-kicker">LISTEN & NOTICE</span><div className="sound-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="lesson-note">♪</span></div><div className="lesson-info"><div className="lesson-topline"><Badge tone="lavender">YOUR FIRST STEPS</Badge><span className="lesson-time">5 MIN</span></div><h3>When a note feels at home</h3><p className="body-copy">Hear how one note can feel like a place to land.</p><ProgressBar value={0} label="Not started"/><Button variant="secondary" size="small">Begin lesson <span aria-hidden="true">→</span></Button></div></Card></div></Section>
    <footer className="showcase-footer"><span className="wordmark">ARPEGGIO<span className="wordmark-dot">.</span></span><span>Understand music. Don’t just memorise it.</span><a href="#top">BACK TO TOP ↑</a></footer>
  </main>;
}
