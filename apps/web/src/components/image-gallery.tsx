import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface GalleryImage {
  id: number;
  filename: string;
  storageKey: string;
  thumbnailKey?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  publicUrl?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageGallery({ images, initialIndex = 0, onClose }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 rounded-full p-2 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 rounded-full p-2 text-white hover:bg-white/10"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div className="relative max-h-[90vh] max-w-[90vw]">
        <img
          src={currentImage.publicUrl || `/api/files/${currentImage.id}/download`}
          alt={currentImage.filename}
          className={`max-h-[90vh] max-w-[90vw] object-contain ${
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="absolute bottom-4 right-4 rounded-full p-2 text-white hover:bg-white/10"
        >
          <ZoomIn className="h-6 w-6" />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
        {currentIndex + 1} / {images.length}
      </div>

      <div className="absolute bottom-4 left-1/2 flex gap-2 -translate-x-1/2 pt-8">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-16 w-16 overflow-hidden rounded border-2 ${
              idx === currentIndex ? "border-white" : "border-transparent"
            }`}
          >
            <img
              src={img.thumbnailKey ? `/api/files/${img.id}/thumbnail` : `/api/files/${img.id}/download`}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface GalleryGridProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
}

export function GalleryGrid({ images, onImageClick }: GalleryGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2 p-2">
      {images.map((image, index) => (
        <button
          key={image.id}
          onClick={() => onImageClick(index)}
          className="aspect-square overflow-hidden rounded border"
        >
          <img
            src={image.thumbnailKey ? `/api/files/${image.id}/thumbnail` : `/api/files/${image.id}/download`}
            alt={image.filename}
            className="h-full w-full object-cover hover:opacity-90"
          />
        </button>
      ))}
    </div>
  );
}
