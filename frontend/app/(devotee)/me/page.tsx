"use client";

import { useDevoteeData } from "../DevoteeDataProvider";
import { locationText } from "../../lib/devotee";
import { formatCount } from "../../lib/api";
import { Button, Card, Icon, Skeleton, type IconName } from "../../components/ui";
import { ReminderToggle } from "../../components/ReminderToggle";

export default function MePage() {
  const { devotee, isLoading, logout } = useDevoteeData();

  if (isLoading || !devotee) {
    return <Skeleton className="h-64" />;
  }

  const details: { icon: IconName; label: string; value: string }[] = [
    { icon: "phone", label: "Mobile", value: devotee.mobile || "Not added" },
    { icon: "mail", label: "Email", value: devotee.email },
    { icon: "link", label: "Location", value: locationText(devotee) },
  ];

  return (
    <div className="grid gap-5">
      <Card className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-2xl font-semibold text-white shadow-sm"
        >
          {devotee.name.charAt(0).toUpperCase()}
        </span>
        <h2 className="mt-3 text-xl font-semibold">{devotee.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {formatCount(devotee.totalJap)} jap completed in total
        </p>
      </Card>

      <Card>
        <div className="grid gap-4">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
              >
                <Icon name={detail.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {detail.label}
                </p>
                <p className="break-words font-medium">{detail.value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-line-soft pt-4 text-xs text-muted">
          To update these details, please contact the ashram admin.
        </p>
      </Card>

      <ReminderToggle />

      <Button variant="secondary" fullWidth onClick={logout}>
        <Icon name="logout" className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
