import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/jwt";

// GET: Retrieve all waitlist entries
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const rows = await query<{
      id: string;
      product_id: string;
      telegram_username: string;
      email: string | null;
      notified: boolean;
      notified_at: string | null;
      created_at: string;
    }>(
      `SELECT
        w.id,
        w.product_id,
        w.telegram_username,
        w.email,
        w.notified,
        w.notified_at,
        w.created_at
       FROM waitlist w
       ORDER BY w.notified ASC, w.created_at DESC`,
      []
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to fetch waitlist",
      },
      { status: 500 }
    );
  }
}

// POST: Mark waitlist entries as notified
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { ids, productId } = await request.json();

    if (!ids && !productId) {
      return NextResponse.json(
        { success: false, error: "Either ids array or productId required" },
        { status: 400 }
      );
    }

    let result: any[] = [];

    if (ids && Array.isArray(ids)) {
      // Mark specific IDs as notified
      result = await query(
        `UPDATE waitlist
         SET notified = true, notified_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`,
        [ids]
      );
    } else if (productId) {
      // Mark all pending for a product as notified
      result = await query(
        `UPDATE waitlist
         SET notified = true, notified_at = NOW()
         WHERE product_id = $1 AND notified = false
         RETURNING id`,
        [productId]
      );
    }

    // Log action
    await query(
      `INSERT INTO logs (type, message, admin_id, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        "delivery",
        `Waitlist notified: ${result.length} users for product ${productId || (ids ? ids.join(", ") : "unknown")}`,
        user.adminId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${result.length} users marked as notified`,
      data: { count: result.length },
    });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to mark as notified",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove waitlist entry
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID required" },
        { status: 400 }
      );
    }

    await query("DELETE FROM waitlist WHERE id = $1", [id]);

    return NextResponse.json({
      success: true,
      message: "Waitlist entry deleted",
    });
  } catch (error) {
    console.error("Waitlist delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to delete entry",
      },
      { status: 500 }
    );
  }
}
