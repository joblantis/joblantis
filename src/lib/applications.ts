import type { Enums } from "@/types/database";

export const APPLICATION_STATUS_LABELS: Record<Enums<"application_status">, string> = {
  new: "Új",
  viewed: "Megnézve",
  trial: "Próbanap",
  offer: "Ajánlat",
  hired: "Felvéve",
  rejected: "Elutasítva",
  auto_closed: "Lezárult",
};

/** A jelölt szemszögéből megjelenített státusz (az elutasítás udvariasan). */
export const CANDIDATE_STATUS_LABELS: Record<Enums<"application_status">, string> = {
  new: "Elküldve – válaszra vár",
  viewed: "Érdeklődnek – chat nyitva",
  trial: "Próbanap",
  offer: "Ajánlatot kaptál",
  hired: "Felvettek",
  rejected: "Nem jutott tovább",
  auto_closed: "Lezárult",
};

export const STATUS_TONE: Record<Enums<"application_status">, "brand" | "neutral" | "success" | "warning" | "danger"> = {
  new: "neutral",
  viewed: "brand",
  trial: "warning",
  offer: "warning",
  hired: "success",
  rejected: "danger",
  auto_closed: "neutral",
};

/** Kanban oszlopok sorrendje; az automatikusan lezártak az elutasítottak között jelennek meg. */
export const PIPELINE: Enums<"application_status">[] = ["new", "viewed", "trial", "offer", "hired", "rejected"];

/** A munkáltató által beállítható státuszok (az "új" és az automatikus lezárás nem). */
export const EMPLOYER_SETTABLE: Enums<"application_status">[] = ["viewed", "trial", "offer", "hired", "rejected"];

export const CHAT_OPEN: Enums<"application_status">[] = ["viewed", "trial", "offer", "hired"];
