import HomePage from "@/components/HomePage";
import { query } from "@/lib/db";
import { products as staticProducts, type Product } from "@/lib/data";

export const revalidate = 60;

async function getProducts(): Promise<Product[]> {
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

    if (!rows.length) return staticProducts;

    return rows.map((p, index) => ({
      id: p.id,
      tag: index === 0 ? "Starter" : "Pro",
      name: p.name,
      price: `$${p.price / 100}`,
      popular: index > 0,
      desc: p.description,
      features: [
        "€400 free credit promo eligible",
        `€${p.threshold_value >= 50 ? "10" : "5"} already spent on the account`,
        `€${p.threshold_value} billing threshold unlocked`,
        "Login + recovery details included",
        "Instant .txt delivery after payment",
        index === 0 ? "Replaced if you can't log in" : "Replaced if you can't log in",
      ],
    }));
  } catch {
    return staticProducts;
  }
}

export default async function Page() {
  const products = await getProducts();
  return <HomePage initialProducts={products} />;
}
