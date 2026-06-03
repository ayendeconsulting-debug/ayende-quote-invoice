import {
  LayoutDashboard,
  Users,
  FileText,
  ReceiptText,
  Wallet,
  Repeat,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Recurring", href: "/recurring", icon: Repeat },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
