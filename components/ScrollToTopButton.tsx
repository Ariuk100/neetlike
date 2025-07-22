'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react' // ArrowUp икон ашигласан
import { Button } from '@/components/ui/button' // Button компонентийг импортлосон

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false) // Нэршлийг visible болгосон

  useEffect(() => {
    const toggleVisibility = () => {
      // Хуудас 300px-ээс илүү доош гүйлгэсэн үед товчийг харуулна
      setVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Хуудсыг жигд дээш гүйлгэнэ
  }

  // visible false байвал null буцааж, товчийг харуулахгүй
  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        variant="secondary" // Button компонентийн variant ашигласан
        onClick={scrollToTop}
        className="rounded-full p-2 shadow-lg" // Загварыг тохируулсан
      >
        <ArrowUp className="w-5 h-5" /> {/* ArrowUp икон ашигласан */}
      </Button>
    </div>
  )
}
