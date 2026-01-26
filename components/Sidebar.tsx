'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { getMenuForRole } from "./menuData";
import {
    ChevronRight,
    ChevronLeft,
    LogOut,
    LayoutDashboard,
    Presentation,
    BookOpen,
    Atom,
    ClipboardList
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
    'layout_dashboard': LayoutDashboard,
    'presentation': Presentation,
    'book_open': BookOpen,
    'atom': Atom,
    'clipboard_list': ClipboardList
};
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";



export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    // const [isDark, setIsDark] = useState(false); // Removed dark mode state
    const [mounted, setMounted] = useState(false);

    // Role based filtering
    const role = user?.role ?? 'student';
    const menuItems = getMenuForRole(role);

    useEffect(() => setMounted(true), []);

    // Force light mode
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('theme');
    }, []);

    // const toggleTheme = ... // Removed

    const toggleExpanded = (id: string) => {
        if (collapsed) {
            setCollapsed(false);
            setExpandedMenus([id]);
            return;
        }
        setExpandedMenus(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    if (!mounted) return null;

    // Loading Skeleton
    if (loading) {
        return (
            <aside className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r bg-white dark:bg-stone-900 shadow-sm transition-all duration-300",
                collapsed ? "w-[64px]" : "w-[260px]"
            )}>
                <div className="flex h-full flex-col p-4 space-y-4">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2 mt-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <>
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen border-r bg-white dark:bg-stone-900 shadow-sm transition-all duration-300",
                    collapsed ? "w-[64px]" : "w-[260px]"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header (Logo & Collapse) */}
                    <div className="flex h-16 items-center justify-between border-b px-4">
                        <Link href="/" className="flex items-center gap-2 overflow-hidden">
                            <div className="relative h-8 w-8 shrink-0">
                                <Image src="/assets/images/logo-sm.png" fill alt="Logo" className="object-contain" />
                            </div>
                            <div className={cn(
                                "font-bold text-xl transition-all duration-300 whitespace-nowrap overflow-hidden text-stone-900 dark:text-white",
                                collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                            )}>
                                PhysX
                            </div>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* User Info Section */}
                    {user && (
                        <div className={cn(
                            "flex flex-col items-center justify-center border-b p-4 transition-all duration-300",
                            collapsed ? "py-4" : "gap-2"
                        )}>
                            <Avatar className={cn(
                                "cursor-pointer ring-2 ring-primary/10 transition-all",
                                collapsed ? "h-8 w-8" : "h-16 w-16"
                            )}>
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {user.displayName?.substring(0, 2).toUpperCase() || 'US'}
                                </AvatarFallback>
                            </Avatar>

                            {!collapsed && (
                                <div className="text-center animate-fade-in">
                                    <p className="font-semibold text-stone-900 dark:text-white truncate max-w-[200px]" title={user.displayName || ''}>
                                        {user.displayName}
                                    </p>
                                    <Badge variant="secondary" className="mt-1 text-xs capitalize">
                                        {{
                                            student: 'Сурагч',
                                            teacher: 'Багш',
                                            admin: 'Админ',
                                            moderator: 'Модератор'
                                        }[role] || role}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scrollable Navigation */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
                        {menuItems.map((item) => (
                            <div key={item.id} className="mb-2">
                                {/* Main Menu Item */}
                                {(!item.columnCount || item.columnCount === 0) && !item.dropdownData ? (
                                    // Simple Link
                                    <Link
                                        href={item.link || '#'}
                                        className={cn(
                                            "group flex items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                                            pathname === item.link ? "bg-slate-100 dark:bg-slate-800 text-primary" : "text-slate-600 dark:text-slate-400"
                                        )}
                                        title={collapsed ? item.title : undefined}
                                    >
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const IconComponent = iconMap[item.icon] || LayoutDashboard;
                                                return <IconComponent className="h-5 w-5" />;
                                            })()}
                                            <span className={cn("truncate transition-all", collapsed ? "w-0 opacity-0 hidden" : "w-full opacity-100")}>
                                                {item.title}
                                            </span>
                                        </div>
                                    </Link>
                                ) : (
                                    // Dropdown Parent
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => toggleExpanded(item.id)}
                                            className={cn(
                                                "group flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                                                expandedMenus.includes(item.id) ? "text-primary" : "text-slate-600 dark:text-slate-400"
                                            )}
                                            title={collapsed ? item.title : undefined}
                                        >
                                            <div className="flex items-center gap-3">
                                                <i className={cn(item.icon, "text-lg w-5 h-5 flex items-center justify-center")} />
                                                <span className={cn("truncate transition-all", collapsed ? "w-0 opacity-0 hidden" : "w-full opacity-100")}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            {!collapsed && (
                                                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedMenus.includes(item.id) ? "rotate-90" : "")} />
                                            )}
                                        </button>

                                        {/* Submenu for Expanded */}
                                        {!collapsed && expandedMenus.includes(item.id) && (
                                            <div className="ml-4 space-y-1 border-l pl-2">
                                                {/* Handling both simple and multi-column by flattening for sidebar */}
                                                {Array.isArray(item.dropdownData) && (
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    (item.dropdownType === 'simple' ? (item.dropdownData as any[]) : (item.dropdownData as any[]).flatMap(g => g.items)).map((sub: any, idx: number) => (
                                                        <Link
                                                            key={idx}
                                                            href={sub.link}
                                                            className={cn(
                                                                "block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary",
                                                                pathname === sub.link ? "text-primary font-medium bg-slate-50 dark:bg-slate-800/50" : "text-slate-500"
                                                            )}
                                                        >
                                                            {sub.title}
                                                        </Link>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t p-4 space-y-2">
                        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between px-2")}>
                            {/* Dark mode toggle removed */}
                            {/* <Button variant="ghost" size="icon" onClick={toggleTheme} title="Theme">
                                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button> */}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Гарах"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Padding - Adjusts based on sidebar state */}
            <style jsx global>{`
        main {
          padding-left: ${collapsed ? '64px' : '260px'};
          transition: padding-left 300ms ease-in-out;
        }
        /* Mobile override if needed */
        @media (max-width: 768px) {
          main {
            padding-left: 0;
          }
          aside {
            transform: translateX(${collapsed ? '-100%' : '0'}); /* Simplified for mobile logic later */
          }
        }
      `}</style>
        </>
    );
}
