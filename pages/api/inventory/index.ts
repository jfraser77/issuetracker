// pages/api/inventory/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import {
  getEmployees,
  createEmployee,
} from "../../../services/employeeService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const items = await getEmployees();
      res.status(200).json(items);
    } else if (req.method === "POST") {
      const newItem = await createEmployee(req.body);
      res.status(201).json(newItem);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Inventory API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
