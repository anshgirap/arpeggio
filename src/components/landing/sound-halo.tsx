import type { PianoNote } from "@/modules/music/piano";

type SoundHaloProps = {
  pulse: { note: PianoNote; sequence: number } | null;
};

const toneClass = (note: PianoNote) => {
  const tone = ["lavender", "lime", "coral"][note.midi % 3];
  return `sound-halo__strike sound-halo__strike--${tone}`;
};

/** Decorative sound rings, with a fresh keyboard ripple for every played note. */
export function SoundHalo({ pulse }: SoundHaloProps) {
  return (
    <svg className="sound-halo" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ellipse className="sound-halo__ring sound-halo__ring--one" cx="500" cy="300" rx="440" ry="220" />
      <ellipse className="sound-halo__ring sound-halo__ring--two" cx="500" cy="300" rx="510" ry="265" />
      <ellipse className="sound-halo__ring sound-halo__ring--three" cx="500" cy="300" rx="580" ry="305" />
      {pulse && (
        <ellipse
          key={pulse.sequence}
          className={toneClass(pulse.note)}
          cx="500"
          cy="300"
          rx="440"
          ry="220"
        />
      )}
    </svg>
  );
}
