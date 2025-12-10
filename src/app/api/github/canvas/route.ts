import { NextRequest, NextResponse } from "next/server";
import { getFileContent, saveFileContent, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import type { ObsidianCanvasData } from "@/types/canvas";

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path requis" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;
    const { content, sha } = await getFileContent(octokit, path, vaultConfig);

    // Parse canvas JSON
    let canvasData: ObsidianCanvasData;
    try {
      canvasData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Format canvas invalide" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      path,
      data: canvasData,
      sha,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error reading canvas:", error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture du canvas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { path, data, sha } = body;

    if (!path || !data) {
      return NextResponse.json(
        { error: "Path et data requis" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;

    // Convert canvas data to JSON string
    const content = JSON.stringify(data, null, "\t");

    const result = await saveFileContent(
      octokit,
      path,
      content,
      sha,
      `Update canvas ${path}`,
      vaultConfig
    );

    return NextResponse.json({
      sha: result.sha,
      success: true,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error saving canvas:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde du canvas" },
      { status: 500 }
    );
  }
}
