"use client";

import { useEffect, useRef } from "react";
import type { SessionStreamEvent } from "@/lib/shared";
import { sessionWsUrl } from "@/lib/ws";

export function TerminalView({ agentId }: { agentId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      await import("@xterm/xterm/css/xterm.css");
      if (disposed) return;

      const term = new Terminal({
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 12,
        lineHeight: 1.25,
        cursorBlink: true,
        convertEol: true,
        disableStdin: true,
        scrollback: 5000,
        theme: {
          background: "#0b0d0c",
          foreground: "#d7dcd6",
          cursor: "#d4ff3a",
          black: "#0b0d0c",
          red: "#ff5c5c",
          green: "#6fcf7a",
          yellow: "#ffb84d",
          blue: "#7ab8ff",
          magenta: "#c49fff",
          cyan: "#7ee8e0",
          white: "#d7dcd6",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container);
      fit.fit();

      const handleResize = () => fit.fit();
      window.addEventListener("resize", handleResize);

      socket = new WebSocket(sessionWsUrl(agentId));
      socket.addEventListener("message", (e) => {
        try {
          const evt = JSON.parse(String(e.data)) as SessionStreamEvent;
          if (evt.type === "pty.data") term.write(evt.bytes);
          if (evt.type === "pty.exit") {
            term.writeln(`\r\n[session ended · exit ${evt.exitCode ?? "?"}]`);
          }
        } catch {
          // ignore malformed frames
        }
      });

      cleanup = () => {
        window.removeEventListener("resize", handleResize);
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      socket?.close();
      cleanup?.();
    };
  }, [agentId]);

  return <div ref={containerRef} className="w-full h-full bg-bg" />;
}
