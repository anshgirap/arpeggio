import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const build = process.env.ARPEGGIO_CURRICULUM_BUILD;
if (!build) throw new Error("ARPEGGIO_CURRICULUM_BUILD must point to the compiled curriculum module.");
const curriculum = await import(pathToFileURL(`${build}/index.js`));

test("initial curriculum definitions are internally consistent and acyclic", () => {
  assert.doesNotThrow(() => curriculum.validateCurriculum());
  assert.equal(curriculum.concepts.length, 10);
  assert.equal(curriculum.learningPaths.length, 3);
  assert.equal(curriculum.LEARNING_STAGES.length, 5);
});

test("prerequisite checks unlock independent beginner branches", () => {
  assert.equal(curriculum.prerequisitesSatisfied("sound-listening", new Set()), true);
  assert.equal(curriculum.prerequisitesSatisfied("pulse", new Set(["sound-listening"])), true);
  assert.equal(curriculum.prerequisitesSatisfied("basic-rhythm", new Set(["sound-listening", "pulse"])), false);
  assert.equal(curriculum.prerequisitesSatisfied("basic-rhythm", new Set(["pulse", "tempo"])), true);
});

test("path progress separates completed, available and locked concepts", () => {
  const initial = curriculum.getPathProgress("music-foundations");
  assert.deepEqual(initial.availableConceptIds, ["sound-listening"]);
  assert.equal(initial.lockedConceptIds.length, 9);

  const afterListening = curriculum.getPathProgress("music-foundations", ["sound-listening"]);
  assert.deepEqual(afterListening.completedConceptIds, ["sound-listening"]);
  assert.deepEqual(afterListening.availableConceptIds, ["pitch", "pulse"]);
  assert.deepEqual(curriculum.getAvailableConcepts(["sound-listening"], "rhythm").map(({ id }) => id), ["pulse"]);
  assert.deepEqual(curriculum.getCompletedConcepts(["sound-listening"], "rhythm").map(({ id }) => id), ["sound-listening"]);
  assert.deepEqual(curriculum.getLockedConcepts(["sound-listening"], "rhythm").map(({ id }) => id), ["tempo", "basic-rhythm"]);
});

test("invalid references, duplicate identifiers and prerequisite cycles are rejected", () => {
  const path = { id: "p", name: "P", description: "", objectives: [], conceptIds: ["a"], level: 1 };
  const concept = { id: "a", name: "A", description: "", objectives: [], prerequisiteIds: [], relatedIds: [], pathIds: ["p"], level: 1 };
  assert.throws(() => curriculum.validateCurriculum([path], [concept, concept]), curriculum.CurriculumDefinitionError);
  assert.throws(() => curriculum.validateCurriculum([path], [{ ...concept, prerequisiteIds: ["missing"] }]), /Unknown prerequisite/);
  const a = { ...concept, prerequisiteIds: ["b"] };
  const b = { ...concept, id: "b", prerequisiteIds: ["a"] };
  assert.throws(() => curriculum.validateCurriculum([{ ...path, conceptIds: ["a", "b"] }], [a, b]), /cycle/);
});

test("unknown paths fail explicitly", () => {
  assert.throws(() => curriculum.getPathProgress("missing"), /Unknown learning path/);
  assert.throws(() => curriculum.getAvailableConcepts([], "missing"), /Unknown learning path/);
});
