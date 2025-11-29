import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, deleteFile } from "@/lib/github";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path, sha } = await request.json();

    if (!path || !sha) {
      return NextResponse.json(
        { error: "Chemin et SHA requis" },
        { status: 400 }
      );
    }

    const octokit = createOctokit(session.accessToken);
    await deleteFile(octokit, path, sha, `Delete ${path}`);

    return NextResponse.json({
      success: true,
      path,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du fichier" },
      { status: 500 }
    );
  }
}
