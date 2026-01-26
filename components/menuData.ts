// /components/header/menuData.ts

// ── Role type ────────────────────────────────────────────────────────────────
export type Role = "admin" | "moderator" | "teacher" | "student";

// ── Төрлүүд ──────────────────────────────────────────────────────────────────
export interface SubMenuItem {
  title: string;
  link: string;
  roles?: Role[];
}

export interface DropdownMenu {
  title: string;
  items: SubMenuItem[];
  icon?: string;
  iconColor?: string;
  roles?: Role[];
}

export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  dropdownType: "simple" | "multi-column";
  dropdownData?: DropdownMenu[] | SubMenuItem[];
  columnCount?: number;
  roles?: Role[];
  link?: string;
}

// ── Бүх үндсэн меню ───────────────────────────────────────────────────────────
// ── Бүх үндсэн меню ───────────────────────────────────────────────────────────
const baseMenuItems: MenuItem[] = [
  {
    id: "admin_dash",
    title: "Dashboard",
    icon: "layout_dashboard",
    dropdownType: "simple",
    roles: ["admin"],
    link: "/admin"
  },
  {
    id: "teacher_board",
    title: "Самбар",
    icon: "presentation", // Changed to key for Lucide icon
    dropdownType: "simple",
    roles: ["teacher"],
    link: "/teacher/board"
  },
  {
    id: "teacher_lessons",
    title: "Хичээл бэлдэх",
    icon: "book_open",
    dropdownType: "simple",
    roles: ["teacher"],
    link: "/teacher/lessons"
  },
  {
    id: "teacher_tasks",
    title: "Даалгавар",
    icon: "clipboard_list",
    dropdownType: "simple",
    roles: ["teacher"],
    link: "/teacher/tasks"
  },
  {
    id: "student_dash",
    title: "Dashboard",
    icon: "layout_dashboard",
    dropdownType: "simple",
    roles: ["student"],
    link: "/student"
  },
];

// ── Шүүх helper ───────────────────────────────────────────────────────────────
const hasAccess = (visibleFor: Role[] | undefined, role: Role) =>
  !visibleFor || visibleFor.includes(role);

/** role-д тааруулж цэсийг шүүж буцаана */
export function getMenuForRole(role: Role): MenuItem[] {
  return baseMenuItems
    .filter((m) => hasAccess(m.roles, role))
    .map<MenuItem>((m) => {
      if (!m.dropdownData) return m;

      if (m.dropdownType === "simple") {
        const items = (m.dropdownData as SubMenuItem[]).filter((i) => hasAccess(i.roles, role));
        return { ...m, dropdownData: items };
      }

      // multi-column
      const columns = (m.dropdownData as DropdownMenu[])
        .filter((col) => hasAccess(col.roles, role))
        .map((col) => ({
          ...col,
          items: col.items.filter((i) => hasAccess(i.roles, role)),
        }))
        .filter((col) => col.items.length > 0);

      return { ...m, dropdownData: columns };
    })
    // ✅ ЗАСВАРЛАСАН: "any" төрлийг ашиглахгүйгээр хоосон цэсийг шүүж байна
    .filter((m) => !m.dropdownData || m.dropdownData.length > 0);
}

// ── Экспорт ───────────────────────────────────────────────────────────────────
export { baseMenuItems as menuItems };