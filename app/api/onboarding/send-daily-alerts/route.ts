import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Starting daily onboarding alerts check...");

    // Call the incomplete tasks check
    const incompleteTasksResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/onboarding/check-incomplete-tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await incompleteTasksResponse.json();

    if (!incompleteTasksResponse.ok) {
      throw new Error(result.error || "Failed to check incomplete tasks");
    }

    console.log("✅ Daily onboarding alerts completed:", result);

    return NextResponse.json({
      success: true,
      message: "Daily onboarding alerts processed successfully",
      details: result,
    });
  } catch (error: any) {
    console.error("❌ Error in daily onboarding alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to process daily onboarding alerts",
        details: error.message,
      },
      { status: 500 }
    );
  }
}