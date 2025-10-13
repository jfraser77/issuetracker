import { connectToDatabase } from "./db";
import sql from "mssql";

// Map user IDs to names (you'll need to populate this based on your Users table)
const userMap: { [key: number]: string } = {
  1: "Joe Fraser",
  2: "Lauren Ingignoli",
  3: "Zach Vollono",
  4: "Sarah Johnson",
  5: "Mike Wilson",
  // Add more mappings as needed
};

export async function getOrderedByName(userId: number): Promise<string> {
  // First check our static map
  if (userMap[userId]) {
    return userMap[userId];
  }

  // If not in map, try to fetch from database
  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT name FROM Users WHERE id = @userId");

    if (result.recordset.length > 0) {
      return result.recordset[0].name;
    }
  } catch (error) {
    console.error("Error fetching user name:", error);
  }

  return `User ${userId}`;
}

export async function getAllUsers() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query("SELECT id, name FROM Users");
    return result.recordset;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}
