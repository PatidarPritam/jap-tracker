import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import app from "./app";
import { isPushConfigured, sendDailyJapReminders } from "./push";

const PORT = process.env.PORT || 5000;

// Evening nudge: after the day's work, early enough to still sit and chant.
const REMINDER_CRON = process.env.REMINDER_CRON || "0 19 * * *";
const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || "Asia/Kolkata";

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (!isPushConfigured) return;

  cron.schedule(
    REMINDER_CRON,
    () => {
      sendDailyJapReminders()
        .then(({ sent, skipped }) => {
          console.log(`[push] daily reminders sent=${sent} failed=${skipped}`);
        })
        .catch((error) => {
          console.error("[push] daily reminder job failed", error);
        });
    },
    { timezone: REMINDER_TIMEZONE }
  );

  console.log(`[push] daily reminders scheduled (${REMINDER_CRON} ${REMINDER_TIMEZONE})`);
});
