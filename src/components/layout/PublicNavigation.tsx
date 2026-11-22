'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';

const publicNavigation = [
  ['/', 'Home'],
  ['/skills', 'Explore Skills'],
  ['/mentors', 'Find Mentors'],
  ['/talent', 'Find Talent'],
  ['/workshops', 'Workshops'],
  ['/roadmaps', 'Roadmaps'],
  ['/about', 'About'],
];

export function PublicNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const dashboardHref =
    user?.role === 'learner'
      ? '/learner'
      : user?.role === 'mentor'
      ? '/mentor'
      : '/admin/dashboard';

  return (
    <nav className="sticky top-0 z-30 border-b border-ink-200 bg-ink-800/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-lg"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">SkillSphere</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {publicNavigation.map(([href, label]) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`nav-underline-link btn-ghost text-sm ${active ? 'text-brand font-medium' : ''}`}
              >
                <span className="nav-label-underline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href={dashboardHref}>
                <Button size="sm" className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Avatar src={user.avatar} name={user.name} size="sm" />
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex items-center justify-center rounded-lg p-2 text-ink-300 hover:bg-ink-700 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay & Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 top-16 z-40 md:hidden flex flex-col"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Drawer Content */}
          <div className="relative z-50 flex flex-col w-full bg-ink-800 border-b border-ink-200 px-6 py-6 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Links */}
            <div className="flex flex-col space-y-1">
              {publicNavigation.map(([href, label]) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      active
                        ? 'bg-brand/10 text-brand font-semibold'
                        : 'text-ink hover:bg-ink-700/60'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Auth / Profile Section */}
            <div className="mt-6 pt-6 border-t border-ink-200 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar src={user.avatar} name={user.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                      <p className="text-xs text-ink-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)}>
                    <Button fullWidth size="md" className="flex items-center justify-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    fullWidth
                    size="sm"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                    }}
                    className="flex items-center justify-center gap-2 text-ink-400 hover:text-red-400"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" fullWidth size="md">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button fullWidth size="md">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
