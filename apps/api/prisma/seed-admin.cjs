require('dotenv/config');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for administrative seeding`);
  return value;
}

const adminEmail = required('CPEB_ADMIN_EMAIL').toLowerCase();
const adminPassword = required('CPEB_ADMIN_PASSWORD');
const technicianEmail = required('CPEB_TECHNICIAN_EMAIL').toLowerCase();
const technicianPassword = required('CPEB_TECHNICIAN_PASSWORD');

if (adminPassword.length < 10 || technicianPassword.length < 10) {
  throw new Error('Seed passwords must contain at least 10 characters');
}

async function upsertUser(pool, name, email, password, role) {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO "User"
      ("id","fullName","email","password","role","isActive","emailVerified","createdAt","updatedAt")
     VALUES
      (concat('seed_',md5($2)),$1,lower($2),$3,$4,true,true,now(),now())
     ON CONFLICT ("email") DO UPDATE SET
      "fullName"=EXCLUDED."fullName",
      "password"=EXCLUDED."password",
      "role"=EXCLUDED."role",
      "isActive"=true,
      "emailVerified"=true,
      "updatedAt"=now()`,
    [name, email, hash, role],
  );
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await upsertUser(pool, 'CPEB Administrator', adminEmail, adminPassword, 'ADMIN');
    await upsertUser(pool, 'CPEB Technician', technicianEmail, technicianPassword, 'TECHNICIAN');
    console.log('Administrative accounts ready');
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
