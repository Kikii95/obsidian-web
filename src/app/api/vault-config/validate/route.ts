import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit } from "@/lib/github";

/**
 * POST /api/vault-config/validate
 * Validate that a vault repo exists and is accessible
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, branch = "main" } = body;

    if (!owner || !repo) {
      return NextResponse.json({
        valid: false,
        error: "owner et repo sont requis",
      });
    }

    const octokit = createOctokit(session.accessToken);

    try {
      // Check if repo exists and is accessible
      const { data: repoData } = await octokit.repos.get({
        owner,
        repo,
      });

      // Check if branch exists
      try {
        await octokit.repos.getBranch({
          owner,
          repo,
          branch,
        });
      } catch (branchError: unknown) {
        if (branchError && typeof branchError === "object" && "status" in branchError && branchError.status === 404) {
          return NextResponse.json({
            valid: false,
            error: `La branche "${branch}" n'existe pas dans ce repository`,
          });
        }
        throw branchError;
      }

      // Check permissions (need at least write access for saving)
      const permissions = repoData.permissions;
      if (!permissions?.push) {
        return NextResponse.json({
          valid: false,
          error: "Vous n'avez pas les permissions d'écriture sur ce repository",
        });
      }

      return NextResponse.json({
        valid: true,
        repoInfo: {
          name: repoData.name,
          fullName: repoData.full_name,
          private: repoData.private,
          defaultBranch: repoData.default_branch,
        },
      });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error) {
        if (error.status === 404) {
          return NextResponse.json({
            valid: false,
            error: "Repository non trouvé. Vérifiez le propriétaire et le nom.",
          });
        }
        if (error.status === 403) {
          return NextResponse.json({
            valid: false,
            error: "Accès refusé. Vous n'avez pas accès à ce repository.",
          });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error validating vault config:", error);
    return NextResponse.json(
      { valid: false, error: "Erreur lors de la validation" },
      { status: 500 }
    );
  }
}
