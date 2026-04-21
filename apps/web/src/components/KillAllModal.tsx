"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Modal } from "./Modal";

export function KillAllModal({
  open,
  onClose,
  count,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
}) {
  const [submitting, setSubmitting] = useState(false);
  const confirm = async () => {
    setSubmitting(true);
    try {
      await api.killAll();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="kill all sessions"
      size="sm"
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
            onClick={() => void confirm()}
            disabled={submitting}
            className="px-3 py-1.5 text-[11px] bg-kind-red text-bg font-semibold rounded-xs disabled:opacity-40"
          >
            {submitting ? "killing…" : "kill all"}
          </button>
        </>
      }
    >
      <div className="text-[12px] text-text-dim leading-relaxed">
        This will send SIGTERM (then SIGKILL after 5s) to every live pty.{" "}
        <span className="text-kind-red font-semibold">{count}</span> session
        {count === 1 ? "" : "s"} will end. Transcripts and chat history stay on disk.
      </div>
    </Modal>
  );
}
