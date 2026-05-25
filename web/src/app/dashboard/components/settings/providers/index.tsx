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
    description: "Transactional email via SendGrid SMTP credentials.",
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
        key: "from_email",
        label: "From email",
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
    description: "Brevo relay credentials with a verified sender address.",
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
        key: "from_email",
        sourceKey: "from",
        label: "From email",
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
        key: "from_email",
        sourceKey: "from",
        label: "From email",
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
  const [selectedProvider, setSelectedProvider] = useState<ProviderDefinition | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<ProviderItem | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const data = (await res.json()) as ProviderItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  const providerCards = useMemo<ProviderCard[]>(() => {
    return SUPPORTED_PROVIDERS.map((definition) => {
      const item = items.find((provider) => provider.name === definition.key) ?? null;
      const fallbackExists =
        items.filter(
          (provider) =>
            provider.channel === definition.channel &&
            provider.is_active &&
            provider.id !== item?.id,
        ).length > 0;

      return {
        definition,
        item,
        fallbackExists,
      };
    });
  }, [items]);

  const connectedCards = providerCards.filter((card) => card.item);

  const openConnectDialog = (definition: ProviderDefinition, item?: ProviderItem) => {
    const values: Record<string, string> = {};

    for (const field of definition.credentials) {
      values[field.key] = "";
    }

    for (const field of definition.config) {
      const configValues = (item?.config ?? {}) as Record<string, unknown>;
      const configValue = configValues[field.sourceKey || field.key];
      values[field.key] =
        typeof configValue === "string" || typeof configValue === "number"
          ? String(configValue)
          : "";
    }

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
    setFieldValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const buildPayload = (definition: ProviderDefinition): CreateProviderPayload => {
    const credentials: Record<string, unknown> = {};
    const config: Record<string, unknown> = {};

    for (const field of definition.credentials) {
      const value = fieldValues[field.key]?.trim();
      if (value) {
        credentials[field.key] = value;
      }
    }

    for (const field of definition.config) {
      const value = fieldValues[field.key]?.trim();
      if (!value) {
        continue;
      }

      const outputKey = field.key;
      config[outputKey] =
        field.type === "number" ? Number(value) : value;
    }

    return {
      name: definition.key,
      channel: definition.channel,
      credentials,
      config,
    };
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProvider) {
      return;
    }

    setError(null);
    setMutatingKey(`save:${selectedProvider.key}`);

    try {
      const payload = buildPayload(selectedProvider);
      const url = editingItem ? `/api/providers/${editingItem.id}` : "/api/providers";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      closeDialog();
      await fetchProviders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save provider connection",
      );
    } finally {
      setMutatingKey(null);
    }
  };

  const updateProviderState = async (
    item: ProviderItem,
    payload: UpdateProviderStatePayload,
  ) => {
    setError(null);
    setMutatingKey(`${payload.action}:${item.id}`);
    try {
      const res = await fetch(`/api/providers/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }

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
            Connect supported notification providers and control which active
            provider is primary for each channel.
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
            {connectedCards.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
                <p className="text-base font-semibold">No providers connected yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connect a provider to get started.
                </p>
                <Button
                  className="mt-5 bg-primary text-primary-foreground hover:bg-primaryemphasis"
                  onClick={() => openConnectDialog(SUPPORTED_PROVIDERS[0])}
                >
                  Connect a provider to get started
                </Button>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {providerCards.map(({ definition, item, fallbackExists }) => {
                const isConnected = Boolean(item);
                const isPrimary = item?.is_primary ?? false;
                const isActive = item?.is_active ?? false;
                const isDisabled = isConnected && !isActive;

                return (
                  <div
                    key={definition.key}
                    className="rounded-2xl border border-border bg-card p-5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-xl">
                          <Icon icon={definition.icon} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="text-base font-semibold">
                              {definition.label}
                            </h6>
                            <Badge variant="outline" className="capitalize">
                              {definition.channel}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {definition.description}
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConnectDialog(definition, item ?? undefined)}
                        >
                          Update
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={isConnected ? "lightInfo" : "outline"}>
                        {isConnected ? "Connected" : "Not Connected"}
                      </Badge>
                      {isConnected ? (
                        <Badge
                          variant={isActive ? "lightSuccess" : "lightWarning"}
                        >
                          {isActive ? "Active" : "Disabled"}
                        </Badge>
                      ) : null}
                      {isPrimary ? (
                        <Badge variant="lightPrimary">
                          Primary
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {!isConnected ? (
                        <Button
                          className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                          onClick={() => openConnectDialog(definition)}
                        >
                          Connect
                        </Button>
                      ) : null}

                      {isDisabled && item ? (
                        <>
                          <Button
                            onClick={() =>
                              void updateProviderState(item, { action: "enable" })
                            }
                            disabled={mutatingKey === `enable:${item.id}`}
                          >
                            Enable
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void updateProviderState(item, {
                                action: "set_primary",
                              })
                            }
                            disabled={mutatingKey === `set_primary:${item.id}`}
                          >
                            Set as Primary
                          </Button>
                        </>
                      ) : null}

                      {isActive && !isPrimary && item ? (
                        <>
                          <Button
                            onClick={() =>
                              void updateProviderState(item, {
                                action: "set_primary",
                              })
                            }
                            disabled={mutatingKey === `set_primary:${item.id}`}
                          >
                            Set as Primary
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void updateProviderState(item, { action: "disable" })
                            }
                            disabled={mutatingKey === `disable:${item.id}`}
                          >
                            Disable
                          </Button>
                        </>
                      ) : null}

                      {isPrimary && item ? (
                        <>
                          <Badge className="rounded-md bg-primary/10 px-3 py-2 text-primary">
                            Primary
                          </Badge>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void updateProviderState(item, { action: "disable" })
                            }
                            disabled={
                              !fallbackExists ||
                              mutatingKey === `disable:${item.id}`
                            }
                          >
                            Disable
                          </Button>
                        </>
                      ) : null}
                    </div>

                    {isPrimary && !fallbackExists ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Connect or enable another active {definition.channel} provider
                        before disabling the primary one.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBox>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true);
            return;
          }
          closeDialog();
        }}
      >
        <DialogContent className="border-border bg-card text-foreground sm:max-w-xl">
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
                  <label className="mb-2 block text-sm font-medium" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "text" : field.type || "text"}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] || ""}
                    onChange={(event) =>
                      updateFieldValue(field.key, event.target.value)
                    }
                  />
                </div>
              ))}

              {selectedProvider.config.map((field) => (
                <div key={field.key}>
                  <label className="mb-2 block text-sm font-medium" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : field.type || "text"}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] || ""}
                    onChange={(event) =>
                      updateFieldValue(field.key, event.target.value)
                    }
                  />
                </div>
              ))}

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
