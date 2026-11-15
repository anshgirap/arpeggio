export const LEARNING_STAGES = [
  "discover",
  "understand",
  "experiment",
  "apply",
  "master",
] as const;

export type LearningStage = (typeof LEARNING_STAGES)[number];
export type ExerciseType =
  | "listen"
  | "identify"
  | "compare"
  | "create"
  | "perform"
  | "reflect";

export interface LearningPath {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objectives: readonly string[];
  readonly conceptIds: readonly string[];
  readonly level: number;
}

export interface MusicalConcept {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objectives: readonly string[];
  readonly prerequisiteIds: readonly string[];
  readonly relatedIds: readonly string[];
  readonly pathIds: readonly string[];
  readonly level: number;
}

export interface MasteryCriteria {
  readonly description: string;
  readonly threshold: number;
  readonly attemptsRequired?: number;
}

export interface LessonMetadata {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly conceptIds: readonly string[];
  readonly objectives: readonly string[];
  readonly order: number;
  readonly estimatedMinutes: number;
  readonly stages: readonly LearningStage[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly masteryCriteria: readonly MasteryCriteria[];
}

export type ProgressionStatus = "completed" | "available" | "locked";

export interface ConceptProgress {
  readonly conceptId: string;
  readonly status: ProgressionStatus;
}

export interface PathProgress {
  readonly pathId: string;
  readonly concepts: readonly ConceptProgress[];
  readonly completedConceptIds: readonly string[];
  readonly availableConceptIds: readonly string[];
  readonly lockedConceptIds: readonly string[];
  readonly nextConceptIds: readonly string[];
}
