import { useEffect, useState, useRef } from 'react';
import ReactMarkdown                   from 'react-markdown';
import remarkGfm                       from 'remark-gfm';
import rehypeRaw                       from 'rehype-raw';
import { Prism as SyntaxHighlighter }  from 'react-syntax-highlighter';
import { oneDark }                     from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid                         from 'mermaid';


// Helper to detect if dark mode is active
const isDarkMode = () => {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
         document.body.classList.contains('dark') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Mermaid theme configurations
const lightThemeVariables = {
  primaryColor: '#4a90d9',
  primaryTextColor: '#fff',
  primaryBorderColor: '#2c5282',
  lineColor: '#718096',
  secondaryColor: '#edf2f7',
  tertiaryColor: '#f7fafc',
  background: '#ffffff',
  mainBkg: '#ffffff',
  // Sequence diagram
  actorBkg: '#4a90d9',
  actorTextColor: '#fff',
  actorBorder: '#2c5282',
  actorLineColor: '#718096',
  signalColor: '#2d3748',
  signalTextColor: '#2d3748',
  noteBkgColor: '#fff9db',
  noteTextColor: '#2d3748',
  noteBorderColor: '#e9c46a',
  // Box backgrounds for participant groups
  labelBoxBkgColor: '#e2e8f0',
  labelTextColor: '#2d3748',
};

const darkThemeVariables = {
  primaryColor: '#4a90d9',
  primaryTextColor: '#fff',
  primaryBorderColor: '#63b3ed',
  lineColor: '#a0aec0',
  secondaryColor: '#2d3748',
  tertiaryColor: '#1a202c',
  background: '#1a202c',
  mainBkg: '#1a202c',
  // Sequence diagram
  actorBkg: '#4a90d9',
  actorTextColor: '#fff',
  actorBorder: '#63b3ed',
  actorLineColor: '#a0aec0',
  signalColor: '#e2e8f0',
  signalTextColor: '#e2e8f0',
  noteBkgColor: '#2d3748',
  noteTextColor: '#e2e8f0',
  noteBorderColor: '#4a5568',
  // Box backgrounds for participant groups
  labelBoxBkgColor: '#2d3748',
  labelTextColor: '#e2e8f0',
};

// Component to render Mermaid diagrams with theme support
const MermaidDiagram = ({ chart }: { chart: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(isDarkMode());

  // Listen for theme changes
  useEffect(() => {
    const checkTheme = () => {
      setDarkMode(isDarkMode());
    };

    // Watch for Bootstrap theme attribute changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-bs-theme', 'class'] 
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Re-render diagram when theme or chart changes
  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;
      try {
        // Re-initialize mermaid with the current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          themeVariables: darkMode ? darkThemeVariables : lightThemeVariables,
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setSvg(`<pre>Error rendering diagram: ${err}</pre>`);
      }
    };
    renderChart();
  }, [chart, darkMode]);

  return (
    <div 
      ref={containerRef} 
      className="mermaid-diagram my-3"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

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
    <div className={ "markdown-container small" + (markdown ? '' : ' text-center flex-grow-1 d-flex flex-column justify-content-center align-self-center') }>
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
            const codeString = String(children).replace(/\n$/, '');

            // Render Mermaid diagrams
            if (!inline && match && match[1] === 'mermaid') {
              // Strip YAML frontmatter from mermaid code (---...---)
              const cleanedChart = codeString.replace(/^---[\s\S]*?---\s*/m, '').trim();
              return <MermaidDiagram chart={cleanedChart} />;
            }

            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  customStyle={{ padding: 0 }}
                  PreTag="div"
                  {...rest}
                >
                  {codeString}
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
