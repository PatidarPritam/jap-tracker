"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { setAdminSession } from "../../lib/auth";
import { TrustShell } from "../../components/TrustShell";
import { Button, Card, Field, Icon, Input, useToast } from "../../components/ui";

type LoginResponse = {
  token: string;
  user: { email: string; name: string; role: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      const data = await apiRequest<LoginResponse>("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          password: form.get("password"),
        }),
      });
      setAdminSession(data.token);
      router.push("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TrustShell active="admin">
      <section className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
        >
          ← Back to home
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
            <Icon name="lock" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold">Admin Login</h1>
            <p className="text-sm text-muted">Sign in to manage devotees and sankalps</p>
          </div>
        </div>
        <Card className="mt-6">
          <form onSubmit={login} className="grid gap-4">
            <Field label="Admin email" required>
              <Input
                name="email"
                type="email"
                placeholder="admin@japtracker.local"
                autoComplete="email"
                autoFocus
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" isLoading={isSubmitting} fullWidth>
              {isSubmitting ? "Signing in…" : "Login"}
            </Button>
          </form>
        </Card>
      </section>
    </TrustShell>
  );
}
