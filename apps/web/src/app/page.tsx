"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatPane } from "@/components/ChatPane";
import { AttachTerminalModal } from "@/components/AttachTerminalModal";
import { useGlorbit } from "@/lib/provider";

export default function HomePage() {
  const { store } = useGlorbit();
  const [attachOpen, setAttachOpen] = useState(false);

  return (
    <>
      <Topbar />
      <Sidebar onAttach={() => setAttachOpen(true)} />
      <ChatPane />
      <AttachTerminalModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onAttached={(handle) => store.setSelection({ kind: "agent", handle })}
      />
    </>
  );
}
