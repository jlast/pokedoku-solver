import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../../../../lib/browser/analytics";
import { getRemoteSettings } from "@pokedoku-helper/user-api-client";
import { buildLogoutUrl, clearSession, getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { isAuthFeatureEnabled } from "../../lib/featureFlags";

const UNNAMED_TRAINER_LABEL = "Unnamed trainer";
const THEME_STORAGE_KEY = "theme-mode";

type ThemeMode = "light" | "dark";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  introText?: string;
  showDate?: string;
  alwaysShowSubheader?: boolean;
  currentPage: string;
}

interface NavButton {
  page: string;
  label: string;
  url: string;
  iconType?: "fill" | "stroke";
  icon: string;
  children?: ToolMenuItem[];
}

interface ToolLink {
  label: string;
  url: string;
  iconType: "fill" | "stroke";
  icon: string;
  matchPrefixes?: string[];
}

interface ToolMenuItem extends ToolLink {
  isPrimary?: boolean;
}

const ALL_TOOLS_ICON =
  "M5 4.5a1.5 1.5 0 1 0 0 .01V4.5Zm0 7a1.5 1.5 0 1 0 0 .01v-.01Zm0 7a1.5 1.5 0 1 0 0 .01v-.01ZM12 4.5a1.5 1.5 0 1 0 0 .01V4.5Zm0 7a1.5 1.5 0 1 0 0 .01v-.01Zm0 7a1.5 1.5 0 1 0 0 .01v-.01ZM19 4.5a1.5 1.5 0 1 0 0 .01V4.5Zm0 7a1.5 1.5 0 1 0 0 .01v-.01Zm0 7a1.5 1.5 0 1 0 0 .01v-.01Z";

const TOOL_MENU_ITEMS: ToolMenuItem[] = [
  {
    label: "All tools",
    url: "tools/",
    iconType: "fill",
    icon: ALL_TOOLS_ICON,
    isPrimary: true,
  },
  {
    label: "Category Explorer",
    url: "tools/category/",
    iconType: "fill",
    matchPrefixes: ["category/"],
    icon: "M21.41 11.58 12.42 2.59A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .53.21 1.04.59 1.41l8.99 8.99a2 2 0 0 0 2.83 0l6.99-6.99a2 2 0 0 0 0-2.83zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z",
  },
  {
    label: "Shiny Odds Calculator",
    url: "tools/shiny-odds-calculator/",
    iconType: "fill",
    icon: "m12 1.8 2.4 6.2L22.2 10l-7.8 2L12 18.2 9.6 12 1.8 10l7.8-2L12 1.8z",
  },
  {
    label: "Pokedoku Insights",
    url: "tools/pokedoku-insights/",
    iconType: "fill",
    icon: "M3 18h18v2H3v-2Zm2-1V9h3v8H5Zm5 0V6h3v11h-3Zm5 0v-5h3v5h-3Z",
  },
];

const NAV_BUTTONS: NavButton[] = [
  {
    page: "home",
    label: "Home",
    url: "",
    icon: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  },
  {
    page: "today",
    label: "Today's Answers",
    url: "pokedoku-answers-today/",
    icon: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z",
  },
  {
    page: "pokemon-list",
    label: "All Pokemon",
    url: "pokemon-list/",
    iconType: "stroke",
    icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 12a3 3 0 1 0 0 .01V12Z",
  },
  {
    page: "tools",
    label: "Tools",
    url: "tools/",
    iconType: "stroke",
    icon: "M3 7h18v12H3V7Zm5 0V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
    children: TOOL_MENU_ITEMS,
  },
  {
    page: "tips",
    label: "Tips & Tricks",
    url: "tips/",
    icon: "M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 11.7-.5.3V16h-3v-2h-1v2H10v-1.99l-.5-.3C7.99 12.79 7 11.01 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.01-.99 3.79-2.5 4.7z",
  },
];

export function Header({
  title,
  subtitle,
  introText,
  showDate,
  alwaysShowSubheader,
  currentPage,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pathname, setPathname] = useState("");
  const [authEnabled, setAuthEnabled] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isUserLabelLoading, setIsUserLabelLoading] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const toolsMenuRef = useRef<HTMLDetailsElement | null>(null);
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const mobileToolsMenuRef = useRef<HTMLDetailsElement | null>(null);
  const mobileUserMenuRef = useRef<HTMLDetailsElement | null>(null);

  const normalizePath = (path: string) => {
    const cleanPath = path.replace(/\/+/g, "/");
    return cleanPath.endsWith("/") ? cleanPath : `${cleanPath}/`;
  };

  const resolvePath = (url: string) =>
    normalizePath(`/${url.replace(/^\/+/, "")}`);

  const stripBasePath = (path: string) => {
    const basePath = normalizePath(import.meta.env.BASE_URL || "/");
    if (basePath === "/") return path;
    if (!path.startsWith(basePath)) return path;
    const stripped = `/${path.slice(basePath.length)}`;
    return normalizePath(stripped);
  };

  const normalizedPathname = pathname ? normalizePath(pathname) : "";
  const currentPath = stripBasePath(normalizedPathname);
  const isToolsSectionPage = currentPath.startsWith(resolvePath("tools/"));
  const isUserSectionPage = currentPath.startsWith(resolvePath("user/"));
  const isToolRouteActive = (item: ToolMenuItem) => {
    const prefixes = [item.url, ...(item.matchPrefixes ?? [])];
    return prefixes.some((prefix) => normalizePath(currentPath).startsWith(resolvePath(prefix)));
  };
  const isToolExactRouteActive = (toolUrl: string) =>
    normalizePath(currentPath) === resolvePath(toolUrl);
  const isToolMenuItemActive = (item: ToolMenuItem, items: ToolMenuItem[]) => {
    if (item.isPrimary) {
      const hasSpecificMatch = items.some(
        (candidate) => !candidate.isPrimary && isToolRouteActive(candidate),
      );
      return isToolExactRouteActive(item.url) || (isToolsSectionPage && !hasSpecificMatch);
    }
    return isToolRouteActive(item);
  };
  const desktopNavButtonClass = (isActive: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border px-2.5 text-[0.8rem] whitespace-nowrap transition-colors ${
      isActive
        ? "cursor-pointer border-transparent bg-transparent text-red-500"
        : "cursor-pointer border-transparent bg-transparent text-[var(--text)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
    }`;

  const mobileNavButtonClass = (isActive: boolean) =>
    `inline-flex w-full items-center justify-start gap-2 rounded-lg border-none px-3 py-2.5 text-left text-sm transition-colors ${
      isActive
        ? "cursor-pointer text-red-500"
        : "cursor-pointer bg-transparent text-[var(--text)] hover:bg-[var(--code-bg)]"
    }`;

  const closeMobileMenu = (
    source: "overlay" | "button" | "close" | "navigate" | "support",
  ) => {
    trackEvent("mobile_menu_close", { from: currentPage, source });
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => {
      const next = !prev;
      trackEvent(next ? "mobile_menu_open" : "mobile_menu_close", {
        from: currentPage,
        source: "button",
      });
      return next;
    });
  };

  const handleSupportClick = (placement: "desktop" | "mobile") => {
    trackEvent("click_support", { from: currentPage, placement });
  };

  const applyTheme = (nextTheme: ThemeMode) => {
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeMode(nextTheme);
  };

  const toggleTheme = (placement: "desktop" | "mobile") => {
    const nextTheme: ThemeMode = themeMode === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    trackEvent("toggle_theme", { from: currentPage, placement, theme: nextTheme });
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rootTheme = document.documentElement.getAttribute("data-theme");
    if (rootTheme === "light" || rootTheme === "dark") {
      setThemeMode(rootTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeMode(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const toolsMenu = toolsMenuRef.current;
      const profileMenu = profileMenuRef.current;
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (toolsMenu?.open && !toolsMenu.contains(target)) {
        toolsMenu.open = false;
      }

      if (profileMenu?.open && !profileMenu.contains(target)) {
        profileMenu.open = false;
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen || !isToolsSectionPage) return;
    if (mobileToolsMenuRef.current) {
      mobileToolsMenuRef.current.open = true;
    }
  }, [mobileMenuOpen, isToolsSectionPage]);

  useEffect(() => {
    if (!mobileMenuOpen || !isUserSectionPage) return;
    if (mobileUserMenuRef.current) {
      mobileUserMenuRef.current.open = true;
    }
  }, [mobileMenuOpen, isUserSectionPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncClientState = () => {
      setPathname(window.location.pathname);
      setAuthEnabled(isAuthFeatureEnabled(window.location.search));
      const profile = getSessionUserProfile();
      setIsSignedIn(Boolean(profile));
      setIsUserLabelLoading(Boolean(profile));
      setUserLabel(null);

      if (!profile) return;

      void (async () => {
        try {
          const token = await getValidSessionIdToken();
          const apiBaseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
          if (!token || !apiBaseUrl) return;

          const remoteSettings = await getRemoteSettings({ token, apiBaseUrl });
          const nextDisplayName = remoteSettings?.displayName.trim() ?? "";
          setUserLabel(nextDisplayName || UNNAMED_TRAINER_LABEL);
        } catch {
          setUserLabel(UNNAMED_TRAINER_LABEL);
        } finally {
          setIsUserLabelLoading(false);
        }
      })();
    };

    const syncFromNav = () => {
      window.setTimeout(syncClientState, 0);
    };

    const handleDisplayNameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ displayName?: string }>;
      const nextDisplayName = customEvent.detail?.displayName?.trim() ?? "";
      setUserLabel(nextDisplayName || UNNAMED_TRAINER_LABEL);
      setIsUserLabelLoading(false);
    };

    syncFromNav();
    window.addEventListener("popstate", syncFromNav);
    window.addEventListener("astro:page-load", syncFromNav as EventListener);
    document.addEventListener("astro:after-swap", syncFromNav as EventListener);
    window.addEventListener("user-display-name-updated", handleDisplayNameUpdated as EventListener);
    return () => {
      window.removeEventListener("popstate", syncFromNav);
      window.removeEventListener("astro:page-load", syncFromNav as EventListener);
      document.removeEventListener("astro:after-swap", syncFromNav as EventListener);
      window.removeEventListener("user-display-name-updated", handleDisplayNameUpdated as EventListener);
    };
  }, []);

  const signOut = () => {
    trackEvent("click_sign_out", { from: currentPage });
    clearSession();
    window.location.assign(buildLogoutUrl());
  };

  const resolvedUserLabel = userLabel ?? UNNAMED_TRAINER_LABEL;

  return (
    <>
      <header className="mb-6 text-center">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex justify-center items-center gap-3 max-[1100px]:flex max-[1100px]:items-center max-[1100px]:justify-between">
            <div className="flex min-w-0 items-center justify-self-start gap-2.5">
              <a
                href={`${import.meta.env.BASE_URL}`}
                aria-label="Go to home page"
                onClick={() =>
                  trackEvent("click_navigate", { url: "", from: currentPage })
                }
                className="shrink-0"
              >
                <img
                  src={import.meta.env.BASE_URL + "logo.svg"}
                  alt="Pokedoku Helper"
                  className="m-0 h-7 w-7 cursor-pointer"
                />
              </a>
              <span
                data-header-title
                className="hidden ml-0.5 text-base leading-tight font-bold text-[var(--text-h)] max-[1100px]:inline-block"
              >
                {title}
              </span>
            </div>

            <nav
              className="inline-flex items-stretch gap-1 rounded-[14px] border border-[var(--border)] bg-[var(--bg)] p-1 shadow-[0_6px_18px_rgba(15,23,42,0.08)] max-[1100px]:hidden"
              aria-label="Primary"
            >
              {NAV_BUTTONS.map((btn) => {
                const isActive = btn.page === currentPage;

                if (btn.children) {
                  return (
                    <details
                      key={btn.label}
                      ref={toolsMenuRef}
                      className="group relative"
                    >
                      <summary
                        className={`${desktopNavButtonClass(false)} list-none group-open:text-red-500`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          {btn.iconType === "stroke" ? (
                            <path
                              d={btn.icon}
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <path d={btn.icon} fill="currentColor" />
                          )}
                        </svg>
                        {btn.label}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                          className="transition-transform group-open:rotate-180"
                        >
                          <path
                            d="m5 7.5 5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </summary>
                      <div className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
                        {btn.children.map((tool) => {
                          const isActiveTool = isToolMenuItemActive(tool, btn.children ?? []);

                          return (
                            <a
                              key={tool.url}
                              href={`${import.meta.env.BASE_URL}${tool.url}`}
                              onClick={() =>
                                trackEvent("click_navigate", {
                                  url: tool.url,
                                  from: currentPage,
                                })
                              }
                              className={`flex items-center gap-2 px-3 py-2.5 text-sm no-underline hover:bg-[var(--code-bg)] ${
                                tool.isPrimary
                                  ? "border-b border-[var(--border)] font-semibold"
                                  : ""
                              } ${isActiveTool ? "text-red-500" : tool.isPrimary ? "text-[var(--text-h)]" : "text-[var(--text)]"}`}
                              aria-current={isActiveTool ? "page" : undefined}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                                className={`shrink-0 h-[14px] w-[14px] ${tool.label === "Shiny Odds Calculator" ? "h-[18px] w-[18px]" : ""}`}
                              >
                                {tool.iconType === "fill" ? (
                                  <path d={tool.icon} fill="currentColor" />
                                ) : (
                                  <path
                                    d={tool.icon}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}
                              </svg>
                              {tool.label}
                            </a>
                          );
                        })}
                      </div>
                    </details>
                  );
                }

                return (
                  <a
                    key={btn.label}
                    href={`${import.meta.env.BASE_URL}${btn.url}`}
                    onClick={() =>
                      trackEvent("click_navigate", {
                        url: btn.url,
                        from: currentPage,
                      })
                    }
                    className={desktopNavButtonClass(isActive)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      {btn.iconType === "stroke" ? (
                        <path
                          d={btn.icon}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path d={btn.icon} fill="currentColor" />
                      )}
                    </svg>
                    {btn.label}
                  </a>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center justify-self-end gap-2">
              {authEnabled ? isSignedIn ? (
                <details ref={profileMenuRef} className="group relative hidden min-[1101px]:block">
                  <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-2.5 pr-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--code-bg)]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--code-bg)] text-[var(--text)]">
                      <img
                        src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
                        alt="Trainer"
                        className="h-5 w-5"
                      />
                    </span>
                    {isUserLabelLoading ? (
                      <span className="h-3 w-24 animate-pulse rounded bg-[var(--code-bg)]" aria-hidden="true" />
                    ) : (
                      <span className="max-w-[180px] truncate">{resolvedUserLabel}</span>
                    )}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="transition-transform group-open:rotate-180"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
                    <a
                      href={`${import.meta.env.BASE_URL}user/`}
                      onClick={() =>
                        trackEvent("click_navigate", {
                          url: "user/",
                          from: currentPage,
                        })
                      }
                      className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text)] no-underline hover:bg-[var(--code-bg)]"
                    >
                      Dashboard
                    </a>
                    <a
                      href={`${import.meta.env.BASE_URL}user/pokedex`}
                      onClick={() =>
                        trackEvent("click_navigate", {
                          url: "user/pokedex",
                          from: currentPage,
                        })
                      }
                      className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text)] no-underline hover:bg-[var(--code-bg)]"
                    >
                      My Pokedex
                    </a>
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full cursor-pointer px-3 py-2.5 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--code-bg)]"
                    >
                      Sign out
                    </button>
                  </div>
                </details>
              ) : (
                <a
                  href={`${import.meta.env.BASE_URL}login/`}
                  onClick={() => trackEvent("click_navigate", { url: "login/", from: currentPage })}
                  className="inline-flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-[var(--code-bg)] px-3 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
                >
                  Login
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => toggleTheme("desktop")}
                className="hidden h-10 items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-semibold text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)] min-[1101px]:inline-flex"
                aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {themeMode === "dark" ? (
                    <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M21 12.79A9 9 0 1 1 11.21 3c-.03.26-.04.52-.04.79a7 7 0 0 0 7 7c.27 0 .53-.01.79-.04Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                {themeMode === "dark" ? "Light mode" : "Dark mode"}
              </button>

              <a
                href="https://buymeacoffee.com/jeroenvande"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden shrink-0 items-center min-[1101px]:inline-flex"
                aria-label="Support me on Buy Me a Coffee"
                onClick={() => handleSupportClick("desktop")}
              >
                <img
                  src="https://cdn.buymeacoffee.com/uploads/project_updates/2023/12/08f1cf468ace518fc8cc9e352a2e613f.png"
                  alt="Support me on Buy Me a Coffee"
                  className="h-6 w-[96px] max-w-none"
                />
              </a>

              <button
                className="hidden h-10 w-10 cursor-pointer flex-col justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-2 max-[1100px]:inline-flex"
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav"
                aria-label="Toggle navigation menu"
                onClick={toggleMobileMenu}
              >
                <span className="mb-[5px] block h-0.5 w-full rounded-sm bg-[var(--text-h)]" />
                <span className="mb-[5px] block h-0.5 w-full rounded-sm bg-[var(--text-h)]" />
                <span className="block h-0.5 w-full rounded-sm bg-[var(--text-h)]" />
              </button>
            </div>
          </div>

          <div className="mb-2 hidden shrink-0 items-center justify-center gap-2 pt-4 lg:!flex">
            <h1
              data-header-title
                className="m-0 text-[1.55rem] leading-tight font-bold tracking-[0.01em] text-[var(--text-h)]"
            >
              {title}
            </h1>
          </div>

          {showDate && (
            <div className="inline-flex flex-wrap items-center justify-center gap-2.5">
              <div
                className="inline-flex items-center gap-2 text-[0.8rem] font-medium text-[var(--text)] max-[1100px]:gap-[7px] max-[1100px]:text-[0.76rem]"
                aria-label="Updates daily"
              >
                <span
                  className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-green-500 text-white max-[1100px]:h-[17px] max-[1100px]:w-[17px]"
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6 9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-[0.8rem] leading-tight font-medium tracking-[0.01em] text-[var(--text)] max-[1100px]:text-[0.76rem]">
                  Updated daily
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--code-bg)] px-3 py-1.5 text-[0.85rem] text-[var(--text)]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                </svg>
                <span data-header-date>{showDate}</span>
              </div>
            </div>
          )}

          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[1099] block bg-black/50 transition-opacity duration-200"
                onClick={() => closeMobileMenu("overlay")}
                aria-hidden="true"
              />
              <div
                className="fixed top-0 bottom-0 left-0 z-[1100] block w-[85%] max-w-[320px] overflow-y-auto bg-[var(--bg)] shadow-[10px_0_28px_rgba(15,23,42,0.2)] transition-transform duration-300 ease-out"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-3.5 pt-3.5 pb-2.5">
                  <span className="inline-flex items-center gap-2 text-base font-bold text-[var(--text-h)]">
                    <img
                      src={import.meta.env.BASE_URL + "logo.svg"}
                      alt="Pokedoku Helper"
                      className="h-5 w-5"
                    />
                    Pokedoku Helper
                  </span>
                  <button
                    className="h-[34px] w-[34px] cursor-pointer rounded-lg border-none bg-transparent text-[var(--text)]"
                    type="button"
                    onClick={() => closeMobileMenu("close")}
                    aria-label="Close navigation menu"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>

                <div id="mobile-nav" className="block px-2 pt-2.5 pb-3">
                  <nav
                    className="flex flex-col gap-1"
                    aria-label="Mobile primary"
                  >
                    {NAV_BUTTONS.map((btn) => {
                      const isActive = btn.page === currentPage;

                      if (btn.children) {
                        return (
                          <details
                            ref={mobileToolsMenuRef}
                            key={`mobile-${btn.label}`}
                            className="group mt-1 overflow-hidden rounded-xl bg-[var(--bg)]"
                            open={mobileMenuOpen && isToolsSectionPage}
                          >
                            <summary className="flex list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                              <span
                                className={`${mobileNavButtonClass(false)}`}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  {btn.iconType === "stroke" ? (
                                    <path
                                      d={btn.icon}
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  ) : (
                                    <path d={btn.icon} fill="currentColor" />
                                  )}
                                </svg>
                                {btn.label}
                              </span>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                                className="mr-3 shrink-0 text-[var(--text)] transition-transform duration-200 group-open:rotate-180"
                              >
                                <path
                                  d="m5 7.5 5 5 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </summary>
                            <div className="bg-[var(--code-bg)] px-2 py-2">
                              {btn.children.map((tool) => {
                                const isActiveTool = isToolMenuItemActive(
                                  tool,
                                  btn.children ?? [],
                                );

                                return (
                                  <a
                                    key={`mobile-${tool.url}`}
                                    href={`${import.meta.env.BASE_URL}${tool.url}`}
                                    onClick={() => {
                                      trackEvent("click_navigate", {
                                        url: tool.url,
                                        from: currentPage,
                                      });
                                      closeMobileMenu("navigate");
                                    }}
                                    className={`mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm no-underline transition-colors ${
                                      isActiveTool
                                        ? "text-red-500"
                                        : "text-[var(--text)] hover:bg-[var(--code-bg)]"
                                    }`}
                                    aria-current={
                                      isActiveTool ? "page" : undefined
                                    }
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      aria-hidden="true"
                                      className={`shrink-0 ${tool.label === "Shiny Odds Calculator" ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]"}`}
                                    >
                                      {tool.iconType === "fill" ? (
                                        <path
                                          d={tool.icon}
                                          fill="currentColor"
                                        />
                                      ) : (
                                        <path
                                          d={tool.icon}
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      )}
                                    </svg>
                                    {tool.label}
                                  </a>
                                );
                              })}
                            </div>
                          </details>
                        );
                      }

                      return (
                        <a
                          key={`mobile-${btn.label}`}
                          href={`${import.meta.env.BASE_URL}${btn.url}`}
                          onClick={() => {
                            trackEvent("click_navigate", {
                              url: btn.url,
                              from: currentPage,
                            });
                            closeMobileMenu("navigate");
                          }}
                          className={mobileNavButtonClass(isActive)}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            {btn.iconType === "stroke" ? (
                              <path
                                d={btn.icon}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : (
                              <path d={btn.icon} fill="currentColor" />
                            )}
                          </svg>
                          {btn.label}
                        </a>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => toggleTheme("mobile")}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--code-bg)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        {themeMode === "dark" ? (
                          <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M21 12.79A9 9 0 1 1 11.21 3c-.03.26-.04.52-.04.79a7 7 0 0 0 7 7c.27 0 .53-.01.79-.04Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                      {themeMode === "dark" ? "Light mode" : "Dark mode"}
                    </button>

                    {authEnabled ? (
                      <details
                        ref={mobileUserMenuRef}
                        className="group mt-1 overflow-hidden rounded-xl bg-[var(--bg)]"
                        open={mobileMenuOpen && isUserSectionPage}
                      >
                        <summary className="flex list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                          <span className={mobileNavButtonClass(false)}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                                fill="currentColor"
                              />
                            </svg>
                            My Pokedoku Helper
                          </span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            className="mr-3 shrink-0 text-[var(--text)] transition-transform duration-200 group-open:rotate-180"
                          >
                            <path
                              d="m5 7.5 5 5 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </summary>

                        <div className="bg-[var(--code-bg)] px-2 py-2">
                          {isSignedIn ? (
                            <div className="mb-1 mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text)]">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--code-bg)] text-[var(--text)]">
                                <img
                                  src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
                                  alt="Trainer"
                                  className="h-6 w-6"
                                />
                              </span>
                              {isUserLabelLoading ? (
                                <span className="h-3 w-24 animate-pulse rounded bg-[var(--code-bg)]" aria-hidden="true" />
                              ) : (
                                <span className="truncate">{resolvedUserLabel}</span>
                              )}
                            </div>
                          ) : null}

                          {isSignedIn ? (
                            <>
                              <a
                                href={`${import.meta.env.BASE_URL}user/`}
                                onClick={() => {
                                  trackEvent("click_navigate", { url: "user/", from: currentPage });
                                  closeMobileMenu("navigate");
                                }}
                                className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text)] no-underline transition-colors hover:bg-[var(--code-bg)]"
                              >
                                Dashboard
                              </a>
                              <a
                                href={`${import.meta.env.BASE_URL}user/pokedex/`}
                                onClick={() => {
                                  trackEvent("click_navigate", { url: "user/pokedex/", from: currentPage });
                                  closeMobileMenu("navigate");
                                }}
                                className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text)] no-underline transition-colors hover:bg-[var(--code-bg)]"
                              >
                                My Pokedex
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  closeMobileMenu("navigate");
                                  signOut();
                                }}
                                className="mt-0.5 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--code-bg)]"
                              >
                                Sign out
                              </button>
                            </>
                          ) : (
                            <a
                              href={`${import.meta.env.BASE_URL}login/`}
                              onClick={() => {
                                trackEvent("click_navigate", { url: "login/", from: currentPage });
                                closeMobileMenu("navigate");
                              }}
                              className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text)] no-underline transition-colors hover:bg-[var(--code-bg)]"
                            >
                              Login
                            </a>
                          )}
                        </div>
                      </details>
                    ) : null}

                    <a
                      href="https://buymeacoffee.com/jeroenvande"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 mb-1 ml-1 inline-flex items-center gap-2 text-[0.9rem] text-[var(--text)]"
                      aria-label="Support me on Buy Me a Coffee"
                      onClick={() => {
                        handleSupportClick("mobile");
                        closeMobileMenu("support");
                      }}
                    >
                      <img
                        src="https://cdn.buymeacoffee.com/uploads/project_updates/2023/12/08f1cf468ace518fc8cc9e352a2e613f.png"
                        alt="Support me on Buy Me a Coffee"
                        className="inline-block h-8 w-auto"
                      />
                    </a>
                  </nav>
                </div>
              </div>
            </>
          )}

          {subtitle && (
            <p
              className={
                (alwaysShowSubheader ? "" : "max-[600px]:hidden") +
                " mx-auto mb-3 max-w-[700px] text-center text-[1.12rem] leading-[1.65] text-[var(--text)]"
              }
            >
              {subtitle}
            </p>
          )}
          {introText && (
            <p className="mt-1 text-[0.95rem] leading-snug text-[var(--text)]">
              {introText}
            </p>
          )}
        </div>
        <div
          className="relative left-1/2 mt-4 w-screen -translate-x-1/2 border-t border-[var(--border)]"
          aria-hidden="true"
        />
      </header>
    </>
  );
}
