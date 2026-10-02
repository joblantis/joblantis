import type { Metadata } from "next";
import { IntroVideoUploader } from "./IntroVideoUploader";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export const metadata: Metadata = { title: "Bemutatkozó videó" };

export default async function IntroVideoPage() {
  const user = await requireRole(["candidate"], "/jelolt/bemutatkozo");
  const supabase = await createClient();
  const { data: p } = await supabase.from("candidate_profiles").select("intro_video_path, intro_video_poster_path").eq("user_id", user.id).single();
  const urls = await signedUrls("intro-videos", [p?.intro_video_path ?? "", p?.intro_video_poster_path ?? ""], { client: supabase });
  const url = p?.intro_video_path ? urls.get(p.intro_video_path) : undefined;
  return (
    <div>
      <PageHeader title="Bemutatkozó videó" subtitle="Ez jelenik meg a profilod tetején, amikor jelentkezel." back="/jelolt" />
      <IntroVideoUploader userId={user.id} current={url ? { url, poster: (p?.intro_video_poster_path && urls.get(p.intro_video_poster_path)) || null } : null} />
    </div>
  );
}
