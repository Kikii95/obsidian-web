import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getShareContext } from "@/lib/server-share-context";
import { validateSharePath } from "@/lib/shares/validation";
import { getLastRateLimit } from "@/lib/github";
import { checkRateLimit, recordUpload } from "@/lib/deposit-rate-limit";
import { DEFAULT_DEPOSIT_CONFIG } from "@/types/shares";
import { isBinaryFile } from "@/lib/file-types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// Get client IP from request headers
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// Sanitize filename to prevent path traversal and invalid chars
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*\\/]/g, "_") // Remove invalid chars
    .replace(/\.{2,}/g, ".") // Remove consecutive dots
    .replace(/^\.+/, "") // Remove leading dots
    .slice(0, 100); // Limit length
}

// Generate unique filename with timestamp and nanoid
function generateUniqueFilename(originalName: string): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const uniqueId = nanoid(6);
  const sanitized = sanitizeFilename(originalName);
  return `${timestamp}_${uniqueId}_${sanitized}`;
}

// Get file extension (lowercase, with dot)
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * POST /api/shares/[token]/deposit - Upload file(s) in deposit mode
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const context = await getShareContext(token);

    if (!context) {
      return NextResponse.json(
        { error: "Partage non trouvé ou expiré" },
        { status: 404 }
      );
    }

    const { share, octokit, vaultConfig } = context;

    // Check deposit permission
    if (share.mode !== "deposit") {
      return NextResponse.json(
        { error: "Ce partage n'accepte pas les dépôts" },
        { status: 403 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit BEFORE processing files
    const rateLimitCheck = checkRateLimit(clientIP, token);
    if (!rateLimitCheck.allowed) {
      const message = rateLimitCheck.reason === "ip_limit"
        ? "Limite de téléchargements atteinte. Réessayez dans quelques minutes."
        : "Trop de fichiers déposés sur ce lien. Réessayez plus tard.";

      return NextResponse.json(
        {
          error: message,
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitCheck.retryAfter || 60),
          }
        }
      );
    }

    // Get deposit configuration from share or use defaults
    const depositConfig = {
      maxFileSize: share.depositMaxFileSize ?? DEFAULT_DEPOSIT_CONFIG.maxFileSize,
      allowedTypes: share.depositAllowedTypes
        ? JSON.parse(share.depositAllowedTypes) as string[]
        : DEFAULT_DEPOSIT_CONFIG.allowedTypes,
      depositFolder: share.depositFolder ?? DEFAULT_DEPOSIT_CONFIG.depositFolder,
    };

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Process each file
    const uploaded: { path: string; name: string; size: number }[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > depositConfig.maxFileSize) {
        const maxMB = Math.round(depositConfig.maxFileSize / (1024 * 1024));
        errors.push({
          name: file.name,
          error: `Fichier trop volumineux (max ${maxMB}MB)`,
        });
        continue;
      }

      // Validate file type if restricted
      if (depositConfig.allowedTypes && depositConfig.allowedTypes.length > 0) {
        const ext = getFileExtension(file.name);
        if (!depositConfig.allowedTypes.includes(ext)) {
          errors.push({
            name: file.name,
            error: `Type non autorisé (${ext})`,
          });
          continue;
        }
      }

      // Generate unique filename
      const uniqueName = generateUniqueFilename(file.name);

      // Build full path
      let basePath = share.folderPath;
      if (depositConfig.depositFolder) {
        basePath = `${basePath}/${depositConfig.depositFolder}`;
      }
      const fullPath = `${basePath}/${uniqueName}`;

      // Validate path is within share boundaries (should always pass but double-check)
      if (!validateSharePath(fullPath, share.folderPath, share.includeSubfolders)) {
        errors.push({
          name: file.name,
          error: "Chemin non autorisé",
        });
        continue;
      }

      try {
        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Content = buffer.toString("base64");

        // Determine if binary or text
        const isBinary = isBinaryFile(file.name);

        // Build full path with rootPath
        const pathWithRoot = vaultConfig.rootPath
          ? `${vaultConfig.rootPath}/${fullPath}`
          : fullPath;

        if (isBinary) {
          // Binary file: use base64 directly
          await octokit.repos.createOrUpdateFileContents({
            owner: vaultConfig.owner,
            repo: vaultConfig.repo,
            path: pathWithRoot,
            message: `Upload ${file.name} via deposit link`,
            content: base64Content,
            branch: vaultConfig.branch,
          });
        } else {
          // Text file: decode and re-encode (handles encoding properly)
          const textContent = buffer.toString("utf-8");
          await octokit.repos.createOrUpdateFileContents({
            owner: vaultConfig.owner,
            repo: vaultConfig.repo,
            path: pathWithRoot,
            message: `Upload ${file.name} via deposit link`,
            content: Buffer.from(textContent).toString("base64"),
            branch: vaultConfig.branch,
          });
        }

        // Record successful upload for rate limiting
        recordUpload(clientIP, token);

        uploaded.push({
          path: fullPath,
          name: file.name,
          size: file.size,
        });
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        errors.push({
          name: file.name,
          error: "Erreur lors du téléchargement",
        });
      }
    }

    // Check updated rate limit
    const updatedRateLimit = checkRateLimit(clientIP, token);

    return NextResponse.json({
      success: uploaded.length > 0,
      uploaded,
      errors: errors.length > 0 ? errors : undefined,
      remaining: updatedRateLimit.remaining,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error in deposit upload:", error);
    return NextResponse.json(
      { error: "Erreur lors du dépôt des fichiers" },
      { status: 500 }
    );
  }
}
