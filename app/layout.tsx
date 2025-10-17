import "@/app/globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "./auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NSN IT-Management Portal",
  description: "Secure employee management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}