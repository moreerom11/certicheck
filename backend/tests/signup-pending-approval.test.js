const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/connection');
const User = require('../src/models/User');

const originalQuery = pool.query;

test.afterEach(() => {
  pool.query = originalQuery;
});

test('new issuer signups are created inactive and use the fixed password hash', async () => {
  pool.query = async (sql, params) => {
    if (sql.includes('INSERT INTO users')) {
      return {
        rows: [{
          id: 77,
          email: params[0],
          first_name: params[2],
          last_name: params[3],
          user_type: params[4],
          is_active: params[5]
        }]
      };
    }
    return { rows: [] };
  };

  const user = await User.create('new@certicheck.com', 'password', 'New', 'User', 'issuer', false);

  assert.equal(user.email, 'new@certicheck.com');
  assert.equal(user.user_type, 'issuer');
  assert.equal(user.is_active, false);
});
