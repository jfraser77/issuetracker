// lib/db.ts - Clean Azure SQL Configuration
import sql from "mssql";

const config: sql.config = {
  user: "joefraser7",
  password: "Revenue80!",
  server: "nsncenterdata.database.windows.net",
  database: "FedEx",
  port: 1433,
  options: {
    encrypt: true, // REQUIRED for Azure
    trustServerCertificate: false, // REQUIRED for Azure
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
    cancelTimeout: 5000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let connection: sql.ConnectionPool;

export async function connectToDatabase() {
  if (connection) return connection;

  try {
    console.log("🔵 Connecting to Azure SQL...");
    console.log("Server:", config.server);
    console.log("Database:", config.database);

    connection = await sql.connect(config);

    // Test connection with simple query
    const result = await connection
      .request()
      .query("SELECT @@SPID as session_id, DB_NAME() as db_name");
    console.log("✅ Azure SQL Connection Successful!");
    console.log("Session ID:", result.recordset[0].session_id);
    console.log("Database:", result.recordset[0].db_name);

    return connection;
  } catch (err: any) {
    console.error("❌ Azure SQL Connection Failed:");
    console.error("Error:", err.message);
    console.error("Code:", err.code);
    if (err.originalError) {
      console.error("Original Error:", err.originalError.message);
    }
    throw err;
  }
}

export { sql };
