import Link from 'next/link';
import { BREAKPOINT_NAV_PX } from '@/constants/layout';

export const SidebarItem = ({
  children,
  href,
  label,
  sidebarExpanded,
  active,
  onNavigate,
}) => {
  const handleClick = () => {
    if (!onNavigate) {
      return;
    }
    const isBelowNavBreakpoint = window.matchMedia(
      `(max-width: ${BREAKPOINT_NAV_PX - 1}px)`
    ).matches;
    if (isBelowNavBreakpoint) {
      onNavigate();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center space-x-3 p-3 rounded-lg bg-sidebar transition-colors"
      data-testid="sidebar-item"
    >
      <div className="w-3 h-3 flex items-center justify-center relative">
        <span className={`${active ? 'primary-color' : 'text-main'} text-sm`}>
          {children}
        </span>
        {!sidebarExpanded && (
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-6 z-10 hidden group-hover:inline-block sidebar-expanded-colors text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
            {label}
          </span>
        )}
      </div>
      {sidebarExpanded && (
        <p className="text-main text-xs font-medium">{label}</p>
      )}
    </Link>
  );
};
