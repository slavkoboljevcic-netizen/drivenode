CREATE TABLE `service_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`vehicle` text NOT NULL,
	`plate` text NOT NULL,
	`type` text NOT NULL,
	`due_date` text NOT NULL,
	`mileage` integer DEFAULT 0 NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`workshop` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Planirano' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_service_records_code` ON `service_records` (`code`);