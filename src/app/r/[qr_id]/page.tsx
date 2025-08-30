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
import { submitReport } from "@/lib/mockIssues";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Map = dynamic(() => import("react-leaflet").then(m => (m as any).MapContainer), { ssr: false }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TileLayer = dynamic(() => import("react-leaflet").then(m => (m as any).TileLayer), { ssr: false }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Marker = dynamic(() => import("react-leaflet").then(m => (m as any).Marker), { ssr: false }) as any;

const schema = z.object({
  category: z.enum(["bin","light","water","other"]),
  urgency: z.enum(["normal","urgent"]),
  note: z.string().max(120).optional(),
  photo: z.instanceof(File).optional(),
  lat: z.number(),
  lng: z.number(),
  token: z.string(),
});

type FormData = z.infer<typeof schema>;

export default function ReportPage() {
  const params = useParams<{ qr_id: string }>();
  const router = useRouter();
  const qr = decodeURIComponent(params.qr_id);
  const preCat: import("@/lib/types").IssueCategory = qr.startsWith("BIN-") ? "bin" : qr.startsWith("LGT-") ? "light" : qr.startsWith("WTR-") ? "water" : "other";

  const [geoDenied, setGeoDenied] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);

  const { register, watch, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: preCat, urgency: "normal" },
  });
  const noteValue = watch("note") || "";

  useEffect(() => {
    if (!coords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setValue("lat", c.lat);
          setValue("lng", c.lng);
        },
        () => setGeoDenied(true),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
  }, [coords, setValue]);

  function onVerify(token: string) {
    setValue("token", token);
  }

  async function onSubmit(data: FormData) {
    const photoUrl = data.photo ? URL.createObjectURL(data.photo) : undefined;
    const res = await submitReport({
      qr_id: qr,
      category: data.category,
      urgency: data.urgency,
      note: data.note,
      lat: data.lat,
      lng: data.lng,
      photo_url: photoUrl,
    });
    toast.success(`Created ticket ${res.id}`);
    router.push(`/r/success?ticket=${res.id}&qr=${encodeURIComponent(qr)}`);
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
                <ToggleGroup type="single" defaultValue={preCat} onValueChange={(v) => v && setValue("category", v as FormData["category"])} className="justify-start">
                  <ToggleGroupItem value="bin" aria-label="Bin">Bin</ToggleGroupItem>
                  <ToggleGroupItem value="light" aria-label="Light">Light</ToggleGroupItem>
                  <ToggleGroupItem value="water" aria-label="Water">Water</ToggleGroupItem>
                  <ToggleGroupItem value="other" aria-label="Other">Other</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <label className="text-sm mb-1 block">Urgency</label>
                <ToggleGroup type="single" defaultValue="normal" onValueChange={(v) => v && setValue("urgency", v as FormData["urgency"])} className="justify-start">
                  <ToggleGroupItem value="normal" aria-label="Normal">Normal</ToggleGroupItem>
                  <ToggleGroupItem value="urgent" aria-label="Urgent">Urgent</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Note (max 120)</label>
              <Textarea maxLength={120} {...register("note")} placeholder="Optional note" />
              <div className="text-xs text-gray-500 mt-1 text-right">{noteValue.length}/120</div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Photo</label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 3 * 1024 * 1024) {
                  toast.error("Max 3MB");
                  e.currentTarget.value = "";
                  return;
                }
                if (f) setValue("photo", f);
              }} />
            </div>

            {/* Coordinates */}
            {coords ? (
              <div className="text-xs text-gray-500">Location: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
            ) : geoDenied ? (
              <div>
                <div className="h-40 overflow-hidden rounded-lg">
                  <Map center={[-33.8869,151.1929]} zoom={16} className="h-40 w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    {/* draggable marker simplified: click to set */}
                    <Marker position={[-33.8869,151.1929]} eventHandlers={{ click: (e: { latlng: { lat: number; lng: number } }) => {
                      const { lat, lng } = e.latlng;
                      setCoords({ lat, lng }); setValue("lat", lat); setValue("lng", lng);
                    } }} />
                  </Map>
                </div>
                <p className="text-xs text-gray-500 mt-1">Location services denied. Tap the map to set a point.</p>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Requesting location…</div>
            )}

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
