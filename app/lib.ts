/** Shared, dependency-free helpers used by the UI and API routes. */
export const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const displayPlate = (plate: string, registered?: boolean) =>
  registered === false || plate.startsWith("DNFM-NEREG-")
    ? "Nema tablica"
    : plate;

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.toLocaleDateString("sr-RS", { day: "2-digit", month: "short" })} • ${date.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`
    : value;
};

export const bookingDate = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleDateString("sr-Latn-RS")} • ${date.toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}`;
};

const NON_BLOCKING_RESERVATION_STATUSES = new Set(["Završena", "Otkazana"]);

export const reservationBlocksVehicle = (status: string) =>
  !NON_BLOCKING_RESERVATION_STATUSES.has(status);

export const reservationPeriodsOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) => {
  const firstStartTime = new Date(firstStart).getTime();
  const firstEndTime = new Date(firstEnd).getTime();
  const secondStartTime = new Date(secondStart).getTime();
  const secondEndTime = new Date(secondEnd).getTime();

  return (
    [firstStartTime, firstEndTime, secondStartTime, secondEndTime].every(
      Number.isFinite,
    ) &&
    firstStartTime < secondEndTime &&
    firstEndTime > secondStartTime
  );
};

export const statusTone = (status = "") =>
  status.includes("Dostupno") ||
  status.includes("Plaćeno") ||
  status.includes("Aktivan")
    ? "green"
    : status.includes("Iznajmljeno") ||
        status.includes("Aktivna") ||
        status.includes("U toku")
      ? "blue"
      : status.includes("Povrat") ||
          status.includes("servisu") ||
          status.includes("Uskoro")
        ? "red"
        : status.includes("Potvr") || status.includes("Rezervisano")
          ? "violet"
          : "amber";
