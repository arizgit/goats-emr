"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/scan", label: "Scan Tag" },
  { href: "/goats/new", label: "Add Goat" }
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 border-b border-farm-100 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-bold text-farm-700">GoatsEMR</h1>
        {session?.user?.email && (
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-farm-600 px-3 py-2 text-sm font-medium text-farm-700"
          >
            Sign out
          </button>
        )}
      </div>
      <nav className="flex gap-2 px-4 pb-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                active ? "bg-farm-600 text-white" : "bg-farm-100 text-farm-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
