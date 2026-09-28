"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLogout, useSession, type SessionUser } from "@/lib/hooks";
import { IconBook, IconHome, IconLogout, IconMenu, IconPlus, IconShield, IconUser, IconX } from "./icons";

type User = SessionUser | null;

function initials(u: NonNullable<User>) {
  const s = u.name ?? u.username ?? u.rollNumber ?? u.role;
  return s.slice(0, 1).toUpperCase();
}

export default function Nav() {
  const { data: session, isPending: sessionPending } = useSession();
  const logoutMutation = useLogout();
  const user: User | undefined = sessionPending && !session ? undefined : (session?.user ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [path]);

  async function logout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Session already gone server-side; still clear local state below.
    }
    setMenuOpen(false);
    router.push("/login");
  }

  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const desk = (href: string, label: string) => (
    <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
      className={`rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors ${isActive(href) ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"}`}>
      {label}
    </Link>
  );

  const tabs = [
    { href: "/", label: "Home", icon: <IconHome /> },
    { href: "/courses", label: "Courses", icon: <IconBook /> },
    { href: "/create", label: "Post", icon: <IconPlus /> },
    { href: "/profile", label: "Profile", icon: <IconUser /> },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: <IconShield /> }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="wrap flex min-h-[60px] items-center gap-2 py-2">
          <Link href={user ? "/" : "/login"} className="flex items-center gap-2.5" aria-label="CSIT Butwal home">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-600 text-base font-bold text-white" aria-hidden>C</span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight">CSIT Butwal</span>
              <span className="block text-[11px] font-medium text-slate-500">Campus platform</span>
            </span>
          </Link>

          {user && (
            <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
              {desk("/", "Home")}
              {desk("/create", "Create Post")}
              {desk("/courses", "Courses")}
              {desk("/profile", "Profile")}
              {user.role === "ADMIN" && desk("/admin", "Admin")}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {user === undefined ? (
              <span className="skeleton h-8 w-20" aria-label="Loading account" />
            ) : user ? (
              <>
                <span className="badge-blue hidden sm:inline-flex" title={user.campus?.name}>{user.role} · {user.campus?.code}</span>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"
                    className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-1.5 py-1 transition-colors hover:bg-slate-100"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700" aria-hidden>{initials(user)}</span>
                    <span className="hidden max-w-[140px] truncate text-left text-[13px] font-semibold lg:block">
                      {user.name ?? user.username ?? user.rollNumber}
                    </span>
                    {menuOpen ? <IconX className="h-4 w-4 text-slate-500" /> : <IconMenu className="h-4 w-4 text-slate-500" />}
                  </button>
                  {menuOpen && (
                    <div role="menu" aria-label="Account" className="absolute right-0 top-full mt-1.5 w-60 overflow-hidden rounded-[12px] border border-slate-200 bg-white py-1.5 shadow-lg">
                      <div className="border-b border-slate-100 px-4 py-2.5">
                        <p className="truncate text-sm font-bold">{user.name ?? user.username ?? user.rollNumber}</p>
                        <p className="truncate text-xs text-slate-500">{user.role} · {user.campus?.name}{user.role === "STUDENT" && user.semester ? ` · Sem ${user.semester}` : ""}</p>
                      </div>
                      <Link role="menuitem" href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"><IconUser />Profile & settings</Link>
                      <Link role="menuitem" href="/privacy" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"><IconShield />Privacy boundary</Link>
                      <button role="menuitem" onClick={logout} disabled={logoutMutation.isPending} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><IconLogout />{logoutMutation.isPending ? "Signing out…" : "Sign out"}</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              path !== "/login" && <Link href="/login" className="btn-primary btn-sm btn">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="tabbar md:hidden" aria-label="Main">
          <div className="mx-auto flex max-w-lg">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} aria-current={isActive(t.href) ? "page" : undefined}>
                <span aria-hidden className={isActive(t.href) ? "[&>svg]:stroke-[2.2px]" : ""}>{t.icon}</span>
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
