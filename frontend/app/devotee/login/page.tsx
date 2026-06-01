"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { TrustShell } from "../../components/TrustShell";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: string };
};

export default function DevoteeLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Use the mobile number and login PIN given by admin");
  const [showForgotPin, setShowForgotPin] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setStatus("Checking...");
      const data = await apiRequest<LoginResponse>("/api/auth/devotee/login", {
        method: "POST",
        body: JSON.stringify({
          mobile: String(form.get("mobile") ?? "").trim(),
          loginPin: String(form.get("loginPin") ?? "").trim(),
        }),
      });
      window.localStorage.setItem("devoteeToken", data.token);
      window.localStorage.setItem("devoteeId", data.user.id);
      router.push(`/devotee/${data.user.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function forgotPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setStatus("Checking mobile number...");
      const data = await apiRequest<{ message: string }>("/api/auth/devotee/forgot-pin", {
        method: "POST",
        body: JSON.stringify({
          mobile: String(form.get("forgotMobile") ?? "").trim(),
        }),
      });
      setStatus(data.message);
      setShowForgotPin(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not request PIN help");
    }
  }

  return (
    <TrustShell active="devotee">
      <section className="mx-auto flex min-h-[calc(100vh-154px)] w-full max-w-md flex-col justify-center px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-[#8b5b29]">
          Back to home
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">Devotee Login</h1>
        <p className="mt-2 text-sm text-[#6b6255]">{status}</p>
        {showForgotPin ? (
          <form
            onSubmit={forgotPin}
            className="mt-6 grid gap-4 rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm"
          >
            <input
              name="forgotMobile"
              type="tel"
              inputMode="tel"
              placeholder="Registered mobile number"
              className="h-11 rounded-md border border-[#cfc5b2] px-3"
              required
            />
            <button className="h-11 rounded-md bg-[#8a3d16] px-4 font-semibold text-white">
              Request PIN Help
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPin(false)}
              className="text-sm font-semibold text-[#8a3d16]"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form
            onSubmit={login}
            className="mt-6 grid gap-4 rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm"
          >
            <input
              name="mobile"
              type="tel"
              inputMode="tel"
              placeholder="Mobile number"
              className="h-11 rounded-md border border-[#cfc5b2] px-3"
              required
            />
            <input
              name="loginPin"
              inputMode="numeric"
              placeholder="Login PIN"
              className="h-11 rounded-md border border-[#cfc5b2] px-3"
              required
            />
            <button className="h-11 rounded-md bg-[#1f6f5b] px-4 font-semibold text-white">
              Login
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPin(true)}
              className="text-sm font-semibold text-[#8a3d16]"
            >
              Forgot login PIN?
            </button>
          </form>
        )}
      </section>
    </TrustShell>
  );
}
