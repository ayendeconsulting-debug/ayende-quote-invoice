import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash -- "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\nAdd this to your .env as ADMIN_PASSWORD_HASH:\n");
console.log(hash + "\n");
