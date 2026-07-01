"use client";

import Link from "next/link";
import { TrustShell } from "../../components/TrustShell";
import { DevoteeLoginForm } from "../../components/DevoteeLoginForm";
import { Card, Icon } from "../../components/ui";

export default function DevoteeLoginPage() {
  return (
    <TrustShell active="devotee">
      <section className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
        >
          ← Back to home
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
            <Icon name="beads" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold">Devotee Login</h1>
            <p className="text-sm text-muted">Use the mobile number and PIN given by the ashram</p>
          </div>
        </div>
        <Card className="mt-6">
          <DevoteeLoginForm />
        </Card>
      </section>
    </TrustShell>
  );
}
