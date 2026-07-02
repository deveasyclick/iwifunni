'use client';

import { CopyButton } from '@/components/ui/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/features/auth/queries';
import { useApiKeyList } from '@/features/settings/apikey/queries';
import { FileCode, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IntegratePanelContentProps {
  readonly workflowId: string;
  readonly workflowName: string;
}

interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

function buildCurlSnippet(
  baseUrl: string,
  workflowId: string,
  workflowName: string,
  user: UserInfo | null,
  keyPrefix: string | null,
) {
  const subscriberId = user?.id ?? 'sub_abc123';
  const email = user?.email ?? 'user@example.com';
  const firstName = user?.first_name ?? 'John';
  const lastName = user?.last_name ?? 'Doe';
  const apiKey = keyPrefix ? `${keyPrefix}...` : 'YOUR_API_KEY';

  return String.raw`curl -X POST ${baseUrl}/api/notifications/trigger \
  -H "Authorization: Bearer ${apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "${workflowName}",
  "to": {
    "subscriberId": "${subscriberId}",
    "email": "${email}",
    "firstName": "${firstName}",
    "lastName": "${lastName}"
  },
  "payload": {
    "plan": "premium"
  }
}'`;
}

export function IntegratePanelContent({
  workflowId,
  workflowName,
}: IntegratePanelContentProps) {
  const { data: profile } = useUserProfile();
  const { data: apiKeys } = useApiKeyList();

  const [baseUrl, setBaseUrl] = useState('https://iwifunni.com/docs');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const firstKeyPrefix = apiKeys?.[0]?.key_prefix ?? null;
  const curlSnippet = buildCurlSnippet(
    baseUrl,
    workflowId,
    workflowName,
    profile ?? null,
    firstKeyPrefix,
  );

  return (
    <div className="space-y-5">
      <p>{/* Tigger instruction should be here*/}</p>
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
            <div className="overflow-hidden rounded-xl border border-border">
              {/* Window tab header */}
              <div className="flex items-center justify-between bg-dark/80 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="ml-2 text-xs font-medium text-white/60">
                    cURL
                  </span>
                </div>
                <CopyButton text={curlSnippet} />
              </div>
              <pre className="overflow-x-auto bg-dark p-4 font-mono text-xs leading-relaxed text-white">
                <code>{curlSnippet}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="nodejs" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Node.js SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with fetch or axios in
                the meantime.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="go" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Go SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with net/http in the
                meantime.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="python" className="mt-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <FileCode className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Python SDK</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SDK coming soon. You can use the REST API with requests in the
                meantime.
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
            {firstKeyPrefix ? `${firstKeyPrefix}...` : 'YOUR_API_KEY'}
          </code>{' '}
          with{' '}
          {firstKeyPrefix ? (
            <>
              the full key starting with{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                {firstKeyPrefix}
              </code>
            </>
          ) : (
            'a valid API key'
          )}
          . Manage your keys in{' '}
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
