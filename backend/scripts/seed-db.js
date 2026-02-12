const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seedDatabase() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'atease',
    multipleStatements: true
  });

  return new Promise((resolve, reject) => {
    try {
      const seedPath = path.join(__dirname, '../database/seed-mysql.sql');
      const sql = fs.readFileSync(seedPath, 'utf8');
      
      connection.query(sql, (error, results) => {
        if (error) {
          console.error('✗ Seed failed:', error.message);
          connection.end();
          reject(error);
        } else {
          console.log('✓ Database seeded successfully!');
          connection.end();
          resolve();
        }
      });
    } catch (error) {
      console.error('✗ Seed failed:', error.message);
      connection.end();
      reject(error);
    }
  });
}

seedDatabase().catch(() => process.exit(1));
