import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pins } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/pins - List all pins for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userPins = await db
      .select()
      .from(pins)
      .where(eq(pins.userId, session.user.id))
      .orderBy(pins.order);

    return NextResponse.json({
      pins: userPins.map((p) => ({
        path: p.path,
        name: p.name,
        type: p.type as "note" | "folder",
      })),
    });
  } catch (error) {
    console.error("Error fetching pins:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des épingles" },
      { status: 500 }
    );
  }
}

// POST /api/pins - Create a new pin
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { path, name, type } = body;

    if (!path || !name || !type) {
      return NextResponse.json(
        { error: "path, name et type sont requis" },
        { status: 400 }
      );
    }

    if (!["note", "folder"].includes(type)) {
      return NextResponse.json(
        { error: "type doit être 'note' ou 'folder'" },
        { status: 400 }
      );
    }

    // Check if pin already exists
    const existing = await db
      .select()
      .from(pins)
      .where(and(eq(pins.userId, session.user.id), eq(pins.path, path)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Cet élément est déjà épinglé" },
        { status: 409 }
      );
    }

    // Get next order number
    const lastPin = await db
      .select({ order: pins.order })
      .from(pins)
      .where(eq(pins.userId, session.user.id))
      .orderBy(desc(pins.order))
      .limit(1);

    const nextOrder = lastPin.length > 0 ? lastPin[0].order + 1 : 0;

    // Create pin
    const [newPin] = await db
      .insert(pins)
      .values({
        userId: session.user.id,
        path,
        name,
        type,
        order: nextOrder,
      })
      .returning();

    return NextResponse.json({
      pin: {
        path: newPin.path,
        name: newPin.name,
        type: newPin.type as "note" | "folder",
      },
    });
  } catch (error) {
    console.error("Error creating pin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'épingle" },
      { status: 500 }
    );
  }
}

// DELETE /api/pins - Delete a pin by path
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "path est requis" },
        { status: 400 }
      );
    }

    await db
      .delete(pins)
      .where(and(eq(pins.userId, session.user.id), eq(pins.path, path)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'épingle" },
      { status: 500 }
    );
  }
}

// PUT /api/pins - Reorder pins (replace all)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { pins: newPins } = body;

    if (!Array.isArray(newPins)) {
      return NextResponse.json(
        { error: "pins doit être un tableau" },
        { status: 400 }
      );
    }

    // Delete all existing pins for user
    await db.delete(pins).where(eq(pins.userId, session.user.id));

    // Insert new pins with order
    if (newPins.length > 0) {
      await db.insert(pins).values(
        newPins.map((pin: { path: string; name: string; type: string }, index: number) => ({
          userId: session.user.id,
          path: pin.path,
          name: pin.name,
          type: pin.type,
          order: index,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering pins:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réorganisation des épingles" },
      { status: 500 }
    );
  }
}
