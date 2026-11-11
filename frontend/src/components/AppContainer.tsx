"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryProvider } from "@/providers/QueryProvider";

type AppContainerProps = {
  children: React.ReactNode;
};

// Note: this app uses a single fixed retro-disco theme (see theme.css) with no
// light/dark toggle, so next-themes' <ThemeProvider> is intentionally omitted here —
// it injects a raw <script> tag into the tree to avoid theme-flash, which newer
// React/Next versions flag as a console warning. <Toaster> falls back to its
// default "system" theme value fine without a provider.
export default function AppContainer({ children }: AppContainerProps) {
  return (
    <QueryProvider>
      <TooltipProvider>
        <Toaster richColors duration={5000} closeButton />
        {children}
      </TooltipProvider>
    </QueryProvider>
  );
}
