// header/menuData.ts

// ── Role type ────────────────────────────────────────────────────────────────
export type Role = "admin" | "moderator" | "teacher" | "student";

// ── Төрлүүд ──────────────────────────────────────────────────────────────────
export interface SubMenuItem {
  title: string;
  link: string;
  /** Хэрэв тодорхойлбол зөвхөн эдгээр role-д харагдана */
  roles?: Role[];
}

export interface DropdownMenu {
  title: string;
  items: SubMenuItem[];
  icon?: string;
  iconColor?: string;
  /** Энэ бүтэн багана/бүлэг зөвхөн эдгээр role-д харагдана (сонголттой) */
  roles?: Role[];
}

export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  dropdownType: "simple" | "multi-column";
  dropdownData?: DropdownMenu[] | SubMenuItem[];
  columnCount?: number;
  /** Бүтэн үндсэн меню зөвхөн эдгээр role-д харагдана (сонголттой) */
  roles?: Role[];
}

// ── UI Kit олон баганатай цэс ────────────────────────────────────────────────
const _uiKitDropdownData: DropdownMenu[] = [
  {
    title: "UI Elements",
    icon: "ti ti-planet",
    iconColor: "text-pink-500",
    // жишээ: бүгдэд нээлттэй тул roles тавихгүй
    roles: ["admin"],
    items: [
      { title: "Alerts", link: "ui-alerts.html" },
      { title: "Avatars", link: "ui-avatars.html" },
      { title: "Buttons", link: "ui-buttons.html" },
      { title: "Budges", link: "ui-budges.html" },
      { title: "Cards", link: "ui-cards.html" },
      { title: "Carousels", link: "ui-carousels.html" },
      { title: "Dropdown", link: "ui-dropdowns.html" },
      { title: "Images", link: "ui-images.html" },
      { title: "Lists", link: "ui-lists.html" },
      { title: "Modals", link: "ui-modals.html" },
      { title: "Navbars", link: "ui-navbars.html" },
      { title: "Paginations", link: "ui-paginations.html" },
      { title: "Progress", link: "ui-progress.html" },
      { title: "Tab & Accordions", link: "ui-tab-accordions.html" },
      { title: "Typography", link: "ui-typography.html" },
    ],
  },
  {
    title: "Advanced UI",
    icon: "ti ti-tent",
    iconColor: "text-blue-500",
    // Жишээ: зөвхөн admin/moderator харагдана
    //roles: ["admin", "moderator"],
    items: [
      { title: "Animation", link: "advanced-animation.html" },
      { title: "Clip Board", link: "advanced-clipboard.html" },
      { title: "Dragula", link: "advanced-dragula.html" },
      { title: "File Manager", link: "advanced-files.html" },
      { title: "Highlight", link: "advanced-highlight.html" },
      { title: "Range Slider", link: "advanced-range-slider.html" },
      { title: "Ribbons", link: "advanced-ribbons.html" },
      { title: "Sweet Alerts", link: "advanced-sweet-alerts.html" },
    ],
  },
  {
    title: "Tables",
    icon: "ti ti-columns",
    iconColor: "text-purple-500",
    items: [
      { title: "Basic", link: "tables-basic.html" },
      { title: "Datatables", link: "tables-datatable.html" },
      { title: "Editable", link: "tables-editable.html" },
    ],
  },
  {
    title: "Forms",
    icon: "ti ti-file-report",
    iconColor: "text-yellow-500",
    items: [
      { title: "Basic Elements", link: "forms-elements.html" },
      { title: "Advance Elements", link: "forms-advanced.html" },
      { title: "Validation", link: "forms-validation.html" },
      { title: "Wizard", link: "forms-wizard.html" },
      { title: "Editors", link: "forms-editors.html" },
      { title: "File Upload", link: "forms-upload.html" },
      { title: "Image Crop", link: "forms-img-crop.html" },
    ],
  },
  {
    title: "Icons",
    icon: "ti ti-box",
    iconColor: "text-orange-500",
    items: [
      { title: "Tabler", link: "icons-tabler.html" },
      { title: "Font Awesome", link: "icons-fa.html" },
      { title: "Material Design", link: "icons-md.html" },
    ],
  },
  {
    title: "Charts",
    icon: "ti ti-chart-infographic",
    iconColor: "text-teal-500",
    items: [
      { title: "Apex", link: "charts-apex.html" },
      { title: "Echart", link: "charts-echart.html" },
      { title: "Chartjs", link: "charts-chartjs.html" },
    ],
  },
  {
    title: "Maps",
    icon: "ti ti-map-pin",
    iconColor: "text-slate-500",
    items: [
      { title: "Google Maps", link: "maps-google.html" },
      { title: "Leaflet Maps", link: "maps-leaflet.html" },
      { title: "Vector Maps", link: "maps-vector.html" },
    ],
  },
];

// ── Бүх үндсэн меню ───────────────────────────────────────────────────────────
const baseMenuItems: MenuItem[] = [
  {
    id: "dashboards",
    title: "Хэрэглэгч",
    icon: "ti ti-smart-home",
    dropdownType: "simple",
    // Зөвхөн admin/moderator/teacher
    roles: ["admin"],
    dropdownData: [
      { title: "Хэрэглэгчийн жагсаалт", link: "admin/users" }
    ],
  },
  {
    id: "apps",
    title: "Контент",
    icon: "ti ti-apps",
    dropdownType: "simple",
    roles: ["moderator"], 
    dropdownData: [
      { title: "Тест", link: "/moderator/tests" },
      { title: "Хичээл", link: "/email-read.html" },
      { title: "Бодлого", link: "chat.html" },
      { title: "Тэмцээн", link: "contact-list.html" },
      { title: "Шалгалт", link: "calendar.html" }
    ],
  },
  /*{
    id: "ui-kit",
    title: "UI KIt",
    icon: "ti ti-planet",
    dropdownType: "multi-column",
    //roles: ["admin", "moderator", "teacher"], // student-аас нуух
    dropdownData: uiKitDropdownData,
    columnCount: 4,
  },
  {
    id: "pages",
    title: "Pages",
    icon: "ti ti-file-diff",
    dropdownType: "simple",
    // roles тавихгүй = бүгдэд харагдана
    dropdownData: [
      { title: "Starter", link: "starter.html" },
      { title: "Profile", link: "profile.html" },
      { title: "Timeline", link: "timeline.html" },
      { title: "Pricing", link: "pricing.html" },
      { title: "Blogs", link: "blogs.html" },
      { title: "FAQs", link: "faqs.html" },
    ],
  },
  {
    id: "auth",
    title: "Authentication",
    icon: "ti ti-shield-lock",
    dropdownType: "simple",
    dropdownData: [
      { title: "Log In", link: "login.html" },
      { title: "Register", link: "register.html" },
      { title: "Re-Password", link: "re-password.html" },
      { title: "Lock Screen", link: "lock-screen.html" },
      { title: "Error 404", link: "404.html" },
      { title: "Error 500", link: "500.html" },
    ],
  },*/
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
        // Хоосон болсон баганынуудыг хасах
        .filter((col) => col.items.length > 0);

      return { ...m, dropdownData: columns };
    })
    // Хоосон дэд-цэстэй үндсэн менюг хасах
    .filter((m) => {
      if (!m.dropdownData) return true;
      return Array.isArray(m.dropdownData) && (m.dropdownData as any[]).length > 0;
    });
}

// ── Экспорт ───────────────────────────────────────────────────────────────────
export { baseMenuItems as menuItems }; // хуучин нэрээр нь ч бас ашиглаж болно