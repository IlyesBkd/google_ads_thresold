import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/jwt";
import { notifyWaitlist } from "@/lib/waitlist-notify";

// GET: Retrieve all waitlist entries
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const rows = await query<{
      id: string;
      product_id: string;
      telegram_username: string | null;
      email: string | null;
      notified: boolean;
      notified_at: string | null;
      notified_via: string | null;
      created_at: string;
    }>(
      `SELECT
        w.id,
        w.product_id,
        w.telegram_username,
        w.email,
        w.notified,
        w.notified_at,
        w.notified_via,
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

// POST: Send restock notifications (email + Telegram channel) to pending users
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId required" },
        { status: 400 }
      );
    }

    const result = await notifyWaitlist(productId);

    return NextResponse.json({
      success: true,
      message:
        `${result.pending} notified — ${result.emailed} emailed, Telegram ${result.telegram}`,
      data: { count: result.pending, ...result },
    });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to send notifications",
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
