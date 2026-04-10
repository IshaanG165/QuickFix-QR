"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TurnstileMock } from "@/components/TurnstileMock";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import Image from "next/image";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Map = dynamic(() => import("react-leaflet").then(m => (m as any).MapContainer), { ssr: false }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TileLayer = dynamic(() => import("react-leaflet").then(m => (m as any).TileLayer), { ssr: false }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Marker = dynamic(() => import("react-leaflet").then(m => (m as any).Marker), { ssr: false }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Popup = dynamic(() => import("react-leaflet").then(m => (m as any).Popup), { ssr: false }) as any;
// lightweight internal component to capture map clicks
const ClickHandler = dynamic(
  () => import("react-leaflet").then(m => {
    const { useMapEvents } = m as any;
    // return a component that binds a click handler
    return function ClickHandler(props: { onPick: (lat: number, lng: number) => void }) {
      useMapEvents({
        click: (e: { latlng: { lat: number; lng: number } }) => props.onPick(e.latlng.lat, e.latlng.lng),
      });
      return null as any;
    };
  }),
  { ssr: false }
);

const schema = z
  .object({
    qr_id: z.string().trim().min(3, "Identifier is too short"),
    category: z.enum(["bin","light","water","other"]),
    urgency: z.enum(["normal","urgent"]),
    title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
    note: z.string().max(240).optional(),
    photo: z.instanceof(File).optional(),
    lat: z.number(),
    lng: z.number(),
    token: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.urgency === "urgent" && !val.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Note is required for urgent reports",
      });
    }
  });

type FormData = z.infer<typeof schema>;

export default function ReportPage() {
  const params = useParams<{ qr_id: string }>();
  const router = useRouter();
  const qr = decodeURIComponent(params.qr_id);
  const preCat: import("@/lib/types").IssueCategory = qr.startsWith("BIN-") ? "bin" : qr.startsWith("LGT-") ? "light" : qr.startsWith("WTR-") ? "water" : "other";

  const [geoDenied, setGeoDenied] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<any | null>(null);

  const { register, watch, handleSubmit, setValue, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { qr_id: qr, category: preCat, urgency: "normal", title: "", token: "dev" },
  });
  const noteValue = watch("note") || "";
  const categoryValue = watch("category");
  const urgencyValue = watch("urgency");
  const titleValue = watch("title") || "";
  const qrInput = watch("qr_id") || qr;

  useEffect(() => {
    let timed = false;
    if (!coords && navigator.geolocation) {
      const timeout = setTimeout(() => {
        // fallback to campus center if location is slow/denied
        timed = true;
        const c = { lat: -33.8869, lng: 151.1929 };
        setCoords(c);
        setValue("lat", c.lat);
        setValue("lng", c.lng);
        setGeoDenied(true);
      }, 3500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (timed) return; // already set fallback
          clearTimeout(timeout);
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setValue("lat", c.lat);
          setValue("lng", c.lng);
        },
        () => {
          if (!timed) {
            const c = { lat: -33.8869, lng: 151.1929 };
            setCoords(c);
            setValue("lat", c.lat);
            setValue("lng", c.lng);
          }
          setGeoDenied(true);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 3000 }
      );
    } else if (!coords) {
      const c = { lat: -33.8869, lng: 151.1929 };
      setCoords(c);
      setValue("lat", c.lat);
      setValue("lng", c.lng);
    }
  }, [coords, setValue]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = await import("leaflet");
      if (!mounted) return;
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;background:#dc2626;border-radius:9999px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>',
        iconSize: [18, 18] as [number, number],
        iconAnchor: [9, 9] as [number, number],
      });
      setMarkerIcon(icon);
    })();
    return () => { mounted = false; };
  }, []);

  function onVerify(token: string) {
    setValue("token", token);
  }

  async function onSubmit(data: FormData) {
    try {
      let photoPath: string | undefined;
      if (data.photo) {
        const fd = new FormData();
        fd.append("file", data.photo);
        fd.append("hint", qr);
        const up = await fetch("/api/uploads", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson?.error || "Upload failed");
        photoPath = upJson.path as string;
      }

      const resp = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          qr_id: data.qr_id || qr,
          category: data.category,
          urgency: data.urgency,
          title: data.title,
          note: data.note ?? null,
          lat: data.lat,
          lng: data.lng,
          photoPath,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Submit failed");
      toast.success(`Created ticket ${json.id}`);
      router.push(`/r/success?ticket=${json.id}&qr=${encodeURIComponent(data.qr_id || qr)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit report";
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Report issue for {qrInput}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* register hidden inputs so RHF tracks these fields */}
            <input type="hidden" {...register("category")} />
            <input type="hidden" {...register("urgency")} />
            <div>
              <label className="text-sm mb-1 block">Identifier</label>
              <Input placeholder="e.g., BIN-001" maxLength={40} {...register("qr_id")} />
              {errors.qr_id && <div className="text-xs text-red-500 mt-1">{errors.qr_id.message as string}</div>}
            </div>
            <div>
              <label className="text-sm mb-1 block">Title</label>
              <Input placeholder="e.g., Overflowing bin near main gate" maxLength={80} {...register("title")}/>
              {errors.title && <div className="text-xs text-red-500 mt-1">{errors.title.message as string}</div>}
              <div className="text-xs text-gray-500 mt-1 text-right">{(watch("title")?.length || 0)}/80</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm mb-1 block">Category</label>
                <ToggleGroup
                  type="single"
                  orientation="horizontal"
                  value={categoryValue}
                  onValueChange={(v) => setValue("category", (v || undefined) as any, { shouldDirty: true, shouldValidate: true })}
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? "category-error" : undefined}
                  className="justify-start"
                >
                  <ToggleGroupItem value="bin" aria-label="Bin" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Bin</ToggleGroupItem>
                  <ToggleGroupItem value="light" aria-label="Light" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Light</ToggleGroupItem>
                  <ToggleGroupItem value="water" aria-label="Water" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Water</ToggleGroupItem>
                  <ToggleGroupItem value="other" aria-label="Other" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Other</ToggleGroupItem>
                </ToggleGroup>
                {errors.category && <div id="category-error" className="text-xs text-red-500 mt-1">Please choose a category</div>}
              </div>
              <div>
                <label className="text-sm mb-1 block">Urgency</label>
                <ToggleGroup
                  type="single"
                  orientation="horizontal"
                  value={urgencyValue}
                  onValueChange={(v) => setValue("urgency", (v || undefined) as any, { shouldDirty: true, shouldValidate: true })}
                  aria-invalid={!!errors.urgency}
                  aria-describedby={errors.urgency ? "urgency-error" : undefined}
                  className="justify-start"
                >
                  <ToggleGroupItem value="normal" aria-label="Normal" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Normal</ToggleGroupItem>
                  <ToggleGroupItem value="urgent" aria-label="Urgent" className="rounded-md border border-gray-200 dark:border-gray-800 transition-all active:scale-95 hover:bg-muted/70 hover:shadow-sm focus-visible:ring-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 dark:data-[state=on]:ring-offset-gray-900 data-[state=on]:font-semibold data-[state=on]:shadow data-[state=on]:scale-95 data-[state=on]:border-transparent">Urgent</ToggleGroupItem>
                </ToggleGroup>
                {errors.urgency && <div id="urgency-error" className="text-xs text-red-500 mt-1">Please choose urgency</div>}
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Note (max 240)</label>
              <Textarea maxLength={240} {...register("note")} placeholder="Describe the issue (e.g., location details, severity)" />
              {errors.note && <div className="text-xs text-red-500 mt-1">{errors.note.message as string}</div>}
              <div className="text-xs text-gray-500 mt-1 text-right">{noteValue.length}/240</div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Photo</label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 3 * 1024 * 1024) {
                  toast.error("Max 3MB");
                  e.currentTarget.value = "";
                  return;
                }
                if (f) {
                  setValue("photo", f);
                  if (photoPreview) URL.revokeObjectURL(photoPreview);
                  setPhotoPreview(URL.createObjectURL(f));
                }
              }} />
              {photoPreview && (
                <div className="mt-2 flex items-center gap-2">
                  <Image src={photoPreview} alt="Selected" width={80} height={80} className="h-20 w-20 object-cover rounded-md border" />
                  <Button type="button" variant="secondary" size="sm" onClick={() => {
                    setValue("photo", undefined);
                    if (photoPreview) URL.revokeObjectURL(photoPreview);
                    setPhotoPreview(null);
                  }}>Remove</Button>
                </div>
              )}
            </div>

            {/* Location picker */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm">Location</label>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  if (!navigator.geolocation) {
                    toast.error("Geolocation not supported");
                    return;
                  }
                  setLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      setCoords(c);
                      setValue("lat", c.lat);
                      setValue("lng", c.lng);
                      setGeoDenied(false);
                      setLocating(false);
                    },
                    () => {
                      setLocating(false);
                      toast.error("Unable to fetch current location");
                    },
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 4000 }
                  );
                }} disabled={locating}>
                  {locating ? "Locating…" : "Use my location"}
                </Button>
              </div>
              <div className="h-56 overflow-hidden rounded-lg">
                <Map
                  center={coords ? [coords.lat, coords.lng] : [-33.8869,151.1929]}
                  zoom={16}
                  className="h-56 w-full"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <ClickHandler onPick={(lat, lng) => { setCoords({ lat, lng }); setValue("lat", lat); setValue("lng", lng); }} />
                  {coords && (
                    <Marker
                      position={[coords.lat, coords.lng]}
                      icon={markerIcon ?? undefined}
                      draggable
                      eventHandlers={{
                        dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
                          const ll = e.target.getLatLng();
                          setCoords({ lat: ll.lat, lng: ll.lng });
                          setValue("lat", ll.lat);
                          setValue("lng", ll.lng);
                        }
                      }}
                    >
                      {titleValue ? (
                        <Popup>
                          <div className="text-sm font-medium">{titleValue}</div>
                          <div className="text-xs text-muted-foreground">{categoryValue} • {urgencyValue}</div>
                        </Popup>
                      ) : null}
                    </Marker>
                  )}
                </Map>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {coords ? (
                  <>Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (tap map or drag marker to adjust)</>
                ) : geoDenied ? (
                  <>Location services denied. Tap the map to set a point.</>
                ) : (
                  <>Requesting location…</>
                )}
              </p>
            </div>

            <TurnstileMock onVerify={onVerify} />

            <Button type="submit" className="w-full" disabled={isSubmitting || !categoryValue || !urgencyValue}>
              {isSubmitting ? "Submitting…" : "Submit Report"}
            </Button>

            <input type="hidden" {...register("lat", { valueAsNumber: true })} />
            <input type="hidden" {...register("lng", { valueAsNumber: true })} />
            <input type="hidden" {...register("token")} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
