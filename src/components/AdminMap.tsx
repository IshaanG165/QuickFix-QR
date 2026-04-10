"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { Issue } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

// Simple clustering fallback component if react-leaflet-cluster fails or just render normally until Zoom is tight
function FitBounds({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    if (!issues.length) return;
    const bounds = L.latLngBounds(issues.map(i => [i.lat, i.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [issues, map]);
  return null;
}

// Leaflet.heat integration layer
function HeatmapLayer({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).L && (window as any).L.heatLayer) {
      const points = issues.map(i => [i.lat, i.lng, i.urgency === "urgent" || i.urgency === "high" ? 1.0 : 0.5]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = (window as any).L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.4: 'cyan',
          0.6: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);

      return () => {
        map.removeLayer(layer);
      };
    }
  }, [issues, map]);
  
  return null;
}

const statusColor: Record<string, string> = {
  reported: "#ef4444",
  in_progress: "#f59e0b",
  fixed: "#10b981",
};

export function AdminMap({
  issues,
  selectedId,
  onSelect,
  center = { lat: -33.8869, lng: 151.1929 },
  zoom = 16,
  fitToIssues = true,
}: {
  issues: Issue[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  fitToIssues?: boolean;
}) {
  const hasIssues = issues && issues.length > 0;
  const markers = useMemo(() => issues, [issues]);
  const [viewMode, setViewMode] = useState<"marker" | "heat">("marker");

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl shadow-sm relative">
      <Script src="https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js" strategy="lazyOnload" />
      
      {/* View Toggle */}
      <div className="absolute top-4 right-4 z-[400] bg-card rounded-lg shadow-md border border-border p-1 flex">
        <button 
          onClick={() => setViewMode("marker")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "marker" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Markers
        </button>
        <button 
          onClick={() => setViewMode("heat")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "heat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Heatmap
        </button>
      </div>

      <MapContainer center={[center.lat, center.lng]} zoom={zoom} className="h-full w-full outline-none z-0" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {fitToIssues && hasIssues ? <FitBounds issues={issues} /> : null}
        
        {viewMode === "heat" && hasIssues && <HeatmapLayer issues={issues} />}
        
        {(viewMode === "marker" || viewMode === "heat") && markers.map((i) => {
          // even in heat mode, render pulsing urgent issues!
          const isUrgent = i.urgency === "urgent" || i.urgency === "high";
          
          if (viewMode === "heat" && !isUrgent) return null; // hide normals in heat mode

          const color = statusColor[i.status];
          const isSelected = selectedId === i.id;
          const size = isSelected ? 16 : 12;

          return (
            <Marker
              key={i.id}
              position={[i.lat, i.lng]}
              eventHandlers={{ click: () => onSelect?.(i.id) }}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:9999px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>`,
                iconSize: [size, size],
              })}
            >
              {isUrgent ? (
                <CircleMarker
                  center={[i.lat, i.lng]}
                  radius={18}
                  pathOptions={{ color: '#ef4444', opacity: 0.8, fillColor: '#ef4444', fillOpacity: 0.3 }}
                  className="animate-pulse"
                />
              ) : null}
              {viewMode === "marker" && (
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} sticky>
                  <div className="text-xs p-1">
                    <div className="font-bold">{i.title || i.qr_id}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{i.category} • {i.status}</div>
                  </div>
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
