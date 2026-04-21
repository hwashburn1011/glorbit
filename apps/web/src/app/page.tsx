export default function HomePage() {
  return (
    <>
      <header className="[grid-area:topbar] border-b border-border bg-gradient-to-b from-[#0f1211] to-bg px-5 py-3 flex items-center gap-5">
        <div className="font-serif font-semibold text-[18px] tracking-[0.02em] text-accent flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--tw-shadow-color)] shadow-accent animate-pulse" />
          glorbit
          <span className="italic text-text-dim text-[12px] ml-1 font-normal">
            — agent room
          </span>
        </div>
        <div className="flex-1" />
      </header>

      <aside className="[grid-area:sidebar] border-r border-border bg-bg-panel overflow-y-auto" />

      <main className="[grid-area:chat] grid grid-rows-[auto_auto_1fr_auto] min-h-0" />
    </>
  );
}
