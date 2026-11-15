import { concepts, learningPaths } from "./data";
import type { LearningPath, MusicalConcept, PathProgress } from "./types";

export class CurriculumDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumDefinitionError";
  }
}

export function validateCurriculum(
  paths: readonly LearningPath[] = learningPaths,
  allConcepts: readonly MusicalConcept[] = concepts,
): void {
  const pathIds = new Set(paths.map(({ id }) => id));
  const conceptMap = new Map(allConcepts.map((concept) => [concept.id, concept]));
  if (pathIds.size !== paths.length) throw new CurriculumDefinitionError("Learning path IDs must be unique.");
  if (conceptMap.size !== allConcepts.length) throw new CurriculumDefinitionError("Concept IDs must be unique.");

  for (const concept of allConcepts) {
    for (const id of concept.prerequisiteIds) {
      if (!conceptMap.has(id)) throw new CurriculumDefinitionError(`Unknown prerequisite '${id}' on '${concept.id}'.`);
      if (id === concept.id) throw new CurriculumDefinitionError(`Concept '${id}' cannot depend on itself.`);
    }
    for (const id of concept.relatedIds) {
      if (!conceptMap.has(id)) throw new CurriculumDefinitionError(`Unknown related concept '${id}' on '${concept.id}'.`);
    }
    for (const id of concept.pathIds) {
      if (!pathIds.has(id)) throw new CurriculumDefinitionError(`Unknown learning path '${id}' on '${concept.id}'.`);
    }
  }
  for (const path of paths) {
    for (const id of path.conceptIds) {
      const concept = conceptMap.get(id);
      if (!concept) throw new CurriculumDefinitionError(`Unknown concept '${id}' on path '${path.id}'.`);
      if (!concept.pathIds.includes(path.id)) throw new CurriculumDefinitionError(`Concept '${id}' does not reference path '${path.id}'.`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visiting.has(id)) throw new CurriculumDefinitionError(`Prerequisite cycle detected at '${id}'.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of conceptMap.get(id)?.prerequisiteIds ?? []) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  }
  for (const { id } of allConcepts) visit(id);
}

export function prerequisitesSatisfied(
  conceptId: string,
  completedConceptIds: ReadonlySet<string>,
  allConcepts: readonly MusicalConcept[] = concepts,
): boolean {
  const concept = allConcepts.find(({ id }) => id === conceptId);
  if (!concept) return false;
  return concept.prerequisiteIds.every((id) => completedConceptIds.has(id));
}

export function getPathProgress(
  pathId: string,
  completedIds: Iterable<string> = [],
  paths: readonly LearningPath[] = learningPaths,
  allConcepts: readonly MusicalConcept[] = concepts,
): PathProgress {
  const path = paths.find(({ id }) => id === pathId);
  if (!path) throw new RangeError(`Unknown learning path '${pathId}'.`);
  const completed = new Set(completedIds);
  const pathConcepts = path.conceptIds
    .map((id) => allConcepts.find((concept) => concept.id === id))
    .filter((concept): concept is MusicalConcept => concept !== undefined);
  const completedConceptIds = pathConcepts.filter(({ id }) => completed.has(id)).map(({ id }) => id);
  const availableConceptIds = pathConcepts
    .filter(({ id }) => !completed.has(id) && prerequisitesSatisfied(id, completed, allConcepts))
    .map(({ id }) => id);
  const lockedConceptIds = pathConcepts
    .filter(({ id }) => !completed.has(id) && !availableConceptIds.includes(id))
    .map(({ id }) => id);

  return {
    pathId,
    concepts: pathConcepts.map(({ id }) => ({
      conceptId: id,
      status: completed.has(id) ? "completed" : availableConceptIds.includes(id) ? "available" : "locked",
    })),
    completedConceptIds,
    availableConceptIds,
    lockedConceptIds,
    nextConceptIds: availableConceptIds,
  };
}

export function getAvailableConcepts(
  completedIds: Iterable<string> = [],
  pathId?: string,
  paths: readonly LearningPath[] = learningPaths,
  allConcepts: readonly MusicalConcept[] = concepts,
): readonly MusicalConcept[] {
  const completed = new Set(completedIds);
  const pathConceptIds = pathId
    ? paths.find(({ id }) => id === pathId)?.conceptIds
    : undefined;
  if (pathId && !pathConceptIds) throw new RangeError(`Unknown learning path '${pathId}'.`);
  return allConcepts.filter((concept) =>
    (!pathConceptIds || pathConceptIds.includes(concept.id)) &&
    !completed.has(concept.id) && prerequisitesSatisfied(concept.id, completed, allConcepts),
  );
}

export function getCompletedConcepts(
  completedIds: Iterable<string>,
  pathId?: string,
  paths: readonly LearningPath[] = learningPaths,
  allConcepts: readonly MusicalConcept[] = concepts,
): readonly MusicalConcept[] {
  const completed = new Set(completedIds);
  const pathConceptIds = pathId
    ? paths.find(({ id }) => id === pathId)?.conceptIds
    : undefined;
  if (pathId && !pathConceptIds) throw new RangeError(`Unknown learning path '${pathId}'.`);
  return allConcepts.filter((concept) =>
    (!pathConceptIds || pathConceptIds.includes(concept.id)) && completed.has(concept.id),
  );
}

export function getLockedConcepts(
  completedIds: Iterable<string> = [],
  pathId?: string,
  paths: readonly LearningPath[] = learningPaths,
  allConcepts: readonly MusicalConcept[] = concepts,
): readonly MusicalConcept[] {
  const completed = new Set(completedIds);
  const pathConceptIds = pathId
    ? paths.find(({ id }) => id === pathId)?.conceptIds
    : undefined;
  if (pathId && !pathConceptIds) throw new RangeError(`Unknown learning path '${pathId}'.`);
  return allConcepts.filter((concept) =>
    (!pathConceptIds || pathConceptIds.includes(concept.id)) &&
    !completed.has(concept.id) && !prerequisitesSatisfied(concept.id, completed, allConcepts),
  );
}
