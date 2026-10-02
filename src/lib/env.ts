// Környezeti változók – soha nem adunk meg kitalált alapértéket. Hiány esetén egyértelmű hibát dobunk.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Hiányzó környezeti változó: ${name}. Add meg a .env.local fájlban (lásd .env.example).`);
  }
  return value;
}

// A NEXT_PUBLIC_ változókat statikusan kell hivatkozni, hogy a kliens bundle-be bekerüljenek.
export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  },
};

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
