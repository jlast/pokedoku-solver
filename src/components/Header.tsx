import { trackEvent } from "../utils/analytics";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showDate?: string;
  currentPage?: string;
}

interface NavButton {
  label: string;
  url: string;
  icon: string;
}

const NAV_BUTTONS: NavButton[] = [
  { label: "Editor", url: "", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" },
  { label: "Today's Puzzle", url: "today/", icon: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" },
  { label: "All Pokemon", url: "pokemon-list/", icon: "M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" },
];

export function Header({ title, subtitle, showDate, currentPage }: HeaderProps) {
  return (
    <>
      <header>
        <div className="title">
          <img src={import.meta.env.BASE_URL + "logo.svg"} alt="Pokedoku Helper" className="logo" />
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

        <div className="controls">
          {NAV_BUTTONS.map((btn) => {
            const isActive = 
              (btn.url === "" && currentPage === "editor") ||
              (btn.url === "today/" && currentPage === "today") ||
              (btn.url === "pokemon-list/" && currentPage === "pokemon-list");
            
            return (
              <button
                key={btn.label}
                onClick={() => {
                  if (isActive) return;
                  trackEvent("click_navigate", { url: btn.url, from: currentPage });
                  window.location.href = `${import.meta.env.BASE_URL}${btn.url}`;
                }}
                className={`nav-btn ${isActive ? "active" : ""}`}
                disabled={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d={btn.icon} />
                </svg>
                {btn.label}
              </button>
            );
          })}
        </div>
        {subtitle && <p className="lead">{subtitle}</p>}
      </header>
      <div className="header-divider" />
    </>
  );
}