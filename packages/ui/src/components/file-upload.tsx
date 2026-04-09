"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import { UploadIcon, XIcon, FileIcon, ImageIcon } from "lucide-react";
import * as React from "react";

interface FileUploadProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
}

interface FilePreview {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

function FileUpload({
  className,
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  value = [],
  onChange,
  disabled = false,
  onUpload,
  ...props
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<FilePreview[]>(
    value.map((f) => ({ file: f }))
  );
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
      const fileExt = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
      const fileType = file.type.toLowerCase();

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return fileExt === type.toLowerCase();
        }
        if (type.includes("*")) {
          const baseType = type.split("/")[0] ?? "";
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Accepted: ${accept}`;
      }
    }

    if (file.size > maxSize) {
      return `File size exceeds ${formatSize(maxSize)}`;
    }

    return null;
  };

  const generatePreview = (file: File): string | undefined => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const validFiles: FilePreview[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (!error) {
        validFiles.push({
          file,
          preview: generatePreview(file),
        });
      }
    }

    if (validFiles.length > 0) {
      const updatedFiles = multiple
        ? [...files, ...validFiles]
        : validFiles.slice(0, 1);

      setFiles(updatedFiles);
      onChange?.(updatedFiles.map((f) => f.file));
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onChange?.(updatedFiles.map((f) => f.file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!onUpload || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 0 } : f))
        );

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
            );
          }
        };

        await onUpload(files.map((f) => f.file));
      }
    } finally {
      setUploading(false);
    }
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div data-slot="file-upload" className={cn("flex flex-col gap-3", className)} {...props}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed border-input bg-transparent p-4 text-xs transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
        <UploadIcon className="size-8 text-muted-foreground" />
        <span className="text-muted-foreground">
          Drag and drop files here, or{" "}
          <span className="text-primary underline">browse</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Max size: {formatSize(maxSize)}
          {accept && ` | Accepted: ${accept}`}
        </span>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((fileData, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-none border bg-muted/30 p-2"
            >
              {fileData.preview ? (
                <img
                  src={fileData.preview}
                  alt={fileData.file.name}
                  className="size-10 rounded-sm object-cover"
                />
              ) : isImage(fileData.file) ? (
                <ImageIcon className="size-10 text-muted-foreground" />
              ) : (
                <FileIcon className="size-10 text-muted-foreground" />
              )}

              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium">
                  {fileData.file.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatSize(fileData.file.size)}
                </div>

                {fileData.progress !== undefined && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${fileData.progress}%` }}
                    />
                  </div>
                )}

                {fileData.error && (
                  <div className="mt-1 text-[10px] text-destructive">
                    {fileData.error}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled || uploading}
                className="rounded-sm p-1 hover:bg-muted disabled:opacity-50"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}

          {onUpload && files.length > 0 && !uploading && (
            <button
              type="button"
              onClick={handleUpload}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-none bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upload {files.length} file{files.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { FileUpload };
