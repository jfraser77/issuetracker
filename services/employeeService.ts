import { connectToDatabase } from "../lib/db";
import { NewEmployee, CreateNewEmployee } from "../app/types/index";
import sql from "mssql";

export async function getEmployees(): Promise<NewEmployee[]> {
  const pool = await connectToDatabase();
  const result = await pool
    .request()
    .query("SELECT * FROM Employees ORDER BY timestamp DESC");
  return result.recordset;
}

export async function createEmployee(
  employee: CreateNewEmployee
): Promise<NewEmployee> {
  const pool = await connectToDatabase();
  const result = await pool
    .request()
    .input("firstName", sql.NVarChar, employee.firstName)
    .input("lastName", sql.NVarChar, employee.lastName)
    .input("jobTitle", sql.NVarChar, employee.jobTitle)
    .input("startDate", sql.Date, employee.startDate)
    .input("currentManager", sql.NVarChar, employee.currentManager)
    .input(
      "directorRegionalDirector",
      sql.NVarChar,
      employee.directorRegionalDirector
    ).query(`
      INSERT INTO Employees 
        (firstName, lastName, jobTitle, startDate, currentManager, directorRegionalDirector)
      OUTPUT INSERTED.*
      VALUES 
        (@firstName, @lastName, @jobTitle, @startDate, @currentManager, @directorRegionalDirector)
    `);

  return result.recordset[0];
}
