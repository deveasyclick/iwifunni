const uid = () => Math.random().toString(36).slice(2, 10);

export const makeRow = (contents: object[]) => ({
  id: `row_${uid()}`,
  cells: [1],
  columns: [
    {
      id: `col_${uid()}`,
      contents,
      values: {},
    },
  ],
  values: {
    selectable: true,
    draggable: true,
    duplicatable: true,
    deletable: true,
    hideable: true,
    _meta: { htmlID: `u_row_${uid()}`, htmlClassNames: 'u_row' },
  },
});

export const makeTextContent = (text: string) => ({
  id: `content_${uid()}`,
  type: 'text',
  values: {
    containerPadding: '10px',
    text: `<p>${text}</p>`,
    _meta: {
      htmlID: `u_content_text_${uid()}`,
      htmlClassNames: 'u_content_text',
    },
  },
});

export const makeHeadingContent = (
  text: string,
  tag: 'h1' | 'h2' | 'h3' = 'h2',
) => ({
  id: `content_${uid()}`,
  type: 'heading',
  values: {
    containerPadding: '10px',
    text,
    tag,
    fontSize: tag === 'h1' ? '28px' : tag === 'h2' ? '22px' : '18px',
    _meta: {
      htmlID: `u_content_heading_${uid()}`,
      htmlClassNames: 'u_content_heading',
    },
  },
});

export const makeImageContent = () => ({
  id: `content_${uid()}`,
  type: 'image',
  values: {
    containerPadding: '10px',
    src: { url: 'https://placehold.co/600x200/e2e8f0/64748b?text=Your+Image' },
    textAlign: 'center',
    altText: 'Image',
    fullWidth: false,
    _meta: {
      htmlID: `u_content_image_${uid()}`,
      htmlClassNames: 'u_content_image',
    },
  },
});

export const makeButtonContent = (label: string) => ({
  id: `content_${uid()}`,
  type: 'button',
  values: {
    containerPadding: '10px',
    text: label,
    href: { name: 'web', values: { href: '#', target: '_blank' } },
    textAlign: 'center',
    backgroundColor: '#3b82f6',
    buttonColors: { color: '#FFFFFF', backgroundColor: '#3b82f6' },
    _meta: {
      htmlID: `u_content_button_${uid()}`,
      htmlClassNames: 'u_content_button',
    },
  },
});

export const makeDividerContent = () => ({
  id: `content_${uid()}`,
  type: 'divider',
  values: {
    containerPadding: '10px',
    width: '100%',
    border: {
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: '#e2e8f0',
    },
    _meta: {
      htmlID: `u_content_divider_${uid()}`,
      htmlClassNames: 'u_content_divider',
    },
  },
});
