const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function initializeDatabase() {
  try {
    const sqlFile = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
    const statements = sqlFile
      .split(/;\s*(?=(?:[^'"`]*(?:['"`])[^'"`]*\1)*[^'"`]*$)/m)
      .filter(Boolean)
      .map(stmt => stmt?.trim())
      .filter(Boolean);

    await pool.query('BEGIN');

    for (const statement of statements) {
      if (!statement || statement.length === 0) continue;
      await pool.query(statement);
    }

    await pool.query('COMMIT');
    console.log('✓ Database initialized successfully');
    return true;
  } catch (err) {
    console.error('✗ Error initializing database:', err.message || err);
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('✗ Failed to rollback transaction:', rollbackErr.message || rollbackErr);
    }
    return false;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then((success) => {
      if (!success) {
        process.exit(1);
      }
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database bootstrap failed:', err.message || err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
