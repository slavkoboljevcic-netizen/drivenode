CREATE TABLE `deleted_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`record_key` text NOT NULL,
	`deleted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_by` text DEFAULT 'Marko Nikolić' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deleted_records_entity_key` ON `deleted_records` (`entity`,`record_key`);