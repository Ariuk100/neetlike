import { getGoogleSheetsClient, getSpreadsheetData } from './lib/google-sheets';

async function inspectCategories() {
    const spreadsheetId = '1M6e6-M8lyS-wf6SW5n5Cx2icHmOuruW_D_--e79maGw';
    try {
        const rows = await getSpreadsheetData(spreadsheetId, 'Categories!A1:C100');
        console.log('Categories Data:');
        console.table(rows);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

inspectCategories();
