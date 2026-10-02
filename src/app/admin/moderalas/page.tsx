/* eslint-disable @next/next/no-img-element -- aláírt, lejáró URL */
import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { formatDate, JOB_STATUS_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { AdminNotice, AdminTabs } from "@/components/admin/AdminNotice";
import { deleteMediaItem, setJobStatus, setUserRole } from "../actions";

export const metadata: Metadata = { title: "Admin – moderálás" };

const ROLE_LABEL = { candidate: "jelölt", employer: "munkáltató", admin: "admin" } as const;

export default async function ModerationAdmin(props: PageProps<"/admin/moderalas">) {
  const me = await requireRole(["admin"], "/admin/moderalas");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const [{ data: jobs }, { data: media }, users] = await Promise.all([
    supabase.from("jobs").select("id, slug, title, status, expires_at, companies(name)").in("status", ["active", "closed"]).order("created_at", { ascending: false }).limit(30),
    supabase.from("media_items").select("id, kind, file_path, thumb_path, description, created_at, candidate_id").order("created_at", { ascending: false }).limit(24),
    q
      ? supabase.from("profiles").select("id, full_name, email, role, created_at").or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,full_name.ilike.%${q.replace(/[%,()]/g, "")}%`).limit(20)
      : supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const thumbs = await signedUrls("candidate-media", (media ?? []).map((m) => m.thumb_path ?? (m.kind === "image" ? m.file_path : "")), { client: supabase });

  return (
    <div className="space-y-8">
      <PageHeader title="Moderálás" />
      <AdminTabs active="/admin/moderalas" />
      <AdminNotice ok={sp.ok} error={sp.hiba} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Állások</h2>
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {jobs?.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/allasok/${j.slug}`} className="block truncate font-medium hover:text-brand">
                  {j.title}
                </Link>
                <p className="truncate text-xs text-muted">
                  {j.companies?.name} · lejár: {formatDate(j.expires_at)}
                </p>
              </div>
              <Badge tone={j.status === "active" ? "success" : "neutral"}>{JOB_STATUS_LABELS[j.status]}</Badge>
              <form action={setJobStatus}>
                <input type="hidden" name="id" value={j.id} />
                <input type="hidden" name="status" value={j.status === "active" ? "closed" : "active"} />
                <button type="submit" className={`rounded-xl px-3 py-2 text-sm font-semibold ${j.status === "active" ? "text-danger" : "text-brand"}`}>
                  {j.status === "active" ? "Lezárás" : "Aktiválás"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Legutóbbi feltöltések</h2>
        <ul className="grid grid-cols-3 gap-2">
          {media?.map((m) => {
            const url = thumbs.get(m.thumb_path ?? (m.kind === "image" ? m.file_path : ""));
            return (
              <li key={m.id} className="space-y-1">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-soft">
                  {url && <img src={url} alt={m.description ?? ""} loading="lazy" className="size-full object-cover" />}
                  {m.kind === "video" && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-xs text-white">videó</span>}
                </div>
                <form action={deleteMediaItem}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="w-full rounded-lg py-1 text-xs font-semibold text-danger hover:bg-danger/5">
                    Törlés
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Felhasználók</h2>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Név vagy email" className="min-h-11 flex-1 rounded-xl border border-line px-3" />
          <button type="submit" className="rounded-xl bg-soft px-4 font-semibold">
            Keresés
          </button>
        </form>
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {users.data?.map((u) => (
            <li key={u.id} className="flex items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.full_name || "–"}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              {u.id === me.id ? (
                <Badge tone="brand">{ROLE_LABEL[u.role]} (te)</Badge>
              ) : (
                <form action={setUserRole} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="min-h-10 rounded-xl border border-line px-2 text-sm" aria-label="Szerepkör">
                    {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="min-h-10 rounded-xl bg-soft px-3 text-sm font-semibold">
                    OK
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
