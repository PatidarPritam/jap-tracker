import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#211f1a]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-5 py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5b29]">
            Jap Tracker
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-6xl">
            Sankalp tracking for admins and personal jap progress for devotees.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6b6255]">
            Admin assigns targets and tracks all devotees. Devotees open their own link, see
            their sankalp, and submit daily jap.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/login"
            className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm transition hover:border-[#1f6f5b]"
          >
            <p className="text-xl font-semibold">Admin Panel</p>
            <p className="mt-2 text-sm leading-6 text-[#6b6255]">
              Add devotees, assign 3-month targets, copy access links, and monitor progress.
            </p>
          </Link>
          <Link
            href="/devotee/login"
            className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm transition hover:border-[#1f6f5b]"
          >
            <p className="text-xl font-semibold">Devotee Panel</p>
            <p className="mt-2 text-sm leading-6 text-[#6b6255]">
              Login with email and access code given by admin to see your sankalp and add jap.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
