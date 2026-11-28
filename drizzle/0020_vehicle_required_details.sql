ALTER TABLE `vehicles` ADD `make` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `model` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `category` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `seats` integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vehicles_vin_unique`
ON `vehicles` (upper(trim(`vin`)))
WHERE trim(`vin`) <> '';
