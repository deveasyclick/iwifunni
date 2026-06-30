'use client';

import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface IntegratePanelContentProps {
  readonly workflowId: string;
  readonly workflowName: string;
}

type Language = 'curl' | 'go' | 'nodejs' | 'python';

const languageLabels: Record<Language, string> = {
  curl: 'cURL',
  go: 'Go',
  nodejs: 'Node.js',
  python: 'Python',
};

function buildSnippets(
  baseUrl: string,
  workflowId: string,
  workflowName: string,
): Record<Language, string> {
  const endpoint = `${baseUrl}/api/notifications/trigger`;
  const comment = `# Trigger the "${workflowName}" workflow`;

  return {
    curl: `${comment}
curl -X POST ${endpoint} \\
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
}'`,
    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	payload := map[string]any{
		"workflow_id":   "${workflowId}",
		"subscriber_id": "sub_abc123",
		"recipient": map[string]string{
			"email": "user@example.com",
		},
		"channels": []string{"email"},
		"metadata": map[string]string{
			"first_name": "Jane",
			"plan":       "premium",
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "${endpoint}", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
}`,
    nodejs: `// Trigger the "${workflowName}" workflow
const response = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    workflow_id: "${workflowId}",
    subscriber_id: "sub_abc123",
    recipient: {
      email: "user@example.com",
    },
    channels: ["email"],
    metadata: {
      first_name: "Jane",
      plan: "premium",
    },
  }),
});

const data = await response.json();
console.log(data);`,
    python: `"""Trigger the "${workflowName}" workflow."""
import requests

response = requests.post(
    "${endpoint}",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "workflow_id": "${workflowId}",
        "subscriber_id": "sub_abc123",
        "recipient": {
            "email": "user@example.com",
        },
        "channels": ["email"],
        "metadata": {
            "first_name": "Jane",
            "plan": "premium",
        },
    },
)

print(response.json())`,
  };
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

  const snippets = buildSnippets(baseUrl, workflowId, workflowName);
  const [language, setLanguage] = useState<Language>('curl');

  return (
    <div className="space-y-5">
      {/* Endpoint info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Endpoint
        </p>
        <p className="mt-1.5 font-mono text-sm text-foreground">
          POST {baseUrl}/api/notifications/trigger
        </p>
      </div>

      {/* Workflow info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workflow
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {workflowName}
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {workflowId}
          </Badge>
        </div>
      </div>

      {/* Code snippets */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Example request
        </p>

        <Tabs
          value={language}
          onValueChange={(v) => setLanguage(v as Language)}
        >
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TabsTrigger key={lang} value={lang}>
                {languageLabels[lang]}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(languageLabels) as Language[]).map((lang) => (
            <TabsContent key={lang} value={lang} className="mt-3">
              <div className="relative">
                <pre
                  className={cn(
                    'overflow-x-auto rounded-xl border border-border bg-dark p-4 font-mono text-xs leading-relaxed text-white',
                  )}
                >
                  <code>{snippets[lang]}</code>
                </pre>
                <CopyButton text={snippets[lang]} />
              </div>
            </TabsContent>
          ))}
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

      {/* Request payload schema */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Request body
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1.5 pr-4 text-left font-medium text-muted-foreground">
                  Field
                </th>
                <th className="py-1.5 pr-4 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="py-1.5 text-left font-medium text-muted-foreground">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="font-mono py-1.5 pr-4">workflow_id</td>
                <td className="py-1.5 pr-4 text-muted-foreground">string</td>
                <td className="py-1.5 text-muted-foreground">
                  ID of the workflow to trigger
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="font-mono py-1.5 pr-4">subscriber_id</td>
                <td className="py-1.5 pr-4 text-muted-foreground">string</td>
                <td className="py-1.5 text-muted-foreground">
                  Target subscriber ID
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="font-mono py-1.5 pr-4">recipient</td>
                <td className="py-1.5 pr-4 text-muted-foreground">object</td>
                <td className="py-1.5 text-muted-foreground">
                  Contains{' '}
                  <code className="rounded bg-muted px-1 font-mono">email</code>
                  ,{' '}
                  <code className="rounded bg-muted px-1 font-mono">phone</code>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="font-mono py-1.5 pr-4">channels</td>
                <td className="py-1.5 pr-4 text-muted-foreground">string[]</td>
                <td className="py-1.5 text-muted-foreground">
                  e.g.{' '}
                  <code className="rounded bg-muted px-1 font-mono">
                    ["email"]
                  </code>
                </td>
              </tr>
              <tr>
                <td className="font-mono py-1.5 pr-4">metadata</td>
                <td className="py-1.5 pr-4 text-muted-foreground">object</td>
                <td className="py-1.5 text-muted-foreground">
                  Custom key-value pairs for template variables
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
