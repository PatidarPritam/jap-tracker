"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: string };
};

export default function DevoteeLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Use the email and access code given by admin");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setStatus("Checking...");
      const data = await apiRequest<LoginResponse>("/api/auth/devotee/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          accessCode: String(form.get("accessCode") ?? "").trim(),
        }),
      });
      window.localStorage.setItem("devoteeToken", data.token);
      window.localStorage.setItem("devoteeId", data.user.id);
      router.push(`/devotee/${data.user.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#211f1a]">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-[#8b5b29]">
          Jap Tracker
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">Devotee Login</h1>
        <p className="mt-2 text-sm text-[#6b6255]">{status}</p>
        <form onSubmit={login} className="mt-6 grid gap-4 rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
          <input
            name="email"
            type="email"
            placeholder="Your email"
            className="h-11 rounded-md border border-[#cfc5b2] px-3"
            required
          />
          <input
            name="accessCode"
            placeholder="Access code"
            className="h-11 rounded-md border border-[#cfc5b2] px-3"
            required
          />
          <button className="h-11 rounded-md bg-[#1f6f5b] px-4 font-semibold text-white">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
