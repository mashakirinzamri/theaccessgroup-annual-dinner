import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Before vs After — Code Fix Comparison",
  description: "Side-by-side comparison of the code before and after the console error fix.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-[13px] leading-relaxed text-neutral-100">
      <code>{children}</code>
    </pre>
  );
}

const BEFORE_APPCONTAINER = `"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider"; // <-- the troublemaker

export default function AppContainer({ children }) {
  return (
    <QueryProvider>
      {/* ThemeProvider secretly injects a <script> tag into the page
          to set light/dark mode before it paints. That's what triggers
          the "Encountered a script tag" warning. */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster richColors duration={5000} closeButton />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}`;

const AFTER_APPCONTAINER = `"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryProvider } from "@/providers/QueryProvider";

// This app only ever uses ONE fixed retro-disco theme — there is no
// light/dark switch anywhere — so ThemeProvider was doing nothing
// useful except causing the warning. It has simply been removed.
export default function AppContainer({ children }) {
  return (
    <QueryProvider>
      <TooltipProvider>
        <Toaster richColors duration={5000} closeButton />
        {children}
      </TooltipProvider>
    </QueryProvider>
  );
}`;

export default function ComparePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 text-neutral-900">
      <a href="/" className="text-sm text-teal-700 underline">
        ← Back to the Annual Dinner app
      </a>

      <h1 className="mt-4 text-2xl font-extrabold">Before vs. After — Why the Error Box Showed Up</h1>
      <p className="mt-2 text-sm text-neutral-600">
        This page is just for comparison. It is not part of the event app — it exists so you can see, in plain
        terms, exactly what changed and why.
      </p>

      {/* Plain-language summary */}
      <section className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="text-lg font-bold">What was wrong, in one sentence</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          One piece of the starter template (a &quot;light/dark mode&quot; helper called{" "}
          <code className="rounded bg-neutral-200 px-1 py-0.5 text-[12px]">ThemeProvider</code>) was quietly adding a{" "}
          <code className="rounded bg-neutral-200 px-1 py-0.5 text-[12px]">&lt;script&gt;</code> tag to the page.
          Modern browsers now complain loudly when that happens. Since this event app only ever uses one fixed
          disco theme — no light/dark switch exists anywhere in it — that helper wasn&apos;t needed at all, so it
          was removed.
        </p>
      </section>

      {/* Side by side */}
      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">BEFORE (broken)</span>
          </div>
          <p className="mb-2 text-xs text-neutral-500">frontend/src/components/AppContainer.tsx</p>
          <CodeBlock>{BEFORE_APPCONTAINER}</CodeBlock>
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
            <li>Wraps the whole app in ThemeProvider</li>
            <li>ThemeProvider injects a hidden script tag</li>
            <li>Browser logs a console error about it</li>
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">AFTER (fixed)</span>
          </div>
          <p className="mb-2 text-xs text-neutral-500">frontend/src/components/AppContainer.tsx</p>
          <CodeBlock>{AFTER_APPCONTAINER}</CodeBlock>
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
            <li>ThemeProvider is gone completely</li>
            <li>No script tag gets injected</li>
            <li>No console error — app looks and works exactly the same</li>
          </ul>
        </div>
      </section>

      {/* What stayed the same */}
      <section className="mt-8 rounded-xl border border-neutral-200 p-5">
        <h2 className="text-lg font-bold">What did NOT change</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          Nothing about how the event app looks, feels, or works was touched. Check-in, the lucky draw, best dress
          voting, the mini game, feedback, the dashboard — all identical. This fix only removed one unused helper
          that wasn&apos;t doing any visible job.
        </p>
      </section>

      {/* Still seeing the old error */}
      <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-amber-900">Still see the red error box on the main app?</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          That box is old and stuck on screen from before this fix — browser tabs don&apos;t always notice code has
          changed underneath them. Do a full hard reload of that tab:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
          <li>Windows/Linux: hold Ctrl + Shift + R</li>
          <li>Mac: hold Cmd + Shift + R</li>
          <li>Or just close the tab and open the page again in a new one</li>
        </ul>
      </section>
    </main>
  );
}
