"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TrustShell, trustName } from "./components/TrustShell";
import { apiRequest } from "./lib/api";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: string };
};

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState("Enter your mobile number and login PIN shared by the ashram.");
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
    <TrustShell active="home">
      <section className="relative isolate min-h-[calc(100vh-88px)] overflow-hidden">
        <Image
          src="/trust-hero.png"
          alt="Ashram courtyard at sunrise"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b170b]/86 via-[#4a2410]/58 to-[#2b170b]/20" />
        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.72fr] lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd995]">
              Jap Sankalp Seva
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-6xl">
              {trustName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff3dc]">
              Daily jap entry and sankalp progress for registered devotees.
            </p>
          </div>

          <div className="rounded-md border border-white/40 bg-[#fffaf1]/96 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a3d16]">
              Devotee Login
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Open your jap panel</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b6255]">{status}</p>
            {showForgotPin ? (
              <form onSubmit={forgotPin} className="mt-5 grid gap-4">
                <input
                  name="forgotMobile"
                  type="tel"
                  inputMode="tel"
                  placeholder="Registered mobile number"
                  className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                  required
                />
                <button className="h-11 rounded-md bg-[#8a3d16] px-4 font-semibold text-white transition hover:bg-[#6f3011]">
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
              <form onSubmit={login} className="mt-5 grid gap-4">
                <input
                  name="mobile"
                  type="tel"
                  inputMode="tel"
                  placeholder="Mobile number"
                  className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                  required
                />
                <input
                  name="loginPin"
                  inputMode="numeric"
                  placeholder="Login PIN"
                  className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                  required
                />
                <button className="h-11 rounded-md bg-[#1f6f5b] px-4 font-semibold text-white transition hover:bg-[#185746]">
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
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Sankalp", "See your assigned target and completion progress."],
          ["Daily Jap", "Submit your daily jap count with date and notes."],
          ["Trust Updates", "Announcements and seva updates can be shown here next."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold text-[#8a3d16]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#6b6255]">{text}</p>
          </div>
        ))}
      </section>
    </TrustShell>
  );
}
