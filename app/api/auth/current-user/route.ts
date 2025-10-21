import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error: any) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
  }
}