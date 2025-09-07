'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react'; // Хэрэв Ant Design icon хүсвэл: import { UpOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export default function ScrollToTopButton(): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    let ticking = false;
    
    const toggleVisibility = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <Button
        type="primary"
        shape="circle"
        size="large"
        onClick={scrollToTop}
        style={{
          boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Scroll to top"
      >
        <ArrowUp size={20} />
        {/* AntD icon хувилбар бол: <UpOutlined /> */}
      </Button>
    </div>
  );
}