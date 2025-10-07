// test-db-connection.ts
import sql from "mssql";

async function testConnection() {
  const config = {
    user: "jfraser",
    password: "GreenBlue1",
    server: "nsncenterdata.database.windows.net",
    database: "FedEx",
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
    },
  };

  try {
    console.log("Attempting to connect...");
    const pool = await sql.connect(config);
    console.log("✅ Connected successfully!");

    // Test a simple query
    const result = await pool.request().query("SELECT @@VERSION as version");
    console.log("✅ Query executed successfully");

    await pool.close();
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error);
    return false;
  }
}

testConnection();
