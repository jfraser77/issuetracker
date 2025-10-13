// app/test-auth/page.tsx
"use client";

import { useState } from "react";

export default function TestAuth() {
  const [result, setResult] = useState<any>(null);

  const testSignin = async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "password123");

    const response = await fetch("/api/auth/signin", {
      method: "POST",
      body: formData,
    });

    setResult(await response.json());
  };

  const testCurrentUser = async () => {
    const response = await fetch("/api/auth/user");
    setResult(await response.json());
  };

  return (
    <div className="p-8">
      <h1>Auth Test</h1>
      <button onClick={testSignin} className="bg-blue-500 text-white p-2 mr-2">
        Test Signin
      </button>
      <button onClick={testCurrentUser} className="bg-green-500 text-white p-2">
        Test Current User
      </button>
      <pre className="mt-4">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
