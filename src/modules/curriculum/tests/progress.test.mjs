import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {completeLesson,currentStreak,emptyProgress,readProgress,saveOnboarding,setActiveLesson}=require(process.env.ARPEGGIO_PROGRESS_BUILD);
function storage(seed=null,throws=false){let value=seed;return {getItem(){if(throws)throw Error("blocked");return value},setItem(_key,next){if(throws)throw Error("blocked");value=next},value:()=>value}}
function browser(store){globalThis.localStorage=store;globalThis.window={dispatchEvent(){}}}

test("new learner gets a safe empty state; SSR does not need browser APIs",()=>{delete globalThis.window;assert.deepEqual(readProgress(),emptyProgress());});
test("completion stores timestamp, adds 100 XP and is idempotent",()=>{browser(storage());const first=completeLesson("pitch");const timestamp=first.completedLessons.pitch;assert.equal(first.totalXP,100);assert.ok(timestamp);assert.equal(completeLesson("pitch").totalXP,100);assert.equal(readProgress().completedLessons.pitch,timestamp)});
test("multiple lesson completions update XP and active lesson",()=>{browser(storage());completeLesson("pitch");const p=completeLesson("notes");assert.equal(p.totalXP,200);assert.equal(p.activeLesson,"octaves");assert.equal(p.recentActivity.length,2)});
test("malformed JSON, missing fields, and unknown schema versions recover to defaults",()=>{for(const raw of ["{",JSON.stringify({schemaVersion:1,completedLessons:{}}),JSON.stringify({...emptyProgress(),schemaVersion:99})]){browser(storage(raw));assert.deepEqual(readProgress(),emptyProgress())}});
test("blocked local storage is handled without throwing",()=>{browser(storage(null,true));assert.deepEqual(readProgress(),emptyProgress());assert.doesNotThrow(()=>setActiveLesson("notes"));assert.doesNotThrow(()=>completeLesson("pitch"))});
test("streak handles first day, same day sessions, consecutive days, missed days and return",()=>{assert.equal(currentStreak(["2026-11-17"],"2026-11-17"),1);assert.equal(currentStreak(["2026-11-17","2026-11-17"],"2026-11-17"),1);assert.equal(currentStreak(["2026-11-16","2026-11-17"],"2026-11-17"),2);assert.equal(currentStreak(["2026-11-14"],"2026-11-17"),0);assert.equal(currentStreak(["2026-11-14","2026-11-16","2026-11-17"],"2026-11-17"),2)});
test("completion records the learner local calendar date",()=>{browser(storage());const before=new Date();const localDay=`${before.getFullYear()}-${String(before.getMonth()+1).padStart(2,"0")}-${String(before.getDate()).padStart(2,"0")}`;const p=completeLesson("pitch");assert.ok(p.activityDays.includes(localDay));});
test("onboarding completion and skip persist preference without overwriting lesson progress",()=>{const store=storage();browser(store);completeLesson("pitch");saveOnboarding("completed","instrument");const state=readProgress();assert.equal(state.onboarding.status,"completed");assert.equal(state.onboarding.learnerType,"instrument");assert.equal(state.totalXP,100);saveOnboarding("skipped","theory");assert.equal(readProgress().onboarding.status,"skipped");assert.equal(readProgress().totalXP,100)});
