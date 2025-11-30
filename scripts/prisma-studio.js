// Script to run Prisma Studio with correct direct database URL
// Ensures DIRECT_DATABASE_URL is set to DATABASE_URL for Prisma Studio
// Prisma Studio requires direct connection, not Accelerate connection

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Ensure DIRECT_DATABASE_URL uses the direct connection (DATABASE_URL)
// This is required for Prisma Studio to be able to edit data
const directUrl = process.env.DATABASE_URL;

if (!directUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Override DIRECT_DATABASE_URL to use DATABASE_URL (direct connection)
// Prisma Studio needs this to edit data
process.env.DIRECT_DATABASE_URL = directUrl;

console.log('Starting Prisma Studio on port 5556...');
console.log('Using direct database connection (DATABASE_URL) for editing capabilities');

try {
  execSync('npx prisma studio --port 5556 --browser none', {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  process.exit(error.status || 1);
}

