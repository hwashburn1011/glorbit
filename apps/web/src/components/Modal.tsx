"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "sm" ? "w-[420px]" : "w-[560px]";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/70 backdrop-blur-sm">
      <div className={`${width} bg-bg-elev border border-border-hot rounded-sm shadow-2xl`}>
        <div className="px-4 py-3 border-b border-border flex items-center">
          <div className="font-serif italic text-text text-[14px]">{title}</div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-text-fade hover:text-text text-[14px] px-2 leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
