// lib/db.ts
import sql from "mssql";

// Validate environment variables
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config: sql.config = {
  user: getRequiredEnvVar("DB_USER"),
  password: getRequiredEnvVar("DB_PASSWORD"),
  server: getRequiredEnvVar("DB_SERVER"), // nsncenterdata.database.windows.net
  database: getRequiredEnvVar("DB_NAME"), // FedEx
  options: {
    encrypt: true, // Mandatory for Azure
    trustServerCertificate: false, // Should be false for production Azure SQL
    enableArithAbort: true,
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
    connection = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
    return connection;
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
}

// Graceful shutdown handler
process.on("SIGINT", async () => {
  if (connection) {
    await connection.close();
    console.log("Azure SQL connection closed");
    process.exit(0);
  }
});
