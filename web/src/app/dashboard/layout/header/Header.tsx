'use client';

import FullLogo from '@/components/shared/FullLogo';
import { useTheme } from '@/components/theme-provider';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import SidebarLayout from '../sidebar/Sidebar';
import Profile from './Profile';
import Search from './Search';

const Header = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [isSticky, setIsSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMode = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <header
        className={`sticky top-0 z-2 ${
          isSticky ? 'bg-background shadow-md fixed w-full' : 'bg-transparent'
        }`}
      >
        <nav
          className={`rounded-none  py-4 sm:ps-6 max-w-full! sm:pe-10 dark:bg-dark flex justify-between items-center px-6`}
        >
          {/* Mobile Toggle Icon */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
            }}
            className="px-[15px] hover:text-primary dark:hover:text-primary text-foreground dark:text-muted-foreground relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-lightprimary  after:bg-transparent rounded-full xl:hidden flex justify-center items-center"
          >
            <Icon icon="tabler:menu-2" height={20} width={20} />
          </button>

          <div className="block xl:hidden">
            <FullLogo />
          </div>

          <div className="flex xl:hidden items-center">
            <button
              type="button"
              className="hover:text-primary px-2 md:px-15 group focus:ring-0 rounded-full flex justify-center items-center relative"
              onClick={toggleMode}
            >
              <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                {resolvedTheme === 'light' ? (
                  <Icon
                    icon="tabler:moon"
                    width="20"
                    className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                  />
                ) : (
                  <Icon
                    icon="solar:sun-bold-duotone"
                    width="20"
                    className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                  />
                )}
              </span>
            </button>

            {/* Profile Dropdown */}
            <Profile />
          </div>

          <div className="hidden xl:flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Search Icon */}
              <div className="relative">
                <Search />
              </div>
            </div>
            <div className="flex w-full justify-end items-end">
              <div className="flex gap-0 items-center ">
                {/* ✅ Dark/Light Toggle */}
                <button
                  type="button"
                  className="hover:text-primary px-15 group focus:ring-0 rounded-full flex justify-center items-center text-gray relative"
                  onClick={toggleMode}
                >
                  <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                    {resolvedTheme === 'light' ? (
                      <Icon
                        icon="tabler:moon"
                        width="20"
                        className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                      />
                    ) : (
                      <Icon
                        icon="solar:sun-bold-duotone"
                        width="20"
                        className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                      />
                    )}
                  </span>
                </button>

                {/* Profile Dropdown */}
                <Profile />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Sidebar</SheetTitle>
          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Header;
