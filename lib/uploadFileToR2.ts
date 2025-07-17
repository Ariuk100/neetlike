// lib/uploadFileToR2.ts
export async function uploadFileToR2(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  // Файлыг Next.js API маршрут руу илгээнэ
  const res = await fetch('/api/upload-to-r2', { // Энэ нь одоо таны сервер талын API руу хандана
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    // Серверээс ирсэн алдааны мэдээллийг авахыг оролдоно
    // 🔴 Засвар: errorData-ийн төрлийг тодорхой зааж өгсөн
    const errorData = (await res.json()) as { error?: string };
    throw new Error(errorData.error || 'Файл байршуулахад алдаа гарлаа.');
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
