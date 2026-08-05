import {
  Activity,
  Boxes,
  Bug,
  Building2,
  Calculator,
  ClipboardCheck,
  Columns2,
  Database,
  Download,
  Equal,
  Factory,
  FileCheck2,
  FileText,
  FlaskConical,
  FolderKanban,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  ListChecks,
  Package,
  Plug,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  Truck,
  Upload,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Search",
    items: [{ title: "Search", href: "/search", icon: Search }],
  },
  {
    title: "Market",
    items: [
      { title: "Organizations", href: "/organizations", icon: Building2 },
      { title: "Manufacturers", href: "/manufacturers", icon: Factory },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
      { title: "Tenders", href: "/tenders", icon: FileText },
      { title: "Installed Base", href: "/installed-base", icon: Boxes },
      { title: "Availability", href: "/availability", icon: Warehouse },
    ],
  },
  {
    title: "Products",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Categories", href: "/categories", icon: LayoutGrid },
      { title: "Brands", href: "/brands", icon: Tag },
      { title: "Applications", href: "/applications", icon: FlaskConical },
      { title: "Methods", href: "/methods", icon: ListChecks },
      { title: "Standards", href: "/standards", icon: Scale },
      { title: "Organisms", href: "/organisms", icon: Bug },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { title: "Equivalence", href: "/equivalence", icon: Equal },
      { title: "Matching", href: "/matching", icon: Link2 },
      { title: "Compare", href: "/compare", icon: Columns2 },
      { title: "Cost per Test", href: "/cost-per-test", icon: Calculator },
      { title: "Prices", href: "/prices", icon: GitCompareArrows },
      { title: "Signals", href: "/signals", icon: Activity },
    ],
  },
  {
    title: "Research",
    items: [
      { title: "Projects", href: "/research", icon: FolderKanban },
      { title: "Sources", href: "/sources", icon: Database },
      { title: "Evidence", href: "/evidence", icon: FileCheck2 },
      { title: "Review", href: "/review", icon: ClipboardCheck },
    ],
  },
  {
    title: "Data Operations",
    items: [
      { title: "Imports", href: "/imports", icon: Download },
      { title: "Exports", href: "/exports", icon: Upload },
      {
        title: "Entity Resolution",
        href: "/admin/entity-resolution",
        icon: ShieldCheck,
      },
      { title: "Data Quality", href: "/admin/data-quality", icon: Gauge },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "General", href: "/settings", icon: Settings },
      { title: "Integrations", href: "/settings/integrations", icon: Plug },
    ],
  },
];
