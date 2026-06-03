import {
  makeRow,
  makeTextContent,
  makeHeadingContent,
  makeImageContent,
  makeButtonContent,
  makeDividerContent,
} from './factories';

type BlockDef = {
  label: string;
  group: string;
  build: () => ReturnType<typeof makeRow>;
};

export type { BlockDef };

export const BLOCK_DEFINITIONS: BlockDef[] = [
  {
    label: 'Heading 1',
    group: 'Typography',
    build: () => makeRow([makeHeadingContent('Section Heading', 'h1')]),
  },
  {
    label: 'Heading 2',
    group: 'Typography',
    build: () => makeRow([makeHeadingContent('Section Heading', 'h2')]),
  },
  {
    label: 'Heading 3',
    group: 'Typography',
    build: () => makeRow([makeHeadingContent('Subsection', 'h3')]),
  },
  {
    label: 'Paragraph',
    group: 'Typography',
    build: () => makeRow([makeTextContent('Write your message here.')]),
  },
  {
    label: 'Blockquote',
    group: 'Typography',
    build: () =>
      makeRow([
        {
          id: `content_${Math.random().toString(36).slice(2, 10)}`,
          type: 'text',
          values: {
            containerPadding: '0px 0px 0px 16px',
            text: '<p style="border-left:4px solid #e2e8f0;padding-left:12px;color:#64748b;font-style:italic;">Your quote text here.</p>',
            _meta: {
              htmlID: `u_content_text_${Math.random().toString(36).slice(2, 10)}`,
              htmlClassNames: 'u_content_text',
            },
          },
        },
      ]),
  },
  {
    label: 'Image',
    group: 'Media',
    build: () => makeRow([makeImageContent()]),
  },
  {
    label: 'Button',
    group: 'Elements',
    build: () => makeRow([makeButtonContent('Click Here')]),
  },
  {
    label: 'Divider',
    group: 'Elements',
    build: () => makeRow([makeDividerContent()]),
  },
  {
    label: 'Header section',
    group: 'Sections',
    build: () =>
      makeRow([
        makeHeadingContent('Welcome!', 'h1'),
        makeTextContent(
          'Thank you for joining us. Here&apos;s what&apos;s new.',
        ),
      ]),
  },
  {
    label: 'Card section',
    group: 'Sections',
    build: () =>
      makeRow([
        makeHeadingContent('Feature Title', 'h3'),
        makeTextContent('Describe the feature or update briefly.'),
        makeButtonContent('Learn More'),
      ]),
  },
  {
    label: 'CTA section',
    group: 'Sections',
    build: () =>
      makeRow([
        makeHeadingContent('Ready to get started?', 'h2'),
        makeTextContent('Join thousands of users today.'),
        makeButtonContent('Get Started'),
      ]),
  },
];
