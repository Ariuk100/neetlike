// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server'; // NextRequest-ийг импортлох
import { adminAuth } from '@/lib/firebaseAdmin'; // Firebase Admin SDK-г импортлох

export async function POST(req: NextRequest) { // req-ийн төрлийг NextRequest болгож өөрчилсөн
  try {
    // 🔴 Засвар: req.json()-ийн төрлийг тодорхой зааж өгсөн
    const { token } = await req.json() as { token?: string };

    if (!token) {
      return NextResponse.json({ error: 'Token not provided' }, { status: 400 });
    }

    // ID Token-г шалгах
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    // 🔴 Нэмэлт: Custom Claims-ээс role-г авах
    const userRole = decodedToken.role || 'student'; // role байхгүй бол 'student' default-оор

    // Session cookie үүсгэх
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 хоног (миллисекундээр)
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    // Cookie-г хариултад нэмэх
    // 🔴 Засвар: '__session' нэртэй cookie болгон тохируулсан
    const response = NextResponse.json({ success: true, uid, role: userRole }, { status: 200 }); // 🔴 Засвар: role-г хариултад нэмсэн
    
    response.cookies.set('__session', sessionCookie, { // 🔴 Засвар: Cookie-ний нэрийг '__session' болгосон
      maxAge: expiresIn / 1000, // maxAge нь секундээр байх ёстой
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Продакшн орчинд secure байх
      path: '/',
      sameSite: 'lax', // CSRF хамгаалалт
    });

    // 🔴 Нэмэлт: user_role cookie-г тохируулах
    response.cookies.set('user_role', userRole, {
      maxAge: expiresIn / 1000, // maxAge нь секундээр байх ёстой
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (err: unknown) {
    console.error('Login API Error:', err);
    // Алдааны мэдээллийг илүү нарийвчлан хэвлэх
    if (err instanceof Error) {
      console.error('Firebase Error Code:', err.message);
    }
    if (err instanceof Error) {
      console.error('Firebase Error Message:', err.message);
    }
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Internal server error'
    }, { status: 500 })
  }
}
