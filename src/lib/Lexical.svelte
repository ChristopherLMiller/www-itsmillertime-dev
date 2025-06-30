<script>
  // Component props
  let { data } = $props();

  // Text format constants
  const TEXT_TYPE_TO_FORMAT = {
    bold: 1,
    italic: 2,
    strikethrough: 4,
    underline: 8,
    code: 16,
    subscript: 32,
    superscript: 64,
    highlight: 128
  };

  // Check if text has specific formatting
  function hasFormat(format, type) {
    return (format & TEXT_TYPE_TO_FORMAT[type]) !== 0;
  }

  // Render individual text node with formatting
  function renderTextNode(node) {
    let text = node.text || '';
    let element = text;
    
    if (!node.format) return element;

    // Apply formatting based on format bitmask
    if (hasFormat(node.format, 'bold')) {
      element = `<strong>${element}</strong>`;
    }
    if (hasFormat(node.format, 'italic')) {
      element = `<em>${element}</em>`;
    }
    if (hasFormat(node.format, 'strikethrough')) {
      element = `<s>${element}</s>`;
    }
    if (hasFormat(node.format, 'underline')) {
      element = `<u>${element}</u>`;
    }
    if (hasFormat(node.format, 'code')) {
      element = `<code>${element}</code>`;
    }
    if (hasFormat(node.format, 'subscript')) {
      element = `<sub>${element}</sub>`;
    }
    if (hasFormat(node.format, 'superscript')) {
      element = `<sup>${element}</sup>`;
    }
    if (hasFormat(node.format, 'highlight')) {
      element = `<mark>${element}</mark>`;
    }

    return element;
  }

  // Render link node
  function renderLinkNode(node) {
    const href = node.url || '';
    const target = node.target || '_blank';
    const rel = node.rel || 'noopener noreferrer';
    
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    
    return `<a href="${href}" target="${target}" rel="${rel}">${innerHTML}</a>`;
  }

  // Render list node
  function renderListNode(node) {
    const tag = node.listType === 'number' ? 'ol' : 'ul';
    let innerHTML = '';
    
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    
    return `<${tag} class="${node.listType}-list">${innerHTML}</${tag}>`;
  }

  // Render list item node
  function renderListItemNode(node) {
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    
    // Handle checkbox list items
    if (node.hasOwnProperty('checked')) {
      const checked = node.checked ? 'checked' : '';
      const checkboxId = `checkbox-${Math.random().toString(36).substr(2, 9)}`;
      return `<li class="checklist-item">
        <input type="checkbox" id="${checkboxId}" ${checked} disabled />
        <label for="${checkboxId}">${innerHTML}</label>
      </li>`;
    }
    
    return `<li>${innerHTML}</li>`;
  }

  // Render heading node
  function renderHeadingNode(node) {
    const tag = node.tag || 'h1';
    let innerHTML = '';
    
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    
    return `<${tag}>${innerHTML}</${tag}>`;
  }

  function parseMarkdownImages(text) {
    const imagePattern = /!\[([^\]]*)\]\(([^']+)\s+'([^']+)'\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imagePattern.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add the image
      parts.push({
        type: 'image',
        src: match[2].trim(),
        alt: match[1].trim(),
        caption: match[3].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim();
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    return parts;
  }

  // Render paragraph node
  function renderParagraphNode(node) {
    let innerHTML = '';
    
    if (node.children) {
      // Check if any child contains markdown images
      const processedChildren = [];
      
      node.children.forEach(child => {
        if (child.type === 'text' && child.text) {
          const parts = parseMarkdownImages(child.text);
          
          if (parts.length > 1 || (parts.length === 1 && parts[0].type === 'image')) {
            // Found markdown images, process them
            parts.forEach(part => {
              if (part.type === 'image') {
                processedChildren.push({
                  type: 'image',
                  src: part.src,
                  alt: part.alt,
                  caption: part.caption
                });
              } else {
                processedChildren.push({
                  type: 'text',
                  text: part.content,
                  format: child.format || 0
                });
              }
            });
          } else {
            // No markdown images, keep original
            processedChildren.push(child);
          }
        } else {
          processedChildren.push(child);
        }
      });
      
      innerHTML = processedChildren.map(child => renderNode(child)).join('');
    }
    
    return `<p style="${node.format ? 'text-align: ' + node.format + ';' : ''}">${innerHTML}</p>`;
  }

  // Render quote node
  function renderQuoteNode(node) {
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    return `<blockquote>${innerHTML}</blockquote>`;
  }

  // Render code block node
  function renderCodeNode(node) {
    const language = node.language || '';
    const code = node.children ? 
      node.children.map(child => child.text || '').join('') : 
      (node.text || '');
    
    return `<pre><code class="language-${language}">${code}</code></pre>`;
  }

  // Render image node
  function renderImageNode(node) {
    const src = node.src || '';
    const alt = node.altText || node.alt || '';
    const width = node.width ? `width="${node.width}"` : '';
    const height = node.height ? `height="${node.height}"` : '';
    const caption = node.caption || '';
    
    let imageHtml = `<img src="${src}" alt="${alt}" ${width} ${height} />`;
    
    if (caption) {
      imageHtml = `<figure>${imageHtml}<figcaption>${caption}</figcaption></figure>`;
    }
    
    return imageHtml;
  }

  // Render upload node
  function renderUploadNode(node) {
    const src = node.value.url || '';
    const alt = node?.value?.alt;
    const width = node?.value?.width ? `width="${node?.value?.width}"` : '';
    const caption = node.value.alt || '';

    let imageHtml = `<img src="${src}" alt="${alt}" ${width} />`;

    if (caption) {
      imageHtml = `<figure>${imageHtml}<figcaption>${caption}</figcaption></figure>`;
    }

    return imageHtml
  }

  // Render table node
  function renderTableNode(node) {
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    return `<table>${innerHTML}</table>`;
  }

  // Render table row node
  function renderTableRowNode(node) {
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    return `<tr>${innerHTML}</tr>`;
  }

  // Render table cell node
  function renderTableCellNode(node) {
    const tag = node.headerState ? 'th' : 'td';
    const colspan = node.colspan > 1 ? `colspan="${node.colspan}"` : '';
    const rowspan = node.rowspan > 1 ? `rowspan="${node.rowspan}"` : '';
    
    let innerHTML = '';
    if (node.children) {
      innerHTML = node.children.map(child => renderNode(child)).join('');
    }
    
    return `<${tag} ${colspan} ${rowspan}>${innerHTML}</${tag}>`;
  }

  // Render horizontal rule
  function renderHorizontalRuleNode() {
    return '<hr />';
  }

  // Render line break
  function renderLineBreakNode() {
    return '<br />';
  }

  // Main render function for any node type
  function renderNode(node) {
    if (!node || !node.type) return '';

    switch (node.type) {
      case 'text':
        return renderTextNode(node);
      case 'link':
      case 'autolink':
        return renderLinkNode(node);
      case 'paragraph':
        return renderParagraphNode(node);
      case 'heading':
        return renderHeadingNode(node);
      case 'quote':
        return renderQuoteNode(node);
      case 'code':
        return renderCodeNode(node);
      case 'image':
        return renderImageNode(node);
      case 'upload':
        return renderUploadNode(node);
      case 'list':
        return renderListNode(node);
      case 'listitem':
        return renderListItemNode(node);
      case 'table':
        return renderTableNode(node);
      case 'tablerow':
        return renderTableRowNode(node);
      case 'tablecell':
        return renderTableCellNode(node);
      case 'horizontalrule':
        return renderHorizontalRuleNode();
      case 'linebreak':
        return renderLineBreakNode();
      default:
        // Handle unknown node types by rendering children if they exist
        if (node.children) {
          return node.children.map(child => renderNode(child)).join('');
        }
        return '';
    }
  }

  // Render the entire editor state
  function renderEditorState(state) {
    if (!state || !state.root || !state.root.children) {
      return '';
    }
    
    return state.root.children.map(child => renderNode(child)).join('');
  }

  // Computed HTML content
  let htmlContent = $derived(renderEditorState(data

  ));
</script>

<div>
  {@html htmlContent}
</div>

<style lang="postcss">
  div :global(ul.check-list) {
    list-style: none;
    padding-left:0;
    margin-left:0;
  }

  :global(p) {
    line-height: 1.6;
    margin-block-end: 1rem;
  }
</style>