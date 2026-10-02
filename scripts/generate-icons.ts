/**
 * PWA ikonok generálása a public/logo.png-ből (fehér háttér, maskable változat biztonsági margóval).
 *   npm run icons
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(__dirname, "..");
const logo = path.join(root, "public", "logo.png");
const outDir = path.join(root, "public", "icons");

async function icon(size: number, padding: number, file: string) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(logo).resize(inner, inner, { fit: "contain", background: "#FFFFFF" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#FFFFFF" } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, file));
}

async function main() {
  if (!existsSync(logo)) throw new Error("Hiányzik a public/logo.png – töltsd fel, majd futtasd újra.");
  mkdirSync(outDir, { recursive: true });
  await icon(192, 0.06, "icon-192.png");
  await icon(512, 0.06, "icon-512.png");
  await icon(512, 0.2, "icon-maskable-512.png");
  await icon(180, 0.08, "apple-touch-icon.png");
  console.log("Ikonok elkészültek: public/icons/");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
