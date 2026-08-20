export const MAX_DISPLAY_NAME_CHARACTERS = 30;
export const MIN_PASSWORD_CHARACTERS = 8;
export const PASSWORD_REQUIREMENT_HINT =
  "半角英字と数字をそれぞれ1文字以上含めてください。";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HAS_LETTER = /[a-zA-Z]/;
const PASSWORD_HAS_DIGIT = /[0-9]/;

export type AuthState = {
  status: "idle" | "error" | "info";
  message: string;
  errors: string[];
};

export const initialAuthState: AuthState = {
  status: "idle",
  message: "",
  errors: [],
};

export function validatePassword(password: string) {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_CHARACTERS) {
    errors.push(`パスワードは${MIN_PASSWORD_CHARACTERS}文字以上にしてください。`);
  }

  if (!PASSWORD_HAS_LETTER.test(password) || !PASSWORD_HAS_DIGIT.test(password)) {
    errors.push(`パスワードは${PASSWORD_REQUIREMENT_HINT}`);
  }

  return errors;
}

export function validateSignup({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName: string;
}) {
  const errors: string[] = [];
  const normalizedDisplayName = displayName.trim();

  if (!EMAIL_PATTERN.test(email)) {
    errors.push("メールアドレスの形式が正しくありません。");
  }

  errors.push(...validatePassword(password));

  if (normalizedDisplayName.length === 0) {
    errors.push("表示名を入力してください。");
  }

  if (normalizedDisplayName.length > MAX_DISPLAY_NAME_CHARACTERS) {
    errors.push(`表示名は${MAX_DISPLAY_NAME_CHARACTERS}文字以内にしてください。`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedDisplayName,
  };
}

export function validateEmailOnly(email: string) {
  const errors: string[] = [];

  if (!EMAIL_PATTERN.test(email)) {
    errors.push("メールアドレスの形式が正しくありません。");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const errors: string[] = [];

  if (!EMAIL_PATTERN.test(email)) {
    errors.push("メールアドレスの形式が正しくありません。");
  }

  if (password.length === 0) {
    errors.push("パスワードを入力してください。");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
