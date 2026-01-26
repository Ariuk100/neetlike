import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export async function getGoogleDriveClient() {
    const serviceAccountKeyBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountKeyBase64) {
        throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 is not defined');
    }

    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8'));

    const auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key.replace(/\\n/g, '\n'),
        scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
}

export async function uploadToDrive(file: File, folderId: string) {
    const drive = await getGoogleDriveClient();

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileMetadata = {
        name: file.name,
        parents: [folderId],
    };

    const media = {
        mimeType: file.type,
        body: Readable.from(buffer),
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
    });

    return response.data;
}
