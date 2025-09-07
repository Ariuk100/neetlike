// app/moderator/layout.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebaseAdmin'

export default async function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get('__session')?.value
  if (!sessionCookie) redirect('/auth')

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
  if (decoded.role !== 'moderator') redirect('/unauthorized')

  return <>{children}</>
}