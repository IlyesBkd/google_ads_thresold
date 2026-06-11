import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get stock count for each product
    const rows = await query<{ product_id: string; count: string }>(
      `SELECT product_id, COUNT(*) as count
       FROM stock_items
       WHERE status = 'available'
       GROUP BY product_id`,
      []
    );

    // Transform to object { "350": 23, "500": 15 }
    const stock: Record<string, number> = {};
    rows.forEach((row) => {
      stock[row.product_id] = parseInt(row.count, 10);
    });

    // Ensure both products have entries (even if 0)
    if (!stock["350"]) stock["350"] = 0;
    if (!stock["500"]) stock["500"] = 0;

    return NextResponse.json({
      success: true,
      data: stock,
    });
  } catch (error: any) {
    console.error("Failed to fetch stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock",
      },
      { status: 500 }
    );
  }
}
