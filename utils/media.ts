import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { AttachmentWithUrl } from "@/types/attachment";

/**
 * Check AWS media URL isn't expired
 * @param url - The media URL
 * @returns True if the media URL is expired, false otherwise
 */
export function isMediaExpired(url: string): boolean {
  const urlObj = new URL(url);
  const expires = urlObj.searchParams.get("Expires");
  if (!expires) {
    return false;
  }
  return new Date(parseInt(expires, 10) * 1000) < new Date();
}

/**
 * Removes AWS secret parameters from a media URL
 * @param attachment - The attachment with the URL
 * @returns The media URL without AWS secret parameters
 */
export function mediaKey(url: string): string {
  const urlObj = new URL(url);
  urlObj.search = "";
  return urlObj.toString();
}

/**
 * Downloads a file from a given attachment URL and saves it locally
 */
export async function downloadFile(
  attachment: AttachmentWithUrl,
): Promise<FileSystem.FileSystemDownloadResult> {
  // Extract unique filename by removing query parameters and getting the last path segment
  // since URL is like this: https://storage.medplum.com/binary/<uuid>/<uuid>?<query_params>
  const url = new URL(attachment.url);
  let filename = `${url.pathname.split("/").pop()}-${attachment.title}`.trim();
  if (!filename) {
    filename = `download-at-${new Date().toISOString()}`;
  }
  return FileSystem.downloadAsync(attachment.url, FileSystem.documentDirectory + filename);
}

/**
 * Downloads and opens the native share dialog for a file attachment
 * @throws Error if download or sharing fails
 */
export async function shareFile(attachment: AttachmentWithUrl): Promise<void> {
  const downloadResult = await downloadFile(attachment);

  if (downloadResult.status !== 200) {
    throw new Error("Failed to download file");
  }

  await Sharing.shareAsync(downloadResult.uri, {
    mimeType: attachment.contentType || "application/octet-stream",
    dialogTitle: `Share File: ${attachment.title}`,
  });
}
