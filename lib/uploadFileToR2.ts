//lib/uploadFileToR2
import { toast } from 'sonner';
export async function uploadFileToR2(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${window.location.origin}/api/upload-to-r2`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Файл байршуулахад алдаа гарлаа.');
    }

    const data = await res.json();
    return data.key;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Тодорхойгүй алдаа';
    toast.error(`Файл байршуулахад алдаа гарлаа: ${message}`);
    throw error;
  }
}