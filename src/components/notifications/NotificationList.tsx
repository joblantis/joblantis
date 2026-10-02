import Link from "next/link";
import { markNotificationsRead } from "@/app/uzenetek/actions";
import type { Tables } from "@/types/database";

type Item = Pick<Tables<"notifications">, "id" | "title" | "body" | "link" | "created_at" | "read_at">;

const time = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" });

/** Alkalmazáson belüli értesítések (ugyanezek mennek ki emailben is). */
export function NotificationList({ items }: { items: Item[] }) {
  if (!items.length) return null;
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Értesítések {unread > 0 && <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">{unread}</span>}
        </h2>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <button type="submit" className="rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-soft">
              Mind olvasott
            </button>
          </form>
        )}
      </div>
      <ul className="divide-y divide-line rounded-3xl border border-line">
        {items.map((n) => {
          const inner = (
            <>
              <p className={`text-sm ${n.read_at ? "font-medium" : "font-bold"}`}>
                {!n.read_at && <span className="mr-2 inline-block size-2 rounded-full bg-brand align-middle" aria-label="Olvasatlan" />}
                {n.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p>
              <p className="mt-1 text-xs text-muted">{time.format(new Date(n.created_at))}</p>
            </>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className="block px-4 py-3 hover:bg-soft">
                  {inner}
                </Link>
              ) : (
                <div className="px-4 py-3">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
