// Файлын байршил: /app/admin/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Session шалгах helper функц
async function verifySession(): Promise<{ user: DecodedIdToken; role: string } | null> {
  // ① Next 15-д cookies() нь async — эхлээд await хийж cookieStore авна
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = (decodedToken as Record<string, unknown>).role ?? 'student';
    return { user: decodedToken, role: role as string };
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  // 1. Нэвтрээгүй бол /login руу үсэргэнэ
  if (!session) {
    redirect('/login');
  }

  // 2. Зөвхөн 'admin' зөвшөөрнө
  if (session.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}