/**
 * One-time script to create an ADMIN user in the database.
 * Run: node server/../scripts/create-admin.js
 * Or from backend: node scripts/create-admin.js
 * Default: admin@atease.com / Admin123 (change in production)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { pool } = require('../server/db');

const DEFAULT_EMAIL = 'admin@atease.com';
const DEFAULT_PASSWORD = 'Admin123';

async function main() {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1");
  if (!roleResult.rows || roleResult.rows.length === 0) {
    console.error('Run database/seed-mysql.sql first to create roles (MySQL) or database/seed.sql (PostgreSQL).');
    process.exit(1);
  }
  const roleId = roleResult.rows[0].id;

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role_id)
     VALUES ($1, $2, $3, $4)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role_id = VALUES(role_id)`,
    ['Admin', email, hash, roleId]
  );
  console.log('Admin user created:', email);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
