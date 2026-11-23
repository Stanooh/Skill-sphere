'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserCircle,
  Users,
  CalendarDays,
  Bookmark,
  GraduationCap,
  Compass,
  BarChart3,
  BookOpen,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldCheck,
  Sparkles,
  Wand2,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/services/notificationService';
import type { Notification } from '@/types';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const learnerNav: NavItem[] = [
  { to: '/learner', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-[18px] h-[18px]" /> },
  { to: '/learner/messages', label: 'Messages', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
  { to: '/learner/mentors', label: 'Find Mentors', icon: <Compass className="w-[18px] h-[18px]" /> },
  { to: '/learner/saved', label: 'Saved Mentors', icon: <Bookmark className="w-[18px] h-[18px]" /> },
  { to: '/learner/sessions', label: 'My Sessions', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
  { to: '/learner/workshops', label: 'Workshops', icon: <BookOpen className="w-[18px] h-[18px]" /> },
  { to: '/learner/career-advisor', label: 'Career Advisor', icon: <Sparkles className="w-[18px] h-[18px]" /> },
  { to: '/learner/roadmap', label: 'Learning Roadmap', icon: <GraduationCap className="w-[18px] h-[18px]" /> },
  { to: '/learner/roadmap/create', label: 'AI Roadmap Generator', icon: <Wand2 className="w-[18px] h-[18px]" /> },
  { to: '/learner/progress', label: 'My Progress', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  { to: '/learner/profile', label: 'My Profile', icon: <UserCircle className="w-[18px] h-[18px]" /> },
];

const mentorNav: NavItem[] = [
  { to: '/mentor', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-[18px] h-[18px]" /> },
  { to: '/mentor/messages', label: 'Messages', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
  { to: '/mentor/requests', label: 'Mentorship Requests', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
  { to: '/mentor/sessions', label: 'Sessions', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
  { to: '/mentor/workshops', label: 'My Workshops', icon: <BookOpen className="w-[18px] h-[18px]" /> },
  { to: '/mentor/student-recommendations', label: 'Student Recommendations', icon: <Star className="w-[18px] h-[18px]" /> },
  { to: '/mentor/profile', label: 'My Profile', icon: <UserCircle className="w-[18px] h-[18px]" /> },
];

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { to: '/admin/verification', label: 'Mentor Verification', icon: <ShieldCheck className="w-[18px] h-[18px]" /> },
  { to: '/admin/users', label: 'User Management', icon: <Users className="w-[18px] h-[18px]" /> },
  { to: '/admin/workshops', label: 'Workshop Management', icon: <BookOpen className="w-[18px] h-[18px]" /> },
  { to: '/admin/learners', label: 'Find Talents', icon: <GraduationCap className="w-[18px] h-[18px]" /> },
  { to: '/admin/reports', label: 'Reports', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  { to: '/admin/settings', label: 'Settings', icon: <Shield className="w-[18px] h-[18px]" /> },
];

const restrictedNav: NavItem[] = [
  { to: '/mentor/account', label: 'Profile', icon: <UserCircle className="w-[18px] h-[18px]" /> },
];

function getNavItems(role: string): NavItem[] {
  if (role === 'learner') return learnerNav;
  if (role === 'mentor') return mentorNav;
  return adminNav;
}

function isNavRouteMatch(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function DashboardLayout({ children, title, restricted = false }: { children: ReactNode; title?: string; restricted?: boolean }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const navItems = restricted ? restrictedNav : user ? getNavItems(user.role) : [];
  const activeNavPath = navItems
    .filter((item) => isNavRouteMatch(pathname, item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
  const roleLabel = user?.role === 'learner' ? 'Learner' : user?.role === 'mentor' ? 'Mentor' : 'Admin';
  const roleBase = user?.role === 'learner' ? '/learner' : user?.role === 'mentor' ? '/mentor' : '/admin/dashboard';
  const profileHref = restricted ? '/mentor/account' : `${roleBase}/profile`;

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const next = await getNotifications(user.id);
      if (active) setNotifications(next);
    };
    void load();
    const unsubscribe = subscribeToNotifications(user.id, () => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleNotifClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen && unreadCount > 0) {
      void markAllNotificationsRead(user!.id).then(() => {
        setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      });
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-ink-800 border-r border-ink-200 flex flex-col z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ink-200">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
          <p className="px-3 mb-2 text-xs font-semibold text-ink-300 uppercase tracking-wider">{roleLabel} Menu</p>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = item.to === activeNavPath;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {item.icon}
                  <span className="nav-label-underline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-ink-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <Avatar src={user?.avatar} name={user?.name ?? ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
              <p className="text-xs text-ink-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-link w-full mt-2 text-red-400 hover:bg-red-950 hover:text-red-300"
            >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-ink-900/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-ink-800 border-b border-ink-200 px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-ink-100 text-ink-400"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {title && <h1 className="text-lg font-semibold text-ink hidden sm:block ml-2">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={handleNotifClick}
                className="relative p-2 rounded-lg hover:bg-ink-100 text-ink-400"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-ink-800 rounded-xl border border-ink-200 shadow-card-hover z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-ink-200">
                    <p className="text-sm font-semibold text-ink">Notifications</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-ink-400 text-center">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.read && user) {
                              void markNotificationRead(user.id, n.id);
                              setNotifications((current) => current.map((item) => item.id === n.id ? { ...item, read: true } : item));
                            }
                          }}
                          className="w-full px-4 py-3 border-b border-ink-100 hover:bg-ink-100 text-left"
                        >
                          <p className="text-sm font-medium text-ink">{n.title}</p>
                          <p className="text-xs text-ink-400 mt-0.5">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link
              href={profileHref}
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-ink-100"
            >
              <Avatar src={user?.avatar} name={user?.name ?? ''} size="sm" />
              <span className="text-sm font-medium text-ink hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="text-sm text-ink-400 mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function RoleGuard({
  role,
  children,
}: {
  role: 'learner' | 'mentor' | 'admin';
  children: ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== role) {
      const base =
        user.role === 'learner'
          ? '/learner'
          : user.role === 'mentor'
            ? '/mentor'
            : '/admin';

      router.replace(base);
    }
  }, [user, role, router]);

  if (!user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}


export function AdminBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-400">
      <Shield className="w-3.5 h-3.5" />
      Admin Access
    </div>
  );
}
