"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import {
  type EntryImageMetadata,
  type SubmissionState,
  validateEntry,
} from "@/lib/entryValidation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

type MatchResult = {
  status: "waiting" | "matched" | "already_submitted";
  exchange_id: string | null;
};

type ReceivedDiary = {
  body: string;
  imageUrl?: string;
  hasImage: boolean;
};

type DemoEntry = {
  id: string;
  questionId: string;
  authorId: string;
  body: string;
  imageName: string | null;
  status: "waiting" | "matched";
  createdAt: number;
};

type DemoExchange = {
  id: string;
  firstEntryId: string;
  secondEntryId: string;
};

// This state only exists while `npm run dev` is running. Supabase takes over
// automatically after the two environment variables in .env.local are set.
const demoEntries: DemoEntry[] = [];
const demoExchanges: DemoExchange[] = [];

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function imageValue(value: FormDataEntryValue | null) {
  if (typeof File === "undefined" || !(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function imageMetadata(image: File | null): EntryImageMetadata | null {
  if (!image) {
    return null;
  }

  return {
    name: image.name,
    size: image.size,
    type: image.type,
  };
}

function stateForResult(
  result: MatchResult,
  receivedDiary?: ReceivedDiary,
): SubmissionState {
  if (result.status === "waiting") {
    return {
      status: "waiting",
      message: "日記を保存しました。次の投稿者との交換を待っています。",
      errors: [],
    };
  }

  if (result.status === "matched") {
    return {
      status: "matched",
      message: "日記を保存し、匿名の相手との交換が成立しました。",
      errors: [],
      exchangeId: result.exchange_id ?? undefined,
      receivedDiary,
    };
  }

  return {
    status: "error",
    message: "この質問にはすでに投稿済みです。投稿内容は変更できません。",
    errors: [],
  };
}

async function getReceivedDiary(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  exchangeId: string,
): Promise<ReceivedDiary | undefined> {
  const { data, error } = await supabase
    .rpc("get_received_entry_for_exchange", { p_exchange_id: exchangeId })
    .single();

  if (error || !data) {
    return undefined;
  }

  const imagePath = (data as { image_path: string | null }).image_path;
  let imageUrl: string | undefined;

  if (imagePath) {
    const { data: signedImage } = await supabase.storage
      .from("diary-images")
      .createSignedUrl(imagePath, 60 * 60);
    imageUrl = signedImage?.signedUrl;
  }

  return {
    body: (data as { body: string }).body,
    imageUrl,
    hasImage: Boolean(imagePath),
  };
}

function submitDemoEntry({
  questionId,
  authorId,
  body,
  imageName,
}: {
  questionId: string;
  authorId: string;
  body: string;
  imageName: string | null;
}): SubmissionState {
  const alreadySubmitted = demoEntries.some(
    (entry) => entry.questionId === questionId && entry.authorId === authorId,
  );

  if (alreadySubmitted) {
    return stateForResult({ status: "already_submitted", exchange_id: null });
  }

  const waitingEntry = demoEntries
    .filter(
      (entry) =>
        entry.questionId === questionId &&
        entry.status === "waiting" &&
        entry.authorId !== authorId,
    )
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  const entry: DemoEntry = {
    id: randomUUID(),
    questionId,
    authorId,
    body,
    imageName,
    status: waitingEntry ? "matched" : "waiting",
    createdAt: Date.now(),
  };

  demoEntries.push(entry);

  if (!waitingEntry) {
    return stateForResult({ status: "waiting", exchange_id: null });
  }

  waitingEntry.status = "matched";
  const exchangeId = randomUUID();
  demoExchanges.push({
    id: exchangeId,
    firstEntryId: waitingEntry.id,
    secondEntryId: entry.id,
  });

  return stateForResult(
    { status: "matched", exchange_id: exchangeId },
    {
      body: waitingEntry.body,
      hasImage: waitingEntry.imageName !== null,
    },
  );
}

function extensionFor(image: File) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensions[image.type] ?? "img";
}

export async function submitDiaryEntry(
  _previousState: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const questionId = textValue(formData.get("questionId"));
  const body = textValue(formData.get("body"));
  const privacyAcknowledged = formData.get("privacyAcknowledged") === "on";
  const image = imageValue(formData.get("image"));

  if (!questionId) {
    return {
      status: "error",
      message: "質問を特定できませんでした。ページを読み込み直してください。",
      errors: [],
    };
  }

  const validation = validateEntry({
    body,
    image: imageMetadata(image),
    privacyAcknowledged,
  });

  if (!validation.isValid) {
    return {
      status: "error",
      message: "入力内容を確認してください。",
      errors: validation.errors,
    };
  }

  if (!isSupabaseConfigured()) {
    const demoUserId = textValue(formData.get("demoUserId"));

    if (!demoUserId) {
      return {
        status: "error",
        message: "デモ利用者を準備できませんでした。ページを読み込み直してください。",
        errors: [],
      };
    }

    return submitDemoEntry({
      questionId,
      authorId: demoUserId,
      body: validation.normalizedBody,
      imageName: image?.name ?? null,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        status: "error",
        message: "投稿にはログインが必要です。参加画面から入り直してください。",
        errors: [],
      };
    }

    let imagePath: string | null = null;

    if (image) {
      imagePath = `${user.id}/${questionId}/${randomUUID()}.${extensionFor(image)}`;
      const { error: uploadError } = await supabase.storage
        .from("diary-images")
        .upload(imagePath, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        return {
          status: "error",
          message: "画像を保存できませんでした。画像を外して再試行してください。",
          errors: [],
        };
      }
    }

    const { data, error } = await supabase
      .rpc("submit_entry_and_match", {
        p_question_id: questionId,
        p_body: validation.normalizedBody,
        p_image_path: imagePath,
      })
      .single();

    if (error || !data) {
      if (imagePath) {
        await supabase.storage.from("diary-images").remove([imagePath]);
      }

      if (error?.code === "23505") {
        return stateForResult({ status: "already_submitted", exchange_id: null });
      }

      return {
        status: "error",
        message: "日記を保存できませんでした。通信状況を確認して、もう一度試してください。",
        errors: [],
      };
    }

    const result = data as MatchResult;
    const receivedDiary =
      result.status === "matched" && result.exchange_id
        ? await getReceivedDiary(supabase, result.exchange_id)
        : undefined;

    revalidatePath("/write");
    return stateForResult(result, receivedDiary);
  } catch {
    return {
      status: "error",
      message: "投稿処理中に問題が起きました。ページを読み込み直して再試行してください。",
      errors: [],
    };
  }
}
