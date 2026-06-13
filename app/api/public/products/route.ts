import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query<{
      id: string;
      name: string;
      description: string;
      price: number;
      threshold_value: number;
    }>(
      `SELECT id, name, description, price, threshold_value
       FROM products
       WHERE active = true
       ORDER BY threshold_value ASC`
    );

    const products = rows.map((p, index) => ({
      id: p.id,
      tag: index === 0 ? "Starter" : "Pro",
      name: p.name,
      price: `$${p.price / 100}`,
      popular: index > 0,
      desc: p.description,
      features: [
        "€400 free credit promo eligible",
        `$${p.threshold_value >= 50 ? '10' : '5'} already spent on the account`,
        `€${p.threshold_value} billing threshold unlocked`,
        "Login + recovery details included",
        "Instant .txt delivery after payment",
        index === 0 ? "24h replacement warranty" : "48h replacement warranty",
      ],
    }));

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to fetch public products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
