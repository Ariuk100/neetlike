'use client'

import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

interface LatexRendererProps {
  text: string
}

// \(...\) доторх хэсгийг LaTeX болгож харуулна
export default function LatexRenderer({ text }: LatexRendererProps) {
  const parts = text.split(/\\\((.*?)\\\)/g)

  return (
    <span>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <InlineMath key={index}>{part}</InlineMath>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}