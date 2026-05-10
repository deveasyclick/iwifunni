"use client";
import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SubscriberType } from "@/app/types/subscriber";

type CreateSubscriberFormProps = {
  onCreated?: (subscriber: SubscriberType) => void;
  onCancel?: () => void;
  compact?: boolean;
};

const subscriberFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.email("Enter a valid email address").optional(),
    ),
    phone: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().optional(),
    ),
    pushToken: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().optional(),
    ),
    channels: z
      .array(z.enum(["email", "sms", "push"]))
      .min(1, "Select at least one notification channel"),
    tags: z.array(z.string().trim().min(1)).max(10, "Maximum of 10 tags"),
  })
  .superRefine((data, ctx) => {
    if (data.channels.includes("email") && !data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email is required when Email channel is selected",
      });
    }
    if (data.channels.includes("sms") && !data.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Phone is required when SMS channel is selected",
      });
    }
    if (data.channels.includes("push") && !data.pushToken) {
      ctx.addIssue({
        code: "custom",
        path: ["pushToken"],
        message: "Push token is required when Push channel is selected",
      });
    }
  });

type FormFieldErrors = Partial<
  Record<"name" | "email" | "phone" | "pushToken" | "channels" | "tags", string>
>;

const CreateSubscriberForm = ({
  onCreated,
  onCancel,
  compact = false,
}: CreateSubscriberFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [channels, setChannels] = useState<("email" | "sms" | "push")[]>([
    "email",
  ]);
  const [tags, setTags] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormFieldErrors>({});

  const toggleChannel = (channel: "email" | "sms" | "push") => {
    setChannels((currentChannels) =>
      currentChannels.includes(channel)
        ? currentChannels.filter((c) => c !== channel)
        : [...currentChannels, channel],
    );
  };

  const handleAddTag = () => {
    if (tags.trim()) {
      if (!tagList.includes(tags.trim())) {
        setTagList([...tagList, tags.trim()]);
      }
      setTags("");
      setErrors((prev) => ({ ...prev, tags: undefined }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTagList(tagList.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    const parsed = subscriberFormSchema.safeParse({
      name,
      email: email || undefined,
      phone: phone || undefined,
      pushToken: pushToken || undefined,
      channels,
      tags: tagList,
    });

    if (!parsed.success) {
      const fieldErrors: FormFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormFieldErrors | undefined;
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const newSubscriber: SubscriberType = {
      id: Date.now().toString(), // Simple ID generation
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pushToken: parsed.data.pushToken,
      channels: parsed.data.channels,
      status: {
        email: "subscribed",
        sms: parsed.data.channels.includes("sms") ? "subscribed" : undefined,
        push: parsed.data.channels.includes("push") ? "subscribed" : undefined,
      },
      tags: parsed.data.tags,
      subscriptionDate: new Date(),
      deleted: false,
    };

    try {
      await fetch("/api/subscriber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubscriber),
      });

      resetForm();
      onCreated?.(newSubscriber);
    } catch (error) {
      console.error("Failed to create subscriber", error);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPushToken("");
    setChannels(["email"]);
    setTagList([]);
    setTags("");
    setErrors({});
  };

  const formBody = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name" className="mb-2 block text-foreground">
            Name *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Subscriber name"
            className="w-full bg-background"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-error">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="mb-2 block text-foreground">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="subscriber@example.com"
            className="w-full bg-background"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error">{errors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="mb-2 block text-foreground">
            Phone (Optional)
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-background"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-error">{errors.phone}</p>
          )}
        </div>

        <div>
          <Label htmlFor="pushToken" className="mb-2 block text-foreground">
            Push Token (Optional)
          </Label>
          <Input
            id="pushToken"
            value={pushToken}
            onChange={(e) => {
              setPushToken(e.target.value);
              setErrors((prev) => ({ ...prev, pushToken: undefined }));
            }}
            placeholder="expo-token-or-device-token"
            className="w-full bg-background"
          />
          {errors.pushToken && (
            <p className="mt-1 text-xs text-error">{errors.pushToken}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block text-foreground">
            Notification Channels
          </Label>
          <div className="flex flex-wrap gap-4 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="email-channel"
                checked={channels.includes("email")}
                onCheckedChange={() => {
                  toggleChannel("email");
                  setErrors((prev) => ({ ...prev, channels: undefined }));
                }}
              />
              <Label
                htmlFor="email-channel"
                className="font-normal cursor-pointer text-foreground"
              >
                Email
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sms-channel"
                checked={channels.includes("sms")}
                onCheckedChange={() => {
                  toggleChannel("sms");
                  setErrors((prev) => ({ ...prev, channels: undefined }));
                }}
              />
              <Label
                htmlFor="sms-channel"
                className="font-normal cursor-pointer text-foreground"
              >
                SMS
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="push-channel"
                checked={channels.includes("push")}
                onCheckedChange={() => {
                  toggleChannel("push");
                  setErrors((prev) => ({ ...prev, channels: undefined }));
                }}
              />
              <Label
                htmlFor="push-channel"
                className="font-normal cursor-pointer text-foreground"
              >
                Push
              </Label>
            </div>
          </div>
          {errors.channels && (
            <p className="mt-2 text-xs text-error">{errors.channels}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="tags" className="mb-2 block text-foreground">
          Tags
        </Label>
        <div className="flex gap-2 mb-3">
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add tag and press Enter"
            className="w-full bg-background"
          />
          <Button
            onClick={handleAddTag}
            variant="outline"
            className="border-border"
          >
            Add
          </Button>
        </div>
        {errors.tags && (
          <p className="mt-1 text-xs text-error">{errors.tags}</p>
        )}

        {tagList.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tagList.map((tag) => (
              <div
                key={tag}
                className="bg-lightprimary text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-primary hover:text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6 justify-end">
        <Button
          onClick={handleSubmit}
          className="rounded-md bg-primary text-primary-foreground hover:bg-primaryemphasis"
        >
          Save Subscriber
        </Button>
        <Button
          variant="outline"
          className="rounded-md border-border text-foreground hover:bg-lightprimary"
          onClick={() => onCancel?.()}
        >
          Cancel
        </Button>
      </div>
    </>
  );

  if (compact) {
    return formBody;
  }

  return (
    <div className="rounded-2xl border border-border bg-dark p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Add New Subscriber
      </h2>
      {formBody}
    </div>
  );
};

export default CreateSubscriberForm;
