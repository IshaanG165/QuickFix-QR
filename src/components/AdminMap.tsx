"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { Issue } from "@/lib/types";
import { useEffect, useMemo } from "react";

function FitBounds({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    if (!issues.length) return;
    const bounds = L.latLngBounds(issues.map(i => [i.lat, i.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.2), { animate: true });
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

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl shadow-sm">
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitToIssues && hasIssues ? <FitBounds issues={issues} /> : null}
        {markers.map((i) => {
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
              {/* Urgent ring */}
              {i.urgency === "urgent" ? (
                <CircleMarker
                  center={[i.lat, i.lng]}
                  radius={18}
                  pathOptions={{ color: color, opacity: 0.4 }}
                />
              ) : null}
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} sticky>
                <div className="text-xs">
                  <div className="font-medium">{i.qr_id}</div>
                  <div className="text-[11px]">{i.category} • {i.status} {i.urgency === "urgent" ? "• URGENT" : ""}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
