"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileMock } from "@/components/TurnstileMock";
import { useEffect, useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import Image from "next/image";
import { Trash2, Lightbulb, Droplets, MoreHorizontal, UploadCloud, MapPin, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { useMapEvents } = m as any;
    return function ClickHandler(props: { onPick: (lat: number, lng: number) => void }) {
      useMapEvents({
        click: (e: { latlng: { lat: number; lng: number } }) => props.onPick(e.latlng.lat, e.latlng.lng),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return null as any;
    };
  }),
  { ssr: false }
);

const schema = z
  .object({
    qr_id: z.string().trim().min(3, "Identifier is too short"),
    category: z.enum(["bin","light","water","other"]),
    urgency: z.enum(["low", "medium", "high", "normal", "urgent"]),
    title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
    note: z.string().max(240).optional(),
    photo: z.instanceof(File).optional(),
    lat: z.number(),
    lng: z.number(),
    token: z.string(),
  })
  .superRefine((val, ctx) => {
    if ((val.urgency === "urgent" || val.urgency === "high") && !val.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Note is required for urgent reports",
      });
    }
  });

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  { id: "bin", label: "Bin", icon: Trash2 },
  { id: "light", label: "Light", icon: Lightbulb },
  { id: "water", label: "Water", icon: Droplets },
  { id: "other", label: "Other", icon: MoreHorizontal },
] as const;

export default function ReportPage() {
  const params = useParams<{ qr_id: string }>();
  const router = useRouter();
  const qr = decodeURIComponent(params.qr_id);
  const preCat: import("@/lib/types").IssueCategory = qr.startsWith("BIN-") ? "bin" : qr.startsWith("LGT-") ? "light" : qr.startsWith("WTR-") ? "water" : "other";

  const [geoDenied, setGeoDenied] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [markerIcon, setMarkerIcon] = useState<any | null>(null);
  const [submitPhase, setSubmitPhase] = useState<0 | 1 | 2 | 3>(0); // 0=idle, 1=uploading, 2=saving, 3=done
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [duplicateBanner, setDuplicateBanner] = useState(false);
  const checkedDup = useRef(false);

  const { register, watch, handleSubmit, setValue, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { qr_id: qr, category: preCat, urgency: "low", title: "", token: "dev" },
  });
  
  const noteValue = watch("note") || "";
  const categoryValue = watch("category");
  const urgencyValue = watch("urgency");
  const titleValue = watch("title") || "";
  const qrInput = watch("qr_id") || qr;

  // Urgency Smart-Detect
  useEffect(() => {
    const v = noteValue.toLowerCase();
    const keywords = ["broken", "dangerous", "overflowing", "dark", "blocked", "smell", "urgent"];
    let matches = 0;
    for (const kw of keywords) {
      if (v.includes(kw)) matches++;
    }
    if (matches >= 2 && urgencyValue !== "high") {
      setValue("urgency", "high", { shouldValidate: true, shouldDirty: true });
      toast("Bumped to High based on your description", { icon: "📈" });
    }
  }, [noteValue, urgencyValue, setValue]);

  // Handle Location
  useEffect(() => {
    let timed = false;
    if (!coords && navigator.geolocation) {
      const timeout = setTimeout(() => {
        timed = true;
        const c = { lat: -33.8869, lng: 151.1929 };
        setCoords(c);
        setValue("lat", c.lat);
        setValue("lng", c.lng);
        setGeoDenied(true);
      }, 3500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (timed) return; 
          clearTimeout(timeout);
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setValue("lat", c.lat);
          setValue("lng", c.lng);
          checkDuplicate(c.lat, c.lng, categoryValue);
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
  }, [coords, setValue, categoryValue]);

  // Duplicate Check
  async function checkDuplicate(lat: number, lng: number, cat: string) {
    if (checkedDup.current) return;
    checkedDup.current = true;
    try {
      const res = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}&category=${cat}`);
      const data = await res.json();
      if (data.found) {
        setDuplicateBanner(true);
      }
    } catch {}
  }

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
        html: '<div style="width:18px;height:18px;background:#F59E0B;border-radius:9999px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>',
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
        setSubmitPhase(1);
        const fd = new FormData();
        fd.append("file", data.photo);
        fd.append("hint", qr);
        const up = await fetch("/api/uploads", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson?.error || "Upload failed");
        photoPath = upJson.path as string;
      }

      setSubmitPhase(2);
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
      
      setSubmitPhase(3);
      toast.success(`Created ticket ${json.id}`);
      router.push(`/r/success?ticket=${json.id}&qr=${encodeURIComponent(data.qr_id || qr)}`);
    } catch (e: unknown) {
      setSubmitPhase(0);
      const msg = e instanceof Error ? e.message : "Failed to submit report";
      toast.error(msg);
      // reset duplicate check to false in case they want to retry
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const getGradient = (cat: string) => {
    if (cat === "bin") return "from-amber-500/30 to-background text-amber-600 dark:text-amber-400";
    if (cat === "light") return "from-blue-500/30 to-background text-blue-600 dark:text-blue-400";
    if (cat === "water") return "from-teal-500/30 to-background text-teal-600 dark:text-teal-400";
    return "from-slate-500/30 to-background text-slate-600 dark:text-slate-400";
  };
  
  const ActiveIcon = useMemo(() => CATEGORIES.find(c => c.id === categoryValue)?.icon || MoreHorizontal, [categoryValue]);

  return (
    <div className="mx-auto max-w-xl pb-16 bg-background min-h-screen">
      {/* Hero Header */}
      <div className={`w-full h-48 md:h-56 relative bg-gradient-to-b ${getGradient(categoryValue)} overflow-hidden flex flex-col justify-end p-6 border-b`}>
        <div className="absolute right-[-20px] top-[-20px] opacity-10">
          <ActiveIcon size={200} />
        </div>
        <AnimatePresence>
          {duplicateBanner && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 bg-primary text-primary-foreground text-sm p-3 pr-10 rounded-xl shadow-lg z-50 flex items-center gap-2"
            >
              <div className="text-xl">⚠️</div>
              <p>A similar issue was reported nearby — it may already be in progress.</p>
              <button type="button" onClick={() => setDuplicateBanner(false)} className="absolute right-3 p-1 hover:bg-white/20 rounded-full transition"><X size={16}/></button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="z-10 relative">
          <ActiveIcon size={32} className="mb-2" />
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-foreground">
            {qrInput.length > 3 ? qrInput : "Report Issue"}
          </h1>
          <p className="text-secondary-foreground text-sm mt-1 opacity-80">We&apos;ll get it fixed as soon as possible.</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 -mt-4 relative z-10 space-y-8">
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register("category")} />
          <input type="hidden" {...register("urgency")} />

          {/* Category Selector Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Type of Issue</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = categoryValue === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setValue("category", cat.id, { shouldDirty: true, shouldValidate: true })}
                    className={`aspect-square sm:aspect-auto sm:h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-200 outline-none
                      ${isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-[0.98]" 
                        : "bg-card hover:bg-muted text-foreground border-border hover:border-gray-400 focus-visible:ring-2 focus-visible:ring-ring"}
                    `}
                  >
                    <Icon size={28} strokeWidth={isSelected ? 2.5 : 2} />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message as string}</p>}
          </div>

          {/* Title & Notes */}
          <div className="space-y-4">
            <div className="relative">
              <Input 
                placeholder=" " 
                maxLength={80} 
                className="peer h-14 rounded-xl border-border bg-card focus:border-accent focus:ring-0 focus:border-b-2 transition-all pt-4" 
                {...register("title")}
              />
              <label className="absolute left-3 top-4 text-muted-foreground text-sm transition-all peer-focus:-top-2 peer-focus:text-xs peer-focus:text-accent peer-focus:bg-background peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:bg-background peer-[&:not(:placeholder-shown)]:px-1">
                Short Title
              </label>
              {errors.title && <div className="text-xs text-destructive mt-1">{errors.title.message as string}</div>}
            </div>

            <div className="relative">
              <Textarea 
                placeholder=" "
                maxLength={240} 
                className="peer min-h-[100px] resize-none rounded-xl border-border bg-card focus:border-accent focus:ring-0 focus:border-b-2 transition-all pt-5"
                {...register("note")} 
              />
              <label className="absolute left-3 top-4 text-muted-foreground text-sm transition-all peer-focus:-top-2 peer-focus:text-xs peer-focus:text-accent peer-focus:bg-background peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:bg-background peer-[&:not(:placeholder-shown)]:px-1">
                Note (location details, severity)
              </label>
              <div className="text-[10px] text-muted-foreground absolute bottom-2 right-3 font-mono">
                {noteValue.length}/240
              </div>
              {errors.note && <div className="text-xs text-destructive mt-1">{errors.note.message as string}</div>}
            </div>
          </div>

          {/* Urgency Pills */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Urgency</h2>
            <div className="flex gap-2 p-1 bg-muted/50 rounded-full border">
              {(["low", "medium", "high"] as const).map((urgency) => {
                const isSelected = urgencyValue === urgency;
                return (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setValue("urgency", urgency, { shouldDirty: true, shouldValidate: true })}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring
                      ${isSelected && urgency === "high" ? "bg-red-500 text-white shadow-sm ring-1 ring-red-500" : isSelected ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}
                    `}
                  >
                    {isSelected && urgency === "high" && (
                      <motion.span 
                        layoutId="high-pulse"
                        className="absolute inset-0 bg-red-400 opacity-30 rounded-full"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10 capitalize">{urgency}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload Area */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Photo</h2>
            <div 
              className={`border-2 border-dashed rounded-2xl p-6 transition-all bg-card overflow-hidden relative cursor-pointer hover:border-accent hover:bg-accent/5 group ${photoPreview ? 'border-transparent p-0' : 'border-border'}`}
              onClick={() => !photoPreview && fileInputRef.current?.click()}
            >
              <Input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                capture="environment" 
                onChange={handlePhotoUpload}
                ref={fileInputRef}
                className="hidden" 
              />
              
              {photoPreview ? (
                <div className="relative aspect-video w-full group">
                  <Image src={photoPreview} fill className="object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" variant="destructive" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setValue("photo", undefined);
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}>Remove Photo</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground group-hover:text-accent group-hover:bg-accent/10">
                    <UploadCloud size={24} />
                  </div>
                  <span className="font-medium text-sm">Tap to add photo</span>
                  <span className="text-xs text-muted-foreground mt-1 text-balance">Adding a photo helps us find the issue faster.</span>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex justify-between items-center">
              <span>Location Pin</span>
            </h2>
            <Card className="overflow-hidden border-border rounded-2xl shadow-sm">
              <div className="h-[200px] bg-muted relative">
                <Map center={coords ? [coords.lat, coords.lng] : [-33.8869,151.1929]} zoom={17} className="h-full w-full outline-none z-0">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                  <ClickHandler onPick={(lat, lng) => { setCoords({ lat, lng }); setValue("lat", lat); setValue("lng", lng); }} />
                  {coords && (
                    <Marker position={[coords.lat, coords.lng]} icon={markerIcon ?? undefined} draggable eventHandlers={{ dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => { const ll = e.target.getLatLng(); setCoords({ lat: ll.lat, lng: ll.lng }); setValue("lat", ll.lat); setValue("lng", ll.lng); } }}>
                      {titleValue ? (
                        <Popup className="rounded-xl shadow-lg border-none">
                          <div className="text-sm font-semibold">{titleValue}</div>
                          <div className="text-[10px] text-muted-foreground uppercase mt-1">{categoryValue} • {urgencyValue}</div>
                        </Popup>
                      ) : null}
                    </Marker>
                  )}
                </Map>
              </div>
              <div className="p-3 bg-card flex items-center justify-between border-t border-border">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 truncate max-w-[60%]">
                  <MapPin size={12} />
                  {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Getting GPS..."}
                </span>
                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs font-medium text-primary hover:text-accent hover:bg-accent/10" onClick={() => {
                  setLocating(true);
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setCoords(c); setValue("lat", c.lat); setValue("lng", c.lng);
                        setGeoDenied(false); setLocating(false);
                      },
                      () => { setLocating(false); toast.error("Unable to get GPS"); },
                      { enableHighAccuracy: true, maximumAge: 10000, timeout: 4000 }
                    );
                  }
                }} disabled={locating}>
                  {locating ? "Locating..." : "Use my location"}
                </Button>
              </div>
            </Card>
          </div>

          <TurnstileMock onVerify={onVerify} />

          {/* Submit Progress Button */}
          <Button 
            type="submit" 
            className={`w-full h-14 rounded-xl text-base font-medium transition-all shadow-md active:scale-[0.98] ${
              submitPhase > 0 ? "bg-accent/10 text-accent outline outline-1 outline-accent pointer-events-none hover:bg-accent/10" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            disabled={isSubmitting || !categoryValue || !urgencyValue}
          >
            <AnimatePresence mode="wait">
              {submitPhase === 0 && (
                <motion.div key="stage-0" initial={{ opacity:0, y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} className="flex items-center gap-2">
                  Submit report <ChevronRight size={18} />
                </motion.div>
              )}
              {submitPhase === 1 && (
                <motion.div key="stage-1" initial={{ opacity:0, y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  Uploading photo...
                </motion.div>
              )}
              {submitPhase === 2 && (
                <motion.div key="stage-2" initial={{ opacity:0, y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  Saving report...
                </motion.div>
              )}
              {submitPhase === 3 && (
                <motion.div key="stage-3" initial={{ opacity:0, y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} className="flex items-center gap-2 text-success">
                  <CheckCircle2 size={18} /> Done
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          <input type="hidden" {...register("lat", { valueAsNumber: true })} />
          <input type="hidden" {...register("lng", { valueAsNumber: true })} />
          <input type="hidden" {...register("token")} />
        </form>
      </div>
    </div>
  );
}
