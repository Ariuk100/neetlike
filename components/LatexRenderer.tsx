'use client'

import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface LatexRendererProps {
  text: string
}

export default function LatexRenderer({ text }: LatexRendererProps) {
  if (!text) return null;

  // Split by $$...$$, \[...\], or \(...\)
  const tokens = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g);

  return (
    <span>
      {tokens.map((token, index) => {
        if (!token) return null;

        if (token.startsWith('$$') && token.endsWith('$$')) {
          const content = token.slice(2, -2);
          return <BlockMath key={index}>{content}</BlockMath>;
        }
        if (token.startsWith('\\[') && token.endsWith('\\]')) {
          const content = token.slice(2, -2);
          return <BlockMath key={index}>{content}</BlockMath>;
        }
        if (token.startsWith('\\(') && token.endsWith('\\)')) {
          const content = token.slice(2, -2);
          return <InlineMath key={index}>{content}</InlineMath>;
        }
        return <span key={index}>{token}</span>;
      })}
    </span>
  )
}