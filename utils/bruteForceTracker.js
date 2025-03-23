// utils/bruteForceTracker.js

const failedAttempts = {}; // { username: { count: Number, lastAttempt: Date } }
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function recordFailure(username) {
  const now = Date.now();
  if (!failedAttempts[username]) {
    failedAttempts[username] = { count: 1, lastAttempt: now };
  } else {
    failedAttempts[username].count++;
    failedAttempts[username].lastAttempt = now;
  }
}

function isLocked(username) {
  const entry = failedAttempts[username];
  if (!entry) return false;

  const elapsed = Date.now() - entry.lastAttempt;
  if (entry.count >= MAX_ATTEMPTS && elapsed < LOCKOUT_DURATION_MS) {
    return true;
  }
  if (elapsed >= LOCKOUT_DURATION_MS) {
    delete failedAttempts[username];
  }
  return false;
}

function clearFailures(username) {
  delete failedAttempts[username];
}

module.exports = {
  recordFailure,
  isLocked,
  clearFailures,
};
