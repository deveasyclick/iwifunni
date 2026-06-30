'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Terminal, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IntegratePanelContentProps {
  readonly workflowId: string;
  readonly workflowName: string;
}

function buildCurlSnippet(baseUrl: string, workflowId: string) {
  return `curl -X POST ${baseUrl}/api/notifications/trigger \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "workflow_id": "${workflowId}",
  "subscriber_id": "sub_abc123",
  "recipient": {
    "email": "user@example.com"
  },
  "channels": ["email"],
  "metadata": {
    "first_name": "Jane",
    "plan": "premium"
  }
}'`;
}

function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute right-2 top-2 h-7 gap-1 text-xs"
      onClick={() => void handleCopy()}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </Button>
  );
}

export function IntegratePanelContent({
  workflowId,
  workflowName,
}: IntegratePanelContentProps) {
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const curlSnippet = buildCurlSnippet(baseUrl, workflowId);

  const [copied, setCopied] = useState(false);

  const copyWorkflowId = async () => {
    try {
      await navigator.clipboard.writeText(workflowId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-5">
      {/* Workflow info with copyable ID */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workflow
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {workflowName}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Workflow ID</span>
          <button
            type="button"
            onClick={() => void copyWorkflowId()}
            className="group inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            title="Copy workflow ID"
          >
            {workflowId}
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>
      </div>

      {/* SDK examples with tabs */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Trigger via API
        </p>

        <Tabs defaultValue="curl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="curl" className="gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              cURL
            </TabsTrigger>
            <TabsTrigger value="nodejs" className="gap-1.5">
              <FileCode className="h-3.5 w-3.5" />
              Node.js
            </TabsTrigger>
            <TabsTrigger value="go" className="gap-1.5">
              <FileCode className="h-3.5 w-3.5" />
              Go
            </TabsTrigger>
            <TabsTrigger value="python" className="gap-1.5">
              <FileCode className="h-3.5 w-3.5" />
              Python
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curl" className="mt-3">
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl border border-border bg-dark p-4 font-mono text-xs leading-relaxed text-white">
                <code>{curlSnippet}</code>
              </pre>
              <CopyButton text={curlSnippet} />
            </div>
          </TabsContent>

          <TabsContent value="nodejs" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Node.js SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with fetch or axios in the meantime.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="go" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Go SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with net/http in the meantime.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="python" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Python SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with requests in the meantime.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Auth note */}
      <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Authentication</p>
        <p className="mt-1">
          Replace{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            YOUR_API_KEY
          </code>{' '}
          with a valid API key. Manage your keys in{' '}
          <a
            href="/dashboard/settings/apikey"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Settings → API Keys
          </a>
          .
        </p>
      </div>
    </div>
  );
}
