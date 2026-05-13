export type GalleryListItem = {
  id: string;
  width: number;
  height: number;
  createdAtMs: number;
};

/** Admin-only; includes uploader info from `user` join. */
export type AdminGalleryListItem = GalleryListItem & {
  uploaderUserId: string;
  uploaderName: string;
  uploaderIsAnonymous: boolean;
};
