"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import CardBox from "@/app/components/shared/CardBox";
import BreadcrumbComp from "@/app/dashboard/layout/shared/breadcrumb/BreadcrumbComp";
import type { SubscriberType } from "@/app/types/subscriber";

export default function SubscriberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subscriberId = params.id as string;

  const [subscriber, setSubscriber] = useState<SubscriberType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channels, setChannels] = useState<("email" | "sms" | "push")[]>([]);
  const [tags, setTags] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [status, setStatus] = useState<
    "subscribed" | "unsubscribed" | "bounced"
  >("subscribed");

  useEffect(() => {
    const fetchSubscriber = async () => {
      try {
        const res = await fetch(`/api/subscriber/${subscriberId}`, {
          headers: { browserrefreshed: "false" },
        });
        const data = await res.json();
        if (data?.data) {
          setSubscriber(data.data);
          setName(data.data.name);
          setEmail(data.data.email || "");
          setPhone(data.data.phone || "");
          setChannels(data.data.channels);
          setTagList(data.data.tags || []);
          setStatus(data.data.status.email || "subscribed");
        }
      } catch (err) {
        console.error("Error fetching subscriber:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriber();
  }, [subscriberId]);

  const handleChannelChange = (
    channel: "email" | "sms" | "push",
    checked: boolean,
  ) => {
    if (checked) {
      setChannels([...channels, channel]);
    } else {
      setChannels(channels.filter((c) => c !== channel));
    }
  };

  const handleAddTag = () => {
    if (tags.trim() && !tagList.includes(tags.trim())) {
      setTagList([...tagList, tags.trim()]);
      setTags("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTagList(tagList.filter((t) => t !== tag));
  };

  const handleUpdate = async () => {
    if (!name || !email) {
      alert("Please fill out name and email fields.");
      return;
    }

    const updatedSubscriber: SubscriberType = {
      id: subscriberId,
      name,
      email,
      phone: phone || undefined,
      channels,
      status: {
        email: status,
        sms: channels.includes("sms") ? status : undefined,
        push: channels.includes("push") ? status : undefined,
      },
      tags: tagList,
      subscriptionDate: subscriber?.subscriptionDate || new Date(),
      lastNotificationDate: subscriber?.lastNotificationDate,
      deleted: false,
    };

    try {
      await fetch(`/api/subscriber/${subscriberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSubscriber),
      });

      setEditing(false);
      setSubscriber(updatedSubscriber);
      // Show success message
      alert("Subscriber updated successfully");
    } catch (error) {
      console.error("Failed to update subscriber", error);
      alert("Failed to update subscriber");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    try {
      await fetch(`/api/subscriber/${subscriberId}`, {
        method: "DELETE",
      });
      router.push("/dashboard/subscribers");
    } catch (error) {
      console.error("Failed to delete subscriber", error);
      alert("Failed to delete subscriber");
    }
  };

  const BCrumb = [
    { to: "/", title: "Home" },
    { to: "/dashboard/subscribers", title: "Subscribers" },
    { title: email || "Subscriber" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Subscriber not found</div>
      </div>
    );
  }

  return (
    <>
      <BreadcrumbComp title={`Subscriber: ${email}`} items={BCrumb} />

      <CardBox>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Subscriber Details</h2>
          <div className="flex gap-2">
            {!editing && (
              <>
                <Button onClick={() => setEditing(true)} className="rounded-md">
                  Edit
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="rounded-md"
                >
                  Delete
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button onClick={handleUpdate} className="rounded-md">
                  Save
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="rounded-md"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-muted p-4 rounded-md mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">ID</p>
              <p className="font-mono">{subscriberId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Subscription Date</p>
              <p>
                {format(new Date(subscriber.subscriptionDate), "MMM dd, yyyy")}
              </p>
            </div>
            {subscriber.lastNotificationDate && (
              <div>
                <p className="text-muted-foreground">Last Notification</p>
                <p>
                  {format(
                    new Date(subscriber.lastNotificationDate),
                    "MMM dd, yyyy",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-background p-6 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="mb-2 block">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Subscriber name"
                disabled={!editing}
                className="w-full"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="mb-2 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="subscriber@example.com"
                disabled={!editing}
                className="w-full"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="mb-2 block">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                disabled={!editing}
                className="w-full"
              />
            </div>

            {/* Status */}
            <div>
              <Label className="mb-2 block">Email Status</Label>
              <div className="flex items-center h-10 px-3 border border-input rounded-md bg-background">
                {editing ? (
                  <select
                    aria-label="email status"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as
                          | "subscribed"
                          | "unsubscribed"
                          | "bounced",
                      )
                    }
                    className="w-full outline-none bg-transparent"
                  >
                    <option value="subscribed">Subscribed</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                  </select>
                ) : (
                  <span className="capitalize">{status}</span>
                )}
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="mt-6">
            <Label className="mb-3 block">Notification Channels</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="email-channel"
                  checked={channels.includes("email")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("email", checked as boolean)
                  }
                  disabled={!editing}
                />
                <Label
                  htmlFor="email-channel"
                  className="font-normal cursor-pointer"
                >
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sms-channel"
                  checked={channels.includes("sms")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("sms", checked as boolean)
                  }
                  disabled={!editing}
                />
                <Label
                  htmlFor="sms-channel"
                  className="font-normal cursor-pointer"
                >
                  SMS
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="push-channel"
                  checked={channels.includes("push")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("push", checked as boolean)
                  }
                  disabled={!editing}
                />
                <Label
                  htmlFor="push-channel"
                  className="font-normal cursor-pointer"
                >
                  Push
                </Label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-6">
            <Label className="mb-2 block">Tags</Label>
            {editing ? (
              <div className="flex gap-2 mb-3">
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="w-full"
                />
                <Button onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
            ) : null}
            {tagList.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {tagList.map((tag) => (
                  <div
                    key={tag}
                    className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    {editing && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary-foreground hover:text-primary rounded-full w-5 h-5 flex items-center justify-center text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBox>
    </>
  );
}
