import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const musicRoot = join(repositoryRoot, "src", "modules", "music");
const temporaryBuild = mkdtempSync(join(tmpdir(), "arpeggio-music-engine-"));
const tsc = join(repositoryRoot, "node_modules", "typescript", "bin", "tsc");

try {
  execFileSync(process.execPath, [
    tsc,
    "--module", "commonjs",
    "--target", "ES2022",
    "--moduleResolution", "node",
    "--rootDir", musicRoot,
    "--outDir", temporaryBuild,
    "--skipLibCheck",
    "--strict",
    "--esModuleInterop",
    join(musicRoot, "index.ts"),
  ], { cwd: repositoryRoot, stdio: "inherit" });

  execFileSync(process.execPath, ["--test", join(musicRoot, "tests", "music-engine.test.mjs")], {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: { ...process.env, ARPEGGIO_MUSIC_ENGINE_BUILD: temporaryBuild },
  });
} finally {
  rmSync(temporaryBuild, { recursive: true, force: true });
}
