const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a readable temporary password for a newly created org admin,
 * e.g. "Sunrise-482-Falcon". Good enough for an MVP where there's no email
 * service wired up yet to send a proper invite/reset link.
 */
function generateTempPassword() {
  const words = ['Sunrise', 'Falcon', 'Granite', 'Harbor', 'Maple', 'Comet', 'Cobalt', 'Atlas'];
  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${word}-${number}-${Math.random().toString(36).slice(-4)}`;
}

module.exports = { hashPassword, comparePassword, generateTempPassword };
