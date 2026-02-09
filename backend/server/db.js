/**
 * MySQL connection pool for the Hotel Booking API.
 * Exposes a pg-like query(sql, params) that returns { rows, insertId } so existing routes work.
 * Load .env in your entry point (e.g. server.js) before requiring this.
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'atease',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function toMysqlPlaceholders(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

async function runQuery(conn, sql, params = []) {
  const mysqlSql = toMysqlPlaceholders(sql);
  const [rows, fields] = await conn.query(mysqlSql, params);
  const insertId = rows && typeof rows.insertId !== 'undefined' ? rows.insertId : undefined;
  return {
    rows: Array.isArray(rows) ? rows : (insertId != null ? [{ id: insertId, insertId }] : []),
    insertId,
  };
}

// Wrap pool.query to return { rows, insertId }
const baseQuery = pool.query.bind(pool);
pool.query = async function query(sql, params = []) {
  const mysqlSql = toMysqlPlaceholders(sql);
  const [rows, fields] = await baseQuery(mysqlSql, params);
  const insertId = rows && typeof rows.insertId !== 'undefined' ? rows.insertId : undefined;
  return {
    rows: Array.isArray(rows) ? rows : (insertId != null ? [{ id: insertId, insertId }] : []),
    insertId,
  };
};

// pg-style pool.connect() for transactions (MySQL: getConnection + beginTransaction)
pool.connect = async function connect() {
  const conn = await pool.getConnection();
  return {
    query: (sql, params) => runQuery(conn, sql, params),
    beginTransaction: () => conn.beginTransaction(),
    commit: () => conn.commit(),
    rollback: () => conn.rollback(),
    release: () => conn.release(),
  };
};

module.exports = { pool };
