"use client";

import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SettlementPicker, type SettlementOption } from "@/components/forms/SettlementPicker";

export type JobFilterValues = {
  munkakor?: string;
  hely?: SettlementOption | null;
  tav?: string;
  ber?: string;
  ber_tipus?: string;
  szezonalis?: string;
};

export function JobFilters({ templates, values, activeCount }: { templates: { slug: string; name: string }[]; values: JobFilterValues; activeCount: number }) {
  return (
    <details className="group rounded-3xl border border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        <span>
          Szűrők
          {activeCount > 0 && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-white">{activeCount}</span>}
        </span>
        <span className="text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <form action="/allasok" method="get" className="space-y-4 border-t border-line p-4">
        <Field label="Munkakör" htmlFor="f-munkakor">
          <Select id="f-munkakor" name="munkakor" defaultValue={values.munkakor ?? ""}>
            <option value="">Mindegyik</option>
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Honnan?" htmlFor="f-hely" hint="Irányítószám vagy település – ebből számoljuk a távolságot légvonalban.">
          <SettlementPicker id="f-hely" name="hely" defaultValue={values.hely} />
        </Field>
        <Field label="Távolság" htmlFor="f-tav">
          <Select id="f-tav" name="tav" defaultValue={values.tav ?? ""}>
            <option value="">Bármilyen</option>
            {[5, 10, 20, 30, 50, 100].map((km) => (
              <option key={km} value={km}>
                {km} km-en belül
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum bér" htmlFor="f-ber">
            <Input id="f-ber" name="ber" inputMode="numeric" defaultValue={values.ber ?? ""} placeholder="Ft" />
          </Field>
          <Field label="Bér típusa" htmlFor="f-ber-tipus">
            <Select id="f-ber-tipus" name="ber_tipus" defaultValue={values.ber_tipus ?? "monthly"}>
              <option value="monthly">Havi</option>
              <option value="hourly">Órabér</option>
            </Select>
          </Field>
        </div>
        <Field label="Szezonális" htmlFor="f-szezon">
          <Select id="f-szezon" name="szezonalis" defaultValue={values.szezonalis ?? ""}>
            <option value="">Mindegy</option>
            <option value="igen">Csak szezonális</option>
            <option value="nem">Csak egész éves</option>
          </Select>
        </Field>
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Szűrés
          </Button>
          <Link href="/allasok" className="inline-flex min-h-12 items-center rounded-2xl px-4 font-semibold text-muted">
            Törlés
          </Link>
        </div>
      </form>
    </details>
  );
}
