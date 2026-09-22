// Generates unique test data for User Management scenarios so repeated runs
// never collide with existing records in the shared demo environment.

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function generateUsername(prefix = 'qaUser') {
  return `${prefix}_${uniqueSuffix()}`;
}

function generatePassword() {
  // Satisfies OrangeHRM's password policy: upper, lower, digit, special, 8+ chars.
  return `Qa@${uniqueSuffix()}Pass`;
}

function generateSearchTerm() {
  return `noSuchUser_${uniqueSuffix()}`;
}

module.exports = { generateUsername, generatePassword, generateSearchTerm };
