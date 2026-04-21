import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "glorbit — agent room",
  description: "A unified chat inbox for parallel AI terminal sessions.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-root h-screen grid grid-rows-[auto_1fr] grid-cols-[288px_1fr] [grid-template-areas:'topbar_topbar''sidebar_chat']">
          {children}
        </div>
      </body>
    </html>
  );
}
