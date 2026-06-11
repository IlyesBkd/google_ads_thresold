import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { productId, telegramUsername, email } = await request.json();

    // Validation
    if (!productId || !telegramUsername) {
      return NextResponse.json(
        { success: false, error: "Product ID and Telegram username are required" },
        { status: 400 }
      );
    }

    // Validate Telegram username format (starts with @)
    const cleanUsername = telegramUsername.startsWith("@")
      ? telegramUsername
      : `@${telegramUsername}`;

    if (!/^@[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "Invalid Telegram username format" },
        { status: 400 }
      );
    }

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

    // Insert into waitlist (ON CONFLICT update created_at to refresh)
    await query(
      `INSERT INTO waitlist (product_id, telegram_username, email, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (product_id, telegram_username)
       DO UPDATE SET created_at = NOW(), notified = false`,
      [productId, cleanUsername, email || null]
    );

    return NextResponse.json({
      success: true,
      message: "You'll be notified on Telegram when stock is available",
    });
  } catch (error: any) {
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
  } catch (error: any) {
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
