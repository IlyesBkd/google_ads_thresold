import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ordersByEmailSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ordersByEmailSchema.safeParse({ email: searchParams.get("email") });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    const email = parsed.data.email;

    // Fetch orders for this email with product details and download token
    const orders = await query<{
      id: string;
      product_id: string;
      quantity: number;
      customer_email: string;
      amount: number;
      coin: string;
      status: string;
      created_at: string;
      paid_at: string | null;
      delivered_at: string | null;
      product_name: string;
      product_price: number;
      download_token: string | null;
      token_expires_at: string | null;
      token_uses_count: number | null;
      token_max_uses: number | null;
    }>(
      `SELECT
        o.id,
        o.product_id,
        o.quantity,
        o.customer_email,
        o.amount,
        o.coin,
        o.status,
        o.created_at,
        o.paid_at,
        o.delivered_at,
        p.name as product_name,
        p.price as product_price,
        dt.token as download_token,
        dt.expires_at as token_expires_at,
        dt.uses_count as token_uses_count,
        dt.max_uses as token_max_uses
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN download_tokens dt ON o.id = dt.order_id
       WHERE o.customer_email = $1
       ORDER BY o.created_at DESC`,
      [email.toLowerCase()]
    );

    // Format response
    const formattedOrders = orders.map((order) => {
      // Check if download is available
      const now = new Date();
      const isTokenValid =
        order.download_token &&
        order.token_expires_at &&
        new Date(order.token_expires_at) > now &&
        order.token_uses_count !== null &&
        order.token_max_uses !== null &&
        order.token_uses_count < order.token_max_uses;

      return {
        id: order.id,
        productId: order.product_id,
        productName: order.product_name,
        quantity: order.quantity,
        amount: order.amount,
        coin: order.coin,
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        deliveredAt: order.delivered_at,
        downloadAvailable: isTokenValid,
        downloadToken: isTokenValid ? order.download_token : null,
        tokenExpiresAt: order.token_expires_at,
        tokenUsesLeft:
          order.token_max_uses && order.token_uses_count !== null
            ? order.token_max_uses - order.token_uses_count
            : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        email,
        orders: formattedOrders,
        totalOrders: formattedOrders.length,
      },
    });
  } catch (error) {
    console.error("Fetch orders by email error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}
