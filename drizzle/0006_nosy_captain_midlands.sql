CREATE TABLE `team_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`branch` text NOT NULL,
	`status` text DEFAULT 'Pozvan' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`last_active` text DEFAULT 'Još nije aktivan' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_team_users_email` ON `team_users` (`email`);