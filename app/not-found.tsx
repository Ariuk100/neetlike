'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div suppressHydrationWarning={true} className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white text-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Image
          src="/ghibli-404.png"
          alt="Lost in Ghibli Forest"
          width={300}
          height={300}
        />
      </motion.div>

      <motion.h1
        className="text-5xl font-bold mt-6 text-blue-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        404 - Хуудас олдсонгүй
      </motion.h1>

      <motion.p
        className="text-lg mt-4 text-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Та энэ ойд төөрсөн бололтой. Таарах зам руу буцах уу?
      </motion.p>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={() => router.back()}
          className="px-5 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
        >
          Гараар буцах 🍃
        </button>
      </motion.div>
    </div>
  )
}