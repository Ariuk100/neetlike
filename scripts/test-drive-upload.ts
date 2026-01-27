import * as dotenv from 'dotenv';
import * as path from 'path';
import { uploadToDrive } from '../lib/google-drive';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testUpload() {
    const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!DRIVE_FOLDER_ID) {
        console.error('GOOGLE_DRIVE_FOLDER_ID is missing');
        process.exit(1);
    }

    console.log('Testing upload to Drive folder:', DRIVE_FOLDER_ID);

    // Mock a File object
    const content = 'Hello, this is a test file for Google Drive upload.';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test-upload.txt', { type: 'text/plain' });

    try {
        const result = await uploadToDrive(file, DRIVE_FOLDER_ID);
        console.log('Upload successful!');
        console.log('File ID:', result.id);
        console.log('View Link:', result.webViewLink);
    } catch (error: any) {
        console.error('Upload failed:');
        if (error.response && error.response.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error);
        }
    }
}

testUpload();
