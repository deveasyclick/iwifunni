'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeProviderProps = {
  readonly children: React.ReactNode;
  readonly attribute?: 'class' | 'data-theme';
  readonly defaultTheme?: Theme;
  readonly enableSystem?: boolean;
  readonly disableTransitionOnChange?: boolean;
  readonly storageKey?: string;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyThemeAttribute(
  attribute: ThemeProviderProps['attribute'],
  resolvedTheme: ResolvedTheme,
) {
  const root = document.documentElement;

  if (attribute === 'data-theme') {
    root.setAttribute('data-theme', resolvedTheme);
    return;
  }

  root.classList.toggle('dark', resolvedTheme === 'dark');
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const initialTheme =
      storedTheme === 'light' ||
      storedTheme === 'dark' ||
      storedTheme === 'system'
        ? storedTheme
        : defaultTheme;

    setTheme(initialTheme);
    setResolvedTheme(
      initialTheme === 'system' && enableSystem
        ? getSystemTheme()
        : (initialTheme as ResolvedTheme),
    );
  }, [defaultTheme, enableSystem, storageKey]);

  React.useEffect(() => {
    const nextResolvedTheme =
      theme === 'system' && enableSystem
        ? getSystemTheme()
        : (theme as ResolvedTheme);

    setResolvedTheme(nextResolvedTheme);
    window.localStorage.setItem(storageKey, theme);

    if (disableTransitionOnChange) {
      document.documentElement.classList.add('theme-switching');
    }

    applyThemeAttribute(attribute, nextResolvedTheme);

    if (disableTransitionOnChange) {
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-switching');
      }, 0);
    }
  }, [attribute, disableTransitionOnChange, enableSystem, storageKey, theme]);

  React.useEffect(() => {
    if (!enableSystem) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(getSystemTheme());
        applyThemeAttribute(attribute, getSystemTheme());
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [attribute, enableSystem, theme]);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
