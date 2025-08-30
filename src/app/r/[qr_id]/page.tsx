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
    category: z.enum(["bin","light","water","other"]),
    urgency: z.enum(["normal","urgent"]),
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

  const { register, watch, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: preCat, urgency: "normal" },
  });
  const noteValue = watch("note") || "";
  const categoryValue = watch("category") || preCat;
  const urgencyValue = watch("urgency") || "normal";

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
          qr_id: qr,
          category: data.category,
          urgency: data.urgency,
          note: data.note ?? null,
          lat: data.lat,
          lng: data.lng,
          photoPath,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Submit failed");
      toast.success(`Created ticket ${json.id}`);
      router.push(`/r/success?ticket=${json.id}&qr=${encodeURIComponent(qr)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit report";
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Report issue for {qr}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm mb-1 block">Category</label>
                <ToggleGroup
                  type="single"
                  value={categoryValue}
                  onValueChange={(v) => v && setValue("category", v as FormData["category"])}
                  className="justify-start"
                >
                  <ToggleGroupItem value="bin" aria-label="Bin">Bin</ToggleGroupItem>
                  <ToggleGroupItem value="light" aria-label="Light">Light</ToggleGroupItem>
                  <ToggleGroupItem value="water" aria-label="Water">Water</ToggleGroupItem>
                  <ToggleGroupItem value="other" aria-label="Other">Other</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <label className="text-sm mb-1 block">Urgency</label>
                <ToggleGroup
                  type="single"
                  value={urgencyValue}
                  onValueChange={(v) => v && setValue("urgency", v as FormData["urgency"])}
                  className="justify-start"
                >
                  <ToggleGroupItem value="normal" aria-label="Normal">Normal</ToggleGroupItem>
                  <ToggleGroupItem value="urgent" aria-label="Urgent">Urgent</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Note (max 240)</label>
              <Textarea maxLength={240} {...register("note")} placeholder="Describe the issue (e.g., location details, severity)" />
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
                      draggable
                      eventHandlers={{
                        dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
                          const ll = e.target.getLatLng();
                          setCoords({ lat: ll.lat, lng: ll.lng });
                          setValue("lat", ll.lat);
                          setValue("lng", ll.lng);
                        }
                      }}
                    />
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
