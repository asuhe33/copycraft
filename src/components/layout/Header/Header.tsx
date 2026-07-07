import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const navItems = [
  { to: ROUTES.HOME, label: '生成' },
  { to: ROUTES.HISTORY, label: '历史' },
  { to: ROUTES.SETTINGS, label: '设置' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <span className="text-xl font-bold text-brand-500">CopyCraft</span>
          <span className="text-xs text-gray-400 ml-1">文案魔匠</span>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
