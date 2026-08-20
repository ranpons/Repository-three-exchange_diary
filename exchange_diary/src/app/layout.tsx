import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ことばの交換日記",
  description: "匿名で日記を交換するための投稿画面",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
