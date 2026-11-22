ALTER TABLE `vehicles` ADD `archived_at` text;
--> statement-breakpoint
UPDATE vehicles
SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP)
WHERE archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM deleted_records
    WHERE deleted_records.entity = 'vehicles'
      AND deleted_records.record_key = vehicles.plate
  );
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_archived_vehicle_reservation_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_archived_vehicle_reservation_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_vehicle_archive_with_active_reservations;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_vehicle_delete_with_linked_data;
--> statement-breakpoint
CREATE TRIGGER prevent_archived_vehicle_reservation_insert
BEFORE INSERT ON reservations
WHEN NEW.vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = NEW.vehicle_id
      AND vehicles.archived_at IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'ARCHIVED_VEHICLE');
END;
--> statement-breakpoint
CREATE TRIGGER prevent_archived_vehicle_reservation_update
BEFORE UPDATE OF vehicle_id, status ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND NEW.vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = NEW.vehicle_id
      AND vehicles.archived_at IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'ARCHIVED_VEHICLE');
END;
--> statement-breakpoint
CREATE TRIGGER prevent_vehicle_archive_with_active_reservations
BEFORE UPDATE OF archived_at ON vehicles
WHEN OLD.archived_at IS NULL
  AND NEW.archived_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM reservations
    WHERE reservations.vehicle_id = OLD.id
      AND reservations.status NOT IN ('Završena', 'Otkazana')
      AND NOT EXISTS (
        SELECT 1 FROM deleted_records
        WHERE deleted_records.entity = 'reservations'
          AND deleted_records.record_key = reservations.code
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_HAS_ACTIVE_RESERVATIONS');
END;
--> statement-breakpoint
CREATE TRIGGER prevent_vehicle_delete_with_linked_data
BEFORE DELETE ON vehicles
WHEN EXISTS (
    SELECT 1 FROM reservations
    WHERE reservations.vehicle_id = OLD.id
      OR (reservations.vehicle_id IS NULL AND lower(trim(reservations.vehicle)) = lower(trim(OLD.name)))
  )
  OR EXISTS (
    SELECT 1 FROM transactions
    WHERE transactions.vehicle_id = OLD.id
      OR (transactions.vehicle_id IS NULL AND instr(lower(transactions.description), lower(OLD.plate)) > 0)
  )
  OR EXISTS (
    SELECT 1 FROM documents
    WHERE documents.vehicle_id = OLD.id
      OR (documents.vehicle_id IS NULL AND lower(trim(documents.linked_to)) = lower(trim(OLD.plate)))
  )
  OR EXISTS (
    SELECT 1 FROM service_records
    WHERE service_records.vehicle_id = OLD.id
      OR (service_records.vehicle_id IS NULL AND lower(trim(service_records.plate)) = lower(trim(OLD.plate)))
  )
  OR EXISTS (
    SELECT 1 FROM vehicle_damages
    WHERE vehicle_damages.vehicle_id = OLD.id
      OR (vehicle_damages.vehicle_id IS NULL AND lower(trim(vehicle_damages.plate)) = lower(trim(OLD.plate)))
  )
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_HAS_LINKED_DATA');
END;
