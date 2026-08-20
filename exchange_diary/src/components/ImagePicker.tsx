"use client";

import { useEffect, useRef, useState } from "react";

import {
  acceptedImageTypes,
  MAX_IMAGE_BYTES,
} from "@/lib/entryValidation";

type ImagePickerProps = {
  disabled?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
};

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ImagePicker({
  disabled = false,
  file,
  onChange,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(
      nextFile && nextFile.type.startsWith("image/")
        ? URL.createObjectURL(nextFile)
        : null,
    );
    onChange(nextFile);
  }

  function removeImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreviewUrl(null);
    onChange(null);
  }

  return (
    <div className="image-picker">
      <div className="image-picker-top">
        <label className="field-label" htmlFor="diary-image">
          画像を添付する（任意）
        </label>
        <p>JPEG / PNG / WebP、1枚、5MBまで</p>
      </div>

      <input
        ref={inputRef}
        className="image-input"
        id="diary-image"
        name="image"
        type="file"
        accept={acceptedImageTypes()}
        disabled={disabled}
        onChange={handleChange}
      />

      {file && (
        <div className="image-preview">
          {previewUrl ? (
            // Blob URLs are created locally and cannot use Next.js image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="選択した画像のプレビュー" />
          ) : (
            <div aria-hidden="true" />
          )}
          <div className="image-preview-details">
            <p className="image-preview-name">{file.name}</p>
            <p className="image-preview-size">
              {formatFileSize(file.size)} / {formatFileSize(MAX_IMAGE_BYTES)}
            </p>
            <button
              className="remove-image-button"
              type="button"
              disabled={disabled}
              onClick={removeImage}
            >
              この画像を外す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
