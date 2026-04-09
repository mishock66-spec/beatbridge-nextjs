"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type ContactStatus,
  CONTACT_STATUSES,
  statusStorageKey,
} from "@/components/ConnectionCard";
import { supabase } from "@/lib/supabase";

interface SlimRecord { username: string; }
interface SlimArtist  { slug: string; records: SlimRecord[]; }

interface DMStatusContextValue {
  statuses: Record<string, ContactStatus>;
  mounted:  boolean;
  updateStatus: (artistSlug: string, username: string, next: ContactStatus) => void;
}

const DMStatusContext = createContext<DMStatusContextValue>({
  statuses: {},
  mounted:  false,
  updateStatus: () => {},
});

export function useDMStatus() {
  return useContext(DMStatusContext);
}

export function DMStatusProvider({
  artists,
  userId,
  children,
}: {
  artists:  SlimArtist[];
  userId:   string | undefined;
  children: ReactNode;
}) {
  const [statuses, setStatuses] = useState<Record<string, ContactStatus>>({});
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    // Seed every known contact with "To contact" as default
    const all: Record<string, ContactStatus> = {};
    artists.forEach((a) => {
      a.records.forEach((r) => {
        all[statusStorageKey(a.slug, r.username)] = "To contact";
      });
    });

    if (!userId || !supabase) {
      setStatuses(all);
      setMounted(true);
      return;
    }

    supabase
      .from("dm_status")
      .select("artist_slug, username, status")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          data.forEach((row) => {
            const key = statusStorageKey(row.artist_slug, row.username);
            if (CONTACT_STATUSES.includes(row.status as ContactStatus)) {
              all[key] = row.status as ContactStatus;
            }
          });
        }
        setStatuses(all);
        setMounted(true);
      })
      .catch(() => {
        setStatuses(all);
        setMounted(true);
      });
  }, [artists, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateStatus(artistSlug: string, username: string, next: ContactStatus) {
    // Optimistic update — instant UI feedback
    const key = statusStorageKey(artistSlug, username);
    setStatuses((prev) => ({ ...prev, [key]: next }));

    if (!userId || !supabase) return;

    const contactId = `${artistSlug}_${username.replace("@", "").toLowerCase()}`;
    supabase
      .from("dm_status")
      .upsert(
        {
          user_id:     userId,
          artist_slug: artistSlug,
          username:    username.replace("@", ""),
          contact_id:  contactId,
          status:      next,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: "user_id,contact_id" }
      )
      .then(({ error }) => {
        if (error) console.error("[DMStatus] upsert error:", error);
      });
  }

  return (
    <DMStatusContext.Provider value={{ statuses, mounted, updateStatus }}>
      {children}
    </DMStatusContext.Provider>
  );
}
