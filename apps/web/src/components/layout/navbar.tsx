import {
  FileCode2,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  Terminal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Link, NavLink } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/templates", label: "Templates" },
  { to: "/docs", label: "Docs" },
  { to: "/models", label: "Models" },
  { to: "/pricing", label: "Pricing" },
];

function NavLinks({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1",
        className
      )}>
      {nav.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive && "bg-accent text-accent-foreground"
            )
          }>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Navbar() {
  const { setTheme, resolvedTheme } = useTheme();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const initial = user?.email?.slice(0, 2).toUpperCase() ?? "G";

  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-[min(100%,280px)]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileCode2 className="text-primary size-5" />
                  ReadMe Gen
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <MobileNav />
                <Link
                  to="/docs#cli-installation"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex justify-start gap-2"
                  )}>
                  <Terminal className="size-4" />
                  Install CLI
                </Link>
                {!isAuthenticated ? (
                  <Link to="/auth" className={buttonVariants()}>
                    Sign in
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      className={buttonVariants({ variant: "secondary" })}>
                      Dashboard
                    </Link>
                    <Link to="/generate" className={buttonVariants()}>
                      Generate
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="bg-primary/15 text-primary inline-flex size-9 items-center justify-center rounded-lg">
              <FileCode2 className="size-5" />
            </span>
            <span className="hidden sm:inline">ReadMe Gen</span>
          </Link>

          <NavLinks className="hidden sm:flex" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/docs#cli-installation"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 font-mono text-xs md:inline-flex"
            )}>
            <Terminal className="size-3.5" />
            <span className="hidden lg:inline">npm i -g @abhishekkkk15/readmegen-cli</span>
            <span className="lg:hidden">CLI</span>
          </Link>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden gap-1.5 sm:inline-flex"
              )}>
              <LayoutDashboard className="size-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          ) : null}

          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle color theme">
            <Sun className="size-4 scale-100 dark:scale-0" />
            <Moon className="absolute size-4 scale-0 dark:scale-100" />
          </Button>

          {!isAuthenticated ? (
            <Link
              to="/auth"
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden sm:inline-flex"
              )}>
              Sign in
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-2 px-1.5">
                    <Link to={"/dashboard"}>
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    {isGuest ? (
                      <Badge
                        variant="secondary"
                        className="hidden text-[10px] sm:inline-flex">
                        Guest
                      </Badge>
                    ) : null}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground text-sm font-medium">
                        {user?.email ?? "Guest session"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {user ? `${user.plan} plan` : "Limited local preview"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/dashboard" />}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/generate" />}>
                  New README
                </DropdownMenuItem>
                {user ? (
                  <DropdownMenuItem render={<Link to="/auth#keys" />}>
                    API keys
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg px-3 py-2 text-sm font-medium">
          {label}
        </Link>
      ))}
    </nav>
  );
}
