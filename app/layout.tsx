import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Providers from "@/components/providers";
import { IconShield } from "@/components/icons";

export const metadata: Metadata = {
  title: "CSIT Butwal — Campus Platform",
  description: "Shared academic platform for CSIT campuses in Butwal: courses, attendance, assignments, anonymous discussion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
          Skip to content
        </a>
        <Providers>
          <Nav />
          <main id="main" className="wrap pb-28 pt-5 sm:pt-7 md:pb-24">{children}</main>
        <footer className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-slate-200 bg-white/95 py-3 backdrop-blur md:block">
          <div className="wrap flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">CSIT Butwal Campus Platform</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><IconShield className="h-4 w-4" />Discussion is anonymous by design</span>
            <a className="ml-auto font-medium text-brand-700 underline-offset-2 hover:underline" href="/privacy">Privacy boundary</a>
          </div>
        </footer>
        </Providers>
      </body>
    </html>
  );
}
