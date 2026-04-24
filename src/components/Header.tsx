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
  { page: "today", label: "Today's Puzzle", url: "", icon: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" },
  { page: "custom", label: "Custom Puzzle", url: "custom/", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" },
  { page: "pokemon-list", label: "All Pokemon", url: "pokemon-list/", icon: "M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" },
  { page: "tips", label: "Tips & Tricks", url: "tips/", icon: "M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 11.7-.5.3V16h-3v-2h-1v2H10v-1.99l-.5-.3C7.99 12.79 7 11.01 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.01-.99 3.79-2.5 4.7z" },
];

export function Header({ title, subtitle, showDate, currentPage }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="site-header">
        <div className="header-top-row">
          <div className="brand-block">
            <img src={import.meta.env.BASE_URL + "logo.svg"} alt="Pokedoku Helper" className="logo" />
            <span className="mobile-inline-title">{title}</span>

            <nav className="header-nav" aria-label="Primary">
              {NAV_BUTTONS.map((btn) => {
                const isActive = btn.page === currentPage;

                return (
                  <button
                    key={btn.label}
                    onClick={() => {
                      if (isActive) return;
                      navigateTo(btn.url);
                    }}
                    className={`nav-btn ${isActive ? "active" : ""}`}
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
          </div>

          <div className="header-right-actions">
            <a
              href="https://buymeacoffee.com/jeroenvande"
              target="_blank"
              rel="noopener noreferrer"
              className="support-btn desktop-support"
              aria-label="Support me on Buy Me a Coffee"
              onClick={() => handleSupportClick("desktop")}
            >
              <img
                src="https://cdn.buymeacoffee.com/uploads/project_updates/2023/12/08f1cf468ace518fc8cc9e352a2e613f.png"
                alt="Support me on Buy Me a Coffee"
                className="support-desktop"
              />
            </a>

            <button
              className="menu-toggle"
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation menu"
              onClick={toggleMobileMenu}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div className="title header-title-row">
          <h1>{title}</h1>
        </div>

        {showDate && (
          <div className="header-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
            </svg>
            {showDate}
          </div>
        )}

        {mobileMenuOpen && (
          <>
            <div
              className="mobile-menu-overlay"
              onClick={() => closeMobileMenu("overlay")}
              aria-hidden="true"
            />
            <div className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
              <div className="mobile-menu-header">
                <span className="mobile-menu-title">Pokedoku Helper</span>
                <button
                  className="mobile-menu-close"
                  type="button"
                  onClick={() => closeMobileMenu("close")}
                  aria-label="Close navigation menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              <div id="mobile-nav" className="mobile-menu open">
                <nav className="mobile-nav" aria-label="Mobile primary">
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
                        className={`nav-btn ${isActive ? "active" : ""}`}
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
                    className="support-btn mobile-support"
                    aria-label="Support me on Buy Me a Coffee"
                    onClick={() => {
                      handleSupportClick("mobile");
                      closeMobileMenu("support");
                    }}
                  >
                    <img
                      src="https://cdn.buymeacoffee.com/uploads/project_updates/2023/12/08f1cf468ace518fc8cc9e352a2e613f.png"
                      alt="Support me on Buy Me a Coffee"
                      className="support-mobile"
                    />
                  </a>
                </nav>
              </div>
            </div>
          </>
        )}

        {subtitle && <p className="lead">{subtitle}</p>}
      </header>
      <div className="header-divider" />
    </>
  );
}
