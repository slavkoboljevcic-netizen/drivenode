CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'Plaćeno' NOT NULL,
	`payment_method` text DEFAULT 'Kartica' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transactions_reference` ON `transactions` (`reference`);