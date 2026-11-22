ALTER TABLE `vehicles` ADD `registration_expires_at` text;
--> statement-breakpoint
ALTER TABLE `service_records` ADD `ends_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `vehicle_availability_blocks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text NOT NULL,
  `vehicle_id` integer NOT NULL,
  `reason` text NOT NULL,
  `starts_at` text NOT NULL,
  `ends_at` text NOT NULL,
  `status` text DEFAULT 'Aktivna' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vehicle_availability_blocks_code` ON `vehicle_availability_blocks` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_vehicle_availability_blocks_vehicle_id` ON `vehicle_availability_blocks` (`vehicle_id`);
--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_vehicle_delete_with_linked_data;
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
  OR EXISTS (
    SELECT 1 FROM vehicle_availability_blocks
    WHERE vehicle_availability_blocks.vehicle_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_HAS_LINKED_DATA');
END;
