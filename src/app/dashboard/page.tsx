"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {currentStreak,emptyProgress,LESSONS,readProgress,type LearnerProgress} from "@/modules/curriculum/persistent-progress";
import "./dashboard.css";
import "./dashboard-upgrade.css";
export default function Dashboard(){
 const [p,setP]=useState<LearnerProgress>(emptyProgress);
 useEffect(()=>{const update=()=>setP(readProgress());update();window.addEventListener("arpeggio-progress",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("arpeggio-progress",update);window.removeEventListener("storage",update)}},[]);
 const completed=LESSONS.filter(l=>p.completedLessons[l.id]).length;
 const next=LESSONS.find(l=>l.id===p.activeLesson&&!p.completedLessons[l.id])??LESSONS.find(l=>!p.completedLessons[l.id]);
 const returning=completed>0;
 const activityDate=(iso:string)=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(new Date(iso));
 return <main className="dash"><header><Link href="/"><Image src="/brand/arpeggio-logo.png" width={204} height={68} alt="ARPEGGIO" priority/></Link><nav><Link href="/learn/foundations">Foundations</Link><Link href="/playground">Playground</Link><Link href="/dashboard" aria-current="page">My Learning</Link></nav></header>
 <section className="dash-welcome"><p>MY LEARNING</p><h1>{returning?"Welcome back.":"Welcome to ARPEGGIO."}</h1><span>{returning?"Pick up where your curiosity left off.":"Start with a sound. Follow your curiosity."}</span></section>
 <section className="dash-continue"><div><p>{returning?"CONTINUE LEARNING":"A GOOD PLACE TO BEGIN"}</p><h2>{returning&&next?next.title:"Music Foundations"}</h2><span>{returning&&next?`${completed} of ${LESSONS.length} lessons explored`:returning?"You’ve completed every available Foundations lesson.":"Discover music through listening, experimentation and play."}</span></div><Link href={!returning?"/onboarding":next?.href??"/playground"} className="dash-cta">{!returning?"Take a quick tour":next?"Continue learning":"Explore the Playground"} ↗</Link></section>
 <section className="dash-stats"><div><strong>{completed}<small> / {LESSONS.length}</small></strong><span>Lessons completed</span></div><div><strong>{p.totalXP}</strong><span>XP earned</span></div><div><strong>{currentStreak(p.activityDays)}</strong><span>Day streak</span></div><div className="dash-meter"><i style={{width:`${completed/LESSONS.length*100}%`}}/></div></section>
 <section className="dash-lower"><div><p className="dash-kicker">MUSIC FOUNDATIONS</p><h2>Your learning journey</h2><ol>{LESSONS.map((l,index)=>{const isDone=Boolean(p.completedLessons[l.id]);const isNext=!isDone&&l.id===next?.id;return <li className={isDone?"is-complete":isNext?"is-next":""} key={l.id}><span>{isDone?"✓":`0${index+1}`}</span><div>{l.title}<small>{isDone?`Completed · ${activityDate(p.completedLessons[l.id]!)}`:isNext?"Recommended next":"Available to explore"}</small></div><Link href={l.href}>{isDone?"Revisit":isNext?"Continue":"Explore"} ↗</Link></li>})}</ol><Link className="dash-foundations" href="/learn/foundations">View all Foundations ↗</Link></div><aside><p className="dash-kicker">RECENT ACTIVITY</p>{p.recentActivity.length?<ol className="dash-activity">{p.recentActivity.slice(0,4).map((a)=><li key={`${a.lesson}-${a.date}`}><i aria-hidden="true"/><div><strong>Completed {LESSONS.find(l=>l.id===a.lesson)?.title}</strong><small>{activityDate(a.date)} · +{a.xp} XP</small></div></li>)}</ol>:<div className="dash-empty"><span aria-hidden="true">⌁</span><p>Your learning moments will appear here after your first lesson.</p></div>}<Link href="/playground" className="dash-play">Explore in the Playground ↗</Link></aside></section></main>
}
