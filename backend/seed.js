// Creates the first Administrator and two test Standard Users.
// Run once with: npm run seed  (from the backend folder)
// Passwords are read from .env so they are never committed to the repository.
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');

dotenv.config();

const required = ['MONGO_URI', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_TECH_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(', ')}`);
  process.exit(1);
}

const seedUsers = [
  { name: 'Support Admin', email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, role: 'admin' },
  { name: 'Tech A', email: 'techa@computersquad.test', password: process.env.SEED_TECH_PASSWORD, role: 'standard' },
  { name: 'Tech B', email: 'techb@computersquad.test', password: process.env.SEED_TECH_PASSWORD, role: 'standard' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const data of seedUsers) {
    const exists = await User.findOne({ email: data.email });
    if (exists) {
      console.log(`Skipped (already exists): ${data.email}`);
    } else {
      await User.create(data); // password is hashed by the User model
      console.log(`Created ${data.role}: ${data.email}`);
    }
  }
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});