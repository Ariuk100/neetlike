import Link from 'next/link';
import Image from 'next/image';
export default function NotFound() {
    return (
      <div className="relative flex flex-col justify-center min-h-screen overflow-hidden">
        <div className="w-full m-auto bg-white dark:bg-slate-800/60 rounded shadow-lg ring-2 ring-slate-300/50 dark:ring-slate-700/50 lg:max-w-md">
          
          {/* Header section */}
          <div className="text-center p-6 bg-slate-900 rounded-t">
          <Link href="/">
  <Image
    src="/assets/images/logo-sm.png"
    alt="PhysX лого"
    width={56}
    height={56}
    className="mx-auto mb-2"
  />
</Link>
            <h3 className="font-semibold text-white text-xl mb-1">
              Уучлаарай, хуудас олдсонгүй
            </h3>
            <p className="text-xs text-slate-400">
              Нүүр хуудас руу буцна уу.
            </p>
          </div>
  
          {/* Content section */}
          <div className="p-6">
            <div className="text-center">
            <Image
  src="/assets/images/widgets/error.png"
  alt="Алдаа"
  width={128}
  height={128}
  className="block mx-auto my-6"
/>
              <h1 className="font-bold text-7xl dark:text-slate-200">404!</h1>
              <h5 className="font-medium text-lg text-slate-400">
                Ямар нэгэн алдаа гарлаа
              </h5>
            </div>
  
            {/* Button */}
            <div className="mt-6">
              <Link
                href="/"
                className="w-full block text-center px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:bg-blue-600"
              >
                Нүүр хуудас руу буцах
              </Link>
            </div>
          </div>
  
        </div>
      </div>
    );
  }