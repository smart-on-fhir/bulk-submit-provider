import { useEffect, useState } from 'react';
import ReactMarkdown           from 'react-markdown';
import remarkGfm               from 'remark-gfm';
import rehypeRaw               from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownEmbed = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch('/api/hack-md')
      .then((res) => res.text())
      .then((text) => {
        // Remove leading YAML frontmatter (--- ... ---) if present, then
        // remove a literal leading 'section' token on its own line if present.
        // Do it in two steps to be robust to various spacing/CRLF combinations.
        let cleaned = text.replace(/^\s*---[\s\S]*?---\s*/i, '');
        cleaned = cleaned.replace(/^\s*section\s*/i, '');

        // Convert HackMD/Markdown admonition blocks like:
        // :::info
        // Some content
        // :::
        // into a Markdown blockquote with a bold label so they render nicely
        // without extra remark plugins. This handles multiple blocks.
        cleaned = cleaned.replace(/::: *([a-zA-Z0-9_-]+)\n([\s\S]*?)\n:::/g, (_m, type, content) => {
          // Trim leading/trailing blank lines from content
          const trimmed = content.replace(/^\s+|\s+$/g, '');
          // Prefix each line with '> ' to make a blockquote, and add a bold label line
          const quoted = trimmed.split('\n').map((line: string) => `> ${line}`).join('\n');
          return `> **${type.toUpperCase()}**\n>\n${quoted}`;
        });

        setMarkdown(cleaned.trimStart());
      })
      .catch((err) => console.error('Failed to fetch markdown:', err));
  }, []);

  return (
    <div className={ "markdown-container" + (markdown ? '' : ' text-center flex-grow-1 d-flex flex-column justify-content-center align-self-center') }>
      <ReactMarkdown
        // Allow GitHub-flavored markdown (tables, task-lists, strikethrough)
        remarkPlugins={[remarkGfm]}
        // Allow raw HTML in the markdown to be parsed and rendered
        rehypePlugins={[rehypeRaw]}
        components={{
          // Render Markdown tables with Bootstrap table styling
          table: ({ node, ...props }) => <table className="table table-bordered table-sm small table-striped" {...props} />,

          // Ensure all links open in a new tab and use rel="noopener noreferrer"
          a: ({ node, ...props }: any) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),

          // Use `any` here to avoid strict typing issues from react-markdown's
          // component prop shapes in this project setup.
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  customStyle={{ padding: 0 }}
                  PreTag="div"
                  {...rest}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            return <code className={className} {...rest}>{children}</code>;
          }
        }}

      >
        { markdown || 'Loading...' }
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownEmbed;
