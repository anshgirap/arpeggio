import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const temp = mkdtempSync(join(tmpdir(), "arpeggio-sandbox-"));
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
try {
  execFileSync(process.execPath, [tsc, "--module", "commonjs", "--target", "ES2022", "--moduleResolution", "node", "--rootDir", join(root, "src", "modules"), "--outDir", temp, "--skipLibCheck", "--strict", "--esModuleInterop", join(root, "src", "modules", "music-sandbox", "index.ts")], { cwd: root, stdio: "inherit" });
  execFileSync(process.execPath, ["--test", join(root, "src", "modules", "music-sandbox", "tests", "music-sandbox.test.mjs")], { cwd: root, stdio: "inherit", env: { ...process.env, ARPEGGIO_SANDBOX_BUILD: temp } });
} finally { rmSync(temp, { recursive: true, force: true }); }
