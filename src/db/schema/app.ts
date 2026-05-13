import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth';

export const images = sqliteTable(
  'images',
  {
    id: text('id').primaryKey(),
    uploaderUserId: text('uploader_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    r2KeyFull: text('r2_key_full').notNull(),
    r2KeyPlaceholder: text('r2_key_placeholder').notNull(),
    width: integer('width', { mode: 'number' }).notNull(),
    height: integer('height', { mode: 'number' }).notNull(),
    fileSize: integer('file_size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('images_uploaderUserId_createdAt_idx').on(
      table.uploaderUserId,
      table.createdAt,
    ),
    index('images_createdAt_id_idx').on(table.createdAt, table.id),
    index('images_deletedAt_idx').on(table.deletedAt),
  ],
);

export const imagesRelations = relations(images, ({ one }) => ({
  uploader: one(user, {
    fields: [images.uploaderUserId],
    references: [user.id],
  }),
}));
