import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountBase64) {
        console.error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 missing');
        process.exit(1);
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const auth = admin.auth();
const db = admin.firestore();

interface StudentInput {
    class: string;
    code: string;
    name: string;
}

const STUDENTS: StudentInput[] = [
    // ===== 11Д =====
    { class: "11Д", code: "1", name: "Гантулга Ананд" },
    { class: "11Д", code: "2", name: "Тунгалаг Анар" },
    { class: "11Д", code: "3", name: "Энхтайван Ариунбаяр" },
    { class: "11Д", code: "4", name: "Батмөнх Ариунболор" },
    { class: "11Д", code: "5", name: "Энхболд Ариунmөр" },
    { class: "11Д", code: "6", name: "Баярбаатар Батноров" },
    { class: "11Д", code: "7", name: "Сангарагчаа Билгүүндарь" },
    { class: "11Д", code: "8", name: "Батчулуун Ботахангуа" },
    { class: "11Д", code: "9", name: "Тэмүүлэн Гэрэлт" },
    { class: "11Д", code: "10", name: "Галаарид Дүүрэнбилэг" },
    { class: "11Д", code: "11", name: "Мөнгөнсүх Жавхлан" },
    { class: "11Д", code: "12", name: "Ганхуяг Ирмүүн" },
    { class: "11Д", code: "13", name: "Өлзийнасан Магнай" },
    { class: "11Д", code: "14", name: "Идэр Маргад" },
    { class: "11Д", code: "15", name: "Батжаргал Мөнх-Энэрэл" },
    { class: "11Д", code: "16", name: "Дэлгэрсайхан Намхайнорвуу" },
    { class: "11Д", code: "17", name: "Сэржмаа Наранбат" },
    { class: "11Д", code: "18", name: "Баттөр Наранзун" },
    { class: "11Д", code: "19", name: "Мөнхбаяр Номунзаяа" },
    { class: "11Д", code: "20", name: "Ганболд Төгөлдөр" },
    { class: "11Д", code: "21", name: "Мөнхбаяр Хулан" },
    { class: "11Д", code: "22", name: "Даваадорж Хүслэн" },
    { class: "11Д", code: "23", name: "Манлайбаатар Цогтзул" },
    { class: "11Д", code: "24", name: "Сономванчиг Цэнгэгмөрөн" },
    { class: "11Д", code: "25", name: "Батбаяр Энхжин" },
    { class: "11Д", code: "26", name: "Ганхуяг Эрдэнэсувд" },
    { class: "11Д", code: "27", name: "Эрдэнэбаатар Эрхэс" },
    { class: "11Д", code: "28", name: "Эрдэнэсүх Янжинхорол" },

    // ===== 11В =====
    { class: "11В", code: "29", name: "Баянмөнх Амархүү" },
    { class: "11В", code: "30", name: "Мянгат Арвин" },
    { class: "11В", code: "31", name: "Нандин-Од Байгаль" },
    { class: "11В", code: "32", name: "Ариунболор Болорнаран" },
    { class: "11В", code: "33", name: "Одбаяр Гэрэлт-Од" },
    { class: "11В", code: "34", name: "Оргилжаргал Жаргалмаа" },
    { class: "11В", code: "35", name: "Бадрах Марал" },
    { class: "11В", code: "36", name: "Баатартогтох Марал-Эрдэнэ" },
    { class: "11В", code: "37", name: "Баярбаатар Содон" },
    { class: "11В", code: "38", name: "Чинбат Тунамалтаж" },
    { class: "11В", code: "39", name: "Алдар Тэнгис" },
    { class: "11В", code: "40", name: "Ууганбаяр Хонгорзул" },
    { class: "11В", code: "41", name: "Дадаабазар Хонгорзул" },
    { class: "11В", code: "42", name: "Эрдэнэбаатар Чингүүн" },
    { class: "11В", code: "43", name: "Дашринчин Эгшиглэн" },
    { class: "11В", code: "44", name: "Болдбаатар Энххүслэн" },
    { class: "11В", code: "45", name: "Ялалт Эрхэм" },

    // ===== 11А =====
    { class: "11А", code: "46", name: "Энхзол Азбилэг" },
    { class: "11А", code: "47", name: "Эрдэмбаяр Ананд" },
    { class: "11А", code: "48", name: "Баттулга Ач-Эрдэнэ" },
    { class: "11А", code: "49", name: "Батболд Билгүүнболд" },
    { class: "11А", code: "50", name: "Сэнгэсамбуу Доржрэнцэн" },
    { class: "11А", code: "51", name: "Баатарчулуун Жавхлан" },
    { class: "11А", code: "52", name: "Ариунбаатар Золбоо" },
    { class: "11А", code: "53", name: "Амарбаясгалан Итгэл" },
    { class: "11А", code: "54", name: "Баярхүү Мөнх-Очир" },
    { class: "11А", code: "55", name: "Мөнхцас Мөрөн" },
    { class: "11А", code: "56", name: "Энх-Амгалан Наранцацрал" },
    { class: "11А", code: "57", name: "Баттулга Номундарь" },
    { class: "11А", code: "58", name: "Цэнд-Аюуш Сүлд" },
    { class: "11А", code: "59", name: "Баяртөгс Сүндэр" },
    { class: "11А", code: "60", name: "Төвшинтөгс Төгөлдөр" },
    { class: "11А", code: "61", name: "Мөнхтулга Төгөлдөр" },
    { class: "11А", code: "62", name: "Түвшинтөгс Учрал" },
    { class: "11А", code: "63", name: "Батмөнх Үлэмж" },
    { class: "11А", code: "64", name: "Мягмарсүрэн Хүслэн" },
    { class: "11А", code: "65", name: "Ганболд Хүслэн" },
    { class: "11А", code: "66", name: "Цэгц Цэлмэг" },
    { class: "11А", code: "67", name: "Батбаяр Чинбишрэлт" },
    { class: "11А", code: "68", name: "Батзориг Чингүүн" },
    { class: "11А", code: "69", name: "Ганбат Чойдэлгэр" },
    { class: "11А", code: "70", name: "Энх-Амар Энх-Амгаланбаатар" },
    { class: "11А", code: "71", name: "Цогт Энхлэн" },
    { class: "11А", code: "72", name: "Идэрхангай Эрдэнэбаяр" },
    { class: "11А", code: "73", name: "Болдбат Ялгуун" },

    // ===== 10В =====
    { class: "10В", code: "74", name: "Амартүвшин Ану-Үжин" },
    { class: "10В", code: "75", name: "Оюунбаатар Баатархүү" },
    { class: "10В", code: "76", name: "Батсайхан Батзориг" },
    { class: "10В", code: "77", name: "Бүдсүрэн Гантөмөр" },
    { class: "10В", code: "78", name: "Алтангэрэл Дүүрэнжаргал" },
    { class: "10В", code: "79", name: "Батсуурь Итгэлт" },
    { class: "10В", code: "80", name: "Тэнгис Марал" },
    { class: "10В", code: "81", name: "Энхбаатар Мишээл" },
    { class: "10В", code: "82", name: "Энхбат Мөнгөнбаатар" },
    { class: "10В", code: "83", name: "Мөнхжаргал Мөнх-Очир" },
    { class: "10В", code: "84", name: "Энхбат Нандин-Эрдэнэ" },
    { class: "10В", code: "85", name: "Оюунболд Оюужин" },
    { class: "10В", code: "86", name: "Буянзаяа Оюундагина" },
    { class: "10В", code: "87", name: "Түвшинжаргал Сийлэн" },
    { class: "10В", code: "88", name: "Цээлэй Солонго" },
    { class: "10В", code: "89", name: "Батбаяр Төгөлдөр" },
    { class: "10В", code: "90", name: "Өлзий Төгөлдөр" },
    { class: "10В", code: "91", name: "Мэндсайхан Төрбилигт" },
    { class: "10В", code: "92", name: "Батзориг Тэмүүлэн" },
    { class: "10В", code: "93", name: "Бат-Эрдэнэ Тэнүүн" },
    { class: "10В", code: "94", name: "Зоригтбат Тэнүүнзаяа" },
    { class: "10В", code: "95", name: "Чинбат Тэргэл" },
    { class: "10В", code: "96", name: "Энхбат Хангарьд" },
    { class: "10В", code: "97", name: "Өнөрбаяр Хунан" },
    { class: "10В", code: "98", name: "Эрхэмбаатар Хүсэлбаатар" },
    { class: "10В", code: "99", name: "Шагдарсүрэн Цогт" },
    { class: "10В", code: "100", name: "Түвшинтөгс Цэлмүүн" },
    { class: "10В", code: "101", name: "Энхбаатар Цэнгэл" },
    { class: "10В", code: "102", name: "Лундаажанцан Энхбаян" },
    { class: "10В", code: "103", name: "Батдорж Энхбилэг" },
    { class: "10В", code: "104", name: "Баяржаргал Энхсаруул" },
    { class: "10В", code: "105", name: "Мөнхжаргал Энэрэл" },
    { class: "10В", code: "106", name: "Мягмар Эрхэмбаяр" },

    // ===== 10Б =====
    { class: "10Б", code: "107", name: "Venegas Khasar" },
    { class: "10Б", code: "108", name: "Түвдэндорж Агарбат" },
    { class: "10Б", code: "109", name: "Мөнхжаргал Амирлан" },
    { class: "10Б", code: "110", name: "Ананд Анар" },
    { class: "10Б", code: "111", name: "Галбадрах Анирлан" },
    { class: "10Б", code: "112", name: "Чинбат Ариунбат" },
    { class: "10Б", code: "113", name: "Сүхболд Батболд" },
    { class: "10Б", code: "114", name: "Эрдэнээ Билгүүнбаяр" },
    { class: "10Б", code: "115", name: "Сандагдорж Биндэръяа" },
    { class: "10Б", code: "116", name: "Билэг-Өрнөх Буянтогтох" },
    { class: "10Б", code: "117", name: "Хаш-Эрдэнэ Ванчинсүрэн" },
    { class: "10Б", code: "118", name: "Дашдэмбэрэл Гарьдмагнай" },
    { class: "10Б", code: "119", name: "Чинзориг Гэгээ" },
    { class: "10Б", code: "120", name: "Батзориг Гэгээнээ" },
    { class: "10Б", code: "121", name: "Дашпүрэв Дөл" },
    { class: "10Б", code: "122", name: "Ууганбаатар Жавхлан" },
    { class: "10Б", code: "123", name: "Ганбаатар Майдар" },
    { class: "10Б", code: "124", name: "Нэмэхболд Маралмаа" },
    { class: "10Б", code: "125", name: "Идэр Мөнгөн" },
    { class: "10Б", code: "126", name: "Батбаяр Мөнгөнтуул" },
    { class: "10Б", code: "127", name: "Мөнхнаран Мөнхтэмүүлэн" },
    { class: "10Б", code: "128", name: "Алтанхуяг Нандинзүрх" },
    { class: "10Б", code: "129", name: "Ганхуяг Наранзүг" },
    { class: "10Б", code: "130", name: "Дарханбат Оюунболор" },
    { class: "10Б", code: "131", name: "Ганзориг Өгөөмөр" },
    { class: "10Б", code: "132", name: "Энхзориг Тэмүгэ" },
    { class: "10Б", code: "133", name: "Бат-Оргил Тэнгис" },
    { class: "10Б", code: "134", name: "Ганбат Удвалчимэг" },
    { class: "10Б", code: "135", name: "Төвшинтөгс Ундрам" },
    { class: "10Б", code: "136", name: "Мөнгөнтулга Хан-Очир" },
    { class: "10Б", code: "137", name: "Алтанхүү Цэлмүүн" },
    { class: "10Б", code: "138", name: "Цэнгэл Цэнгүүн" },
    { class: "10Б", code: "139", name: "Баттулга Эгшиглэн" },
    { class: "10Б", code: "140", name: "Мөнх-Эрдэнэ Эрдэмбаяр" },
    { class: "10Б", code: "141", name: "Найдан Эрдэнэсайхан" },
];

function generateUniqueCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper: "11Д" -> { grade: 11, group: "Д" }
function parseClass(classStr: string): { grade: number; group: string } {
    const match = classStr.match(/^(\d+)(.*)$/);
    if (!match) return { grade: 0, group: classStr };
    return {
        grade: parseInt(match[1], 10),
        group: match[2].trim(),
    };
}

// Helper: "Гантулга Ананд" -> { lastName: "Гантулга", firstName: "Ананд" }
function parseName(nameStr: string): { lastName: string; firstName: string } {
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return { lastName: "", firstName: parts[0] };
    return {
        lastName: parts[0],
        firstName: parts.slice(1).join(" "),
    };
}

async function main() {
    console.log(`Starting clean import of ${STUDENTS.length} students...`);

    const codes = new Set<string>();

    for (const studentInput of STUDENTS) {
        let studentCode = generateUniqueCode();
        while (codes.has(studentCode)) {
            studentCode = generateUniqueCode();
        }
        codes.add(studentCode);

        const email = `${studentCode}@physx.local`;
        const password = studentCode;

        const { grade, group } = parseClass(studentInput.class);
        const { lastName, firstName } = parseName(studentInput.name);

        try {
            // 1. Create Auth User
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: studentInput.name,
            });

            // 2. Set Custom Claims
            await auth.setCustomUserClaims(userRecord.uid, { role: 'student' });

            // 3. Create Firestore Document in 'users' collection
            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                lastName: lastName,
                firstName: firstName,
                name: firstName, // Нэр талбар дээр нь зөвхөн өөрийнх нь нэрийг орууллаа
                ovog: lastName, // Тайлбарлахад хялбар болгож нэмэлт талбар
                fullDisplay: `${lastName} ${firstName}`,
                class: studentInput.class.trim(),
                grade: grade,
                group: group,
                studentCode: studentCode,
                role: 'student',
                email: email,
                passwordHint: studentCode,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[SUCCESS] Registered: ${lastName} -> ${firstName} (Class: ${grade}, Group: ${group}) - Code: ${studentCode}`);
        } catch (error: any) {
            console.error(`[ERROR] Failed to register ${studentInput.name}:`, error.message);
        }
    }

    console.log('Import completed.');
}

main().catch(console.error);
