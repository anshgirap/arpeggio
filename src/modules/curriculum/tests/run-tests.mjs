import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const curriculumRoot = join(repositoryRoot, "src", "modules", "curriculum");
const temporaryBuild = mkdtempSync(join(tmpdir(), "arpeggio-curriculum-"));
const tsc = join(repositoryRoot, "node_modules", "typescript", "bin", "tsc");

try {
  execFileSync(process.execPath, [
    tsc,
    "--module", "commonjs",
    "--target", "ES2022",
    "--moduleResolution", "node",
    "--rootDir", curriculumRoot,
    "--outDir", temporaryBuild,
    "--skipLibCheck",
    "--strict",
    "--esModuleInterop",
    join(curriculumRoot, "index.ts"),
    join(curriculumRoot, "persistent-progress.ts"),
  ], { cwd: repositoryRoot, stdio: "inherit" });

  execFileSync(process.execPath, ["--test", join(curriculumRoot, "tests", "curriculum.test.mjs"), join(curriculumRoot, "tests", "progress.test.mjs")], {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: { ...process.env, ARPEGGIO_CURRICULUM_BUILD: temporaryBuild, ARPEGGIO_PROGRESS_BUILD: join(temporaryBuild, "persistent-progress.js") },
  });
} finally {
  rmSync(temporaryBuild, { recursive: true, force: true });
}
