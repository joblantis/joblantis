/** Az admin műveletek visszajelzése (?ok=… / ?hiba=… a redirect után). */
export function AdminNotice({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  if (e) return <p role="alert" className="rounded-2xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{e}</p>;
  if (o) return <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{o}</p>;
  return null;
}

export function AdminTabs({ active }: { active: string }) {
  const tabs = [
    ["/admin", "Áttekintés"],
    ["/admin/sablonok", "Sablonok"],
    ["/admin/kompetenciak", "Kompetenciák"],
    ["/admin/kartyak", "Kártyák"],
    ["/admin/moderalas", "Moderálás"],
  ];
  return (
    <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Admin menü">
      {tabs.map(([href, label]) => (
        <a
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active === href ? "bg-brand text-white" : "bg-soft text-ink"}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
