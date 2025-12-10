"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/ui/logo";
import {
  Check,
  Loader2,
  Github,
  FolderGit2,
  GitBranch,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useVaultConfigStore } from "@/lib/vault-config";

type Step = "welcome" | "config" | "validate" | "success";

interface ValidationResult {
  valid: boolean;
  error?: string;
  repoInfo?: {
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string;
  };
}

export default function SetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setConfig } = useVaultConfigStore();

  const [step, setStep] = useState<Step>("welcome");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill owner with current user's username
  useEffect(() => {
    if (session?.user?.username && !owner) {
      setOwner(session.user.username);
    }
  }, [session?.user?.username, owner]);

  // Check if already configured
  useEffect(() => {
    const checkExistingConfig = async () => {
      try {
        const response = await fetch("/api/vault-config");
        const data = await response.json();
        if (data.exists && data.config) {
          // Already configured, redirect to home
          setConfig(data.config);
          router.push("/");
        }
      } catch {
        // Ignore errors, user will configure
      }
    };

    if (status === "authenticated") {
      checkExistingConfig();
    }
  }, [status, router, setConfig]);

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      const response = await fetch("/api/vault-config/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, branch }),
      });

      const result = await response.json();
      setValidationResult(result);

      if (result.valid) {
        // Auto-update branch if different from what user entered
        if (result.repoInfo?.defaultBranch && result.repoInfo.defaultBranch !== branch) {
          setBranch(result.repoInfo.defaultBranch);
        }
        setStep("validate");
      }
    } catch (err) {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/vault-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, branch }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      const data = await response.json();

      // Save to local store
      setConfig({
        owner,
        repo,
        branch,
        configured: true,
      });

      setStep("success");

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo className="h-12 w-12" />
        </div>

        {/* Welcome Step */}
        {step === "welcome" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Bienvenue sur Obsidian Web</CardTitle>
              <CardDescription>
                Configurez votre vault GitHub pour commencer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>Accédez à vos notes Obsidian depuis n'importe où</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>Synchronisation automatique avec GitHub</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>Fonctionne hors-ligne avec PWA</p>
                </div>
              </div>

              <Button onClick={() => setStep("config")} className="w-full">
                Configurer mon vault
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Config Step */}
        {step === "config" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-primary" />
                Configuration du Vault
              </CardTitle>
              <CardDescription>
                Entrez les informations de votre repository GitHub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {validationResult && !validationResult.valid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationResult.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="owner" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    Propriétaire
                  </Label>
                  <Input
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Votre nom d'utilisateur GitHub ou une organisation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repo" className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4" />
                    Repository
                  </Label>
                  <Input
                    id="repo"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="obsidian-vault"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le nom du repository contenant votre vault
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Branche
                  </Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                  />
                  <p className="text-xs text-muted-foreground">
                    La branche à utiliser (généralement main ou master)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("welcome")}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleValidate}
                  disabled={!owner || !repo || isValidating}
                  className="flex-1"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      Vérifier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validate Step */}
        {step === "validate" && validationResult?.valid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Repository validé
              </CardTitle>
              <CardDescription>
                Votre vault est accessible et prêt à être configuré
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Repository</span>
                  <span className="text-sm font-medium">
                    {validationResult.repoInfo?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Branche</span>
                  <span className="text-sm font-medium">{branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Visibilité</span>
                  <span className="text-sm font-medium">
                    {validationResult.repoInfo?.private ? "Privé 🔒" : "Public 🌐"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("config");
                    setValidationResult(null);
                  }}
                  className="flex-1"
                >
                  Modifier
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      Confirmer
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Step */}
        {step === "success" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Configuration terminée !</CardTitle>
              <CardDescription>
                Votre vault est prêt. Redirection en cours...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
