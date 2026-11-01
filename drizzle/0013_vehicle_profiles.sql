ALTER TABLE `reservations` ADD `vehicle_id` integer;
--> statement-breakpoint
ALTER TABLE `service_records` ADD `vehicle_id` integer;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `vehicle_id` integer;
--> statement-breakpoint
ALTER TABLE `documents` ADD `vehicle_id` integer;
--> statement-breakpoint
ALTER TABLE `vehicle_damages` ADD `vehicle_id` integer;
--> statement-breakpoint
CREATE INDEX `idx_reservations_vehicle_id` ON `reservations` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `idx_service_records_vehicle_id` ON `service_records` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_vehicle_id` ON `transactions` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `idx_documents_vehicle_id` ON `documents` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `idx_vehicle_damages_vehicle_id` ON `vehicle_damages` (`vehicle_id`);
--> statement-breakpoint
UPDATE reservations
SET vehicle_id = (
  SELECT MIN(vehicle.id)
  FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.name)) = lower(trim(reservations.vehicle))
)
WHERE vehicle_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM vehicles AS vehicle
    WHERE lower(trim(vehicle.name)) = lower(trim(reservations.vehicle))
  );
--> statement-breakpoint
UPDATE service_records
SET vehicle_id = (
  SELECT vehicle.id FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(service_records.plate))
  LIMIT 1
)
WHERE vehicle_id IS NULL;
--> statement-breakpoint
UPDATE vehicle_damages
SET vehicle_id = (
  SELECT vehicle.id FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(vehicle_damages.plate))
  LIMIT 1
)
WHERE vehicle_id IS NULL;
--> statement-breakpoint
UPDATE documents
SET vehicle_id = (
  SELECT vehicle.id FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(documents.linked_to))
  LIMIT 1
)
WHERE vehicle_id IS NULL;
--> statement-breakpoint
UPDATE transactions
SET vehicle_id = (
  SELECT vehicle.id FROM vehicles AS vehicle
  WHERE lower(transactions.description) LIKE lower('[' || vehicle.plate || '] %')
  LIMIT 1
)
WHERE vehicle_id IS NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_reservation_overlap_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_reservation_overlap_update;
--> statement-breakpoint
CREATE TRIGGER prevent_reservation_overlap_insert
BEFORE INSERT ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE (
        existing.vehicle_id = NEW.vehicle_id
        OR (
          existing.vehicle_id IS NULL
          AND lower(trim(existing.vehicle)) = lower(trim(NEW.vehicle))
        )
      )
      AND existing.status NOT IN ('Završena', 'Otkazana')
      AND julianday(existing.starts_at) < julianday(NEW.ends_at)
      AND julianday(existing.ends_at) > julianday(NEW.starts_at)
      AND NOT EXISTS (
        SELECT 1
        FROM deleted_records AS deleted
        WHERE deleted.entity = 'reservations'
          AND deleted.record_key = existing.code
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER prevent_reservation_overlap_update
BEFORE UPDATE OF vehicle_id, vehicle, starts_at, ends_at, status ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE existing.id <> OLD.id
      AND (
        existing.vehicle_id = NEW.vehicle_id
        OR (
          existing.vehicle_id IS NULL
          AND lower(trim(existing.vehicle)) = lower(trim(NEW.vehicle))
        )
      )
      AND existing.status NOT IN ('Završena', 'Otkazana')
      AND julianday(existing.starts_at) < julianday(NEW.ends_at)
      AND julianday(existing.ends_at) > julianday(NEW.starts_at)
      AND NOT EXISTS (
        SELECT 1
        FROM deleted_records AS deleted
        WHERE deleted.entity = 'reservations'
          AND deleted.record_key = existing.code
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
END;
