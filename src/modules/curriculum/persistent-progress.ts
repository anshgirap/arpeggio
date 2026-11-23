export const LESSONS=[{id:"pitch",title:"Understanding Pitch",href:"/learn/pitch"},{id:"notes",title:"Understanding Musical Notes",href:"/learn/notes"},{id:"octaves",title:"Understanding Octaves",href:"/learn/octaves"},{id:"semitones",title:"Understanding Semitones",href:"/learn/semitones"}] as const;
export type LessonId=typeof LESSONS[number]["id"];
export type LearnerProgress={schemaVersion:1;completedLessons:Partial<Record<LessonId,string>>;activeLesson:LessonId|null;totalXP:number;activityDays:string[];recentActivity:{lesson:LessonId;date:string;xp:number}[];currentPath:string;onboarding:{status:"new"|"completed"|"skipped";learnerType:string|null}};
const KEY="arpeggio.learner-progress.v1";
export const emptyProgress=():LearnerProgress=>({schemaVersion:1,completedLessons:{},activeLesson:"pitch",totalXP:0,activityDays:[],recentActivity:[],currentPath:"music-foundations",onboarding:{status:"new",learnerType:null}});
function valid(value:unknown):value is LearnerProgress {
  if(!value||typeof value!=="object")return false;
  const p=value as Partial<LearnerProgress>;
  const ids=new Set<string>(LESSONS.map(({id})=>id));
  if(p.schemaVersion!==1||!p.completedLessons||typeof p.completedLessons!=="object"||!Number.isFinite(p.totalXP)||!Array.isArray(p.activityDays)||!Array.isArray(p.recentActivity)||typeof p.currentPath!=="string")return false;
  if(p.activeLesson!==null&&!ids.has(p.activeLesson??""))return false;
  if(Object.entries(p.completedLessons).some(([id,date])=>!ids.has(id)||typeof date!=="string"||!Number.isFinite(Date.parse(date))))return false;
  if(p.activityDays.some(day=>typeof day!=="string"||!/^(\d{4})-(\d{2})-(\d{2})$/.test(day)))return false;
  return p.recentActivity.every(event=>Boolean(event)&&ids.has(event.lesson)&&Number.isFinite(Date.parse(event.date))&&Number.isFinite(event.xp));
}
export function readProgress():LearnerProgress {if(typeof window==="undefined")return emptyProgress();try{const raw=localStorage.getItem(KEY);if(!raw)return emptyProgress();const parsed:unknown=JSON.parse(raw);if(!valid(parsed))return emptyProgress();return {...emptyProgress(),...parsed,onboarding:parsed.onboarding??{status:"new",learnerType:null}}}catch{return emptyProgress()}}
function save(p:LearnerProgress){try{localStorage.setItem(KEY,JSON.stringify(p));window.dispatchEvent(new Event("arpeggio-progress"));}catch{/* Storage can be disabled or full; the current view remains usable. */}}
const dateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function setActiveLesson(id:LessonId){if(typeof window==="undefined")return;const p=readProgress();if(!p.completedLessons[id]){p.activeLesson=id;save(p)}}
export function saveOnboarding(status:"completed"|"skipped",learnerType?:string|null){if(typeof window==="undefined")return;const p=readProgress();p.onboarding={status,learnerType:learnerType??p.onboarding.learnerType};save(p)}
export function completeLessonWithReward(id:LessonId){if(typeof window==="undefined")return {progress:readProgress(),earnedXP:0};const p=readProgress();if(p.completedLessons[id])return {progress:p,earnedXP:0};const day=dateKey();p.completedLessons[id]=new Date().toISOString();p.totalXP+=100;p.activityDays=Array.from(new Set([...p.activityDays,day])).sort();p.recentActivity=[{lesson:id,date:new Date().toISOString(),xp:100},...p.recentActivity].slice(0,8);p.activeLesson=LESSONS.find(l=>!p.completedLessons[l.id])?.id??null;save(p);return {progress:p,earnedXP:100}}
export function completeLesson(id:LessonId){return completeLessonWithReward(id).progress}
export function currentStreak(days:string[],today=dateKey()){const set=new Set(days);const d=new Date(`${today}T12:00:00`);let count=0;if(!set.has(today)){d.setDate(d.getDate()-1);if(!set.has(dateKey(d)))return 0}while(set.has(dateKey(d))){count++;d.setDate(d.getDate()-1)}return count}
