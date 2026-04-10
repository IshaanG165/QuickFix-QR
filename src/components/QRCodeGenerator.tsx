"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, QrCode } from "lucide-react";

export function QRCodeGenerator() {
  const [assetName, setAssetName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<"bin" | "light" | "water" | "other">("bin");
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!assetName || !location) return;
    const prefix = category === "bin" ? "BIN" : category === "light" ? "LGT" : category === "water" ? "WTR" : "OTH";
    const rand = Math.floor(1000 + Math.random() * 9000);
    const slug = `${prefix}-${rand}`;
    setGeneratedSlug(slug);
  };

  const handleDownload = () => {
    const svg = document.getElementById("generated-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${generatedSlug || "qr"}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Card className="h-full border-border bg-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/10">
        <QrCode className="text-primary" size={20} />
        <h2 className="font-semibold">QR Code Generator</h2>
      </div>
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset Name</label>
          <Input 
            placeholder="e.g. South Courtyard Bin 1" 
            value={assetName} 
            onChange={e => setAssetName(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
          <Select value={category} onValueChange={(v: "bin" | "light" | "water" | "other") => setCategory(v)}>
            <SelectTrigger className="bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bin">Bin</SelectItem>
              <SelectItem value="light">Lighting</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 mb-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coordinates / Location Note</label>
          <Input 
            placeholder="e.g. -33.8869, 151.1929" 
            value={location} 
            onChange={e => setLocation(e.target.value)}
            className="bg-background"
          />
        </div>

        <Button onClick={handleGenerate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl" disabled={!assetName || !location}>
          Generate Code
        </Button>

        {generatedSlug && (
          <div className="mt-6 pt-6 border-t border-dashed border-border flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm inline-block">
              <QRCodeSVG 
                id="generated-qr-code" 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${generatedSlug}`} 
                size={180} 
                level={"H"} 
                includeMargin={false}
              />
            </div>
            <div className="text-center w-full">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest leading-none">Generated ID</p>
              <p className="font-mono text-xl font-bold tracking-tight text-foreground">{generatedSlug}</p>
            </div>
            <Button variant="outline" className="w-full rounded-xl flex items-center gap-2 border-border" onClick={handleDownload}>
              <Download size={16} /> Download PNG
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
