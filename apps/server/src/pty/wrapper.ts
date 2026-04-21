import { spawn, type IPty } from "node-pty";
import os from "node:os";

export interface SpawnPtyOptions {
  launchCmd: string;
  cwd: string;
  cols?: number;
  rows?: number;
  env?: NodeJS.ProcessEnv;
}

export interface PtyHandle {
  pid: number;
  write(data: string): void;
  writeLine(data: string): void;
  kill(signal?: NodeJS.Signals): void;
  interrupt(): void;
  resize(cols: number, rows: number): void;
  onData(cb: (data: string) => void): () => void;
  onExit(cb: (exitCode: number | null) => void): () => void;
  raw(): IPty;
}

function defaultShell(): string {
  if (os.platform() === "win32") {
    return process.env.COMSPEC ?? "cmd.exe";
  }
  return process.env.SHELL ?? "/bin/bash";
}

export function spawnPty(opts: SpawnPtyOptions): PtyHandle {
  const shell = defaultShell();
  const args =
    os.platform() === "win32" ? ["/d", "/s", "/c", opts.launchCmd] : ["-lc", opts.launchCmd];

  const pty = spawn(shell, args, {
    name: "xterm-256color",
    cols: opts.cols ?? 120,
    rows: opts.rows ?? 30,
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env, TERM: "xterm-256color", GLORBIT: "1" },
  });

  const dataHandlers = new Set<(data: string) => void>();
  const exitHandlers = new Set<(code: number | null) => void>();

  pty.onData((d) => {
    for (const h of dataHandlers) h(d);
  });
  pty.onExit(({ exitCode }) => {
    for (const h of exitHandlers) h(exitCode);
  });

  return {
    pid: pty.pid,
    write(data) {
      pty.write(data);
    },
    writeLine(data) {
      pty.write(data.endsWith("\n") ? data : data + "\n");
    },
    kill(signal) {
      try {
        pty.kill(signal);
      } catch {
        // pty already dead
      }
    },
    interrupt() {
      pty.write("\x03");
    },
    resize(cols, rows) {
      try {
        pty.resize(cols, rows);
      } catch {
        // pty already dead
      }
    },
    onData(cb) {
      dataHandlers.add(cb);
      return () => dataHandlers.delete(cb);
    },
    onExit(cb) {
      exitHandlers.add(cb);
      return () => exitHandlers.delete(cb);
    },
    raw() {
      return pty;
    },
  };
}
