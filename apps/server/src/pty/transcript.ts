import fs from "node:fs";

const FLUSH_BYTES = 8 * 1024;
const FLUSH_MS = 2000;

export interface TranscriptWriter {
  append(chunk: string): void;
  flush(): Promise<void>;
  close(): Promise<void>;
  path(): string;
}

export function openTranscript(filePath: string): TranscriptWriter {
  const stream = fs.createWriteStream(filePath, { flags: "a" });
  let buffer = "";
  let timer: NodeJS.Timeout | null = null;

  const flushNow = () => {
    if (!buffer) return;
    const toWrite = buffer;
    buffer = "";
    stream.write(toWrite);
  };

  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flushNow();
    }, FLUSH_MS);
  };

  return {
    append(chunk: string) {
      buffer += chunk;
      if (Buffer.byteLength(buffer, "utf8") >= FLUSH_BYTES) {
        flushNow();
        return;
      }
      schedule();
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flushNow();
    },
    async close() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flushNow();
      await new Promise<void>((resolve) => stream.end(() => resolve()));
    },
    path() {
      return filePath;
    },
  };
}
