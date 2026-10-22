"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { motion } from "motion/react";
import { ExternalLink, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import { defaultLocations, normalizeBatch, normalizeLocation } from "@/lib/coaching";
import type { Batch, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { refreshCoaching } from "@/components/admin/refresh";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

const blank: Location = { id: "", name: "", area: "", address: "", mapUrl: "", phone: "", active: true, order: 1 };

export function LocationsManager() {
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [editing, setEditing] = useState<Location | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const stopLoc = onSnapshot(
      query(collection(db(), "locations"), orderBy("order", "asc")),
      (snap) => setLocations(snap.docs.map((d) => normalizeLocation(d.id, d.data()))),
      () => setLocations([]),
    );
    const stopBatch = onSnapshot(collection(db(), "batches"), (snap) => setBatches(snap.docs.map((d) => normalizeBatch(d.id, d.data()))));
    return () => {
      stopLoc();
      stopBatch();
    };
  }, []);

  async function importDefaults() {
    setImporting(true);
    const wb = writeBatch(db());
    for (const { id, ...rest } of defaultLocations) {
      wb.set(doc(db(), "locations", id), { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await wb.commit();
    await refreshCoaching();
    setImporting(false);
  }

  async function remove(loc: Location) {
    const count = batches.filter((b) => b.locationId === loc.id).length;
    if (count > 0) {
      window.alert(`${loc.name} still has ${count} batch${count > 1 ? "es" : ""}. Move or delete them first.`);
      return;
    }
    if (!window.confirm(`Delete ${loc.name}? This cannot be undone.`)) return;
    await deleteDoc(doc(db(), "locations", loc.id));
    await refreshCoaching();
  }

  const nextOrder = (locations?.at(-1)?.order ?? 0) + 1;

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Coaching centres where your batches run. Inactive centres are hidden from the website."
        actions={
          locations &&
          locations.length > 0 && (
            <PrimaryButton onClick={() => setEditing({ ...blank, order: nextOrder })}>
              <Plus className="size-4" /> Add location
            </PrimaryButton>
          )
        }
      />

      <div className="mt-8">
        {locations === null ? (
          <Spinner />
        ) : locations.length === 0 ? (
          <EmptyState
            icon={<MapPin className="size-6" />}
            title="No locations yet"
            body="Start with your two centres — Mirpur Academia and Uttara QED — or add a new one."
            action={
              <>
                <PrimaryButton onClick={importDefaults} loading={importing}>
                  Add Mirpur Academia &amp; Uttara QED
                </PrimaryButton>
                <GhostButton onClick={() => setEditing({ ...blank, order: nextOrder })}>
                  <Plus className="size-4" /> Custom location
                </GhostButton>
              </>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {locations.map((loc, i) => {
              const count = batches.filter((b) => b.locationId === loc.id).length;
              return (
                <motion.article
                  key={loc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn("rounded-3xl border border-line p-6", !loc.active && "opacity-60")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-forest text-forest-ink">
                        <MapPin className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="font-display text-xl">{loc.name}</h3>
                        <p className="text-sm text-ink-soft">{loc.area || "No area set"}</p>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs", loc.active ? "bg-forest/15 text-forest" : "bg-paper-2 text-ink-soft")}>
                      {loc.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <dl className="mt-5 space-y-1.5 text-sm">
                    {loc.address && <dd className="text-ink-soft">{loc.address}</dd>}
                    {loc.phone && (
                      <dd className="flex items-center gap-1.5 text-ink-soft">
                        <Phone className="size-3.5" aria-hidden /> {loc.phone}
                      </dd>
                    )}
                    {loc.mapUrl && (
                      <dd>
                        <a href={loc.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-4">
                          Open map <ExternalLink className="size-3" aria-hidden />
                        </a>
                      </dd>
                    )}
                  </dl>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <p className="text-sm">
                      <strong className="font-semibold">{count}</strong> <span className="text-ink-soft">batch{count === 1 ? "" : "es"}</span>
                    </p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setEditing(loc)} className="grid size-9 place-items-center rounded-full hover:bg-paper-2" aria-label={`Edit ${loc.name}`}>
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => remove(loc)} className="grid size-9 place-items-center rounded-full text-ember hover:bg-paper-2" aria-label={`Delete ${loc.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <LocationEditor location={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function LocationEditor({ location, onClose }: { location: Location | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(location)} title={location?.id ? "Edit location" : "Add location"} onClose={onClose}>
      {location && <LocationForm key={location.id || "new"} location={location} onDone={onClose} />}
    </Drawer>
  );
}

function LocationForm({ location, onDone }: { location: Location; onDone: () => void }) {
  const [active, setActive] = useState(location.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get("name")).trim(),
      area: String(f.get("area")).trim(),
      address: String(f.get("address")).trim(),
      mapUrl: String(f.get("mapUrl")).trim(),
      phone: String(f.get("phone")).trim(),
      order: Number(f.get("order")) || 1,
      active,
      updatedAt: serverTimestamp(),
    };
    if (!data.name) return setError("Give the location a name.");
    setSaving(true);
    try {
      if (location.id) await setDoc(doc(db(), "locations", location.id), data, { merge: true });
      else await addDoc(collection(db(), "locations"), { ...data, createdAt: serverTimestamp() });
      await refreshCoaching();
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={drawerFormClass}>
      <DrawerBody>
      <Field label="Centre name">
        <input name="name" required defaultValue={location.name} className={adminInput} placeholder="Mirpur Academia" />
      </Field>
      <Field label="Area" hint="Shown under the name">
        <input name="area" defaultValue={location.area} className={adminInput} placeholder="Mirpur, Dhaka" />
      </Field>
      <Field label="Address" hint="Optional">
        <textarea name="address" rows={2} defaultValue={location.address} className={adminInput} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" hint="Optional">
          <input name="phone" type="tel" defaultValue={location.phone} className={adminInput} />
        </Field>
        <Field label="Display order">
          <input name="order" type="number" min={1} defaultValue={location.order} className={adminInput} />
        </Field>
      </div>
      <Field label="Google Maps link" hint="Optional">
        <input name="mapUrl" type="url" defaultValue={location.mapUrl} className={adminInput} placeholder="https://maps.google.com/…" />
      </Field>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3.5">
        <span>
          <span className="block text-sm font-medium">Show on website</span>
          <span className="block text-xs text-ink-soft">Hidden centres keep their batches but aren&apos;t listed publicly.</span>
        </span>
        <Toggle checked={active} onChange={setActive} />
      </label>
      <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton type="submit" loading={saving}>
          Save location
        </PrimaryButton>
      </DrawerFooter>
    </form>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-forest" : "bg-paper-3")}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn("absolute top-1 size-5 rounded-full bg-paper shadow", checked ? "right-1" : "left-1")}
      />
    </button>
  );
}
