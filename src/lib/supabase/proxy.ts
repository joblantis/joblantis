import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PROTECTED: { prefix: string; roles: Array<Database["public"]["Enums"]["user_role"]> }[] = [
  { prefix: "/munkaltato", roles: ["employer", "admin"] },
  { prefix: "/jelolt", roles: ["candidate", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/uzenetek", roles: ["candidate", "employer", "admin"] },
];

/** Munkamenet frissítése és optimista, szerepkör szerinti útvédelem. A valódi jogosultságot az RLS adja. */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const path = request.nextUrl.pathname;
  const rule = PROTECTED.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  if (!rule) return response;

  if (!userId) {
    const login = request.nextUrl.clone();
    login.pathname = "/belepes";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (!profile || !rule.roles.includes(profile.role)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}
