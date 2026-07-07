"use client";

import { useRef, useState } from "react";
import { AgentAvatar } from "@/components/CosmeticsPanel";
import { AVATAR_PRESETS } from "@/lib/avatar";
import type { AvatarPresetId, EquippedCosmetics, ProfilePicture } from "@/lib/progression-types";

interface ProfilePicturePickerProps {
  name: string;
  profilePicture: ProfilePicture;
  equipped: EquippedCosmetics;
  saving: boolean;
  onSelect: (picture: ProfilePicture) => void;
  onUpload: (file: File) => Promise<void>;
}

export function ProfilePicturePicker({
  name,
  profilePicture,
  equipped,
  saving,
  onSelect,
  onUpload,
}: ProfilePicturePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      event.target.value = "";
    }
  }

  const isInitial = profilePicture.type === "initial";
  const isUpload = profilePicture.type === "upload";
  const activePreset =
    profilePicture.type === "preset" ? profilePicture.presetId : undefined;

  return (
    <div className="glass-card space-y-5 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Profile</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Profile picture</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose a color style, upload a photo, or use your initial.
        </p>
      </div>

      <div className="flex justify-center py-2">
        <AgentAvatar
          name={name}
          equipped={equipped}
          profilePicture={profilePicture}
          size="lg"
          showBadge
        />
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {AVATAR_PRESETS.map((preset) => {
          const selected = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={saving}
              onClick={() => onSelect({ type: "preset", presetId: preset.id as AvatarPresetId })}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition disabled:opacity-50 ${
                selected
                  ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
              }`}
              title={preset.name}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${preset.gradient}`}
              >
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="line-clamp-1 text-[10px] text-slate-400">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSelect({ type: "initial" })}
          className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
            isInitial
              ? "border-blue-500/40 bg-blue-500/10 text-white"
              : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/20"
          }`}
        >
          Use my initial
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => inputRef.current?.click()}
          className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
            isUpload
              ? "border-blue-500/40 bg-blue-500/10 text-white"
              : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/20"
          }`}
        >
          Upload photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
      </div>

      {uploadError ? (
        <p className="text-sm text-rose-300">{uploadError}</p>
      ) : (
        <p className="text-xs text-slate-500">JPG, PNG, or WebP — max 2 MB.</p>
      )}
    </div>
  );
}

function dispatchProfileUpdated(input: {
  equippedCosmetics?: EquippedCosmetics;
  equipped?: EquippedCosmetics;
  profilePicture: ProfilePicture;
}) {
  const equipped = input.equipped ?? input.equippedCosmetics;
  if (!equipped) return;

  window.dispatchEvent(
    new CustomEvent("profile-updated", {
      detail: { equipped, profilePicture: input.profilePicture },
    })
  );
}

export { dispatchProfileUpdated };
