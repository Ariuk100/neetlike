// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // dangerouslyAllowSVG нь images объектын шууд доор байрлана.
    dangerouslyAllowSVG: true, // SVG зургийг ачаалахыг зөвшөөрөх
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile image-ийн host
      },
      {
        protocol: 'https',
        // Таны Cloudflare R2 зургийн домайн (private access)
        // Энэ нь таны .env.local дахь R2_ACCOUNT_ID-тай таарч байх ёстой.
        hostname: 'e7b9e46baf6a9b19fc668713a540639b.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        // Шинээр нэмэгдсэн Cloudflare R2 Public Access домайн
        // Энэ нь таны .env.local дахь R2_ACCOUNT_ID-тай таарч байх ёстой.
        hostname: 'pub-e7b9e46baf6a9b19fc668713a540639b.r2.dev',
      },
      {
        protocol: 'https',
        // Таны Cloudflare R2 зургийн домайн (private access)
        // Энэ нь таны .env.local дахь R2_ACCOUNT_ID-тай таарч байх ёстой.
        hostname: '09e2947bfcee4019a38b1b41cf1e353e.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        // Шинээр нэмэгдсэн Cloudflare R2 Public Access домайн
        // Энэ нь таны .env.local дахь R2_ACCOUNT_ID-тай таарч байх ёстой.
        hostname: 'pub-09e2947bfcee4019a38b1b41cf1e353e.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // next/image-ийн onError-д ашиглагдах placeholder домэйн
      },
      // Бусад зураг ачаалдаг домэйнүүд байвал энд нэмнэ
    ],
  },
};

export default nextConfig;
