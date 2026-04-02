"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DashboardUserMenuProps = {
  avatarUrl: string | null;
};

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDKxvORuVmDZYtE3NianxBmhqHDFlGNIQhdZaqZ_kbEerzfm0VSKHRDubmhDXWaVMlCoOYwSlME0BUwmf3xOvEA1sEj9k6LSzdUYTH0Ze8qq-gB3DT9DWUgGwO4_CUQLgPmStaJdcwhx3uYoBnNSs3kUGyyXnbxSkvcMfsAyjAtve3hUy_oeuD8obins_oVGZu2e9zS8UUjFQPIk1A4Nj88k3eBH7RQQHbsm655peIBdiMt9GUOD3PEDbj_DnwHD2cXDOtQ3gaDjJXA";

export function DashboardUserMenu({ avatarUrl }: DashboardUserMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);
    try {
      await fetch("/auth/session/clear", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-8 w-8 overflow-hidden rounded-full border border-[#8A5A2B]/30"
        aria-label="打开用户菜单"
      >
        <img
          alt="用户头像"
          className="h-full w-full rounded-full object-cover"
          src={avatarUrl || DEFAULT_AVATAR}
        />
      </button>

      <div
        className={`absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#D8C7AE] bg-[#F7F2E8]/95 shadow-xl backdrop-blur-xl ${
          open ? "block" : "hidden"
        }`}
      >
        <Link
          href="/dashboard/account"
          className="block rounded-t-xl border-b border-[#E2D5C2]/80 px-4 py-3 text-sm text-[#4A4038] transition-colors hover:bg-[#EFE4D2]"
        >
          个人页面
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-b-xl px-4 py-3 text-left text-sm text-[#4A4038] transition-colors hover:bg-[#EFE4D2]"
        >
          {isPending ? "退出中..." : "退出登录"}
        </button>
      </div>
    </div>
  );
}


