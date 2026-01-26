import { google } from 'googleapis';

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
];

export async function getGoogleSheetsClient() {
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

    return google.sheets({ version: 'v4', auth });
}

export async function getSpreadsheetData(spreadsheetId: string, range: string) {
    try {
        const sheets = await getGoogleSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.data.values;
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('getSpreadsheetData Error:', (error as any)?.response?.data || (error as Error).message);
        throw error;
    }
}

export async function updateSpreadsheetRow(spreadsheetId: string, range: string, values: (string | number | boolean)[][]) {
    try {
        const sheets = await getGoogleSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: { values },
        });
        return response.data;
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('updateSpreadsheetRow Error:', (error as any)?.response?.data || (error as Error).message);
        throw error;
    }
}

export async function appendSpreadsheetRow(spreadsheetId: string, range: string, values: (string | number | boolean)[][]) {
    try {
        const sheets = await getGoogleSheetsClient();
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: { values },
        });
        return response.data;
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('appendSpreadsheetRow Error:', (error as any)?.response?.data || (error as Error).message);
        throw error;
    }
}
