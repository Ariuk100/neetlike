// lib/uploadFileToR2.ts
import { toast } from 'sonner';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.physx.mn'

export async function uploadFileToR2(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/upload-to-r2`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.error || 'Файл байршуулахад алдаа гарлаа.');
    }

    const data = await res.json();
    return data.key;
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    toast.error(`Файл байршуулахад алдаа гарлаа: ${error.message}`);
    throw error;
  }
}