ALTER TABLE `reservations` ADD `client_id` integer;
--> statement-breakpoint
CREATE INDEX `idx_reservations_client_id` ON `reservations` (`client_id`);
--> statement-breakpoint
UPDATE reservations
SET client_id = (
  SELECT MIN(client.id)
  FROM clients AS client
  WHERE lower(trim(client.name)) = lower(trim(reservations.client))
)
WHERE client_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM clients AS client
    WHERE lower(trim(client.name)) = lower(trim(reservations.client))
  );
