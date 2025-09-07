"use client";

import { useEffect, useState, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";

import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useAuth } from '@/app/context/AuthContext'; // ✅ AuthContext импорт

import {
  getMenuForRole,
  type MenuItem,
  type DropdownMenu,
  type SubMenuItem,
} from "./menuData";

type Role = "admin" | "moderator" | "teacher" | "student";

export default function Header() {
  // ✅ Performance засах - memoized constant
  const iconBadgeMap = useRef<Record<string, string>>({
    "text-pink-500": "text-pink-500 bg-pink-500/10 border-pink-500/30",
    "text-blue-500": "text-blue-500 bg-blue-500/10 border-blue-500/30",
    "text-yellow-500": "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
    "text-orange-500": "text-orange-500 bg-orange-500/10 border-orange-500/30",
    "text-purple-500": "text-purple-500 bg-purple-500/10 border-purple-500/30",
    "text-teal-500": "text-teal-500 bg-teal-500/10 border-teal-500/30",
    "text-slate-500": "text-slate-500 bg-slate-500/10 border-slate-500/30",
  }).current;
  
  const getIconBadgeClasses = (iconColor?: string) => {
    return iconBadgeMap[iconColor ?? ""] ?? "text-slate-500 bg-slate-500/10 border-slate-500/30";
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);

  // ✅ AuthContext ашиглах - API дахин дуудахгүй
  const { user } = useAuth();
  
  // ---- AuthContext-с гарсан өгөгдөл дээр суурилсан local state ----
  const role = (user?.role as Role) || "student";
  const filteredMenu = getMenuForRole(role);
  const isAuthed = !!user;
  const userName = user?.name || user?.displayName || null;
  const email = user?.email || null;
  
  // ---- Firebase зураг ба Google provider шалгалт ----
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [isGoogle, setIsGoogle] = useState<boolean>(false);

  // ✅ Firebase зураг болон provider мэдээлэл авах (optimized)
  useEffect(() => {
    if (!isAuthed) {
      setPhotoURL(null);
      setIsGoogle(false);
      return;
    }
    
    // AuthContext-тай нэгдмэл болгох
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setPhotoURL(u?.photoURL ?? u?.providerData?.[0]?.photoURL ?? null);
        const providerIds = u?.providerData?.map(p => p.providerId) ?? [];
        setIsGoogle(providerIds.includes("google.com"));
      } else {
        setPhotoURL(null);
        setIsGoogle(false);
      }
    });
    return () => unsub();
  }, [isAuthed]); // ✅ isAuthed dependency нэмэх

  const handleDropdownToggle = (dropdownId: string) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
  };
  const handleMobileMenuToggle = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const handleThemeToggle = () => setIsDarkTheme(!isDarkTheme);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
      document.body.setAttribute("data-layout-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.setAttribute("data-layout-mode", "light");
    }
  }, [isDarkTheme]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [navRef]);

  const handleLogoutClick = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      try { await signOut(auth); } catch {}
      window.location.href = "/";
    }
  };

  // ---- Dropdown layout ----
  const COLUMN_WIDTH_PX = 220;
  const SIMPLE_COLUMN_WIDTH_PX = 200;
  const GRID_GAP_PX = 16;
  const GRID_PADDING_X_PX = 16;

  const getDropdownWidthVar = (item: MenuItem): string => {
    if (item.dropdownType === "multi-column") {
      const col = item.columnCount && item.columnCount > 0 ? item.columnCount : 1;
      const total = col * COLUMN_WIDTH_PX + (col - 1) * GRID_GAP_PX + GRID_PADDING_X_PX * 2;
      return `${total}px`;
    }
    return `${SIMPLE_COLUMN_WIDTH_PX}px`;
  };

  const renderDropdownContent = (item: MenuItem) => {
    if (item.dropdownType === "simple" && item.dropdownData) {
      const simpleItems = item.dropdownData as SubMenuItem[];
      return (
        <ul className="py-1">
          {simpleItems.map((subItem, index) => (
            <li key={index}>
              <Link href={subItem.link} className="nav-link dark:hover:bg-slate-800/70">
                {subItem.title}
              </Link>
            </li>
          ))}
        </ul>
      );
    }

    if (item.dropdownType === "multi-column" && item.dropdownData) {
      const multi = item.dropdownData as DropdownMenu[];
      const columnCount = item.columnCount || 1;

      const columns: DropdownMenu[][] = Array.from({ length: columnCount }, () => []);
      const counts: number[] = Array.from({ length: columnCount }, () => 0);
      const sorted = [...multi].sort((a, b) => b.items.length - a.items.length);
      sorted.forEach((group) => {
        let minIdx = 0;
        for (let i = 1; i < columnCount; i++) {
          if ((counts[i] ?? 0) < (counts[minIdx] ?? 0)) minIdx = i;
        }
        columns[minIdx]?.push(group);
        counts[minIdx]! += group?.items?.length || 0;
      });

      return (
        <div
          className="grid gap-4 px-4 pb-4"
          style={{ gridTemplateColumns: `repeat(${columnCount}, ${COLUMN_WIDTH_PX}px)` }}
        >
          {columns.map((columnItems, colIndex) => (
            <div key={colIndex}>
              {columnItems.map((col, index) => (
                <div key={index}>
                  <h5 className="font-medium text-base p-4 border-b border-dashed border-slate-500 dark:border-slate-600 md:border-slate-300 text-slate-300 dark:text-slate-500 md:text-slate-700">
                    {col.icon && (
                      <span className={`w-8 h-8 mr-2 rounded-lg inline-flex items-center justify-center border shadow-sm ${getIconBadgeClasses(col.iconColor)}`}>
                        <i className={col.icon} />
                      </span>
                    )}
                    {col.title}
                  </h5>
                  <ul className="py-1">
                    {col.items.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link href={subItem.link} className="nav-link dark:hover:bg-slate-800/70">
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Google нэвтэрсэн боловч photoURL байхгүй үед ашиглах түр icon
  const GoogleCircle = () => (
    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border">
      <span className="text-[13px] font-semibold" style={{ color: "#4285F4" }}>G</span>
    </div>
  );

  return (
    <nav id="physx-header" className="border-gray-200 bg-gray-900 px-2.5 py-2.5 shadow-sm dark:bg-slate-800 sm:px-4 block print:hidden">
      <div className="container mx-0 flex max-w-full flex-wrap items-center lg:mx-auto" ref={navRef}>
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center outline-none">
            <Image src="/assets/images/logo-sm.png" alt="PhysX small logo" width={30} height={30} className="h-auto" />
            <Image src="/assets/images/logo.png" alt="PhysX logo" width={79} height={16} className="ml-2 hidden xl:block mt-1" />
          </Link>
        </div>

        {/* NAV MENU */}
        <div className={`order-2 w-full items-center justify-between md:order-1 md:ml-5 md:flex md:w-auto transition-all duration-300 ${isMobileMenuOpen ? "block animate-fade-in" : "hidden"}`} id="mobile-menu-2">
          <ul className="font-body mt-4 flex flex-col font-medium md:mt-0 md:flex-row md:text-sm md:font-medium space-x-0 md:space-x-4 lg:space-x-6 xl:space-x-8 navbar">
            {filteredMenu.map((item) => (
              <li key={item.id} className="dropdown relative">
                <button onClick={() => handleDropdownToggle(item.id)} className="dropdown-toggle flex w-full items-center border-b border-gray-800 py-2 px-3 font-medium md:border-0 md:p-0">
                  <i className={`${item.icon} mr-1 pb-1 text-lg`} /> {item.title}
                  <i className="ti ti-chevron-down ml-auto lg:ml-1" />
                </button>
                <div
                  className={`dropdown-menu absolute top-full left-0 translate-y-2 z-50 w-auto list-none divide-y rounded
                    bg-gray-800 md:bg-white text-base shadow dark:divide-gray-600 border border-slate-700 md:border-white
                    dark:border-slate-700/50 dark:bg-gray-900 bg-[url('/assets/images/widgets/m-p2.png')] bg-no-repeat bg-right-bottom
                    nav-controlled ${openDropdown === item.id ? "block" : "hidden"}`}
                  style={{ "--ddw": getDropdownWidthVar(item) } as CSSProperties}
                >
                  {renderDropdownContent(item)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className="order-1 ml-auto flex items-center md:order-2">
          {/* Нэвтрээгүй үед: зөвхөн 'Нэвтрэх' товч */}
          {!isAuthed && (
        <div className="flex items-center gap-2">
        <Link
          href="/register"
          className="inline-flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          <i className="fas fa-plus mr-2 text-base"></i>
          Бүртгүүлэх
        </Link>
      
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-gray-200 focus:z-10 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        >
          <i className="fas fa-sign-in-alt mr-2 text-base"></i>
          Нэвтрэх
        </Link>
      </div>
          )}

          {/* Нэвтэрсэн үед: Search / Theme / Notifications / Profile */}
          {isAuthed && (
            <>
              {/* Search */}
              <div className="relative mr-2 hidden lg:mr-4 lg:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="ti ti-search text-gray-400 z-10" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-gray-700 bg-gray-900 p-2 pl-10 text-gray-300 outline-none focus:border-gray-700 focus:ring-gray-700 dark:bg-slate-800 sm:text-sm"
                  placeholder="Search..."
                />
              </div>

              {/* Theme Toggle */}
              <div className="mr-2 lg:mr-4">
                <button onClick={handleThemeToggle} id="toggle-theme" className="flex rounded-full md:mr-0 relative">
                  <i className={`top-icon ${isDarkTheme ? "ti ti-moon" : "ti ti-sun"}`} />
                </button>
              </div>

              {/* Notifications */}
              <div className="mr-2 lg:mr-4 dropdown relative">
                <button
                  type="button"
                  className="dropdown-toggle flex rounded-full md:mr-0"
                  aria-expanded={openDropdown === "notifications"}
                  onClick={() => handleDropdownToggle("notifications")}
                >
                  <i className="ti ti-bell text-2xl text-gray-400" />
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-right z-50 my-1 w-64 list-none divide-y h-52 divide-gray-100 rounded border-slate-700 md:border-white text-base shadow dark:divide-gray-600 bg-white dark:bg-slate-800 ${openDropdown === "notifications" ? "block" : "hidden"}`}
                  data-simplebar=""
                >
                  <ul className="py-1">
                    <li className="py-2 px-4">
                      <a className="dropdown-item" href="#">
                        <div className="flex align-items-start">
                          <Image className="object-cover rounded-full h-8 w-8 shrink-0 mr-3" src="/assets/images/users/avatar-2.jpg" alt="ntf" width={32} height={32} />
                          <div className="flex-grow ml-0.5 overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-300">Karen Robinson</p>
                            <p className="text-gray-500 mb-0 text-xs truncate dark:text-gray-400">Hey ! i&apos;m available here</p>
                          </div>
                        </div>
                      </a>
                    </li>
                    <li className="py-2 px-4">
                      <a className="dropdown-item" href="#">
                        <div className="flex align-items-start">
                          <Image className="object-cover rounded-full h-8 w-8 shrink-0 mr-3" src="/assets/images/users/avatar-3.jpg" alt="ntf" width={32} height={32} />
                          <div className="flex-grow ml-0.5 overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-300">Your order is placed</p>
                            <p className="text-gray-500 mb-0 text-xs truncate dark:text-gray-400">Dummy text of the printing and industry.</p>
                          </div>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Profile */}
              <div className="mr-2 lg:mr-0 dropdown relative">
                <button
                  type="button"
                  className="dropdown-toggle flex items-center rounded-full text-sm focus:bg-none focus:ring-0 dark:focus:ring-0 md:mr-0"
                  aria-expanded={openDropdown === "user"}
                  onClick={() => handleDropdownToggle("user")}
                >
                  {photoURL ? (
                    <Image className="h-8 w-8 rounded-full" src={photoURL} alt="user photo" width={32} height={32} unoptimized />
                  ) : isGoogle ? (
                    <GoogleCircle />
                  ) : (
                    <Image className="h-8 w-8 rounded-full" src="/assets/images/users/avatar-1.jpg" alt="user photo" width={32} height={32} />
                  )}
                  <span className="ml-2 hidden text-left xl:block">
                    <span className="block font-medium text-gray-400">{userName ?? "User"}</span>
                    {/* Signed in оронд ROLE харуулах */}
                    <span className="-mt-1 block text-sm font-medium text-gray-500">
                      {role}
                    </span>
                  </span>
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-right z-50 my-1 list-none divide-y divide-gray-100 rounded border-slate-700 md:border-white text-base shadow dark:divide-gray-600 bg-white dark:bg-slate-800 ${openDropdown === "user" ? "block" : "hidden"}`}
                >
                  <div className="py-3 px-4">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{userName ?? "User"}</span>
                    <span className="block truncate text-sm font-normal text-gray-500 dark:text-gray-400">{email ?? "—"}</span>
                  </div>
                  <ul className="py-1">
                  <li>
  <Link
    href={`/${role}/profile`}
    className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900/20 dark:hover:text-white"
  >
    Тохиргоо
  </Link>
</li>
                   <li>
                      <button
                        onClick={handleLogoutClick}
                        className="block w-full text-left py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900/20 dark:hover:text-white"
                      >
                       Гарах
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Mobile Toggle (аль ч тохиолдолд) */}
          <button
            onClick={handleMobileMenuToggle}
            type="button"
            id="toggle-menu"
            className="ml-1 inline-flex items-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 md:hidden"
            aria-controls="mobile-menu-2"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            <i className={`h-6 w-6 text-lg leading-6 ${isMobileMenuOpen ? "ti ti-x" : "ti ti-menu-2"}`} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .nav-controlled {
          width: var(--ddw) !important;
          max-width: none !important;
        }
      `}</style>
    </nav>
  );
}