import { RootProvider } from "fumadocs-ui/provider/next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import "./global.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, fontMono.variable, "font-sans antialiased")}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
