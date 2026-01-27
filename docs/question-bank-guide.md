# Question Bank Module - Техникийн заавар

Энэхүү баримт бичиг нь "Unified School System"-ийн асуултын сангийн модулийн бүтэц, ажиллагаа болон түүнийг хэрхэн удирдах талаарх техникийн мэдээллийг агуулна.

## 1. Архитектур (Architecture)

Систем нь **"Master vs. Runtime"** гэсэн зарчмаар ажилладаг:
- **Master Source (Google Sheets)**: Багш нар асуултыг гараар засах, нэмэх, удирдах үндсэн орчин.
- **Runtime Source (Cloudflare D1/R2)**: Шалгалтын үед сурагчдад асуултыг маш хурдан (Sheet-ээс 10-20 дахин хурдан) хүргэх транзакц орчин.

### Дата урсгал:
1. Багш Next.js систем дэх **Editor**-ыг ашиглан Sheet рүү асуулт хадгална (`sheets-action.ts`).
2. Cloudflare Worker нь Sheet-ээс датаг уншиж **D1** (Metadata) болон **R2** (JSON Package) руу синк хийнэ.
3. Сурагч шалгалт эхлэхэд Cloudflare-ийн бэлэн багцыг (JSON) уншина.

## 2. Google Sheets Бүтэц

Google Spreadsheet нь доорх хоёр үндсэн табтай байх ёстой:

### A. "MCQ" Таб (Questions)
Асуултуудыг хадгалах үндсэн Sheet.
- **Баганууд**: `ID`, `Status`, `Subject`, `Topic`, `Sub-topic`, `Grade`, `Bloom`, `Difficulty`, `Question Text`, `Opt 1-5 Text/Image`, `Correct Answer`, `Solution Text/Image`.
- **Status**: `active` (идэвхтэй), `inactive` (идэвхгүй - шинэ асуултын анхны төрөл), `deleted` (устгасан - систем харуулахгүй).

### B. "Categories" Таб (Hierarchy)
Dropdown сонголтуудыг динамикаар удирдах Sheet.
- **Баганууд**: `Subject`, `Topic`, `Sub-topic`.
- **Тэмдэглэл**: Мөр бүрт Хичээл болон Сэдвийг заавал давтан бичнэ.

## 3. Teacher Editor (Next.js & Server Actions)

Editor нь системд бүрэн React component хэлбэрээр хийгдсэн бөгөөд `sheets-action.ts`-ээр дамжуулан Google Sheets болон Firebase Storage-тай харьцдаг.

### Үндсэн функцууд:
- **Direct Sheet Integration**: Google Sheets API v4 ашиглан өгөгдлийг шууд унших/бичих (Service Account).
- **Image Optimization**: Зургийг `sheets-action.ts` ашиглан Firebase Storage руу хуулна. Олсон public link-ийг Sheet-д хадгална.
- **Шатлалт сонголт**: Хичээл сонгоход түүнд хамаарах Сэдэв, түүнд хамаарах Дэд сэдвүүд л шүүгдэж гарч ирнэ.
- **Preview**: Асуулт болон бодолтыг бичих явцад шууд харах (Live Preview) боломжтой.
- **Soft Delete**: Асуултыг устгахад `deleted` төлөвтэй болно.

## 4. Next.js Integration

### Sidebar холболт:
- `components/menuData.ts` файл дээр `teacher_tasks` ID-тай цэс нэмэгдсэн.

### Хуудас:
- `app/teacher/tasks/page.tsx`: Асуултын жагсаалт, шүүлтүүр.
- `app/teacher/tasks/editor/page.tsx`: Асуулт нэмэх, засах форм.

## 5. Deployment & Maintenance

1. **Environment Variables**: `.env.local` дотор `GOOGLE_SHEET_ID` болон `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64` тохируулагдсан байх шаардлагатай.
2. **Sheet-ийн толгой**: Sheet-ийн эхний мөрийн нэрсийг (Headers) болон баганын дарааллыг өөрчилж болохгүй, энэ нь кодтой (`sheets-action.ts`) хатуу уягдсан.
