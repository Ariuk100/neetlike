// lib/utils.ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getR2PublicImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
  const bucketName = process.env.NEXT_PUBLIC_R2_PUBLIC_BUCKET_NAME;
  if (!accountId || !bucketName) {
    console.error("R2-ийн тохиргооны хувьсагчууд дутуу байна.");
    return null;
  }
  return `https://pub-${accountId}.r2.dev/${bucketName}/${key}`;
}