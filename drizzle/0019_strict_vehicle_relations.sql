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
  SELECT MIN(vehicle.id)
  FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(service_records.plate))
)
WHERE vehicle_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM vehicles AS vehicle
    WHERE lower(trim(vehicle.plate)) = lower(trim(service_records.plate))
  );
--> statement-breakpoint
UPDATE vehicle_damages
SET vehicle_id = (
  SELECT MIN(vehicle.id)
  FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(vehicle_damages.plate))
)
WHERE vehicle_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM vehicles AS vehicle
    WHERE lower(trim(vehicle.plate)) = lower(trim(vehicle_damages.plate))
  );
--> statement-breakpoint
UPDATE documents
SET vehicle_id = (
  SELECT MIN(vehicle.id)
  FROM vehicles AS vehicle
  WHERE lower(trim(vehicle.plate)) = lower(trim(documents.linked_to))
)
WHERE vehicle_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM vehicles AS vehicle
    WHERE lower(trim(vehicle.plate)) = lower(trim(documents.linked_to))
  );
--> statement-breakpoint
UPDATE transactions
SET vehicle_id = (
  SELECT MIN(vehicle.id)
  FROM vehicles AS vehicle
  WHERE lower(transactions.description) LIKE lower('[' || vehicle.plate || '] %')
)
WHERE vehicle_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM vehicles AS vehicle
    WHERE lower(transactions.description) LIKE lower('[' || vehicle.plate || '] %')
  );
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_reservation_overlap_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_reservation_overlap_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_vehicle_delete_with_linked_data;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_reservation_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_reservation_vehicle_id_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_service_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_service_vehicle_id_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_damage_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS require_damage_vehicle_id_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_transaction_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_transaction_vehicle_id_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_document_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_document_vehicle_id_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_block_vehicle_id_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS validate_block_vehicle_id_update;
--> statement-breakpoint
CREATE TRIGGER prevent_reservation_overlap_insert
BEFORE INSERT ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE existing.vehicle_id = NEW.vehicle_id
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
BEFORE UPDATE OF vehicle_id, starts_at, ends_at, status ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE existing.id <> OLD.id
      AND existing.vehicle_id = NEW.vehicle_id
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
CREATE TRIGGER prevent_vehicle_delete_with_linked_data
BEFORE DELETE ON vehicles
WHEN EXISTS (
    SELECT 1 FROM reservations WHERE reservations.vehicle_id = OLD.id
  )
  OR EXISTS (
    SELECT 1 FROM transactions WHERE transactions.vehicle_id = OLD.id
  )
  OR EXISTS (
    SELECT 1 FROM documents WHERE documents.vehicle_id = OLD.id
  )
  OR EXISTS (
    SELECT 1 FROM service_records WHERE service_records.vehicle_id = OLD.id
  )
  OR EXISTS (
    SELECT 1 FROM vehicle_damages WHERE vehicle_damages.vehicle_id = OLD.id
  )
  OR EXISTS (
    SELECT 1 FROM vehicle_availability_blocks
    WHERE vehicle_availability_blocks.vehicle_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_HAS_LINKED_DATA');
END;
--> statement-breakpoint
CREATE TRIGGER require_reservation_vehicle_id_insert
BEFORE INSERT ON reservations
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER require_reservation_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON reservations
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER require_service_vehicle_id_insert
BEFORE INSERT ON service_records
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER require_service_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON service_records
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER require_damage_vehicle_id_insert
BEFORE INSERT ON vehicle_damages
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER require_damage_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON vehicle_damages
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER validate_transaction_vehicle_id_insert
BEFORE INSERT ON transactions
WHEN NEW.vehicle_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
END;
--> statement-breakpoint
CREATE TRIGGER validate_transaction_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON transactions
WHEN NEW.vehicle_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
END;
--> statement-breakpoint
CREATE TRIGGER validate_document_vehicle_id_insert
BEFORE INSERT ON documents
WHEN NEW.vehicle_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
END;
--> statement-breakpoint
CREATE TRIGGER validate_document_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON documents
WHEN NEW.vehicle_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
END;
--> statement-breakpoint
CREATE TRIGGER validate_block_vehicle_id_insert
BEFORE INSERT ON vehicle_availability_blocks
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
--> statement-breakpoint
CREATE TRIGGER validate_block_vehicle_id_update
BEFORE UPDATE OF vehicle_id ON vehicle_availability_blocks
WHEN NEW.vehicle_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
END;
