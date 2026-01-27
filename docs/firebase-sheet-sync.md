# Firebase Storage & Sheet Sync Implementation

Энэхүү баримт бичигт асуултын сангийн системд хийгдсэн сүүлийн үеийн өөрчлөлтүүд, тэр дундаа Firebase Storage болон Google Sheets Sync-ийн шинэчлэлтийг тайлбарлах болно.

## 1. Firebase Storage руу шилжих (Image Handling)

Өмнө нь зургийг Google Drive дээр хадгалж байсан нь "500 Internal Server Error" болон Quota хязгаарлалт үүсгэж байсан тул, зургийн хадгалалтыг **Firebase Storage** руу бүрэн шилжүүлэв.

### Өөрчлөлтүүд:
- **Direct Upload**: Зургийг `sheets-action.ts` доторх `uploadImage` функцээр дамжуулан Firebase Storage-ийн `questions/` хавтас руу шууд хуулна.
- **Public Access**: Хуулсан зурагт `makePublic()` команд ажиллуулж, `https://storage.googleapis.com/...` гэсэн нийтийн холбоосыг авна.
- **Sheet Integration**: Энэхүү холбоосыг Google Sheet-ийн харгалзах баганад (`questionImage`, `opt1Image` гэх мэт) хадгална.

## 2. Sheets <-> Firestore Sync

Асуултын өгөгдлийг Google Sheet-д бүрэн эхээр нь (Master), Firestore-д хайлт, шүүлт хийхэд зориулагдсан хөнгөн хэлбэрээр (Metadata) давхар хадгалдаг болгосон.

### `upsertQuestion` функцийн логик:
1. **Prepare Data**: `question` объектод `updatedAt` цаг болон `id` онооно.
2. **Sheet Save**: Бүх өгөгдлийг (текст, зураг, сонголтууд гэх мэт) Google Sheet рүү хадгална.
3. **Firestore Metadata Save**: Зөвхөн шүүлт хийхэд хэрэгтэй талбаруудыг (`subject`, `topic`, `difficulty`, `grade`, `status`, `id` гэх мэт) Firestore-ийн `questions` цуглуулга руу `set(merge: true)` хийнэ.
   - *Анхаар*: Хүнд текстүүд (questionText, solutionText) Firestore-д хадгалагдахгүй.

## 3. Soft Delete Implementation

Асуултыг устгах үед шууд физикээр устгахгүйгээр "Soft Delete" хийнэ.

- **Sheet**: Тухайн мөрийн `status` баганы утгыг `deleted` болгож шинэчилнэ.
- **Firestore**: Тухайн асуултын `id`-аар олж `status: 'deleted'` гэж шинэчилнэ.
- **Filter**: Систем `deleted` статустай асуултуудыг жагсаалтад харуулахгүй шүүнэ.

## 4. Давуу талууд
- **Найдвартай байдал**: Google Drive-ийн permission алдаанаас сэргийлсэн.
- **Хурд**: Firestore-оос хайлт хийх нь Google Sheet-ээс бүх мөрийг уншихаас хурдан.
- **Data Integrity**: ID дээр суурилсан sync нь мөрийн дугаар зөрөх эрсдэлийг бууруулна.
