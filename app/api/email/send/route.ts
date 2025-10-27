import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const emailData = await request.json();

    await sendEmail(emailData);

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
      },
      { status: 500 }
    );
  }
}
