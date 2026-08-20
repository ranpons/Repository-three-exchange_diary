export const MAX_DIARY_CHARACTERS = 500;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type EntryImageMetadata = {
  name: string;
  size: number;
  type: string;
};

export type EntryValidationInput = {
  body: string;
  image: EntryImageMetadata | null;
  privacyAcknowledged: boolean;
};

export type SubmissionState = {
  status: "idle" | "error" | "waiting" | "matched";
  message: string;
  errors: string[];
  exchangeId?: string;
};

export const initialSubmissionState: SubmissionState = {
  status: "idle",
  message: "",
  errors: [],
};

export function validateEntry({
  body,
  image,
  privacyAcknowledged,
}: EntryValidationInput) {
  const errors: string[] = [];
  const normalizedBody = body.trim();

  if (normalizedBody.length === 0) {
    errors.push("日記本文を入力してください。");
  }

  if (normalizedBody.length > MAX_DIARY_CHARACTERS) {
    errors.push(`本文は${MAX_DIARY_CHARACTERS}文字以内にしてください。`);
  }

  if (
    image &&
    !ACCEPTED_IMAGE_TYPES.includes(
      image.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    errors.push("画像はJPEG、PNG、WebPのいずれかを選んでください。");
  }

  if (image && image.size > MAX_IMAGE_BYTES) {
    errors.push("画像は5MB以下にしてください。");
  }

  if (!privacyAcknowledged) {
    errors.push("個人情報に関する確認へチェックを入れてください。");
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedBody,
  };
}

export function acceptedImageTypes() {
  return ACCEPTED_IMAGE_TYPES.join(",");
}
