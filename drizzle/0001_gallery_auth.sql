ALTER TABLE `session` ADD `impersonated_by` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_anonymous` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` integer;--> statement-breakpoint
CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`uploader_user_id` text NOT NULL,
	`r2_key_full` text NOT NULL,
	`r2_key_placeholder` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`uploader_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `images_uploaderUserId_createdAt_idx` ON `images` (`uploader_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `images_createdAt_id_idx` ON `images` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `images_deletedAt_idx` ON `images` (`deleted_at`);
