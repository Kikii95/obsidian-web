import type { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { owner, repo } = await params;

  return {
    title: `${owner}/${repo} | Temp Vault Reader`,
    description: `Browse ${owner}/${repo} as an Obsidian vault`,
  };
}

export default function TempVaultLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
