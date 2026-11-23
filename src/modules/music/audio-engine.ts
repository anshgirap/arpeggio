import type { PianoNote } from "./piano";

type PianoVoice = { oscillators: OscillatorNode[]; gains: GainNode[]; group: "phrase" | "manual"; end: number };

/** Shared, lightweight piano-like Web Audio synthesizer. */
export class PianoAudioEngine {
  private context: AudioContext | null = null;
  private readonly voices = new Set<PianoVoice>();
  private master: GainNode | null = null;
  private revision = 0;
  get playbackRevision(): number { return this.revision; }

  private getContext(): AudioContext {
    if (typeof window === "undefined" || !window.AudioContext) throw new Error("Audio playback is not supported in this browser.");
    if (!this.context || this.context.state === "closed") {
      this.context = new window.AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }
  async tryAutoplay(): Promise<boolean> {
    try { const c=this.getContext(); if(this.isRunning(c))return true; await Promise.race([c.resume().catch(()=>undefined),new Promise<void>(r=>window.setTimeout(r,240))]); return this.isRunning(c); } catch { return false; }
  }
  private isRunning(context:AudioContext):boolean{return context.state==="running"}
  async enable(): Promise<void> { const c=this.getContext(); if(!this.isRunning(c))await c.resume(); if(!this.isRunning(c))throw new Error("Audio could not be started."); }

  play(note:PianoNote,duration=.46,group:PianoVoice["group"]="manual",revision=this.revision):boolean {
    const c=this.context, master=this.master;
    if(!c||!master||c.state!=="running"||revision!==this.revision)return false;
    try {
      const now=c.currentTime, f=note.frequency, midi=note.midi;
      const register=midi<48?0:midi>84?2:1;
      const partials=register===0?[[1,.72],[2,.22],[3,.11],[4,.055]]:register===2?[[1,.74],[2,.2],[3,.075],[4,.025]]:[[1,.68],[2,.25],[3,.13],[4,.065],[5,.025]];
      const voice:PianoVoice={oscillators:[],gains:[],group,end:now+Math.max(.18,duration)};
      const total=Math.max(.18,duration), decay=register===0?2.8:register===2?1.05:1.65;
      const peak=.095/Math.sqrt(Math.max(1,this.voices.size+1));
      for(const [harmonic,weight] of partials){
        const osc=c.createOscillator(), gain=c.createGain();
        osc.type=harmonic===1?"triangle":"sine"; osc.frequency.setValueAtTime(f*harmonic,now);
        if(harmonic>1)osc.detune.setValueAtTime((harmonic%2?1:-1)*1.5,now);
        const amp=peak*weight; gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),now+.006+register*.002); gain.gain.exponentialRampToValueAtTime(.0001,now+Math.min(total,decay));
        // A short, quiet noise transient supplies the felt-hammer onset.
        osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+Math.max(total,decay)+.08);
        voice.oscillators.push(osc);voice.gains.push(gain);
      }
      this.voices.add(voice);
      let ended=0;voice.oscillators.forEach(o=>{o.onended=()=>{ended+=1;if(ended===voice.oscillators.length){this.voices.delete(voice);voice.gains.forEach(g=>{try{g.disconnect()}catch{}})}}});
      return true;
    } catch { return false; }
  }
  stopAll():void { this.revision+=1;this.stopVoices(); }
  stopVoices(group?:PianoVoice["group"]):void {
    const c=this.context;if(!c||c.state==="closed")return;const now=c.currentTime;
    for(const v of this.voices){if(group&&v.group!==group)continue;for(let i=0;i<v.oscillators.length;i++){try{const g=v.gains[i];g.gain.cancelScheduledValues(now);g.gain.setValueAtTime(Math.max(g.gain.value,.0001),now);g.gain.exponentialRampToValueAtTime(.0001,now+.09);v.oscillators[i].stop(now+.1)}catch{}}}
  }
  async dispose():Promise<void>{this.stopAll();const c=this.context;this.context=null;this.master=null;if(c&&c.state!=="closed")await c.close();}
}
