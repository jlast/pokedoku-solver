import { useEffect, useState } from "react";
import { trackEvent } from "../utils/analytics";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showDate?: string;
  currentPage: string;
}

interface NavButton {
  page: string;
  label: string;
  url: string;
  icon: string;
}

const NAV_BUTTONS: NavButton[] = [
  { page: "today", label: "Today's Answers", url: "", icon: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" },
  { page: "custom", label: "Custom Puzzle", url: "custom/", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" },
  { page: "pokemon-list", label: "All Pokemon", url: "pokemon-list/", icon: "M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" },
  { page: "puzzle-stats", label: "Rarity Stats", url: "puzzle-stats/", icon: "M3 17h3V9H3v8zm5 0h3V5H8v12zm5 0h3v-4h-3v4zm5 2H2v2h16v-2z" },
  { page: "tips", label: "Tips & Tricks", url: "tips/", icon: "M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 11.7-.5.3V16h-3v-2h-1v2H10v-1.99l-.5-.3C7.99 12.79 7 11.01 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.01-.99 3.79-2.5 4.7z" },
];

export function Header({ title, subtitle, showDate, currentPage }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopNavButtonClass = (isActive: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border px-2.5 text-[0.8rem] whitespace-nowrap transition-colors ${
      isActive
        ? "cursor-default border-slate-700 bg-slate-700 text-white"
        : "cursor-pointer border-transparent bg-transparent text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
    }`;

  const mobileNavButtonClass = (isActive: boolean) =>
    `inline-flex w-full items-center justify-start gap-2 rounded-lg border-none px-3 py-2.5 text-left text-sm transition-colors ${
      isActive
        ? "cursor-default bg-slate-500 text-white"
        : "cursor-pointer bg-transparent text-slate-700 hover:bg-slate-50"
    }`;

  const closeMobileMenu = (source: "overlay" | "button" | "close" | "navigate" | "support") => {
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navigateTo = (url: string) => {
    trackEvent("click_navigate", { url, from: currentPage });
    window.location.assign(`${import.meta.env.BASE_URL}${url}`);
  };

  return (
    <>
      <header className="site-header text-left">
        <div className="flex justify-center items-center gap-3 max-[1100px]:flex max-[1100px]:items-center max-[1100px]:justify-between">
          <div className="flex min-w-0 items-center justify-self-start gap-2.5">
            <a
              href={`${import.meta.env.BASE_URL}`}
              aria-label="Go to home page"
              onClick={() => trackEvent("click_navigate", { url: "", from: currentPage })}
              className="shrink-0"
            >
              <img
                src={import.meta.env.BASE_URL + "logo.svg"}
                alt="Pokedoku Helper"
                className="m-0 h-8 w-8 cursor-pointer max-[1100px]:h-7 max-[1100px]:w-7"
              />
            </a>
            <span className="hidden ml-0.5 text-base leading-tight font-bold text-slate-900 max-[1100px]:inline-block">{title}</span>

          </div>

          <nav
            className="inline-flex items-stretch gap-1 rounded-[14px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-1 shadow-[0_6px_18px_rgba(15,23,42,0.08)] max-[1100px]:hidden"
            aria-label="Primary"
          >
            {NAV_BUTTONS.map((btn) => {
              const isActive = btn.page === currentPage;

              return (
                <button
                  key={btn.label}
                  onClick={() => {
                    if (isActive) return;
                    navigateTo(btn.url);
                  }}
                  className={desktopNavButtonClass(isActive)}
                  disabled={isActive}
                  aria-current={isActive ? "page" : undefined}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={btn.icon} />
                  </svg>
                  {btn.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-self-end gap-2">
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
                className="h-6 w-auto max-w-none"
              />
            </a>

            <button
              className="hidden h-10 w-10 cursor-pointer flex-col justify-center rounded-[10px] border border-slate-300 bg-white p-2 max-[1100px]:inline-flex"
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation menu"
              onClick={toggleMobileMenu}
            >
              <span className="mb-[5px] block h-0.5 w-full rounded-sm bg-slate-700" />
              <span className="mb-[5px] block h-0.5 w-full rounded-sm bg-slate-700" />
              <span className="block h-0.5 w-full rounded-sm bg-slate-700" />
            </button>
          </div>
        </div>

        <div className="title !hidden shrink-0 pt-4 lg:!flex">
          <h1 className="m-0 !text-[1.55rem] leading-tight tracking-[0.01em]">{title}</h1>
        </div>

        {showDate && (
          <div className="inline-flex flex-col items-center gap-2.5">
            <div className="inline-flex items-center gap-2 text-[0.8rem] font-medium text-slate-500 max-[1100px]:gap-[7px] max-[1100px]:text-[0.76rem]" aria-label="Updates daily">
              <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-green-500 text-white max-[1100px]:h-[17px] max-[1100px]:w-[17px]" aria-hidden="true">
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
              <span className="text-[0.8rem] leading-tight font-medium tracking-[0.01em] text-slate-500 max-[1100px]:text-[0.76rem]">Updated daily</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[0.85rem] text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
              </svg>
              {showDate}
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[1099] block bg-black/50 animate-[headerFadeIn_0.2s]"
              onClick={() => closeMobileMenu("overlay")}
              aria-hidden="true"
            />
            <div className="fixed top-0 bottom-0 left-0 z-[1100] block w-[85%] max-w-[320px] overflow-y-auto bg-white shadow-[10px_0_28px_rgba(15,23,42,0.2)] animate-[headerSlideIn_0.3s_ease-out]" role="dialog" aria-modal="true" aria-label="Navigation menu">
              <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-slate-200 bg-white px-3.5 pt-3.5 pb-2.5">
                <span className="text-base font-bold text-slate-900">Pokedoku Helper</span>
                <button
                  className="h-[34px] w-[34px] cursor-pointer rounded-lg border-none bg-transparent text-slate-600"
                  type="button"
                  onClick={() => closeMobileMenu("close")}
                  aria-label="Close navigation menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              <div id="mobile-nav" className="block px-2 pt-2.5 pb-3">
                <nav className="flex flex-col gap-1" aria-label="Mobile primary">
                  {NAV_BUTTONS.map((btn) => {
                    const isActive = btn.page === currentPage;

                    return (
                      <button
                        key={`mobile-${btn.label}`}
                        onClick={() => {
                          if (isActive) return;
                          navigateTo(btn.url);
                          closeMobileMenu("navigate");
                        }}
                        className={mobileNavButtonClass(isActive)}
                        disabled={isActive}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={btn.icon} />
                        </svg>
                        {btn.label}
                      </button>
                    );
                  })}

                  <a
                    href="https://buymeacoffee.com/jeroenvande"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 mb-1 ml-1 inline-flex items-center gap-2 text-[0.9rem] text-slate-700"
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

        {subtitle && <p className="lead">{subtitle}</p>}
      </header>
      <div className="my-6 h-1 bg-gradient-to-b from-black/10 to-transparent" />
    </>
  );
}
