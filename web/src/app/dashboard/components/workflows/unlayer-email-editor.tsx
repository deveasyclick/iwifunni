"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import EmailEditor, { type EditorRef } from "react-email-editor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// ─── Body encoding/decoding ────────────────────────────────────────────────

const DESIGN_PREFIX = "<!-- unlayer-design:";
const DESIGN_SUFFIX = " -->";

export const encodeEmailBody = (design: object, html: string): string => {
  const encoded = Buffer.from(JSON.stringify(design)).toString("base64");
  return `${DESIGN_PREFIX}${encoded}${DESIGN_SUFFIX}\n${html}`;
};

export const decodeEmailBody = (
  body: string,
): { design: object; html: string } | null => {
  if (!body.startsWith(DESIGN_PREFIX)) return null;
  const endIdx = body.indexOf(DESIGN_SUFFIX);
  if (endIdx === -1) return null;

  const b64 = body.slice(DESIGN_PREFIX.length, endIdx);
  const html = body.slice(endIdx + DESIGN_SUFFIX.length).replace(/^\n/, "");

  try {
    const design = JSON.parse(
      Buffer.from(b64, "base64").toString("utf-8"),
    ) as object;
    return { design, html };
  } catch {
    return null;
  }
};

// ─── Block factories ───────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const makeRow = (contents: object[]) => ({
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
    _meta: { htmlID: `u_row_${uid()}`, htmlClassNames: "u_row" },
  },
});

const makeTextContent = (text: string) => ({
  id: `content_${uid()}`,
  type: "text",
  values: {
    containerPadding: "10px",
    text: `<p>${text}</p>`,
    _meta: {
      htmlID: `u_content_text_${uid()}`,
      htmlClassNames: "u_content_text",
    },
  },
});

const makeHeadingContent = (text: string, tag: "h1" | "h2" | "h3" = "h2") => ({
  id: `content_${uid()}`,
  type: "heading",
  values: {
    containerPadding: "10px",
    text,
    tag,
    fontSize: tag === "h1" ? "28px" : tag === "h2" ? "22px" : "18px",
    _meta: {
      htmlID: `u_content_heading_${uid()}`,
      htmlClassNames: "u_content_heading",
    },
  },
});

const makeImageContent = () => ({
  id: `content_${uid()}`,
  type: "image",
  values: {
    containerPadding: "10px",
    src: { url: "https://placehold.co/600x200/e2e8f0/64748b?text=Your+Image" },
    textAlign: "center",
    altText: "Image",
    fullWidth: false,
    _meta: {
      htmlID: `u_content_image_${uid()}`,
      htmlClassNames: "u_content_image",
    },
  },
});

const makeButtonContent = (label: string) => ({
  id: `content_${uid()}`,
  type: "button",
  values: {
    containerPadding: "10px",
    text: label,
    href: { name: "web", values: { href: "#", target: "_blank" } },
    textAlign: "center",
    backgroundColor: "#3b82f6",
    buttonColors: { color: "#FFFFFF", backgroundColor: "#3b82f6" },
    _meta: {
      htmlID: `u_content_button_${uid()}`,
      htmlClassNames: "u_content_button",
    },
  },
});

const makeDividerContent = () => ({
  id: `content_${uid()}`,
  type: "divider",
  values: {
    containerPadding: "10px",
    width: "100%",
    border: {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "#e2e8f0",
    },
    _meta: {
      htmlID: `u_content_divider_${uid()}`,
      htmlClassNames: "u_content_divider",
    },
  },
});

// ─── Premade block definitions ─────────────────────────────────────────────

type BlockDef = {
  label: string;
  group: string;
  build: () => ReturnType<typeof makeRow>;
};

const BLOCK_DEFINITIONS: BlockDef[] = [
  {
    label: "Heading 1",
    group: "Typography",
    build: () => makeRow([makeHeadingContent("Section Heading", "h1")]),
  },
  {
    label: "Heading 2",
    group: "Typography",
    build: () => makeRow([makeHeadingContent("Section Heading", "h2")]),
  },
  {
    label: "Heading 3",
    group: "Typography",
    build: () => makeRow([makeHeadingContent("Subsection", "h3")]),
  },
  {
    label: "Paragraph",
    group: "Typography",
    build: () => makeRow([makeTextContent("Write your message here.")]),
  },
  {
    label: "Blockquote",
    group: "Typography",
    build: () =>
      makeRow([
        {
          id: `content_${uid()}`,
          type: "text",
          values: {
            containerPadding: "0px 0px 0px 16px",
            text: '<p style="border-left:4px solid #e2e8f0;padding-left:12px;color:#64748b;font-style:italic;">Your quote text here.</p>',
            _meta: {
              htmlID: `u_content_text_${uid()}`,
              htmlClassNames: "u_content_text",
            },
          },
        },
      ]),
  },
  {
    label: "Image",
    group: "Media",
    build: () => makeRow([makeImageContent()]),
  },
  {
    label: "Button",
    group: "Elements",
    build: () => makeRow([makeButtonContent("Click Here")]),
  },
  {
    label: "Divider",
    group: "Elements",
    build: () => makeRow([makeDividerContent()]),
  },
  {
    label: "Header section",
    group: "Sections",
    build: () =>
      makeRow([
        makeHeadingContent("Welcome!", "h1"),
        makeTextContent(
          "Thank you for joining us. Here&apos;s what&apos;s new.",
        ),
      ]),
  },
  {
    label: "Card section",
    group: "Sections",
    build: () =>
      makeRow([
        makeHeadingContent("Feature Title", "h3"),
        makeTextContent("Describe the feature or update briefly."),
        makeButtonContent("Learn More"),
      ]),
  },
  {
    label: "CTA section",
    group: "Sections",
    build: () =>
      makeRow([
        makeHeadingContent("Ready to get started?", "h2"),
        makeTextContent("Join thousands of users today."),
        makeButtonContent("Get Started"),
      ]),
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

export type UnlayerEmailEditorHandle = {
  getEncodedBody: () => Promise<string>;
};

type Props = {
  initialValue?: string;
  onHtmlChange?: (html: string) => void;
  onEncodedBodyChange?: (encodedBody: string) => void;
};

// ─── Component ─────────────────────────────────────────────────────────────

const UnlayerEmailEditor = forwardRef<UnlayerEmailEditorHandle, Props>(
  ({ initialValue, onHtmlChange, onEncodedBodyChange }, ref) => {
    const { resolvedTheme } = useTheme();
    const editorRef = useRef<EditorRef>(null);
    const onHtmlChangeRef = useRef(onHtmlChange);
    const onEncodedBodyChangeRef = useRef(onEncodedBodyChange);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      onHtmlChangeRef.current = onHtmlChange;
    }, [onHtmlChange]);

    useEffect(() => {
      onEncodedBodyChangeRef.current = onEncodedBodyChange;
    }, [onEncodedBodyChange]);

    useImperativeHandle(ref, () => ({
      getEncodedBody: () =>
        new Promise((resolve, reject) => {
          const editor = editorRef.current?.editor;
          if (!editor) {
            reject(new Error("Editor not ready"));
            return;
          }
          editor.exportHtml(({ design, html }) => {
            resolve(encodeEmailBody(design as object, html));
          });
        }),
    }));

    const handleReady = useCallback(() => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      if (initialValue) {
        const decoded = decodeEmailBody(initialValue);
        if (decoded) {
          editor.loadDesign(
            decoded.design as Parameters<typeof editor.loadDesign>[0],
          );
        }
      } else {
        editor.loadDesign({
          body: {
            rows: [makeRow([makeTextContent("Start typing your message here.")])],
          },
        } as Parameters<typeof editor.loadDesign>[0]);
      }

      editor.addEventListener("design:updated", () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          editor.exportHtml(({ design, html }) => {
            onHtmlChangeRef.current?.(html);
            onEncodedBodyChangeRef.current?.(encodeEmailBody(design as object, html));
          });
        }, 800);
      });
    }, [initialValue]);

    const insertBlock = useCallback((def: BlockDef) => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      editor.saveDesign((design) => {
        const d = design as { body?: { rows?: object[] } };
        const rows: object[] = d.body?.rows ?? [];
        const newRow = def.build();
        const updated = {
          ...d,
          body: { ...(d.body ?? {}), rows: [...rows, newRow] },
        };
        editor.loadDesign(updated as Parameters<typeof editor.loadDesign>[0]);
      });
    }, []);

    const projectId = process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID
      ? Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID)
      : undefined;

    const groups = [...new Set(BLOCK_DEFINITIONS.map((b) => b.group))];

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add block
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {groups.map((group, gi) => (
                <div key={group}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs">
                    {group}
                  </DropdownMenuLabel>
                  {BLOCK_DEFINITIONS.filter((b) => b.group === group).map(
                    (def) => (
                      <DropdownMenuItem
                        key={def.label}
                        onSelect={() => insertBlock(def)}
                      >
                        {def.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/50">
          <EmailEditor
            ref={editorRef}
            onReady={handleReady}
            projectId={projectId}
            minHeight={560}
            options={{
              displayMode: "email",
              features: { stockImages: false },
              appearance: {
                theme: resolvedTheme === "dark" ? "dark" : "light",
              },
              mergeTags: {
                subscriber: {
                  name: "Subscriber",
                  mergeTags: {
                    firstName: { name: "First Name", value: "{{subscriber.firstName}}" },
                    lastName: { name: "Last Name", value: "{{subscriber.lastName}}" },
                    email: { name: "Email", value: "{{subscriber.email}}" },
                    id: { name: "Subscriber ID", value: "{{subscriber.id}}" },
                  },
                },
                workflow: {
                  name: "Workflow",
                  mergeTags: {
                    name: { name: "Workflow Name", value: "{{workflow.name}}" },
                    eventData: { name: "Event Data", value: "{{workflow.eventData}}" },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  },
);

UnlayerEmailEditor.displayName = "UnlayerEmailEditor";

export default UnlayerEmailEditor;
