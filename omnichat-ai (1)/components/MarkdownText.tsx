import React from 'react';

interface MarkdownTextProps {
  content: string;
}

// A lightweight manual markdown parser for code blocks and paragraphs
// to avoid heavy external dependencies for this specific output format.
const MarkdownText: React.FC<MarkdownTextProps> = ({ content }) => {
  // Split by code blocks (```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="leading-relaxed break-words text-sm md:text-base">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language if available (e.g. ```typescript ...)
          const lines = part.split('\n');
          const firstLine = lines[0].replace('```', '').trim();
          const codeContent = lines.slice(1, -1).join('\n'); // remove first and last line

          return (
            <div key={index} className="my-4 rounded-md overflow-hidden bg-[#1e1e1e] border border-gray-700 font-mono text-xs md:text-sm shadow-md">
              {firstLine && (
                <div className="px-4 py-2 bg-gray-800 text-gray-400 text-xs border-b border-gray-700 select-none">
                  {firstLine}
                </div>
              )}
              <div className="overflow-x-auto p-4 text-gray-300">
                <pre style={{ margin: 0 }}>
                  <code>{codeContent}</code>
                </pre>
              </div>
            </div>
          );
        } else {
          // Regular text processing: handle line breaks
          // We split by double newlines for paragraphs
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        }
      })}
    </div>
  );
};

export default MarkdownText;
