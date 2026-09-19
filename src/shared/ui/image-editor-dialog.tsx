import { RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { calculateSquareCrop } from "../lib/image-crop";
import { Button } from "./button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface ImageEditorDialogProps {
  file: File | null;
  mode?: "square" | "original";
  title: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

function rotatedCanvas(image: HTMLImageElement, rotation: number) {
  const quarterTurn = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = quarterTurn ? image.naturalHeight : image.naturalWidth;
  canvas.height = quarterTurn ? image.naturalWidth : image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editing is unavailable in this browser.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unable to prepare this image."))),
      type,
      0.9,
    ),
  );
}

export function ImageEditorDialog({
  file,
  mode = "square",
  title,
  onCancel,
  onConfirm,
}: ImageEditorDialogProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImage(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImage(next);
    next.onerror = () => setError("This image could not be opened.");
    next.src = url;
    setRotation(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!image || !previewRef.current) return;
    const source = rotatedCanvas(image, rotation);
    const preview = previewRef.current;
    const context = preview.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, preview.width, preview.height);
    if (mode === "square") {
      const crop = calculateSquareCrop(source.width, source.height, { zoom, offsetX, offsetY });
      context.drawImage(
        source,
        crop.x,
        crop.y,
        crop.size,
        crop.size,
        0,
        0,
        preview.width,
        preview.height,
      );
    } else {
      const scale = Math.min(preview.width / source.width, preview.height / source.height);
      const width = source.width * scale;
      const height = source.height * scale;
      context.drawImage(
        source,
        (preview.width - width) / 2,
        (preview.height - height) / 2,
        width,
        height,
      );
    }
  }, [image, mode, offsetX, offsetY, rotation, zoom]);

  const confirm = async () => {
    if (!file || !image || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const source = rotatedCanvas(image, rotation);
      const output = document.createElement("canvas");
      const context = output.getContext("2d");
      if (!context) throw new Error("Image editing is unavailable in this browser.");
      if (mode === "square") {
        output.width = 640;
        output.height = 640;
        const crop = calculateSquareCrop(source.width, source.height, { zoom, offsetX, offsetY });
        context.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, 640, 640);
      } else {
        const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
        output.width = Math.round(source.width * scale);
        output.height = Math.round(source.height * scale);
        context.drawImage(source, 0, 0, output.width, output.height);
      }
      const type = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
        ? file.type
        : "image/jpeg";
      const blob = await canvasBlob(output, type);
      const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      onConfirm(
        new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-edited.${extension}`, { type }),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to prepare this image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && !processing && onCancel()}>
      <DialogContent showClose={!processing} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "square"
              ? "Adjust the crop so the face stays centred in profile and sidebar views."
              : "Rotate the image and confirm how it will appear in the application."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="mx-auto grid aspect-square w-full max-w-80 place-items-center overflow-hidden rounded-lg bg-slate-100">
            <canvas
              ref={previewRef}
              width={640}
              height={640}
              className="h-full w-full object-contain"
              aria-label="Edited image preview"
            />
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((value) => (value + 270) % 360)}
            >
              <RotateCcw /> Rotate left
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              <RotateCw /> Rotate right
            </Button>
          </div>
          {mode === "square" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Zoom</span>
                <input
                  aria-label="Zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-blue-700"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Left / right</span>
                <input
                  aria-label="Horizontal position"
                  type="range"
                  min="-100"
                  max="100"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                  className="w-full accent-blue-700"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Up / down</span>
                <input
                  aria-label="Vertical position"
                  type="range"
                  min="-100"
                  max="100"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                  className="w-full accent-blue-700"
                />
              </label>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={processing} onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!image || processing} onClick={() => void confirm()}>
            {processing ? "Preparing…" : "Use this image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
