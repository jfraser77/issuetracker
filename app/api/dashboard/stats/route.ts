import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase();
    
    const [employeesResult, newThisMonthResult, terminationsResult, laptopsResult] = await Promise.all([
      pool.request().query("SELECT COUNT(*) as count FROM Employees WHERE status = 'active'"),
      pool.request().query(`
        SELECT COUNT(*) as