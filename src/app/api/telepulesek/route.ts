import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Település-kereső irányítószámra vagy névre (nyilvános katalógus).
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);
  const supabase = await createClient();
  const query = supabase.from("settlements").select("id, postal_code, name, county").limit(12);
  const { data, error } = /^\d{2,4}$/.test(q)
    ? await query.like("postal_code", `${q}%`).order("postal_code")
    : await query.ilike("name", `${q.replace(/[%_]/g, "")}%`).order("name").order("postal_code");
  if (error) return NextResponse.json({ error: "Keresési hiba" }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
