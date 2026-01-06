const crypto = require('crypto');

console.log('\n========================================');
console.log('🔐 GENERATING SECURE SECRETS');
console.log('========================================\n');

// Generate JWT Secret (64 bytes = 512 bits)
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Generate Session Secret (64 bytes = 512 bits)
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('Copy these to your .env file:\n');
console.log('JWT_SECRET=' + jwtSecret);
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n========================================');
console.log('✅ SECRETS GENERATED SUCCESSFULLY');
console.log('========================================\n');

console.log('📋 Instructions:');
console.log('1. Copy the secrets above');
console.log('2. Open .env file');
console.log('3. Replace old secrets with these new ones');
console.log('4. Save .env file');
console.log('5. Restart server: npm run dev\n');
