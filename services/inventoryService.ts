// services/inventoryService.ts
import { connectToDatabase } from "../lib/db";
import { InventoryItem, CreateInventoryItem } from "../types/inventory";
import sql from "mssql";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const pool = await connectToDatabase();
  const result = await pool
    .request()
    .query("SELECT * FROM InventoryItems ORDER BY timestamp DESC");
  return result.recordset;
}

export async function createInventoryItem(
  item: CreateInventoryItem
): Promise<InventoryItem> {
  const pool = await connectToDatabase();
  const result = await pool
    .request()
    .input("name", sql.NVarChar, item.name)
    .input("computer", sql.Bit, item.computer)
    .input("docking_station", sql.Bit, item.docking_station)
    .input("phone", sql.Bit, item.phone)
    .input("monitors", sql.Bit, item.monitors)
    .input("printer", sql.Bit, item.printer)
    .input("returned", sql.Bit, item.returned)
    .input("description", sql.NVarChar, item.description || null).query(`
      INSERT INTO InventoryItems 
        (name, computer, docking_station, phone, monitors, printer, returned, description)
      OUTPUT INSERTED.*
      VALUES 
        (@name, @computer, @docking_station, @phone, @monitors, @printer, @returned, @description)
    `);

  return result.recordset[0];
}
