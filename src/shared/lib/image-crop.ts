export interface CropOptions {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CropRect {
  x: number;
  y: number;
  size: number;
}

export function calculateSquareCrop(
  width: number,
  height: number,
  { zoom, offsetX, offsetY }: CropOptions,
): CropRect {
  const safeZoom = Math.min(3, Math.max(1, zoom));
  const size = Math.min(width, height) / safeZoom;
  const availableX = Math.max(0, width - size);
  const availableY = Math.max(0, height - size);
  const normalizedX = (Math.min(100, Math.max(-100, offsetX)) + 100) / 200;
  const normalizedY = (Math.min(100, Math.max(-100, offsetY)) + 100) / 200;
  return {
    x: availableX * normalizedX,
    y: availableY * normalizedY,
    size,
  };
}
