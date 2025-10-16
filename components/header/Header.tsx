'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import {
  getMenuForRole,
  type MenuItem,
  type DropdownMenu,
  type SubMenuItem,
} from './menuData';

const COLUMN_WIDTH_PX = 220;
const SIMPLE_COLUMN_WIDTH_PX = 200;
const GRID_GAP_PX = 16;
const GRID_PADDING_X_PX = 16;

const GoogleCircle = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-white">
    <span className="text-[13px] font-semibold text-[#4285F4]">G</span>
  </div>
);

const AuthSkeleton = () => (
  <div className="flex items-center gap-2 animate-pulse">
    <div className="h-10 w-24 rounded-md bg-gray-700" />
    <div className="h-10 w-24 rounded-md bg-gray-700" />
  </div>
);

export default function Header() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { user, logout, loading } = useAuth();

  // ✅ ЗАСВАРЛАСАН: Hydration алдаанаас сэргийлэхийн тулд mounted state нэмэв.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAuthed = Boolean(user);
  const role = user?.role ?? 'student';
  const userName = user?.name ?? user?.displayName ?? 'User';
  const email = user?.email ?? undefined;
  const photoURL = user?.photoURL ?? undefined;
  const isGoogle = user?.providerId === 'google.com';
  const filteredMenu = getMenuForRole(role);

  const iconBadgeMapRef = useRef<Record<string, string>>({
    'text-pink-500': 'text-pink-500 bg-pink-500/10 border-pink-500/30',
    'text-blue-500': 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    'text-yellow-500': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    'text-orange-500': 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    'text-purple-500': 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    'text-teal-500': 'text-teal-500 bg-teal-500/10 border-teal-500/30',
    'text-slate-500': 'text-slate-500 bg-slate-500/10 border-slate-500/30',
  });

  const getIconBadgeClasses = (iconColor?: string): string => {
    const map = iconBadgeMapRef.current;
    return map[iconColor ?? ''] ?? 'text-slate-500 bg-slate-500/10 border-slate-500/30';
  };

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkTheme(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkTheme(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleThemeToggle = (): void => {
    const newThemeIsDark = !isDarkTheme;
    setIsDarkTheme(newThemeIsDark);
    if (newThemeIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogoutClick = async (): Promise<void> => {
    await logout();
    router.push('/');
  };

  const handleDropdownToggle = (dropdownId: string): void => {
    setOpenDropdown((prev) => (prev === dropdownId ? null : dropdownId));
  };

  const handleMobileMenuToggle = (): void => setIsMobileMenuOpen((prev) => !prev);

  const getDropdownWidthVar = (item: MenuItem): string => {
    if (item.dropdownType === 'multi-column') {
      const col = item.columnCount && item.columnCount > 0 ? item.columnCount : 1;
      const total = col * COLUMN_WIDTH_PX + (col - 1) * GRID_GAP_PX + GRID_PADDING_X_PX * 2;
      return `${total}px`;
    }
    return `${SIMPLE_COLUMN_WIDTH_PX}px`;
  };

  const renderDropdownContent = (item: MenuItem) => {
    if (item.dropdownType === 'simple' && item.dropdownData) {
      const simpleItems = item.dropdownData as SubMenuItem[];
      return (
        <ul className="py-1">
          {simpleItems.map((subItem, index) => (
            <li key={`${item.id}-simple-${index}`}>
              <Link
                href={subItem.link}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800/70"
                onClick={() => setOpenDropdown(null)}
              >
                {subItem.title}
              </Link>
            </li>
          ))}
        </ul>
      );
    }

    if (item.dropdownType === 'multi-column' && item.dropdownData) {
      const multi = item.dropdownData as DropdownMenu[];
      const columnCount = item.columnCount ?? 1;

      const columns: DropdownMenu[][] = Array.from({ length: columnCount }, () => []);
      const counts: number[] = Array.from({ length: columnCount }, () => 0);

      const sorted = [...multi].sort((a, b) => b.items.length - a.items.length);
      sorted.forEach((group) => {
        let minIdx = 0;
        for (let i = 1; i < columnCount; i += 1) {
          if ((counts[i] ?? 0) < (counts[minIdx] ?? 0)) minIdx = i;
        }
        columns[minIdx]?.push(group);
        counts[minIdx] = (counts[minIdx] ?? 0) + (group.items?.length ?? 0);
      });

      return (
        <div className={`grid gap-4 px-4 pb-4 grid-cols-[repeat(${columnCount},_220px)]`}>
          {columns.map((columnItems, colIndex) => (
            <div key={`col-${colIndex}`}>
              {columnItems.map((col, index) => (
                <div key={`grp-${colIndex}-${index}`}>
                  <h5 className="p-4 text-base font-medium text-slate-300 border-b border-dashed border-slate-500 dark:text-slate-500 dark:border-slate-600 md:border-slate-300 md:text-slate-700">
                    {col.icon && (
                      <span
                        className={`mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm ${getIconBadgeClasses(
                          col.iconColor
                        )}`}
                      >
                        <i className={col.icon} />
                      </span>
                    )}
                    {col.title}
                  </h5>
                  <ul className="py-1">
                    {col.items.map((subItem, subIndex) => (
                      <li key={`sub-${colIndex}-${index}-${subIndex}`}>
                        <Link
                          href={subItem.link}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800/70"
                          onClick={() => setOpenDropdown(null)}
                        >
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

  return (
    <nav
      id="physx-header"
      className="block border-gray-200 bg-gray-900 px-2.5 py-2.5 shadow-sm dark:bg-slate-800 print:hidden sm:px-4"
    >
      <div
        className="container mx-0 flex max-w-full flex-wrap items-center lg:mx-auto"
        ref={navRef}
      >
        <Link href="/" className="flex items-center outline-none">
          <Image
            src="/assets/images/logo-sm.png"
            alt="PhysX small logo"
            width={30}
            height={30}
            className="h-auto"
          />
          <Image
            src="/assets/images/logo.png"
            alt="PhysX logo"
            width={79}
            height={16}
            className="ml-2 mt-1 hidden xl:block"
          />
        </Link>

        {isAuthed && <div
          className={`order-2 w-full items-center justify-between md:order-1 md:ml-5 md:flex md:w-auto transition-all duration-300 ${
            isMobileMenuOpen ? 'block animate-fade-in' : 'hidden'
          }`}
          id="mobile-menu-2"
        >
          <ul className="font-body mt-4 flex flex-col font-medium md:mt-0 md:flex-row md:space-x-4 md:text-sm lg:space-x-6 xl:space-x-8">
            {filteredMenu.map((item) => (
              <li key={item.id} className="dropdown relative">
                <button
                  onClick={() => handleDropdownToggle(item.id)}
                  className="dropdown-toggle flex w-full items-center border-b border-gray-800 py-2 px-3 font-medium text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white transition-colors duration-200 md:border-0 md:p-0"
                  aria-expanded={openDropdown === item.id}
                >
                  <i className={`${item.icon} mr-1 pb-1 text-lg`} /> {item.title}
                  <i className="ti ti-chevron-down ml-auto lg:ml-1" />
                </button>
                <div
                  className={`dropdown-menu absolute top-full left-0 z-50 list-none divide-y rounded border border-slate-700/50 bg-white dark:bg-gray-900 text-base shadow dark:divide-gray-600 dark:border-slate-700/50 md:border-white ${
                    openDropdown === item.id ? 'block' : 'hidden'
                  } max-w-none w-[var(--ddw)]`}
                  style={{ '--ddw': getDropdownWidthVar(item) } as CSSProperties}
                >
                  {renderDropdownContent(item)}
                </div>
              </li>
            ))}
          </ul>
        </div>}

        <div className="order-1 ml-auto flex items-center md:order-2">
          {loading ? (
            <AuthSkeleton />
          ) : !isAuthed ? (
            <div className="flex items-center gap-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                <i className="fas fa-plus mr-2 text-base" /> Бүртгүүлэх
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
              >
                <i className="fas fa-sign-in-alt mr-2 text-base" /> Нэвтрэх
              </Link>
            </div>
          ) : (
            <>
              <div className="relative mr-2 hidden lg:mr-4 lg:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="ti ti-search text-gray-400 z-10" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-gray-700 bg-gray-900 p-2 pl-10 text-gray-300 outline-none focus:border-gray-700 focus:ring-gray-700 dark:bg-slate-800 sm:text-sm"
                  placeholder="Search..."
                  aria-label="Search"
                />
              </div>

              {/* ✅ ЗАСВАРЛАСАН: mounted үед л theme товчийг харуулна */}
              <div className="mr-2 lg:mr-4">
                {mounted && (
                    <button
                    onClick={handleThemeToggle}
                    id="toggle-theme"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-700 transition-colors"
                    aria-label="Toggle theme"
                    >
                    <Sun className={`h-5 w-5 ${isDarkTheme ? 'hidden' : 'block'}`} />
                    <Moon className={`h-5 w-5 ${isDarkTheme ? 'block' : 'hidden'}`} />
                    </button>
                )}
              </div>

              <div className="dropdown relative mr-2 lg:mr-4">
                <button
                  type="button"
                  className="dropdown-toggle flex rounded-full md:mr-0"
                  onClick={() => handleDropdownToggle('notifications')}
                  aria-expanded={openDropdown === 'notifications'}
                >
                  <i className="ti ti-bell text-2xl text-gray-400" />
                </button>
              </div>

              <div className="dropdown relative ml-2 lg:ml-0">
                <button
                  type="button"
                  className="dropdown-toggle flex items-center rounded-full text-sm"
                  onClick={() => handleDropdownToggle('user')}
                  aria-expanded={openDropdown === 'user'}
                >
                  {photoURL ? (
                    <Image
                      className="h-8 w-8 rounded-full object-cover"
                      src={photoURL}
                      alt="user photo"
                      width={32}
                      height={32}
                      unoptimized
                    />
                  ) : isGoogle ? (
                    <GoogleCircle />
                  ) : (
                    <Image
                      className="h-8 w-8 rounded-full"
                      src="/assets/images/users/avatar-1.jpg"
                      alt="user photo"
                      width={32}
                      height={32}
                    />
                  )}
                  <span className="ml-2 hidden text-left xl:block">
                    <span className="block font-medium text-gray-400">{userName}</span>
                    <span className="-mt-1 block text-sm font-medium text-gray-500">{role}</span>
                  </span>
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-right absolute right-0 top-full z-50 my-1 list-none divide-y divide-gray-100 rounded border-slate-700 bg-white text-base shadow dark:divide-gray-600 dark:bg-slate-800 ${
                    openDropdown === 'user' ? 'block' : 'hidden'
                  }`}
                >
                  <div className="py-3 px-4">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {userName}
                    </span>
                    <span className="block truncate text-sm font-normal text-gray-500 dark:text-gray-400">
                      {email ?? '—'}
                    </span>
                  </div>
                  <ul className="py-1">
                    <li>
                      <Link
                        href={`/${role}/profile`}
                        className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900/20 dark:hover:text-white"
                        onClick={() => setOpenDropdown(null)}
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
          <button
            onClick={handleMobileMenuToggle}
            type="button"
            className="ml-1 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 md:hidden"
            aria-label="Open main menu"
          >
            <i className={`h-6 w-6 text-lg leading-6 ${isMobileMenuOpen ? 'ti ti-x' : 'ti ti-menu-2'}`} />
          </button>
        </div>
      </div>
    </nav>
  );
}

