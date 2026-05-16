/**
 * Spawn pack_service.py (loads & runs environment/env2.ipynb logic).
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.join(__dirname, "python", "pack_service.py");
const ENV2_NOTEBOOK = path.resolve(__dirname, "../../environment/env2.ipynb");
const REPO_ROOT = path.resolve(__dirname, "../..");
const AI_ALGORITHMS = path.join(REPO_ROOT, "AI_algorithms");

const PYTHON_CANDIDATES =
  process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];

/**
 * @param {object} payload
 * @param {{ timeoutMs?: number }} [opts]
 */
export function runPythonPack(payload, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const trySpawn = (index) => {
      if (index >= PYTHON_CANDIDATES.length) {
        reject(
          new Error(
            "Python not found. Install Python 3 and ensure `python` or `py` is on PATH."
          )
        );
        return;
      }

      const cmd = PYTHON_CANDIDATES[index];
      const args =
        cmd === "py" ? ["-3", PYTHON_SCRIPT] : [PYTHON_SCRIPT];

      const pathSep = process.platform === "win32" ? ";" : ":";
      const pyPath = [AI_ALGORITHMS, process.env.PYTHONPATH]
        .filter(Boolean)
        .join(pathSep);

      const child = spawn(cmd, args, {
        env: {
          ...process.env,
          ENV2_NOTEBOOK_PATH: ENV2_NOTEBOOK,
          PYTHONPATH: pyPath,
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGTERM");
        reject(new Error(`Python packer timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => {
        if (settled) return;
        if (err.code === "ENOENT") {
          trySpawn(index + 1);
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(err);
      });

      child.on("close", (code) => {
        if (settled) return;

        const spawnMissing =
          code === 9009 ||
          code === -4058 ||
          (code !== 0 && !stdout.trim() && /not found|introuvable/i.test(stderr));

        if (spawnMissing && index + 1 < PYTHON_CANDIDATES.length) {
          settled = true;
          clearTimeout(timer);
          trySpawn(index + 1);
          return;
        }

        settled = true;
        clearTimeout(timer);

        let parsed;
        try {
          parsed = stdout.trim() ? JSON.parse(stdout) : {};
        } catch {
          reject(
            new Error(
              `Invalid JSON from Python packer (exit ${code}). stderr: ${stderr.slice(0, 500)}`
            )
          );
          return;
        }

        if (code !== 0 || parsed.error) {
          reject(
            new Error(
              parsed.error ||
                parsed.detail ||
                stderr ||
                `Python packer failed with exit code ${code}. Is Python 3 installed?`
            )
          );
          return;
        }

        resolve(parsed);
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    };

    trySpawn(0);
  });
}

export { ENV2_NOTEBOOK };
