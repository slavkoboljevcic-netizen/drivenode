ALTER TABLE `vehicles` ADD `out_of_service` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE vehicles
SET out_of_service = 1
WHERE status = 'Van upotrebe';
