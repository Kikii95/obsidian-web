"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Search,
  Loader2,
  GitBranch,
  Star,
  Lock,
  ExternalLink,
  X,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  default_branch: string;
  owner: {
    login: string;
  };
}

interface GitHubOrg {
  login: string;
  avatar_url: string;
}

export function ExploreRepoDialog() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [userOrgs, setUserOrgs] = useState<GitHubOrg[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user repos when dialog opens (if authenticated)
  useEffect(() => {
    if (open && session && userRepos.length === 0) {
      fetchUserRepos();
    }
  }, [open, session]);

  const fetchUserRepos = async () => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const res = await fetch("/api/github/repos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      console.log("[ExploreDialog] Repos API response:", data.debug);
      console.log("[ExploreDialog] Organizations:", data.organizations);
      setUserRepos(data.repos || []);
      setUserOrgs(data.organizations || []);
    } catch (err) {
      console.error("Failed to fetch repos:", err);
      setError("Impossible de charger vos repos");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Filter repos based on search
  const filteredRepos = userRepos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if search is a valid owner/repo format
  const isValidRepoPath = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(search.trim());

  const handleNavigate = useCallback(
    (repoPath: string) => {
      setOpen(false);
      setSearch("");
      router.push(`/t/${repoPath}`);
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidRepoPath) {
      handleNavigate(search.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Explorer un repo public">
          <Globe className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Explorer un repo GitHub
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="owner/repo (ex: obsidianmd/obsidian-help)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Direct navigation hint */}
          {search && isValidRepoPath && (
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start gap-2 min-w-0"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Ouvrir <span className="font-mono text-primary">{search}</span>
              </span>
            </Button>
          )}

          {/* User repos section (if authenticated) */}
          {session && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Vos repositories
                {isLoadingRepos && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-1">
                  {filteredRepos.length === 0 && !isLoadingRepos && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {search ? "Aucun repo trouvé" : "Aucun repo"}
                    </p>
                  )}

                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.full_name}
                      type="button"
                      onClick={() => handleNavigate(repo.full_name)}
                      className={cn(
                        "w-full min-w-0 text-left px-3 py-2 rounded-md text-sm",
                        "hover:bg-muted transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate min-w-0 flex-1">
                          {repo.full_name}
                        </span>
                        {repo.private && (
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate min-w-0 mt-0.5">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 shrink-0">
                          <GitBranch className="h-3 w-3" />
                          {repo.default_branch}
                        </span>
                        {repo.stargazers_count > 0 && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Not authenticated hint */}
          {!session && (
            <p className="text-sm text-muted-foreground text-center">
              Connectez-vous pour voir vos repos GitHub
            </p>
          )}

          {/* Organization shortcuts (only if orgs available) */}
          {session && userOrgs.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Organisations
              </div>
              <div className="flex flex-wrap gap-2">
                {userOrgs.map((org) => (
                  <Button
                    key={org.login}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch(`${org.login}/`)}
                    className="text-xs gap-1.5"
                  >
                    {org.avatar_url && (
                      <img
                        src={org.avatar_url}
                        alt={org.login}
                        className="h-4 w-4 rounded-sm"
                      />
                    )}
                    {org.login}/
                  </Button>
                ))}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
