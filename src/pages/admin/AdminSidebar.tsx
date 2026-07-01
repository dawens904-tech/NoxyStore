import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Gamepad2, Box, PlusCircle, LogOut,
  Joystick, Layers, ChevronLeft, ChevronRight, Menu, ShoppingBag, X, Tag, Image, LayoutList, Gamepad,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const BASE = '/secure-dashboard-92x2011';

const navItems = [
  { label: 'Dashboard', path: BASE, icon: LayoutDashboard, exact: true },
  { label: 'Orders', path: `${BASE}/orders`, icon: ShoppingBag },
  { label: 'Games', path: `${BASE}/games`, icon: Gamepad2 },
  { label: 'Lootbar Games', path: `${BASE}/lootbar-games`, icon: Joystick },
  { label: 'Products', path: `${BASE}/products`, icon: Box },
  { label: 'Add Product', path: `${BASE}/products/add`, icon: PlusCircle },
  { label: 'SKU Overrides', path: `${BASE}/lootbar-games`, icon: Layers },
  { label: 'Redeem Codes', path: `${BASE}/coupons`, icon: Tag },
  { label: 'Banners', path: `${BASE}/banners`, icon: Image },
  { label: 'Sections', path: `${BASE}/sections`, icon: LayoutList },
  { label: 'Item4Gamer', path: `${BASE}/item4gamer`, icon: Gamepad },
];

interface Props {
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

export default function AdminSidebar({ collapsed: controlledCollapsed, onCollapsedChange }: Props) {
  const { user } = useAuthStore();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = controlledCollapsed ?? localCollapsed;
  const setCollapsed = (v: boolean) => {
    setLocalCollapsed(v);
    onCollapsedChange?.(v);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const sidebarContent = (isMobile = false) => (
    <div className={`flex flex-col h-full transition-all duration-300 ${!isMobile && collapsed ? 'items-center' : ''}`}>
      {/* Brand + collapse toggle — hidden on mobile since header handles it */}
      {!isMobile && (
        <div className={`mb-8 flex items-start justify-between ${collapsed ? 'flex-col items-center gap-3 px-0' : 'px-1'}`}>
          {!collapsed && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Admin Panel</div>
              <div className="text-xl font-black text-slate-900 leading-tight">NoxyStore</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                {user?.email ?? '—'}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      )}

      {/* Role badge */}
      {(!collapsed || isMobile) && (
        <div className="mb-6 px-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold uppercase tracking-wide">
            {user?.role ?? 'admin'}
          </span>
          {isMobile && (
            <p className="text-[10px] text-slate-400 font-mono mt-1.5 truncate">{user?.email ?? '—'}</p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              end={item.exact}
              onClick={() => isMobile && setMobileOpen(false)}
              title={collapsed && !isMobile ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  collapsed && !isMobile ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {(!collapsed || isMobile) && item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title={collapsed && !isMobile ? 'Sign Out' : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all mt-4 ${
          collapsed && !isMobile ? 'justify-center px-2' : ''
        }`}
      >
        <LogOut className="h-4 w-4 flex-shrink-0" />
        {(!collapsed || isMobile) && 'Sign Out'}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed z-50 md:hidden w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-md"
        style={{ top: "calc(0.875rem + env(safe-area-inset-top))", left: "1rem" }}
      >
        <Menu size={16} className="text-slate-700" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl overflow-y-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            {/* Mobile header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Admin Panel</div>
                <div className="text-lg font-black text-slate-900">NoxyStore</div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-5 flex-1">
              {sidebarContent(true)}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 flex-col border-r border-slate-200 bg-white shadow-sm z-40 transition-all duration-300 overflow-y-auto ${
          collapsed ? 'w-[60px] px-2 py-7' : 'w-64 px-5 py-7'
        }`}
      >
        {sidebarContent(false)}
      </aside>
    </>
  );
}

