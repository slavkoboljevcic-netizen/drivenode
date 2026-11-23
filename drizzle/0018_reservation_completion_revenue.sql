ALTER TABLE `reservations` ADD `completed_at` text;
--> statement-breakpoint
UPDATE `reservations`
SET `completed_at` = `ends_at`
WHERE `status` = 'Završena'
  AND `completed_at` IS NULL;
