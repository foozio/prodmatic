"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Search,
  Bell,
  Menu,
  Home,
  Package,
  Lightbulb,
  Users,
  FileText,
  Kanban,
  Calendar,
  Rocket,
  BarChart3,
  Flag,
  Settings,
  Plus,
  ChevronDown,
} from "lucide-react";
import { UserWithProfile, OrganizationWithTeams } from "@/types";
import { signOut } from "next-auth/react";

interface AppShellProps {
  children: React.ReactNode;
  user: UserWithProfile;
  currentOrganization: OrganizationWithTeams;
  organizations: OrganizationWithTeams[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
}

export function AppShell({
  children,
  user,
  currentOrganization,
  organizations,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const orgSlug = currentOrganization.slug;

  const navigationItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/orgs/${orgSlug}`,
      icon: Home,
    },
    {
      label: "Products",
      href: `/orgs/${orgSlug}/products`,
      icon: Package,
    },
    {
      label: "Teams",
      href: `/orgs/${orgSlug}/teams`,
      icon: Users,
    },
    {
      label: "Ideas",
      href: `/orgs/${orgSlug}/ideas`,
      icon: Lightbulb,
      badge: "12",
    },
    {
      label: "Customers",
      href: `/orgs/${orgSlug}/customers`,
      icon: Users,
    },
    {
      label: "Documents",
      href: `/orgs/${orgSlug}/documents`,
      icon: FileText,
    },
    {
      label: "Kanban",
      href: `/orgs/${orgSlug}/kanban`,
      icon: Kanban,
    },
    {
      label: "Roadmap",
      href: `/orgs/${orgSlug}/roadmap`,
      icon: Calendar,
    },
    {
      label: "Releases",
      href: `/orgs/${orgSlug}/releases`,
      icon: Rocket,
    },
    {
      label: "Analytics",
      href: `/orgs/${orgSlug}/analytics`,
      icon: BarChart3,
    },
    {
      label: "Feature Flags",
      href: `/orgs/${orgSlug}/flags`,
      icon: Flag,
    },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Organization Selector */}
      <div className="p-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-2 hover:bg-gray-100 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {currentOrganization.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentOrganization.teams.length} teams
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem key={org.id} asChild>
                <Link
                  href={`/orgs/${org.slug}`}
                  className="flex items-center space-x-2"
                >
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                  <span>{org.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/organizations/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t">
        <Link
          href={`/orgs/${orgSlug}/settings`}
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith(`/orgs/${orgSlug}/settings`)
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                ProdMatic
              </span>
            </Link>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Mobile menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-16 shrink-0 items-center px-6">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    ProdMatic
                  </span>
                </Link>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
                <input
                  className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Search..."
                  type="search"
                />
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>

              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback>
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}