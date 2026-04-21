"use client";

import { useMemo, useState } from "react";
import type { ColorKey, Provider } from "@/lib/shared";
import { HANDLE_PATTERN } from "@/lib/shared";
import { api } from "@/lib/api";
import { Modal } from "./Modal";

const PROVIDERS: { value: Provider; label: string; defaultCmd: string }[] = [
  { value: "claude-code", label: "claude code", defaultCmd: "claude-code" },
  { value: "opencode", label: "opencode", defaultCmd: "opencode" },
  { value: "aider", label: "aider", defaultCmd: "aider" },
  { value: "custom", label: "custom", defaultCmd: "" },
];

const COLORS: { key: ColorKey; tone: string }[] = [
  { key: "accent", tone: "bg-accent" },
  { key: "blue", tone: "bg-kind-blue" },
  { key: "violet", tone: "bg-kind-violet" },
  { key: "amber", tone: "bg-kind-amber" },
  { key: "green", tone: "bg-kind-green" },
  { key: "pink", tone: "bg-kind-pink" },
  { key: "cyan", tone: "bg-kind-cyan" },
  { key: "orange", tone: "bg-kind-orange" },
];

export function AttachTerminalModal({
  open,
  onClose,
  onAttached,
}: {
  open: boolean;
  onClose: () => void;
  onAttached: (handle: string) => void;
}) {
  const [handle, setHandle] = useState("");
  const [repoLabel, setRepoLabel] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [provider, setProvider] = useState<Provider>("claude-code");
  const [launchCmd, setLaunchCmd] = useState("claude-code");
  const [colorKey, setColorKey] = useState<ColorKey>("accent");
  const [avatar, setAvatar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoAvatar = useMemo(() => {
    if (avatar.trim()) return avatar.trim().slice(0, 2);
    if (handle.length >= 2) return handle.slice(0, 2);
    return handle || "??";
  }, [avatar, handle]);

  const validationError = useMemo(() => {
    if (!HANDLE_PATTERN.test(handle)) return "handle must match ^[a-z][a-z0-9-]{1,23}$";
    if (!repoLabel.trim()) return "repo label required";
    if (!repoPath.trim() || !repoPath.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(repoPath))
      return "repo path must be absolute";
    if (!launchCmd.trim()) return "launch command required";
    return null;
  }, [handle, repoLabel, repoPath, launchCmd]);

  const onSubmit = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createAgent({
        handle,
        repoLabel: repoLabel.trim(),
        repoPath: repoPath.trim(),
        provider,
        launchCmd: launchCmd.trim(),
        colorKey,
        avatarText: autoAvatar,
      });
      onAttached(handle);
      onClose();
      setHandle("");
      setRepoLabel("");
      setRepoPath("");
      setLaunchCmd("claude-code");
      setAvatar("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-fade outline-none focus:border-accent";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="attach terminal"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] border border-border text-text-dim hover:text-text rounded-xs"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting || !!validationError}
            className="px-3 py-1.5 text-[11px] bg-accent text-bg font-semibold rounded-xs disabled:opacity-40"
          >
            {submitting ? "attaching…" : "attach"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-1 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">handle</span>
          <input
            className={field}
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            placeholder="athena"
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">avatar (2 chars)</span>
          <input
            className={field}
            value={avatar}
            onChange={(e) => setAvatar(e.target.value.slice(0, 2))}
            placeholder={autoAvatar}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">repo label</span>
          <input
            className={field}
            value={repoLabel}
            onChange={(e) => setRepoLabel(e.target.value)}
            placeholder="billing-service"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">repo path (absolute)</span>
          <input
            className={field}
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/Users/me/repos/billing-service"
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">provider</span>
          <select
            className={field}
            value={provider}
            onChange={(e) => {
              const p = e.target.value as Provider;
              setProvider(p);
              const def = PROVIDERS.find((x) => x.value === p)?.defaultCmd ?? "";
              if (def) setLaunchCmd(def);
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">launch cmd</span>
          <input
            className={field}
            value={launchCmd}
            onChange={(e) => setLaunchCmd(e.target.value)}
          />
        </label>
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widen text-text-fade">color</span>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColorKey(c.key)}
                aria-pressed={colorKey === c.key}
                className={`w-6 h-6 rounded-md ${c.tone} ring-2 ring-offset-1 ring-offset-bg-elev ${colorKey === c.key ? "ring-accent" : "ring-transparent"}`}
              />
            ))}
          </div>
        </div>
      </div>
      {error && <div className="mt-3 text-[11px] text-kind-red">{error}</div>}
    </Modal>
  );
}
