import { useEffect, useState } from "react";
import type { AdminStateResponse, AdminStateUpdateRequest } from "../types/threat";
import {
  ADMIN_REFRESH_FEED_ENDPOINT,
  ADMIN_STATE_ENDPOINT,
  ADMIN_STATE_POLL_INTERVAL_MS,
  API_BASE,
} from "../utils/constants";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function useAdminState() {
  const [adminState, setAdminState] = useState<AdminStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchState = async () => {
      try {
        const data = await requestJson<AdminStateResponse>(ADMIN_STATE_ENDPOINT);
        if (!active) {
          return;
        }

        setAdminState(data);
        setError(null);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error ? requestError.message : "Failed to load admin state.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchState();
    const intervalId = window.setInterval(() => {
      void fetchState();
    }, ADMIN_STATE_POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const updateState = async (patch: AdminStateUpdateRequest) => {
    setIsSaving(true);

    try {
      const data = await requestJson<AdminStateResponse>(ADMIN_STATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      setAdminState(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save controls.");
    } finally {
      setIsSaving(false);
    }
  };

  const refreshLiveFeed = async () => {
    setIsSaving(true);

    try {
      const data = await requestJson<AdminStateResponse>(ADMIN_REFRESH_FEED_ENDPOINT, {
        method: "POST",
      });

      setAdminState(data);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to refresh live feed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const triggerGodMode = async () => {
    try {
      await requestJson<{ status: string; burst_count: number }>(`${API_BASE}/god-mode`, {
        method: "POST",
      });
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to trigger burst.");
    }
  };

  return {
    adminState,
    isLoading,
    isSaving,
    error,
    updateState,
    refreshLiveFeed,
    triggerGodMode,
  };
}
