// app/api/upload-to-r2/route.ts (Next.js App Router)

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 тохиргоог орчны хувьсагчаас авна
// Эдгээр хувьсагчид .env.local файлд тохируулагдсан байх ёстой.
// process.env хувьсагчид string эсвэл undefined байж болно.
const R2_BUCKET: string | undefined = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID: string | undefined = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY: string | undefined = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID: string | undefined = process.env.R2_ACCOUNT_ID;

// S3 SDK-ийн алдааг тодорхойлох интерфейс
// AWS SDK-ийн алдаанууд нь Error-г өвлөдөг бөгөөд нэмэлт талбаруудтай байдаг.
interface S3ServiceException extends Error {
  name: string;
  message: string;
  $fault?: 'client' | 'server';
  $metadata?: {
    httpStatusCode: number;
    requestId: string;
    extendedRequestId: string;
    cfId: string;
    attempts: number;
    totalRetryDelay: number;
  };
  Code?: string; // S3 алдаанууд ихэвчлэн 'Code' (том үсгээр) талбартай байдаг
  code?: string; // Заримдаа 'code' (жижиг үсгээр) талбартай байж болно
}

// isS3ServiceException нь unknown төрлийн алдаа нь S3ServiceException мөн эсэхийг шалгадаг type guard функц юм.
// Энэ нь 'any' төрөл ашиглахгүйгээр алдааны объектыг аюулгүйгээр боловсруулах боломжийг олгоно.
function isS3ServiceException(error: unknown): error is S3ServiceException {
  // Алдаа нь объект бөгөөд null биш эсэхийг шалгана.
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  // Объектыг string түлхүүртэй ерөнхий Record болгон хувиргана.
  const err = error as Record<string, unknown>;

  // Ерөнхий Error объектын нийтлэг шинж чанаруудыг шалгана.
  const hasName = typeof err.name === 'string';
  const hasMessage = typeof err.message === 'string';

  // S3-ийн алдааны кодын талбаруудыг шалгана ('Code' эсвэл 'code').
  const hasS3Code = (
    ('Code' in err && typeof err.Code === 'string') || // 'Code' талбар байгаа эсэх, мөн string эсэх
    ('code' in err && typeof err.code === 'string')    // 'code' талбар байгаа эсэх, мөн string эсэх
  );

  // Шаардлагатай бүх шинж чанарууд байгаа бол S3ServiceException гэж үзнэ.
  return hasName && hasMessage && hasS3Code;
}

export async function POST(req: NextRequest) {
  try {
    // Орчны хувьсагчид тохируулагдсан эсэхийг шалгах
    if (!R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
      console.error('R2 environment variables are not set. Check your .env.local file.');
      return NextResponse.json({ error: 'Сервер талын тохиргооны алдаа: R2 хувьсагчид байхгүй байна.' }, { status: 500 });
    }

    // Cloudflare R2-ийн endpoint URL-г үүсгэх
    // Дээрх шалгалтын дараа R2_ACCOUNT_ID нь string гэдэг нь баталгаажсан тул ! эсвэл as string ашиглах шаардлагагүй.
    const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    // S3Client-г үүсгэх
    // R2 нь S3 API-тай нийцдэг тул @aws-sdk/client-s3-г ашиглана.
    // Дээрх шалгалтын дараа credentials-ийн утгууд string гэдэг нь баталгаажсан.
    const s3Client = new S3Client({
      region: 'auto', // Cloudflare R2 нь region-г автоматаар тодорхойлдог
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    // Хүсэлтээс FormData-г авах
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл олдсонгүй.' }, { status: 400 });
    }

    // Файлыг Buffer болгон хувиргах
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Файлын нэрийг давхцалгүй болгох (жишээ нь: timestamp + original filename)
    // Зайг "_" -ээр солих нь URL-д асуудал үүсгэхгүй.
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const fileKey = `uploads/${fileName}`; // R2 доторх файлын зам

    // R2 руу байршуулах параметрүүд
    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: fileKey, // R2 доторх файлын нэр
      Body: buffer, // Файлын агуулга
      ContentType: file.type, // Файлын MIME төрөл
    };

    // R2 руу файл байршуулах командыг илгээх
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Байршуулсан файлын нийтийн URL-г буцаах
    // R2-ийн нийтийн хандалтын endpoint-ээс үүснэ.
    // Хэрэв та Cloudflare R2-д Public Access Domain тохируулсан бол:
    const publicUrl = `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET}/${fileKey}`;

    // Эсвэл хэрэв та custom domain тохируулсан бол:
    // const publicUrl = `https://your-custom-domain.com/${fileKey}`; // "your-custom-domain.com"-ийг өөрийн домэйнээр солино.

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error('R2 Upload API Error:', error);
    let errorMessage = 'Файл байршуулахад алдаа гарлаа.';

    // Алдааны дэлгэрэнгүй мэдээллийг аюулгүйгээр шалгах
    if (isS3ServiceException(error)) {
      // S3ServiceException төрөл болсон тул шууд хандах боломжтой
      console.error('R2 Error Code:', error.Code || error.code); // 'any' ашиглахгүйгээр 'Code' эсвэл 'code'-д хандана
      console.error('R2 Error Message:', error.message);
      errorMessage = error.message;
    } else if (error instanceof Error) {
      // Ерөнхий Error instance бол
      console.error('R2 Error Message:', error.message);
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      // Зүгээр л 'message' талбартай объект бол
      console.error('R2 Error Message:', (error as { message: string }).message);
      errorMessage = (error as { message: string }).message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
