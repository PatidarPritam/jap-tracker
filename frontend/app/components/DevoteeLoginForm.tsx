"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { setDevoteeSession } from "../lib/auth";
import { Button, Field, Input, useToast } from "./ui";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: string };
};

/**
 * Devotee mobile + PIN login with a "forgot PIN" flow. Shared by the home
 * hero and the dedicated /devotee/login page.
 */
export function DevoteeLoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      const data = await apiRequest<LoginResponse>("/api/auth/devotee/login", {
        method: "POST",
        body: JSON.stringify({
          mobile: String(form.get("mobile") ?? "").trim(),
          loginPin: String(form.get("loginPin") ?? "").trim(),
        }),
      });
      setDevoteeSession(data.token, data.user.id);
      router.push(`/devotee/${data.user.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function forgotPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      const data = await apiRequest<{ message: string }>("/api/auth/devotee/forgot-pin", {
        method: "POST",
        body: JSON.stringify({
          mobile: String(form.get("forgotMobile") ?? "").trim(),
        }),
      });
      toast.info(data.message);
      setShowForgotPin(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request PIN help");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (showForgotPin) {
    return (
      <form onSubmit={forgotPin} className="grid gap-4">
        <Field label="Registered mobile number" required>
          <Input
            name="forgotMobile"
            type="tel"
            inputMode="tel"
            placeholder="Mobile number"
            autoFocus
            required
          />
        </Field>
        <Button type="submit" isLoading={isSubmitting} fullWidth>
          Request PIN Help
        </Button>
        <button
          type="button"
          onClick={() => setShowForgotPin(false)}
          className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
        >
          ← Back to login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={login} className="grid gap-4">
      <Field label="Mobile number" required>
        <Input
          name="mobile"
          type="tel"
          inputMode="tel"
          placeholder="Mobile number"
          autoComplete="username"
          required
        />
      </Field>
      <Field label="Login PIN" required>
        <Input
          name="loginPin"
          inputMode="numeric"
          placeholder="6-digit PIN from the ashram"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" variant="success" isLoading={isSubmitting} fullWidth>
        {isSubmitting ? "Checking…" : "Login"}
      </Button>
      <button
        type="button"
        onClick={() => setShowForgotPin(true)}
        className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
      >
        Forgot login PIN?
      </button>
    </form>
  );
}
