"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Sidebar } from "@/components/Sidebar";

export default function HomePage() {
  const [attachOpen, setAttachOpen] = useState(false);
  return (
    <>
      <Topbar />
      <Sidebar onAttach={() => setAttachOpen(true)} />
      <main className="[grid-area:chat] grid grid-rows-[auto_auto_1fr_auto] min-h-0" />
      {attachOpen && null /* modal lands in epic 17 */}
    </>
  );
}
