"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatPane } from "@/components/ChatPane";
import { AttachTerminalModal } from "@/components/AttachTerminalModal";
import { TabTitleBinder } from "@/components/TabTitleBinder";
import { useGlorbit } from "@/lib/provider";

export default function HomePage() {
  const { store } = useGlorbit();
  const [attachOpen, setAttachOpen] = useState(false);

  return (
    <>
      <TabTitleBinder />
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
