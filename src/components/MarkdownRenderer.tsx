'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
      title="コピー"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks with syntax highlighting
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const isInline = !match && !String(children).includes('\n');
          const codeString = String(children).replace(/\n$/, '');

          if (isInline) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <div className="relative group my-4 rounded-lg overflow-hidden">
              {/* Language badge */}
              {language && (
                <div className="absolute top-0 left-0 px-3 py-1 bg-slate-800 text-slate-400 text-xs font-mono uppercase rounded-br">
                  {language}
                </div>
              )}
              <CopyButton text={codeString} />
              <SyntaxHighlighter
                style={oneDark as { [key: string]: React.CSSProperties }}
                language={language || 'text'}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '2.5rem 1rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        },

        // Styled tables
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return (
            <thead className="bg-slate-100 dark:bg-slate-700">
              {children}
            </thead>
          );
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-2 border border-slate-300 dark:border-slate-600">
              {children}
            </td>
          );
        },

        // Styled blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-purple-50 dark:bg-purple-900/20 rounded-r-lg">
              {children}
            </blockquote>
          );
        },

        // Styled links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline"
            >
              {children}
            </a>
          );
        },

        // Styled lists
        ul({ children }) {
          return (
            <ul className="list-disc list-inside my-2 space-y-1">
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol className="list-decimal list-inside my-2 space-y-1">
              {children}
            </ol>
          );
        },

        // Styled headings
        h1({ children }) {
          return (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-slate-900 dark:text-white">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-xl font-bold mt-5 mb-3 text-slate-900 dark:text-white">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-900 dark:text-white">
              {children}
            </h3>
          );
        },

        // Paragraphs
        p({ children }) {
          return (
            <p className="my-2 leading-relaxed">
              {children}
            </p>
          );
        },

        // Horizontal rule
        hr() {
          return <hr className="my-6 border-slate-300 dark:border-slate-600" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
