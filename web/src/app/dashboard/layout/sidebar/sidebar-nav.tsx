'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

/** Returns the Tailwind class for the item's visual state. */
function getItemStateClass(isSubItem: boolean, isSelected: boolean) {
  if (isSubItem && isSelected) return '!bg-transparent text-primary';
  if (isSelected) return 'bg-primary text-white';
  return 'text-sidebar-foreground dark:text-white';
}

/* ------------------------------------------------------------------ */
/*  Sidebar Nav Item (replaces AMMenuItem)                            */
/* ------------------------------------------------------------------ */

interface SidebarNavItemProps {
  readonly icon: React.ReactNode;
  readonly isSelected: boolean;
  readonly isSubItem?: boolean;
  readonly href?: string;
  readonly target?: string;
  readonly disabled?: boolean;
  readonly badge?: boolean;
  readonly badgeContent?: string;
  readonly badgeColor?: string;
  readonly badgeTextColor?: string;
  readonly className?: string;
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
}

export function SidebarNavItem({
  icon,
  isSelected,
  isSubItem = false,
  href,
  target,
  disabled = false,
  badge = false,
  badgeContent = 'New',
  badgeColor = 'bg-lightsecondary',
  badgeTextColor = 'text-secondary',
  className = '',
  onClick,
  children,
}: SidebarNavItemProps) {
  const stateClass = getItemStateClass(isSubItem, isSelected);

  const content = (
    <div
      data-active={isSelected}
      className={`mb-0.5 flex w-full items-center gap-3 overflow-hidden rounded-md text-left text-sm hover:bg-lightprimary hover:text-primary hover:translate-x-1 transition-all duration-200 ease-in-out px-[10px] py-[10px] ${stateClass} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {/* Icon */}
      <div className="shrink-0 [&>svg]:size-[18px]">{icon}</div>

      {/* Text + optional badge */}
      <div className="flex items-center justify-between w-full">
        <span className="text-sm leading-tight truncate">{children}</span>
        {badge && (
          <span
            data-slot="badge"
            className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit shrink-0 ${badgeColor} ${badgeTextColor} !ml-auto`}
          >
            {badgeContent}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={className}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      role="button"
      tabIndex={onClick ? 0 : undefined}
    >
      {href ? (
        <Link href={href} target={target} className="contents">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Nav Submenu (replaces AMSubmenu)                          */
/*  Fully controlled open/close state based on pathname.              */
/* ------------------------------------------------------------------ */

interface SidebarNavSubmenuProps {
  readonly itemUrl: string;
  readonly firstChildUrl?: string;
  readonly icon: React.ReactNode;
  readonly title?: string;
  readonly children: React.ReactNode;
}

export function SidebarNavSubmenu({
  itemUrl,
  firstChildUrl,
  icon,
  title,
  children,
}: SidebarNavSubmenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isInside = pathname.startsWith(itemUrl);
  const [open, setOpen] = useState(isInside);

  // Sync open state with pathname: auto-open when inside, auto-close when leaving
  useEffect(() => {
    setOpen(isInside);
  }, [isInside]);

  const handleClick = () => {
    if (!isInside && firstChildUrl) {
      // Navigate to the first child page when clicking the section title
      router.push(firstChildUrl);
    } else {
      // Already inside the section — toggle the submenu
      setOpen((prev) => !prev);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={handleClick}
          data-open={open}
          className={`flex w-full items-center gap-3 overflow-hidden rounded-md text-left text-sm hover:bg-lightprimary hover:text-primary hover:translate-x-1 transition-all duration-200 ease-in-out px-[10px] py-[10px] ${
            isInside
              ? 'bg-primary text-white'
              : 'text-sidebar-foreground dark:text-white'
          } cursor-pointer`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="shrink-0 [&>svg]:size-[18px]">{icon}</span>
              <span className="text-sm leading-tight truncate">{title}</span>
            </div>
            {open ? (
              <ChevronDown size={16} className="shrink-0" />
            ) : (
              <ChevronRight size={16} className="shrink-0" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col pl-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
