"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disableReminders,
  enableReminders,
  reminderState,
  type ReminderState,
} from "../lib/push";
import { Button, Card, Icon, Skeleton, useToast } from "./ui";
import { useT } from "./LanguageProvider";

/**
 * Opt-in control for the evening jap reminder. Deliberately opt-in and buried
 * in the profile tab — a notification nobody asked for is the fastest way to
 * get the app muted.
 */
export function ReminderToggle() {
  const toast = useToast();
  const t = useT();
  const [state, setState] = useState<ReminderState | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await reminderState());
    } catch {
      // Treat a failed probe as "not available" rather than blocking the page.
      setState({ supported: false, available: false, enabled: false, blocked: false });
    }
  }, []);

  useEffect(() => {
    // Probing permission + server config is async; state is set by the loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function toggle() {
    if (!state) return;

    try {
      setIsBusy(true);
      if (state.enabled) {
        await disableReminders();
        toast.info(t("reminder.disabled"));
      } else {
        const granted = await enableReminders();
        toast[granted ? "success" : "info"](
          t(granted ? "reminder.enabled" : "reminder.declined")
        );
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("reminder.updateFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  if (!state) return <Skeleton className="h-24" />;
  // Nothing actionable to show if the device or the server cannot do push.
  if (!state.supported || !state.available) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
        >
          <Icon name="clock" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("reminder.title")}</p>
          <p className="mt-0.5 text-sm text-muted">
            {t(state.blocked ? "reminder.blocked" : "reminder.text")}
          </p>
        </div>
      </div>

      {!state.blocked && (
        <Button
          variant={state.enabled ? "secondary" : "success"}
          fullWidth
          className="mt-4"
          isLoading={isBusy}
          onClick={toggle}
        >
          {t(state.enabled ? "reminder.turnOff" : "reminder.turnOn")}
        </Button>
      )}
    </Card>
  );
}
