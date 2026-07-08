'use client';

import FullLogo from '@/components/shared/FullLogo';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SimpleBar from 'simplebar-react';
import SidebarContent from './sidebaritems';
import { SidebarNavItem, SidebarNavSubmenu } from './sidebar-nav';

interface SidebarItemType {
  heading?: string;
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: SidebarItemType[];
  disabled?: boolean;
  isPro?: boolean;
}

const renderSidebarItems = (
  items: SidebarItemType[],
  currentPath: string,
  onClose?: () => void,
  isSubItem: boolean = false,
) => {
  return items.map((item) => {
    const isSelected = currentPath === item?.url;
    const IconComp = item.icon || null;

    const iconElement = IconComp ? (
      <Icon icon={IconComp} height={21} width={21} />
    ) : (
      <Icon icon={'ri:checkbox-blank-circle-line'} height={9} width={9} />
    );

    // Heading
    if (item.heading) {
      return (
        <div className="mb-1" key={item.heading}>
          <p className="hide-menu leading-21 text-sidebar-foreground dark:text-sidebar-foreground font-bold uppercase text-xs">
            {item.heading}
          </p>
        </div>
      );
    }

    // Submenu — fully controlled open/close based on pathname
    if (item.children?.length) {
      return (
        <SidebarNavSubmenu
          key={item.id}
          itemUrl={item.url || ''}
          firstChildUrl={item.children?.[0]?.url}
          icon={iconElement}
          title={item.name}
        >
          {renderSidebarItems(item.children, currentPath, onClose, true)}
        </SidebarNavSubmenu>
      );
    }

    // Regular menu item
    const linkTarget = item.url?.startsWith('https') ? '_blank' : '_self';

    const itemClassNames = isSubItem ? `mt-0.5` : `mt-0.5`;

    return (
      <SidebarNavItem
        key={item.id}
        icon={iconElement}
        isSelected={isSelected}
        isSubItem={isSubItem}
        href={item.url}
        target={linkTarget}
        disabled={item.disabled}
        badge={!!item.isPro}
        badgeContent={item.isPro ? 'Pro' : undefined}
        badgeColor="bg-lightsecondary"
        badgeTextColor="text-secondary"
        className={`${itemClassNames} shrink-0`}
        onClick={onClose}
      >
        <span className="truncate flex-1">{item.title || item.name}</span>
      </SidebarNavItem>
    );
  });
};

const SidebarLayout = ({ onClose }: { readonly onClose?: () => void }) => {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 border-r border-border bg-sidebar dark:bg-sidebar z-10 h-screen w-[270px]">
      {/* Logo */}
      <div className="px-6 flex items-center brand-logo overflow-hidden h-[64px]">
        <Link href="/">
          <FullLogo />
        </Link>
      </div>

      {/* Sidebar items */}
      <SimpleBar className="h-[calc(100vh-100px)]">
        <div className="px-6">
          {SidebarContent.map((section) => (
            <div key={section.id}>
              {renderSidebarItems(
                [
                  ...(section.heading ? [{ heading: section.heading }] : []),
                  ...(section.children || []),
                ],
                pathname,
                onClose,
              )}
            </div>
          ))}
        </div>
      </SimpleBar>
    </aside>
  );
};

export default SidebarLayout;
