// Password hashing and login tokens.

const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const scrypt = promisify(crypto.scrypt);

// Turn a password into "salt:hash". The salt is random for every user, so two people
// with the same password get different hashes, and the real password is never stored.
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return salt.toString('hex') + ':' + key.toString('hex');
}

// Check a typed password against a stored "salt:hash"
async function verifyPassword(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 2) return false;

  const key = await scrypt(password, Buffer.from(parts[0], 'hex'), 64);
  const expected = Buffer.from(parts[1], 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

// A pretend account, used so a login for an unknown email takes as long as a real one
const dummyHash = hashPassword('this-is-not-a-real-password');

async function burnTime(password) {
  await verifyPassword(password, await dummyHash);
}

// A login token the browser keeps and sends with later requests. It is signed with the
// server's secret, so the browser cannot change who it says it is.
function signToken(userId, secret) {
  return jwt.sign({}, secret, { subject: String(userId), expiresIn: '7d' });
}

// Returns the user id inside a valid token, or null if the token is missing, forged, or expired
function readToken(token, secret) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret).sub;
  } catch (err) {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, burnTime, signToken, readToken };
