const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

export class LineBuffer {
  private remainder = "";

  push(chunk: string): string[] {
    const normalized = (this.remainder + chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const parts = normalized.split("\n");
    this.remainder = parts.pop() ?? "";
    return parts;
  }

  flush(): string[] {
    if (!this.remainder) return [];
    const last = this.remainder;
    this.remainder = "";
    return [last];
  }
}
