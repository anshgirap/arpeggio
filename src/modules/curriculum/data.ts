import type { LearningPath, LessonMetadata, MusicalConcept } from "./types";

export const learningPaths: readonly LearningPath[] = [
  {
    id: "music-foundations",
    name: "Music Foundations",
    description: "Build an intuitive sense of pitch, notes, scales and musical time.",
    objectives: ["Notice how musical sounds differ", "Recognise basic pitch relationships", "Connect note patterns with pulse and rhythm"],
    conceptIds: ["sound-listening", "pitch", "musical-notes", "note-relationships", "intervals", "octaves", "basic-scales", "pulse", "tempo", "basic-rhythm"],
    level: 1,
  },
  {
    id: "rhythm",
    name: "Rhythm",
    description: "Find, feel and shape patterns in musical time.",
    objectives: ["Feel a steady pulse", "Explore tempo", "Recognise and create simple rhythms"],
    conceptIds: ["sound-listening", "pulse", "tempo", "basic-rhythm"],
    level: 1,
  },
  {
    id: "intervals-pitch-relationships",
    name: "Intervals & Pitch Relationships",
    description: "Explore how notes move, relate and repeat across registers.",
    objectives: ["Compare pitches", "Hear distances between notes", "Recognise octave relationships"],
    conceptIds: ["sound-listening", "pitch", "musical-notes", "note-relationships", "intervals", "octaves"],
    level: 1,
  },
];

export const concepts: readonly MusicalConcept[] = [
  {
    id: "sound-listening", name: "Sound and listening",
    description: "Notice that sounds can be higher, lower, longer, shorter or differently coloured.",
    objectives: ["Describe what changes when sounds are compared", "Listen for similarities and differences"],
    prerequisiteIds: [], relatedIds: ["pitch", "pulse"], pathIds: ["music-foundations", "rhythm", "intervals-pitch-relationships"], level: 1,
  },
  {
    id: "pitch", name: "Pitch", description: "Explore how musical sounds move from low to high.",
    objectives: ["Order sounds by pitch", "Recognise that pitch can move up, down or stay the same"],
    prerequisiteIds: ["sound-listening"], relatedIds: ["musical-notes", "note-relationships"], pathIds: ["music-foundations", "intervals-pitch-relationships"], level: 1,
  },
  {
    id: "musical-notes", name: "Musical notes", description: "Connect familiar note names with distinct pitches.",
    objectives: ["Recognise the repeating note-name set", "Locate a named pitch in different representations"],
    prerequisiteIds: ["pitch"], relatedIds: ["octaves", "intervals"], pathIds: ["music-foundations", "intervals-pitch-relationships"], level: 1,
  },
  {
    id: "note-relationships", name: "Note relationships", description: "Compare two or more notes and notice the distance between them.",
    objectives: ["Compare notes by listening", "Describe whether two notes feel close or far apart"],
    prerequisiteIds: ["pitch", "musical-notes"], relatedIds: ["intervals", "basic-scales"], pathIds: ["music-foundations", "intervals-pitch-relationships"], level: 2,
  },
  {
    id: "intervals", name: "Intervals", description: "Give names to the musical distances between two pitches.",
    objectives: ["Recognise a few common pitch distances", "Relate interval names to sound and semitone distance"],
    prerequisiteIds: ["note-relationships"], relatedIds: ["octaves", "basic-scales"], pathIds: ["music-foundations", "intervals-pitch-relationships"], level: 2,
  },
  {
    id: "octaves", name: "Octaves", description: "Hear how pitches can sound related while repeating at a higher or lower level.",
    objectives: ["Recognise octave similarity", "Find octave-equivalent notes across registers"],
    prerequisiteIds: ["musical-notes", "note-relationships"], relatedIds: ["intervals", "basic-scales"], pathIds: ["music-foundations", "intervals-pitch-relationships"], level: 2,
  },
  {
    id: "basic-scales", name: "Basic scales", description: "Explore how selected notes form a recognisable pattern around a home note.",
    objectives: ["Follow a simple scale pattern", "Hear the relationship between a root and other scale notes"],
    prerequisiteIds: ["intervals"], relatedIds: ["musical-notes", "note-relationships"], pathIds: ["music-foundations"], level: 2,
  },
  {
    id: "pulse", name: "Pulse", description: "Find the steady beat that music can move around.",
    objectives: ["Tap along with a steady beat", "Distinguish the pulse from changing sounds"],
    prerequisiteIds: ["sound-listening"], relatedIds: ["tempo", "basic-rhythm"], pathIds: ["music-foundations", "rhythm"], level: 1,
  },
  {
    id: "tempo", name: "Tempo", description: "Explore how fast or slowly a steady pulse moves.",
    objectives: ["Compare faster and slower pulses", "Connect tempo changes with musical feel"],
    prerequisiteIds: ["pulse"], relatedIds: ["basic-rhythm"], pathIds: ["music-foundations", "rhythm"], level: 1,
  },
  {
    id: "basic-rhythm", name: "Basic rhythm", description: "Create patterns by combining sounds and spaces around a pulse.",
    objectives: ["Recognise simple repeated rhythmic patterns", "Create a short rhythm using sounds and rests"],
    prerequisiteIds: ["pulse", "tempo"], relatedIds: ["sound-listening"], pathIds: ["music-foundations", "rhythm"], level: 2,
  },
];

// Metadata only: full lesson content belongs to the future Lesson Engine.
export const lessons: readonly LessonMetadata[] = concepts.map((concept, index) => ({
  id: `intro-${concept.id}`,
  title: `Explore ${concept.name.toLowerCase()}`,
  description: `A short discovery-led introduction to ${concept.name.toLowerCase()}.`,
  conceptIds: [concept.id],
  objectives: concept.objectives,
  order: index + 1,
  estimatedMinutes: 5,
  stages: ["discover", "understand", "experiment", "apply", "master"],
  exerciseTypes: ["listen", "compare", "create", "reflect"],
  masteryCriteria: [{ description: "Demonstrate the concept consistently in varied examples.", threshold: 0.8, attemptsRequired: 2 }],
}));
