'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Upload a file to Firebase Storage and return the download URL
 */
export async function uploadWhiteboardImage(
    sessionId: string,
    pageIndex: number,
    file: File
): Promise<string> {
    // Create unique filename
    const timestamp = Date.now();
    // Sanitize filename: remove special characters, keep extension
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const storagePath = `whiteboard/${sessionId}/page_${pageIndex}/${filename}`;

    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

/**
 * Generate a unique element ID
 */
export function generateElementId(): string {
    return `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
