CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`plate` text NOT NULL,
	`year` integer NOT NULL,
	`km` integer DEFAULT 0 NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'Dostupno' NOT NULL,
	`service` text DEFAULT 'Nije zakazano' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vehicles_plate` ON `vehicles` (`plate`);