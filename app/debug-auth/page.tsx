import { getCurrentUser } from "@/app/actions/auth";
import { cookies } from "next/headers";

export default async function DebugAuth() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth-user");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Current User:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Auth Cookie:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify({
              exists: !!authCookie,
              value: authCookie?.value ? '***' : 'none',
              options: authCookie?.options
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">All Cookies:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(cookieStore.getAll().map(c => ({
              name: c.name,
              value: c.value ? '***' : 'none'
            })), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}