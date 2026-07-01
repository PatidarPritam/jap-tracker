import Image from "next/image";
import { TrustShell, trustName } from "./components/TrustShell";
import { DevoteeLoginForm } from "./components/DevoteeLoginForm";
import { Icon, type IconName } from "./components/ui";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "target", title: "Sankalp", text: "See your assigned target and completion progress." },
  { icon: "beads", title: "Daily Jap", text: "Submit your daily jap count with date and notes." },
  {
    icon: "sparkles",
    title: "Trust Updates",
    text: "Announcements and seva updates can be shown here next.",
  },
];

export default function Home() {
  return (
    <TrustShell active="home">
      <section className="relative isolate overflow-hidden">
        <Image
          src="/trust-hero.png"
          alt="Ashram courtyard at sunrise"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b170b]/90 via-[#4a2410]/65 to-[#2b170b]/25" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.72fr] lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">
              Jap Sankalp Seva
            </p>
            <h1 className="font-devanagari mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
              {trustName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-saffron-50">
              Daily jap entry and sankalp progress for registered devotees.
            </p>
          </div>

          <div className="rounded-xl border border-white/30 bg-surface-muted/95 p-6 shadow-float backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-saffron-700">
              Devotee Login
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Open your jap panel</h2>
            <p className="mt-1 mb-5 text-sm leading-6 text-muted">
              Enter the mobile number and login PIN shared by the ashram.
            </p>
            <DevoteeLoginForm />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-line bg-surface p-5 shadow-card transition hover:shadow-card-hover"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
              <Icon name={feature.icon} />
            </span>
            <p className="mt-3 text-lg font-semibold text-saffron-800">{feature.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{feature.text}</p>
          </div>
        ))}
      </section>
    </TrustShell>
  );
}
