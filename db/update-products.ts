import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function updateProducts() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Deactivating old products...');
  await pool.query(`UPDATE products SET active = false WHERE id IN ('PROD-350', 'PROD-500', '350', '500')`);

  console.log('Upserting new products...');
  await pool.query(`
    INSERT INTO products (id, name, description, price, threshold_value, category, low_stock_alert, active)
    VALUES
      ('starter', 'Starter Threshold Account', 'A Google Ads account with the billing threshold unlocked at €10. €5 already spent — ready to run campaigns immediately. Also eligible for the €400 free credit promo.', 5000, 10, 'threshold', 5, true),
      ('pro', 'Pro Threshold Account', 'Higher-tier account with a €50 billing threshold and €10 already spent — more spending room before Google charges you. Also eligible for the €400 free credit promo.', 7500, 50, 'threshold', 5, true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      threshold_value = EXCLUDED.threshold_value,
      active = EXCLUDED.active,
      updated_at = NOW()
  `);

  const result = await pool.query('SELECT id, name, price, active FROM products ORDER BY price');
  console.log('\nProducts in DB:');
  for (const r of result.rows) {
    console.log(`  ${r.id} - ${r.name} - $${r.price / 100} - active: ${r.active}`);
  }

  await pool.end();
  console.log('\nDone!');
}

updateProducts().catch(console.error);
