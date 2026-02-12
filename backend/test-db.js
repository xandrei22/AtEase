require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_NAME || 'atease',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('Testing database connection...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Database: ${process.env.DB_NAME || 'atease'}`);
    console.log(`User: ${process.env.DB_USER || 'root'}`);

    const connection = await pool.getConnection();
    console.log('✓ Connected to database');

    // Test if rooms table exists and has data
    const [rooms] = await connection.query('SELECT * FROM rooms');
    console.log(`✓ Rooms table has ${rooms.length} rooms`);
    
    if (rooms.length > 0) {
      console.log('\nSample room:');
      console.log(JSON.stringify(rooms[0], null, 2));
    }

    connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
