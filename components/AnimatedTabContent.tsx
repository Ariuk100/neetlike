// components/AnimatedTabContent.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import * as React from 'react';

type Props = {
  value: string;          // энэ tab-ийн key
  current: string;        // идэвхтэй tab-ийн key (parent-аас ирнэ)
  children: React.ReactNode;
};

export function AnimatedTabContent({ value, current, children }: Props) {
  const isActive = value === current;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}