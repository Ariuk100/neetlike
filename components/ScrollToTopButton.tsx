// /components/ScrollToTopButton.tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Функцийн буцаах утгын төрлийг (JSX.Element | null) УСТГАСАН!
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const toggleVisibility = () => {
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 300);
      });
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) {
    return null;
  }

  return (
    <Button
      variant="default"
      size="icon"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
    >
      <ArrowUp className="h-6 w-6" />
    </Button>
  );
}