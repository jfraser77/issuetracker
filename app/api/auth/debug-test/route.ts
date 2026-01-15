import { NextResponse } from "next/server";
import sql from "mssql";
import bcrypt from "bcrypt";

// Direct database config (temporarily)
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "FedEx",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    console.log("=== DEBUG TEST START ===");
    console.log("Input email:", email);
    console.log("Input password:", password);

    // Connect directly
    const pool = await sql.connect(dbConfig);

    // Query 1: Get user with SELECT *
    const result1 = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    console.log("\nQuery 1 (SELECT *):");
    console.log("Records found:", result1.recordset.length);

    if (result1.recordset.length > 0) {
      const user1 = result1.recordset[0];
      console.log("User object keys:", Object.keys(user1));
      console.log("User fields:");
      Object.keys(user1).forEach((key) => {
        console.log(
          `  ${key}:`,
          typeof user1[key],
          "=",
          key === "password" ? user1[key]?.substring(0, 30) + "..." : user1[key]
        );
      });

      // Test bcrypt
      if (user1.password) {
        console.log("\nTesting bcrypt with SELECT * result:");
        const test1 = await bcrypt.compare("TempPass123!", user1.password);
        console.log("BCrypt compare result:", test1);
      }
    }

    // Query 2: Get user with specific columns
    const result2 = await pool.request().input("email", sql.NVarChar, email)
      .query(`
        SELECT id, email, name, password, role 
        FROM Users 
        WHERE email = @email
      `);

    console.log("\nQuery 2 (SELECT specific columns):");
    console.log("Records found:", result2.recordset.length);

    if (result2.recordset.length > 0) {
      const user2 = result2.recordset[0];
      console.log("User object keys:", Object.keys(user2));
      console.log("Password field exists:", !!user2.password);
      console.log("Password value:", user2.password?.substring(0, 30) + "...");

      // Test bcrypt
      if (user2.password) {
        console.log("\nTesting bcrypt with specific columns result:");
        const test2 = await bcrypt.compare("TempPass123!", user2.password);
        console.log("BCrypt compare result:", test2);

        // Also test with input password
        const test3 = await bcrypt.compare(password, user2.password);
        console.log("BCrypt compare with input password:", test3);
      }
    }

    // Test with known hash
    console.log("\n=== BCRYPT SELF-TEST ===");
    const knownHash =
      "$2a$12$X7VX5C8q9TqBwRkLpQwR3uKzJ8hNvM2QwP7rS9tUyVzA1bC3dE5fG7hJ9l";
    const testHash = await bcrypt.compare("TempPass123!", knownHash);
    console.log("Known hash test:", testHash);

    // Generate a new hash to test
    const newHash = await bcrypt.hash("TempPass123!", 12);
    console.log("New hash generated:", newHash.substring(0, 30) + "...");
    const testNewHash = await bcrypt.compare("TempPass123!", newHash);
    console.log("New hash test:", testNewHash);

    console.log("=== DEBUG TEST END ===\n");

    await pool.close();

    return NextResponse.json({
      success: true,
      tests: {
        query1_records: result1.recordset.length,
        query2_records: result2.recordset.length,
        bcrypt_self_test: testHash,
        bcrypt_new_hash_test: testNewHash,
      },
    });
  } catch (error: any) {
    console.error("Debug test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
