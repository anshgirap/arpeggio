import { LEARNING_STAGES, type LearningStage } from "./types";

export interface LearningStageDefinition {
  readonly id: LearningStage;
  readonly name: string;
  readonly purpose: string;
  readonly order: number;
}

export const learningStages: readonly LearningStageDefinition[] = [
  { id: "discover", name: "Discover", purpose: "Experience the idea through sound or observation.", order: 1 },
  { id: "understand", name: "Understand", purpose: "Make sense of what was noticed.", order: 2 },
  { id: "experiment", name: "Experiment", purpose: "Explore how the idea changes in different situations.", order: 3 },
  { id: "apply", name: "Apply", purpose: "Use the idea in a musical context.", order: 4 },
  { id: "master", name: "Master", purpose: "Show reliable understanding over time.", order: 5 },
];

export { LEARNING_STAGES };
