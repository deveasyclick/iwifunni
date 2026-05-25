"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import CardBox from "@/app/components/shared/CardBox";
import type {
  CreateProviderPayload,
  ProviderItem,
  UpdateProviderStatePayload,
} from "@/app/types/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type FieldDefinition = {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "number";
  sourceKey?: string;
  location: "credentials" | "config";
};

type ProviderDefinition = {
  key: string;
  label: string;
  channel: "email" | "sms" | "push";
  icon: string;
  description: string;
  credentials: FieldDefinition[];
  config: FieldDefinition[];
};

type ProviderCard = {
  definition: ProviderDefinition;
  item: ProviderItem | null;
  fallbackExists: boolean;
};

const SUPPORTED_PROVIDERS: ProviderDefinition[] = [
  {
    key: "sendgrid",
    label: "SendGrid",
    channel: "email",
    icon: "simple-icons:sendgrid",
    description: "Transactional email via SendGrid API.",
    credentials: [
      {
        key: "api_key",
        label: "API key",
        placeholder: "SG.xxxxx",
        type: "password",
        location: "credentials",
      },
    ],
    config: [
      {
        key: "sender_name",
        label: "Sender name",
        placeholder: "My App",
        location: "config",
      },
      {
        key: "from_email",
        label: "Sender email",
        placeholder: "no-reply@example.com",
        location: "config",
      },
    ],
  },
  {
    key: "brevo",
    label: "Brevo",
    channel: "email",
    icon: "simple-icons:brevo",
    description: "Brevo SMTP relay with a verified sender address.",
    credentials: [
      {
        key: "login",
        label: "SMTP login",
        placeholder: "user@example.com",
        location: "credentials",
      },
      {
        key: "api_key",
        label: "API key",
        placeholder: "xkeysib-xxxxx",
        type: "password",
        location: "credentials",
      },
    ],
    config: [
      {
        key: "sender_name",
        label: "Sender name",
        placeholder: "My App",
        location: "config",
      },
      {
        key: "from_email",
        sourceKey: "from",
        label: "Sender email",
        placeholder: "no-reply@example.com",
        location: "config",
      },
    ],
  },
  {
    key: "smtp",
    label: "SMTP",
    channel: "email",
    icon: "mdi:email-fast-outline",
    description: "Custom SMTP relay for email delivery.",
    credentials: [
      {
        key: "username",
        label: "Username",
        placeholder: "smtp-user",
        location: "credentials",
      },
      {
        key: "password",
        label: "Password",
        placeholder: "smtp-password",
        type: "password",
        location: "credentials",
      },
    ],
    config: [
      {
        key: "host",
        label: "Host",
        placeholder: "smtp.example.com",
        location: "config",
      },
      {
        key: "port",
        label: "Port",
        placeholder: "587",
        type: "number",
        location: "config",
      },
      {
        key: "sender_name",
        label: "Sender name",
        placeholder: "My App",
        location: "config",
      },
      {
        key: "from_email",
        sourceKey: "from",
        label: "Sender email",
        placeholder: "no-reply@example.com",
        location: "config",
      },
    ],
  },
  {
    key: "termii",
    label: "Termii",
    channel: "sms",
    icon: "mdi:message-text-fast-outline",
    description: "SMS delivery using Termii sender credentials.",
    credentials: [
      {
        key: "api_key",
        label: "API key",
        placeholder: "termii-api-key",
        type: "password",
        location: "credentials",
      },
    ],
    config: [
      {
        key: "sender_id",
        label: "Sender ID",
        placeholder: "IWIFUNNI",
        location: "config",
      },
    ],
  },
  {
    key: "twilio",
    label: "Twilio",
    channel: "sms",
    icon: "simple-icons:twilio",
    description: "SMS delivery with Twilio account credentials.",
    credentials: [
      {
        key: "account_sid",
        label: "Account SID",
        placeholder: "ACxxxxxxxx",
        location: "credentials",
      },
      {
        key: "auth_token",
        label: "Auth token",
        placeholder: "twilio-auth-token",
        type: "password",
        location: "credentials",
      },
    ],
    config: [
      {
        key: "from_number",
        sourceKey: "sender_id",
        label: "From number",
        placeholder: "+1234567890",
        location: "config",
      },
    ],
  },
  {
    key: "fcm",
    label: "FCM",
    channel: "push",
    icon: "logos:firebase",
    description: "Push delivery using Firebase Cloud Messaging.",
    credentials: [
      {
        key: "server_key",
        label: "Server key",
        placeholder: "fcm-server-key",
        type: "password",
        location: "credentials",
      },
    ],
    config: [],
  },
  {
    key: "webpush",
    label: "Web Push",
    channel: "push",
    icon: "mdi:web",
    description: "Browser push delivery with VAPID keys.",
    credentials: [
      {
        key: "public_key",
        label: "Public key",
        placeholder: "web-push-public-key",
        location: "credentials",
      },
      {
        key: "private_key",
        label: "Private key",
        placeholder: "web-push-private-key",
        type: "password",
        location: "credentials",
      },
    ],
    config: [],
  },
];

const CHANNEL_GROUPS: { channel: "email" | "sms" | "push"; label: string; icon: string }[] = [
  { channel: "email", label: "Email", icon: "mdi:email-outline" },
  { channel: "sms", label: "SMS", icon: "mdi:message-text-outline" },
  { channel: "push", label: "Push", icon: "mdi:bell-outline" },
];

const parseError = async (res: Response): Promise<string> => {
  const fallback = "Request failed";
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const ProviderManagement = () => {
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDefinition | null>(null);
  const [editingItem, setEditingItem] = useState<ProviderItem | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [enabledToggle, setEnabledToggle] = useState(true);
  const [primaryToggle, setPrimaryToggle] = useState(false);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await parseError(res));
      const data = (await res.json()) as ProviderItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProviders(); }, [fetchProviders]);

  const providerCards = useMemo<ProviderCard[]>(() => {
    return SUPPORTED_PROVIDERS.map((definition) => {
      const item = items.find((p) => p.name === definition.key) ?? null;
      const fallbackExists =
        items.filter(
          (p) => p.channel === definition.channel && p.is_active && p.id !== item?.id,
        ).length > 0;
      return { definition, item, fallbackExists };
    });
  }, [items]);

  const connectedCount = providerCards.filter((c) => c.item).length;

  const openConnectDialog = (definition: ProviderDefinition, item?: ProviderItem) => {
    const values: Record<string, string> = {};
    for (const field of definition.credentials) values[field.key] = "";
    for (const field of definition.config) {
      const configValues = (item?.config ?? {}) as Record<string, unknown>;
      const v = configValues[field.sourceKey ?? field.key];
      values[field.key] = typeof v === "string" || typeof v === "number" ? String(v) : "";
    }
    // Default toggles: if first provider overall, enable+primary; otherwise enabled, not primary
    const isFirst = items.length === 0 && !item;
    setEnabledToggle(item ? item.is_active : isFirst || true);
    setPrimaryToggle(item ? item.is_primary : isFirst);
    setSelectedProvider(definition);
    setEditingItem(item ?? null);
    setFieldValues(values);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedProvider(null);
    setEditingItem(null);
    setFieldValues({});
  };

  const updateFieldValue = (key: string, value: string) => {
    setFieldValues((cur) => ({ ...cur, [key]: value }));
  };

  const buildPayload = (definition: ProviderDefinition): CreateProviderPayload => {
    const credentials: Record<string, unknown> = {};
    const config: Record<string, unknown> = {};
    for (const field of definition.credentials) {
      const v = fieldValues[field.key]?.trim();
      if (v) credentials[field.key] = v;
    }
    for (const field of definition.config) {
      const v = fieldValues[field.key]?.trim();
      if (!v) continue;
      config[field.key] = field.type === "number" ? Number(v) : v;
    }
    return { name: definition.key, channel: definition.channel, credentials, config };
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProvider) return;
    setError(null);
    setMutatingKey(`save:${selectedProvider.key}`);
    try {
      const payload = buildPayload(selectedProvider);
      const url = editingItem ? `/api/providers/${editingItem.id}` : "/api/providers";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseError(res));

      // Apply toggles after save
      const saved = (await res.json()) as ProviderItem;
      if (primaryToggle) {
        await fetch(`/api/providers/${saved.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_primary" }),
        });
      } else if (!enabledToggle) {
        await fetch(`/api/providers/${saved.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disable" }),
        });
      }

      closeDialog();
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider connection");
    } finally {
      setMutatingKey(null);
    }
  };

  const updateProviderState = async (item: ProviderItem, payload: UpdateProviderStatePayload) => {
    setError(null);
    setMutatingKey(`${payload.action}:${item.id}`);
    try {
      const res = await fetch(`/api/providers/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseError(res));
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provider");
    } finally {
      setMutatingKey(null);
    }
  };

  return (
    <>
      <CardBox className="p-6">
        <div className="flex flex-col gap-2 border-b border-border pb-5">
          <h5 className="card-title">Providers</h5>
          <p className="text-sm text-muted-foreground">
            Connect notification providers and control which one is primary for each channel.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading providers...
          </div>
        ) : (
          <>
            {connectedCount === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                  <Icon icon="mdi:connection" />
                </div>
                <p className="text-base font-semibold">No providers connected yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect a provider to start sending notifications.
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-8">
              {CHANNEL_GROUPS.map(({ channel, label, icon }) => {
                const channelCards = providerCards.filter((c) => c.definition.channel === channel);
                return (
                  <div key={channel}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon icon={icon} className="text-muted-foreground" />
                      <h6 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </h6>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {channelCards.map(({ definition, item, fallbackExists }) => {
                        const isConnected = Boolean(item);
                        const isPrimary = item?.is_primary ?? false;
                        const isActive = item?.is_active ?? false;
                        const isMutating = mutatingKey?.endsWith(item?.id ?? "");

                        if (!isConnected) {
                          return (
                            <button
                              key={definition.key}
                              type="button"
                              onClick={() => openConnectDialog(definition)}
                              className="group relative flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-5 text-center transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-lg transition-transform duration-200 group-hover:scale-110">
                                <Icon icon={definition.icon} />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{definition.label}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                  {definition.description}
                                </p>
                              </div>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <Icon icon="mdi:plus" className="text-[10px]" />
                                Connect
                              </span>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={definition.key}
                            className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-base">
                                  <Icon icon={definition.icon} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold">{definition.label}</span>
                                    {isPrimary ? (
                                      <Badge variant="lightPrimary" className="text-[10px] px-1.5 py-0">
                                        Primary
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {isActive ? "Active" : "Disabled"}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => openConnectDialog(definition, item ?? undefined)}
                              >
                                Edit
                              </Button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                              {!isPrimary && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={Boolean(isMutating)}
                                  onClick={() => void updateProviderState(item!, { action: "set_primary" })}
                                >
                                  Set primary
                                </Button>
                              )}
                              {isActive && !isPrimary ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground"
                                  disabled={Boolean(isMutating)}
                                  onClick={() => void updateProviderState(item!, { action: "disable" })}
                                >
                                  Disable
                                </Button>
                              ) : null}
                              {!isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={Boolean(isMutating)}
                                  onClick={() => void updateProviderState(item!, { action: "enable" })}
                                >
                                  Enable
                                </Button>
                              ) : null}
                              {isPrimary && fallbackExists ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground"
                                  disabled={Boolean(isMutating)}
                                  onClick={() => void updateProviderState(item!, { action: "disable" })}
                                >
                                  Disable
                                </Button>
                              ) : null}
                            </div>

                            {isPrimary && !fallbackExists ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                Add another {channel} provider to disable this one.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBox>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => { if (open) { setDialogOpen(true); } else { closeDialog(); } }}
      >
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Update provider" : "Connect provider"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedProvider
                ? `Configure ${selectedProvider.label} for ${selectedProvider.channel} delivery.`
                : "Configure provider settings."}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider ? (
            <form className="space-y-4" onSubmit={submitProvider}>
              {selectedProvider.credentials.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "text" : field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => updateFieldValue(field.key, e.target.value)}
                  />
                </div>
              ))}

              {selectedProvider.config.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => updateFieldValue(field.key, e.target.value)}
                  />
                </div>
              ))}

              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="toggle-enabled" className="text-sm font-medium">
                      Enable provider
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow this provider to send notifications
                    </p>
                  </div>
                  <Switch
                    id="toggle-enabled"
                    checked={enabledToggle}
                    onCheckedChange={(checked) => {
                      setEnabledToggle(checked);
                      if (!checked) setPrimaryToggle(false);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="toggle-primary" className="text-sm font-medium">
                      Set as primary
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use this as the default provider for {selectedProvider.channel}
                    </p>
                  </div>
                  <Switch
                    id="toggle-primary"
                    checked={primaryToggle}
                    disabled={!enabledToggle}
                    onCheckedChange={(checked) => {
                      setPrimaryToggle(checked);
                      if (checked) setEnabledToggle(true);
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={mutatingKey === `save:${selectedProvider.key}`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                  disabled={mutatingKey === `save:${selectedProvider.key}`}
                >
                  {mutatingKey === `save:${selectedProvider.key}`
                    ? "Saving..."
                    : editingItem
                      ? "Save changes"
                      : "Connect provider"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProviderManagement;
