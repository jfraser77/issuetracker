import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  // Check if user is admin (adjust this based on your admin role naming)
  if (!user || (user.role !== "Admin" && user.role !== "I.T.")) {
    redirect("/management-portal/dashboard");
  }

  return <>{children}</>;
}