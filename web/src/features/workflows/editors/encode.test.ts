import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '../types/data-panel';
import {
  mailyVariablesToText,
  renderPreview,
  textToMailyVariables,
} from './encode';

// ---------------------------------------------------------------------------
// mailyVariablesToText
// ---------------------------------------------------------------------------
describe('mailyVariablesToText', () => {
  it('converts <span data-id="…"> to {{path}}', () => {
    expect(
      mailyVariablesToText(
        '<span data-id="subscriber.firstName" data-required="false">First Name</span>',
      ),
    ).toBe('{{subscriber.firstName}}');
  });

  it('converts <div data-type="variable" data-id="…"> to {{path}}', () => {
    expect(
      mailyVariablesToText(
        '<div data-type="variable" data-id="subscriber.firstName">First Name</div>',
      ),
    ).toBe('{{subscriber.firstName}}');
  });

  it('preserves surrounding HTML when converting span variable', () => {
    const input =
      '<p>Hello <span data-id="subscriber.firstName" data-required="false">First Name</span> ,</p>';
    expect(mailyVariablesToText(input)).toBe(
      '<p>Hello {{subscriber.firstName}} ,</p>',
    );
  });

  it('preserves surrounding HTML when converting div variable', () => {
    const input =
      '<p>Hello </p><div data-type="variable" data-id="subscriber.firstName">First Name</div><p>,</p>';
    expect(mailyVariablesToText(input)).toBe(
      '<p>Hello </p>{{subscriber.firstName}}<p>,</p>',
    );
  });

  it('handles multiple variables in one string', () => {
    const input = [
      '<span data-id="subscriber.firstName">First</span> ',
      '<span data-id="subscriber.lastName">Last</span>',
    ].join('');
    expect(mailyVariablesToText(input)).toBe(
      '{{subscriber.firstName}} {{subscriber.lastName}}',
    );
  });

  it('handles mixed span and div variables', () => {
    const input = [
      '<span data-id="subscriber.firstName">First</span> ',
      '<div data-type="variable" data-id="subscriber.lastName">Last</div>',
    ].join('');
    expect(mailyVariablesToText(input)).toBe(
      '{{subscriber.firstName}} {{subscriber.lastName}}',
    );
  });

  it('returns string unchanged when no variable elements exist', () => {
    expect(mailyVariablesToText('<p>Hello world</p>')).toBe(
      '<p>Hello world</p>',
    );
  });

  it('returns empty string for empty input', () => {
    expect(mailyVariablesToText('')).toBe('');
  });

  it('ignores <div> without data-id attribute', () => {
    expect(mailyVariablesToText('<div class="foo">bar</div>')).toBe(
      '<div class="foo">bar</div>',
    );
  });
});

// ---------------------------------------------------------------------------
// textToMailyVariables
// ---------------------------------------------------------------------------
describe('textToMailyVariables', () => {
  const defs: VariableDefinition[] = [
    {
      path: 'subscriber.firstName',
      label: 'First Name',
      type: 'string',
      description: 'Subscriber first name',
    },
    {
      path: 'subscriber.lastName',
      label: 'Last Name',
      type: 'string',
      description: 'Subscriber last name',
    },
  ];

  it('converts {{path}} to a span with data-type and data-id', () => {
    expect(textToMailyVariables('Hello {{subscriber.firstName}}', defs)).toBe(
      'Hello <span data-type="variable" data-id="subscriber.firstName">First Name</span>',
    );
  });

  it('uses the path itself as label when definition is missing', () => {
    expect(textToMailyVariables('{{unknown.var}}', defs)).toBe(
      '<span data-type="variable" data-id="unknown.var">unknown.var</span>',
    );
  });

  it('handles multiple variables', () => {
    expect(
      textToMailyVariables(
        '{{subscriber.firstName}} {{subscriber.lastName}}',
        defs,
      ),
    ).toBe(
      [
        '<span data-type="variable" data-id="subscriber.firstName">First Name</span>',
        ' ',
        '<span data-type="variable" data-id="subscriber.lastName">Last Name</span>',
      ].join(''),
    );
  });

  it('returns string unchanged when no {{}} patterns exist', () => {
    expect(textToMailyVariables('Hello world', defs)).toBe('Hello world');
  });

  it('returns empty string for empty input', () => {
    expect(textToMailyVariables('', defs)).toBe('');
  });

  it('works with empty variable definitions', () => {
    expect(textToMailyVariables('Hi {{subscriber.firstName}}', [])).toBe(
      'Hi <span data-type="variable" data-id="subscriber.firstName">subscriber.firstName</span>',
    );
  });
});

// ---------------------------------------------------------------------------
// renderPreview
// ---------------------------------------------------------------------------
describe('renderPreview', () => {
  const ctx: Record<string, unknown> = {
    'subscriber.firstName': 'Yusuf',
    'subscriber.lastName': 'Smith',
    'workflow.orderId': 'ORD-12345',
  };

  it('substitutes {{path}} with the context value', () => {
    expect(renderPreview('Hello {{subscriber.firstName}}', ctx)).toBe(
      'Hello Yusuf',
    );
  });

  it('replaces multiple variables', () => {
    expect(
      renderPreview('{{subscriber.firstName}} {{subscriber.lastName}}', ctx),
    ).toBe('Yusuf Smith');
  });

  it('wraps missing keys in <strong>', () => {
    expect(renderPreview('{{missing.key}}', ctx)).toBe(
      '<strong>{{missing.key}}</strong>',
    );
  });

  it('wraps null/undefined values in <strong>', () => {
    const partialCtx: Record<string, unknown> = {
      'subscriber.firstName': undefined,
    };
    expect(renderPreview('{{subscriber.firstName}}', partialCtx)).toBe(
      '<strong>{{subscriber.firstName}}</strong>',
    );
  });

  it('wraps object values in <strong>', () => {
    const objCtx: Record<string, unknown> = {
      'subscriber.meta': { plan: 'pro' },
    };
    expect(renderPreview('{{subscriber.meta}}', objCtx)).toBe(
      '<strong>{{subscriber.meta}}</strong>',
    );
  });

  it('preserves HTML structure around substitutions', () => {
    expect(renderPreview('<p>Hello {{subscriber.firstName}} ,</p>', ctx)).toBe(
      '<p>Hello Yusuf ,</p>',
    );
  });

  it('preserves surrounding HTML with block-level div variables', () => {
    // This simulates Maily's actual renderHTML output after our fix
    // where mailyVariablesToText already converted the div to {{path}}
    expect(
      renderPreview('<p>Hello </p>{{subscriber.firstName}}<p>,</p>', ctx),
    ).toBe('<p>Hello </p>Yusuf<p>,</p>');
  });

  it('returns string unchanged when no {{}} patterns exist', () => {
    expect(renderPreview('Hello world', ctx)).toBe('Hello world');
  });

  it('returns empty string for empty input', () => {
    expect(renderPreview('', ctx)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Round-trip: textToMailyVariables → mailyVariablesToText
// ---------------------------------------------------------------------------
describe('round-trip (textToMailyVariables → mailyVariablesToText)', () => {
  const defs: VariableDefinition[] = [
    {
      path: 'subscriber.firstName',
      label: 'First Name',
      type: 'string',
      description: '',
    },
  ];

  it('produces the original {{path}} after a full cycle', () => {
    const input = 'Hello {{subscriber.firstName}}';
    const asHtml = textToMailyVariables(input, defs);
    const back = mailyVariablesToText(asHtml);
    expect(back).toBe(input);
  });
});
