"use client";

import { NetworkStatus } from "@/components/ui/network-status";
import { QuickSwitcher } from "@/components/navigation/quick-switcher";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { WhatsNewModal } from "@/components/ui/whats-new-modal";
import { ScrollRestoration } from "@/components/navigation/scroll-restoration";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { DynamicPwaMeta } from "@/components/pwa/dynamic-pwa-meta";
import { IosPwaPrompt } from "@/components/pwa/ios-pwa-prompt";
import { QuickCaptureFAB } from "@/components/capture/quick-capture-fab";

interface DashboardOverlaysProps {
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  whatsNewOpen: boolean;
  setWhatsNewOpen: (open: boolean) => void;
}

export function DashboardOverlays({
  shortcutsOpen,
  setShortcutsOpen,
  whatsNewOpen,
  setWhatsNewOpen,
}: DashboardOverlaysProps) {
  return (
    <>
      {/* Network Status Indicator */}
      <NetworkStatus />

      {/* Quick Switcher (Ctrl+P) */}
      <QuickSwitcher />

      {/* Keyboard Shortcuts Modal (? or Ctrl+/) */}
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* What's New Modal */}
      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />

      {/* Scroll Restoration */}
      <ScrollRestoration />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Dynamic PWA Meta Tags (updates on theme change) */}
      <DynamicPwaMeta />

      {/* iOS Add to Home Screen Prompt */}
      <IosPwaPrompt />

      {/* Quick Capture FAB */}
      <QuickCaptureFAB />
    </>
  );
}
