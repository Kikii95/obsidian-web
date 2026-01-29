"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutProvider, type LayoutProviderProps } from "@/contexts/layout-context";
import { UnifiedHeader } from "./unified-header";
import { UnifiedSidebar, SidebarHeader } from "./unified-sidebar";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { NetworkStatus } from "@/components/ui/network-status";
import { QuickSwitcher } from "@/components/navigation/quick-switcher";
import { ScrollRestoration } from "@/components/navigation/scroll-restoration";
import { DynamicPwaMeta } from "@/components/pwa/dynamic-pwa-meta";
import { IosPwaPrompt } from "@/components/pwa/ios-pwa-prompt";
import { FolderOpen, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLayoutFeatures } from "@/types/layout";
import type { VaultFile } from "@/types";
import type { BreadcrumbItem, ShareMetadata, TempMetadata } from "@/types/layout";

interface UniversalLayoutBaseProps {
  children: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  sidebarHeader?: React.ReactNode;
  sidebarActions?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Custom sidebar content (bypasses UnifiedSidebar) */
  customSidebar?: React.ReactNode;
  /** Whether to show sidebar at all */
  showSidebar?: boolean;
  className?: string;
}

type UniversalLayoutProps = UniversalLayoutBaseProps & LayoutProviderProps;

/**
 * Universal layout component
 * Wraps children with LayoutProvider and renders header, sidebar, and main content
 */
export function UniversalLayout(props: UniversalLayoutProps) {
  const {
    children,
    breadcrumb,
    sidebarHeader,
    sidebarActions,
    headerLeft,
    headerCenter,
    headerRight,
    customSidebar,
    showSidebar = true,
    className,
    ...providerProps
  } = props;

  const { mode, tree, metadata, permissions } = providerProps;
  const features = getLayoutFeatures(mode);

  return (
    <LayoutProvider {...providerProps}>
      <UniversalLayoutContent
        breadcrumb={breadcrumb}
        sidebarHeader={sidebarHeader}
        sidebarActions={sidebarActions}
        headerLeft={headerLeft}
        headerCenter={headerCenter}
        headerRight={headerRight}
        customSidebar={customSidebar}
        showSidebar={showSidebar}
        className={className}
        features={features}
        mode={mode}
        tree={tree}
        metadata={metadata}
      >
        {children}
      </UniversalLayoutContent>
    </LayoutProvider>
  );
}

interface LayoutContentProps {
  children: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  sidebarHeader?: React.ReactNode;
  sidebarActions?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerRight?: React.ReactNode;
  customSidebar?: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
  features: ReturnType<typeof getLayoutFeatures>;
  mode: string;
  tree: VaultFile[];
  metadata: LayoutProviderProps["metadata"];
}

function UniversalLayoutContent({
  children,
  breadcrumb,
  sidebarHeader,
  sidebarActions,
  headerLeft,
  headerCenter,
  headerRight,
  customSidebar,
  showSidebar = true,
  className,
  features,
  mode,
  tree,
  metadata,
}: LayoutContentProps) {
  // Build href function based on mode
  const buildHref = (file: VaultFile): string | null => {
    if (file.type === "dir") {
      return null; // Directories handled by toggle
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (mode === "dashboard") {
      if (ext === "md") {
        return `/note/${encodeURIComponent(file.path.replace(/\.md$/, ""))}`;
      }
      if (["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "mp4", "webm"].includes(ext)) {
        return `/file/${encodeURIComponent(file.path.replace(/\.[^.]+$/, ""))}`;
      }
      if (ext === "canvas") {
        return `/canvas/${encodeURIComponent(file.path.replace(/\.canvas$/, ""))}`;
      }
      return null;
    }

    if (mode === "share") {
      const shareMeta = metadata as ShareMetadata;
      const { token } = shareMeta;
      if (ext === "md") {
        return `/s/${token}/note/${encodeURIComponent(file.path.replace(/\.md$/, ""))}`;
      }
      if (["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "mp4", "webm"].includes(ext)) {
        return `/s/${token}/file/${encodeURIComponent(file.path.replace(/\.[^.]+$/, ""))}`;
      }
      return null;
    }

    if (mode === "temp") {
      const tempMeta = metadata as TempMetadata;
      const { owner, repo, branch } = tempMeta;
      const params = new URLSearchParams();
      if (branch) params.set("branch", branch);
      const query = params.toString() ? `?${params}` : "";

      if (ext === "md") {
        return `/t/${owner}/${repo}/note/${encodeURIComponent(file.path.replace(/\.md$/, ""))}${query}`;
      }
      if (["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "mp4", "webm"].includes(ext)) {
        return `/t/${owner}/${repo}/file/${encodeURIComponent(file.path.replace(/\.[^.]+$/, ""))}${query}`;
      }
      // Code files
      if (["js", "ts", "tsx", "jsx", "py", "c", "cpp", "h", "hpp", "java", "go", "rs"].includes(ext)) {
        return `/t/${owner}/${repo}/code/${encodeURIComponent(file.path)}${query}`;
      }
      return null;
    }

    return null;
  };

  // Default sidebar header based on mode
  const defaultSidebarHeader = () => {
    if (mode === "share") {
      const shareMeta = metadata as ShareMetadata;
      return (
        <SidebarHeader
          title={shareMeta.folderPath.split("/").pop() || "Folder"}
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
        />
      );
    }
    if (mode === "temp") {
      const tempMeta = metadata as TempMetadata;
      return (
        <SidebarHeader
          title={`${tempMeta.owner}/${tempMeta.repo}`}
          icon={<Github className="h-5 w-5" />}
        />
      );
    }
    return null;
  };

  const sidebarVariant = features.sidebar.resizable ? "resizable" : "collapsible";

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", className)}>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header */}
      <UnifiedHeader
        left={headerLeft}
        center={headerCenter}
        right={headerRight}
        breadcrumb={breadcrumb}
      />

      {/* Scroll progress (dashboard only) */}
      {features.extras.scrollProgress && <ScrollProgress />}

      {/* Main with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - custom or unified */}
        {showSidebar && customSidebar}
        {showSidebar && !customSidebar && tree.length > 0 && (
          <UnifiedSidebar
            variant={sidebarVariant}
            header={sidebarHeader ?? defaultSidebarHeader()}
            actions={sidebarActions}
            tree={tree}
            buildHref={buildHref}
            search={features.sidebar.showSearch}
            showIcons={true}
            enableSelection={features.sidebar.showSelection}
          />
        )}

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {children}
        </main>
      </div>

      {/* Extras (dashboard only) */}
      {features.extras.networkStatus && <NetworkStatus />}
      {features.extras.quickSwitcher && <QuickSwitcher />}
      {features.extras.scrollRestoration && <ScrollRestoration />}
      <ScrollToTop />
      {features.extras.pwaMeta && <DynamicPwaMeta />}
      {features.extras.pwaMeta && <IosPwaPrompt />}
    </div>
  );
}

// Re-export components for convenience
export { SidebarHeader } from "./unified-sidebar";
