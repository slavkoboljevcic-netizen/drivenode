CREATE TABLE `vehicle_damages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text NOT NULL,
  `vehicle` text NOT NULL,
  `plate` text NOT NULL,
  `description` text NOT NULL,
  `date` text NOT NULL,
  `cost` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'Prijavljena' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `idx_vehicle_damages_code` ON `vehicle_damages` (`code`);
