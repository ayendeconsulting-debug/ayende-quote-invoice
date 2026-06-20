import {
  LayoutDashboard,
  Users,
  FileText,
  ReceiptText,
  Wallet,
  Repeat,
  BellRing,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Section heading shown above the items; omitted for the top, ungrouped block. */
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Billing",
    items: [
      { label: "Quotes", href: "/quotes", icon: FileText },
      { label: "Invoices", href: "/invoices", icon: ReceiptText },
      { label: "Payments", href: "/payments", icon: Wallet },
      { label: "Recurring", href: "/recurring", icon: Repeat },
      { label: "Reminders", href: "/reminders", icon: BellRing },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    label: "Setup",
    items: [
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Flattened list, kept for any consumer that wants every item in order. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
