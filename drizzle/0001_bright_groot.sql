CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`client` text NOT NULL,
	`vehicle` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`location` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Potvrđena' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_code` ON `reservations` (`code`);