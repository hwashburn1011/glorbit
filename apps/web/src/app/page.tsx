import { Topbar } from "@/components/Topbar";

export default function HomePage() {
  return (
    <>
      <Topbar />
      <aside className="[grid-area:sidebar] border-r border-border bg-bg-panel overflow-y-auto" />
      <main className="[grid-area:chat] grid grid-rows-[auto_auto_1fr_auto] min-h-0" />
    </>
  );
}
