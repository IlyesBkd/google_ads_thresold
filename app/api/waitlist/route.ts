import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { waitlistSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Normalise empty strings to undefined so "email only" or "telegram only" both pass
    const normalized = {
      productId: body.productId,
      telegramUsername: body.telegramUsername?.trim() || undefined,
      email: body.email?.trim() || undefined,
    };

    const parsed = waitlistSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { productId, telegramUsername, email } = parsed.data;

    const cleanUsername = telegramUsername
      ? telegramUsername.startsWith("@")
        ? telegramUsername
        : `@${telegramUsername}`
      : null;
    const cleanEmail = email ? email.toLowerCase() : null;

    // Check if product exists
    const productCheck = await query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // De-dupe: find an existing entry for this product matching telegram OR email
    const existing = await query<{ id: string }>(
      `SELECT id FROM waitlist
       WHERE product_id = $1
         AND (
           ($2::text IS NOT NULL AND telegram_username = $2)
           OR ($3::text IS NOT NULL AND email = $3)
         )
       LIMIT 1`,
      [productId, cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      // Refresh the entry, fill in any newly-provided contact, reset notified
      await query(
        `UPDATE waitlist
         SET telegram_username = COALESCE($2, telegram_username),
             email = COALESCE($3, email),
             notified = false,
             notified_via = NULL,
             created_at = NOW()
         WHERE id = $1`,
        [existing[0].id, cleanUsername, cleanEmail]
      );
    } else {
      await query(
        `INSERT INTO waitlist (product_id, telegram_username, email, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [productId, cleanUsername, cleanEmail]
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list — we'll notify you when it's back in stock",
    });
  } catch (error) {
    console.error("Waitlist registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register for notifications",
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve waitlist for a product (admin only, or public count)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID required" },
        { status: 400 }
      );
    }

    // Return count only (public)
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM waitlist
       WHERE product_id = $1 AND notified = false`,
      [productId]
    );

    const count = parseInt(rows[0]?.count || "0", 10);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch waitlist count",
      },
      { status: 500 }
    );
  }
}
