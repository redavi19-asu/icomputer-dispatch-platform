export type DispatchPlanEntitlements = {
  id: "basic" | "business" | "custom";
  label: string;
  maxDrivers: number | null;
  maxDispatcherSeats: number | null;
};

export function getPlanEntitlements(planValue?: string | null): DispatchPlanEntitlements {
  const normalized = (planValue || "basic").toLowerCase();

  if (normalized.includes("business")) {
    return {
      id: "business",
      label: "DispatchOS Business",
      maxDrivers: 30,
      maxDispatcherSeats: 5,
    };
  }

  if (normalized.includes("custom")) {
    return {
      id: "custom",
      label: "DispatchOS Custom",
      maxDrivers: null,
      maxDispatcherSeats: null,
    };
  }

  return {
    id: "basic",
    label: "DispatchOS Basic",
    maxDrivers: 10,
    maxDispatcherSeats: 1,
  };
}

export function seatLabel(value: number | null) {
  return value === null ? "Custom" : String(value);
}
