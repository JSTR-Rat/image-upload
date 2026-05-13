import { ulid } from 'ulid';

export function newImageRecordId(): string {
  return ulid();
}

export function r2FullKey(id: string): string {
  return `img/${id}/full.webp`;
}

export function r2PlaceholderKey(id: string): string {
  return `img/${id}/placeholder.webp`;
}
