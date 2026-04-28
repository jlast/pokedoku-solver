interface HeaderProps {
  title: string;
  subtitle?: string;
  showDate?: string;
}

export function Header({ title, subtitle, showDate }: HeaderProps) {
  return (
    <header>
      <div className="title">
        <img src={import.meta.env.BASE_URL + "logo.svg"} alt="Pokedoku Helper" className="logo" />
        <h1>{title}</h1>
      </div>
      {subtitle && <p className="lead">{subtitle}</p>}
      {showDate && <p>Today's puzzle for <b>{showDate}</b></p>}
    </header>
  );
}