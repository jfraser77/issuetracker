// Run: node scripts/reset-garcia-password.js
// Set DB env vars before running, or replace the placeholder values below.

const sql = require("mssql");
const bcrypt = require("bcryptjs");

const config = {
  user: process.env.DB_USER || "REPLACE_WITH_DB_USER",
  password: process.env.DB_PASSWORD || "REPLACE_WITH_DB_PASSWORD",
  server: process.env.DB_SERVER || "REPLACE_WITH_DB_SERVER",
  database: process.env.DB_NAME || "REPLACE_WITH_DB_NAME",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
};

const TARGET_EMAIL = "ggarcia4@uspi.com";
const NEW_PASSWORD = "Uspi#123#";

async function resetPassword() {
  const pool = await sql.connect(config);
  const hashed = await bcrypt.hash(NEW_PASSWORD, 12);

  const result = await pool
    .request()
    .input("email", sql.NVarChar, TARGET_EMAIL)
    .input("password", sql.NVarChar, hashed)
    .query(
      "UPDATE Users SET password = @password, updatedAt = GETDATE() WHERE email = @email"
    );

  if (result.rowsAffected[0] === 0) {
    console.error("No user found with email:", TARGET_EMAIL);
  } else {
    console.log("Password reset successfully for", TARGET_EMAIL);
  }

  await pool.close();
}

resetPassword().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
