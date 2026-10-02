import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email-megerősítés / magic link visszatérési pont: a kódot munkamenetre cseréljük.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const fallback = profile?.role === "employer" ? "/munkaltato/ceg" : "/jelolt";
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }
  return NextResponse.redirect(`${origin}/belepes?hiba=link`);
}
