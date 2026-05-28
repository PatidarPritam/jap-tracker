"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { TrustShell } from "../../components/TrustShell";

type LoginResponse = {
  token: string;
  user: { email: string; name: string; role: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Login required");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setStatus("Checking...");
      const data = await apiRequest<LoginResponse>("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          password: form.get("password"),
        }),
      });
      window.localStorage.setItem("adminToken", data.token);
      router.push("/admin");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <TrustShell active="admin">
      <section className="mx-auto flex min-h-[calc(100vh-154px)] w-full max-w-md flex-col justify-center px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-[#8b5b29]">
          Back to home
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-[#6b6255]">{status}</p>
        <form onSubmit={login} className="mt-6 grid gap-4 rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
          <input
            name="email"
            type="email"
            placeholder="Admin email"
            className="h-11 rounded-md border border-[#cfc5b2] px-3"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="h-11 rounded-md border border-[#cfc5b2] px-3"
            required
          />
          <button className="h-11 rounded-md bg-[#6f3f1f] px-4 font-semibold text-white">
            Login
          </button>
        </form>
      </section>
    </TrustShell>
  );
}
