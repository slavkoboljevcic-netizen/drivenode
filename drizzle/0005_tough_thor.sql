CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`folder` text NOT NULL,
	`linked_to` text DEFAULT '' NOT NULL,
	`uploaded_by` text DEFAULT 'Marko Nikolić' NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_storage_key` ON `documents` (`storage_key`);