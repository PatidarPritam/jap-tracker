import Link from "next/link";
import Image from "next/image";
import { TrustShell, trustName } from "./components/TrustShell";

export default function Home() {
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b170b]/80 via-[#4a2410]/42 to-transparent" />
        <div className="relative mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd995]">
              Jap Sankalp Seva
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-6xl">
              {trustName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff3dc]">
              Devotee registration, sankalp assignment, daily jap entry, and trust reports in one
              simple seva system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="rounded-md bg-[#d7902f] px-5 py-3 font-semibold text-[#241308] shadow-sm transition hover:bg-[#f0aa48]"
              >
                Admin Login
              </Link>
              <Link
                href="/devotee/login"
                className="rounded-md border border-white/70 bg-white/12 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Devotee Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Devotee Seva", "Create devotee records with location and access code."],
          ["Sankalp Tracking", "Assign targets and monitor active jap progress."],
          ["Reports", "Review village, district, and state level participation."],
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
