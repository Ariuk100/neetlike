// src/lib/r2.ts

// Cloudflare R2-ийн public access тохиргоог энд тодорхойлно
// Эдгээр хувьсагчдыг .env.local файлаас авна.
const NEXT_PUBLIC_R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;


/**
 * Cloudflare R2 дээрх зургийн public URL-ийг үүсгэнэ.
 * Энэ функц нь Next.js-ийн NEXT_PUBLIC_ префиксээр эхэлсэн орчны хувьсагчдыг клиент талд хандах боломжтой болгодог онцлогийг ашиглана.
 *
 * @param imageKey R2 bucket доторх зургийн зам (жишээ нь: 'uploads/my-image.jpg').
 * Энэ нь Firebase-ээс хадгалагдсан зургийн зам юм.
 * @returns Зургийн бүрэн URL (string) эсвэл null, хэрэв imageKey эсвэл R2 Account ID байхгүй бол.
 */
export const getR2PublicImageUrl = (imageKey?: string | null): string | null => {
  // imageKey хоосон эсвэл хүчингүй бол null буцаана
  if (!imageKey || typeof imageKey !== 'string' || imageKey.trim() === '') {
    // console.warn("getR2PublicImageUrl: Зургийн key олдсонгүй эсвэл хоосон байна.");
    return null;
  }

  // Cloudflare Account ID байхгүй бол алдааг тэмдэглэж null буцаана
  if (!NEXT_PUBLIC_R2_ACCOUNT_ID) {
    console.error("Алдаа: NEXT_PUBLIC_R2_ACCOUNT_ID орчны хувьсагч тохируулагдаагүй байна.");
    return null;
  }

  const cleanedImageKey = imageKey.trim();

  // Хэрэв imageKey нь аль хэдийн бүрэн URL байвал түүнийг шууд буцаана (жишээ нь, гадны URL)
  if (cleanedImageKey.startsWith('http://') || cleanedImageKey.startsWith('https://')) {
    return cleanedImageKey;
  }

  // Cloudflare R2 Public Development URL-ийн зөв бүтцийг ашиглана:
  // https://pub-<ACCOUNT_ID>.r2.dev/<OBJECT_KEY>
  // Энд OBJECT_KEY нь bucket доторх файлын бүрэн зам (жишээ нь: uploads/image.jpg)
  const imageUrl = `https://pub-${NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev/${cleanedImageKey}`;
  return imageUrl;
};