import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Gamepad2, Box, Server, PlusCircle } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Games', path: '/admin/games', icon: Gamepad2 },
  { label: 'Products', path: '/admin/products', icon: Box },
  { label: 'Servers', path: '/admin/games', icon: Server },
  { label: 'Add Product', path: '/admin/products/add', icon: PlusCircle }
];

export default function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white px-6 py-8">
      <div className="mb-10">
        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 mb-4">Admin Panel</div>
        <div className="text-2xl font-bold text-slate-900">NoxyStore</div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}