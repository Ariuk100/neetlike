// app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, ClipboardList, TrendingUp, Mail, Phone, MapPin, Users, UserCheck, FileText, Award, Video,
  Sparkles, ShieldCheck, Lightbulb, MessageSquare, Newspaper, Handshake, Calendar, Star, Quote, BookText, Rocket, Send,
  UserPlus, Search, Play, DollarSign, Folder, GraduationCap, Percent, Gift, Briefcase, Atom, Check // Tag иконыг устгасан
} from 'lucide-react';

// Sample teacher data
const teachers = [
  {
    id: 1,
    name: 'Э. Оюунбаатар',
    title: 'Математикийн багш',
    image: 'https://placehold.co/150x150/ADD8E6/000000?text=Багш+1', // Image placeholder
  },
  {
    id: 2,
    name: 'Б. Цэцэгмаа',
    title: 'Физикийн багш',
    image: 'https://placehold.co/150x150/90EE90/000000?text=Багш+2',
  },
  {
    id: 3,
    name: 'Г. Гантулга',
    title: 'Химийн багш',
    image: 'https://placehold.co/150x150/FFB6C1/000000?text=Багш+3',
  },
  {
    id: 4,
    name: 'Д. Нарантуяа',
    title: 'Биологийн багш',
    image: 'https://placehold.co/150x150/FFD700/000000?text=Багш+4',
  },
  {
    id: 5,
    name: 'Ч. Батбаяр',
    title: 'Монгол хэлний багш',
    image: 'https://placehold.co/150x150/FFA07A/000000?text=Багш+5',
  },
];

// Sample testimonials data
const testimonials = [
  {
    id: 1,
    quote: "NEETLITE-ийн хичээлүүд маш ойлгомжтой, багш нар нь ч мундаг. Миний шалгалтын оноо мэдэгдэхүйц нэмэгдсэн!",
    author: "А. Ариунболд",
    title: "12-р ангийн сурагч",
    avatar: "https://placehold.co/80x80/E0BBE4/000000?text=А.А",
  },
  {
    id: 2,
    quote: "Дасгалууд нь үнэхээр ахиц гаргахад тустай. Өөрийгөө үнэлэх систем нь ч таалагдсан.",
    author: "Б. Энхтуул",
    title: "Их сургуулийн оюутан",
    avatar: "https://placehold.co/80x80/957DAD/000000?text=Б.Э",
  },
  {
    id: 3,
    quote: "Цаг хугацаа хэмнэсэн, хаанаас ч суралцах боломжтой нь маш давуу талтай.",
    author: "Г. Баярсайхан",
    title: "Ахлах сургуулийн багш",
    avatar: "https://placehold.co/80x80/FFC72C/000000?text=Г.Б",
  },
];

// Sample FAQ data
const faqs = [
  {
    id: 1,
    question: "NEETLITE-д хэрхэн бүртгүүлэх вэ?",
    answer: "Та манай нүүр хуудасны 'Нэвтрэх / Бүртгүүлэх' товчийг даран бүртгүүлэх боломжтой. И-мэйл эсвэл Google-ээр бүртгүүлж болно."
  },
  {
    id: 2,
    question: "Хичээлүүд хэр хугацаанд үргэлжлэх вэ?",
    answer: "Манай хичээлүүд нь таны өөририйн хурдаар суралцах боломжтой байхаар зохион байгуулагдсан. Та хүссэн үедээ эхлүүлж, дуусгах боломжтой."
  },
  {
    id: 3,
    question: "Төлбөрийн ямар сонголтууд байдаг вэ?",
    answer: "Бид сар, улирал, жилийн багцуудыг санал болгодог. Дэлгэрэнгүй мэдээллийг 'Үйлчилгээ' хэсгээс харна уу."
  },
];

// Sample Blog data
const blogPosts = [
  {
    id: 1,
    title: "Онлайн сургалтын ирээдүй ба NEETLITE",
    summary: "Цахим сургалт хэрхэн таны амьдралыг өөрчлөх тухай.",
    image: "https://placehold.co/300x200/FFD8B2/000000?text=Блог+1",
    link: "#"
  },
  {
    id: 2,
    title: "Шалгалтанд хэрхэн амжилттай бэлдэх вэ?",
    summary: "Шалгалтанд бэлдэх үр дүнтэй аргууд.",
    image: "https://placehold.co/300x200/C2E0FF/000000?text=Блог+2",
    link: "#"
  },
  {
    id: 3,
    title: "Багш нарын шинэчлэгдсэн хичээлүүд",
    summary: "Манай багш нарын бэлтгэсэн шинэ хичээлүүдийн танилцуулга.",
    image: "https://placehold.co/300x200/D4A5A5/000000?text=Блог+3",
    link: "#"
  },
];

// Sample Partners data
const partners = [
  { id: 1, name: 'Түнш 1', logo: 'https://placehold.co/100x50/F0F0F0/000000?text=Лого+1' },
  { id: 2, name: 'Түнш 2', logo: 'https://placehold.co/100x50/E0E0E0/000000?text=Лого+2' },
  { id: 3, name: 'Түнш 3', logo: 'https://placehold.co/100x50/D0D0D0/000000?text=Лого+3' },
  { id: 4, name: 'Түнш 4', logo: 'https://placehold.co/100x50/C0C0C0/000000?text=Лого+4' },
  { id: 5, name: 'Түнш 5', logo: 'https://placehold.co/100x50/B0B0B0/000000?text=Лого+5' },
];

// Sample Featured Courses data
const featuredCourses = [
  {
    id: 1,
    title: "Бүрэн Дунд Боловсролын Математик",
    description: "Математикийн үндсэн ойлголтууд болон шалгалтанд бэлдэх хичээл.",
    image: "https://placehold.co/300x200/A2D2FF/000000?text=Математик",
    link: "#"
  },
  {
    id: 2,
    title: "Физикийн Гүнзгийрүүлсэн Сургалт",
    description: "Физикийн хуулиуд, бодлого бодох аргачлал.",
    image: "https://placehold.co/300x200/BDE0FE/000000?text=Физик",
    link: "#"
  },
  {
    id: 3,
    title: "Химийн Урвалын Үндэс",
    description: "Органик болон органик бус химийн хичээлүүд.",
    image: "https://placehold.co/300x200/FFC8DD/000000?text=Хими",
    link: "#"
  },
];

// Sample Pricing Plans data
const pricingPlans = [
  {
    id: 1,
    name: "Үндсэн Багц",
    price: "₮29,000",
    period: "/ сар",
    features: [
      "Бүх видео хичээлүүд",
      "Үндсэн дасгал ажлууд",
      "Хөгжлийн хяналт",
      "И-мэйл дэмжлэг"
    ],
    buttonText: "Эхлэх",
    buttonLink: "#",
    isFeatured: false,
  },
  {
    id: 2,
    name: "Дээд Зэрэглэлийн Багц",
    price: "₮69,000",
    period: "/ сар",
    features: [
      "Бүх видео хичээлүүд",
      "Бүрэн дасгал ажлууд",
      "Гүнзгийрүүлсэн хөгжлийн хяналт",
      "24/7 чат дэмжлэг",
      "Багштай шууд холбогдох",
      "Нэмэлт материал"
    ],
    buttonText: "Сонгох",
    buttonLink: "#",
    isFeatured: true,
  },
  {
    id: 3,
    name: "Жилийн Багц",
    price: "₮299,000",
    period: "/ жил",
    features: [
      "Дээд Зэрэглэлийн Багцын бүх боломж",
      "Жилийн турш хязгааргүй хандалт",
      "Онцгой вебинар, семинарт оролцох",
      "Хувийн зөвлөгөө"
    ],
    buttonText: "Худалдан Авах",
    buttonLink: "#",
    isFeatured: false,
  },
];

// Sample Course Categories data
const courseCategories = [
  { id: 1, name: "Математик", icon: BookOpen, count: "50+ хичээл", link: "#" },
  { id: 2, name: "Физик", icon: Atom, count: "40+ хичээл", link: "#" },
  { id: 3, name: "Хими", icon: Lightbulb, count: "35+ хичээл", link: "#" },
  { id: 4, name: "Биологи", icon: GraduationCap, count: "30+ хичээл", link: "#" },
  { id: 5, name: "Монгол Хэл", icon: FileText, count: "25+ хичээл", link: "#" },
  { id: 6, name: "Англи Хэл", icon: MessageSquare, count: "45+ хичээл", link: "#" },
];

// Sample Teaching Methodology data
const teachingMethodology = [
  {
    id: 1,
    title: "Интерактив Видео Хичээлүүд",
    description: "Орчин үеийн, сонирхолтой видео хичээлүүд нь таныг идэвхтэй оролцуулна.",
    icon: Video,
  },
  {
    id: 2,
    title: "Хувийн Сургалтын Зам",
    description: "Таны суралцах хурд, сонирхолд тохирсон хувийн хөтөлбөр.",
    icon: TrendingUp,
  },
  {
    id: 3,
    title: "Практик Дасгал Ажлууд",
    description: "Онолын мэдлэгээ бататгах олон төрлийн дасгал, тестүүд.",
    icon: ClipboardList,
  },
  {
    id: 4,
    title: "Мэргэжлийн Багшийн Дэмжлэг",
    description: "Туршлагатай багш нараас шууд зөвлөгөө, тусламж авна.",
    icon: Users,
  },
];

// Sample Scholarships / Discounts data
const scholarships = [
  {
    id: 1,
    title: "Шилдэг Сурагчийн Тэтгэлэг",
    description: "Амжилттай суралцагчдад зориулсан жилийн тэтгэлэг.",
    icon: Award,
    link: "#",
  },
  {
    id: 2,
    title: "Эрт Бүртгүүлсэн Хөнгөлөлт",
    description: "Жилийн багцад эрт бүртгүүлсэн хүмүүст 20% хөнгөлөлт.",
    icon: Percent,
    link: "#",
  },
];

// Sample Enrollment Benefits / Perks data
const enrollmentBenefits = [
  { id: 1, title: "Онлайн Сургалтын Материал", description: "Бүх хичээлийн материалд хязгааргүй хандалт.", icon: BookOpen },
  { id: 2, title: "Хэрэглэгчийн Бүлгэм", description: "Бусад суралцагчидтай холбогдож, мэдлэг солилцох.", icon: Users },
  { id: 3, title: "Төгсөлтийн Гэрчилгээ", description: "Хичээлээ амжилттай дүүргэсэн тохиолдолд гэрчилгээ олгоно.", icon: Star },
  { id: 4, title: "Ажлын Байрны Зөвлөгөө", description: "Ирээдүйн карьертаа бэлдэх зөвлөгөө, чиглүүлэг.", icon: Briefcase },
];


export default function Home() {


  // Refs and states to control visibility of sections
  const aboutRef = useRef<HTMLElement>(null);
  const [aboutVisible, setAboutVisible] = useState(false);

  const videoRef = useRef<HTMLElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);

  const whyChooseUsRef = useRef<HTMLElement>(null);
  const [whyChooseUsVisible, setWhyChooseUsVisible] = useState(false);

  const servicesRef = useRef<HTMLElement>(null);
  const [servicesVisible, setServicesVisible] = useState(false);

  const pricingRef = useRef<HTMLElement>(null); // New ref for Pricing Plans
  const [pricingVisible, setPricingVisible] = useState(false); // New state for Pricing Plans

  const featuredCoursesRef = useRef<HTMLElement>(null);
  const [featuredCoursesVisible, setFeaturedCoursesVisible] = useState(false);

  const categoriesRef = useRef<HTMLElement>(null); // New ref for Course Categories
  const [categoriesVisible, setCategoriesVisible] = useState(false); // New state for Course Categories

  const teachersRef = useRef<HTMLElement>(null);
  const [teachersVisible, setTeachersVisible] = useState(false);

  const testimonialsRef = useRef<HTMLElement>(null);
  const [testimonialsVisible, setTestimonialsVisible] = useState(false);

  const statsRef = useRef<HTMLElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const faqRef = useRef<HTMLElement>(null);
  const [faqVisible, setFaqVisible] = useState(false);

  const howItWorksRef = useRef<HTMLElement>(null);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  const methodologyRef = useRef<HTMLElement>(null); // New ref for Teaching Methodology
  const [methodologyVisible, setMethodologyVisible] = useState(false); // New state for Teaching Methodology

  const blogRef = useRef<HTMLElement>(null);
  const [blogVisible, setBlogVisible] = useState(false);

  const partnersRef = useRef<HTMLElement>(null);
  const [partnersVisible, setPartnersVisible] = useState(false);

  const roadmapRef = useRef<HTMLElement>(null);
  const [roadmapVisible, setRoadmapVisible] = useState(false);

  const scholarshipsRef = useRef<HTMLElement>(null); // New ref for Scholarships
  const [scholarshipsVisible, setScholarshipsVisible] = useState(false); // New state for Scholarships

  const benefitsRef = useRef<HTMLElement>(null); // New ref for Enrollment Benefits
  const [benefitsVisible, setBenefitsVisible] = useState(false); // New state for Enrollment Benefits

  const ctaRef = useRef<HTMLElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);

  const leaveCommentRef = useRef<HTMLElement>(null);
  const [leaveCommentVisible, setLeaveCommentVisible] = useState(false);

  const contactRef = useRef<HTMLElement>(null);
  const [contactVisible, setContactVisible] = useState(false);



  // Use Intersection Observer to show sections
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1, // When 10% of the element is visible
    };

    const createObserver = (ref: React.RefObject<HTMLElement | null>, setVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
      if (ref.current) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisible(true);
            } else {
              setVisible(false); // Make it invisible when it leaves the viewport
            }
          });
        }, observerOptions);
        observer.observe(ref.current);
        return () => {
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        };
      }
    };

    createObserver(aboutRef, setAboutVisible);
    createObserver(videoRef, setVideoVisible);
    createObserver(whyChooseUsRef, setWhyChooseUsVisible);
    createObserver(servicesRef, setServicesVisible);
    createObserver(pricingRef, setPricingVisible); // New observer call
    createObserver(featuredCoursesRef, setFeaturedCoursesVisible);
    createObserver(categoriesRef, setCategoriesVisible); // New observer call
    createObserver(teachersRef, setTeachersVisible);
    createObserver(testimonialsRef, setTestimonialsVisible);
    createObserver(statsRef, setStatsVisible);
    createObserver(faqRef, setFaqVisible);
    createObserver(howItWorksRef, setHowItWorksVisible);
    createObserver(methodologyRef, setMethodologyVisible); // New observer call
    createObserver(blogRef, setBlogVisible);
    createObserver(partnersRef, setPartnersVisible);
    createObserver(roadmapRef, setRoadmapVisible);
    createObserver(scholarshipsRef, setScholarshipsVisible); // New observer call
    createObserver(benefitsRef, setBenefitsVisible); // New observer call
    createObserver(ctaRef, setCtaVisible);
    createObserver(leaveCommentRef, setLeaveCommentVisible);
    createObserver(contactRef, setContactVisible);

  }, []); // Runs only once on component mount

 

  const handleSubmitComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Энд сэтгэгдлийг илгээх логик орно (жишээ нь, API дуудах)
    alert('Сэтгэгдэл амжилттай илгээгдлээ! (Энэ нь зөвхөн жишиг мессеж юм)');
    // Формыг цэвэрлэх
    e.currentTarget.reset();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 font-inter text-gray-800 relative overflow-hidden">
      {/* Subtle background circles/shapes for visual interest with morph effect */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" style={{ animationDelay: '-4s' }}></div>
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" style={{ animationDelay: '-6s' }}></div>

      <div className="relative z-10 bg-white p-8 md:p-16 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-3xl w-full transform transition-all duration-500 hover:scale-105 hover:shadow-3xl mt-20">
        <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-purple-800 mb-4 animate-fade-in-down">
          Hello NEETLITE!
        </h1>
        <p className="text-sm md:text-base text-gray-800 mb-6 animate-fade-in-up">
          Тавтай морилно уу! Таны суралцах аялал эндээс эхэлнэ.
        </p>
        <div className="space-y-4">
          <a
            href="/auth"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-700 to-purple-700 text-white font-semibold text-sm rounded-full shadow-lg hover:from-blue-800 hover:to-purple-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
          >
            Нэвтрэх / Бүртгүүлэх
          </a>
        </div>
      </div>

      {/* Newly added information sections */}
      <section
        ref={aboutRef}
        className={`w-full max-w-4xl mt-20 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Бидний тухай</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          NEETLITE нь суралцагчдад зориулсан цогц онлайн платформ юм. Бид танд шинэлэг сургалтын хэрэглэгдэхүүн, интерактив хичээлүүд, мөн өөрийн хурдаар суралцах боломжийг олгоно. Бидний зорилго бол суралцах үйл явцыг илүү хялбар, үр дүнтэй, сонирхолтой болгох явдал юм.
        </p>
      </section>

      {/* Video Introduction Section */}
      <section
        ref={videoRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${videoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Video className="w-6 h-6 mr-2 text-blue-600" /> Видео танилцуулга
        </h2>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
          <video
            className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg"
            src="https://www.w3schools.com/html/mov_bbb.mp4" // Жишээ видео URL. Үүнийг өөрийн видеоны URL-ээр солино уу.
            autoPlay
            loop
            muted
            playsInline
          >
            Таны вэб хөтөч видео тагийг дэмжихгүй байна.
          </video>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Бидний платформын тухай дэлгэрэнгүй мэдээллийг энэхүү видеоноос хүлээн авна уу.
        </p>
      </section>

      {/* Why Choose Us Section */}
      <section
        ref={whyChooseUsRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${whyChooseUsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Sparkles className="w-6 h-6 mr-2 text-yellow-600" /> Яагаад Биднийг Сонгох Вэ?
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="p-6 rounded-xl bg-yellow-50 shadow-lg text-left">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" /> Оновчтой Сургалтын Хөтөлбөр
            </h3>
            <p className="text-sm text-gray-700">Мэргэжлийн багш нарын боловсруулсан, үр дүнтэй сургалтын хөтөлбөр.</p>
          </div>
          <div className="p-6 rounded-xl bg-green-50 shadow-lg text-left">
            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2" /> Найдвартай Платформ
            </h3>
            <p className="text-sm text-gray-700">Аюулгүй, тогтвортой ажиллагаатай, хэрэглэгчдэд ээлтэй орчин.</p>
          </div>
          <div className="p-6 rounded-xl bg-red-50 shadow-lg text-left">
            <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
              <Award className="w-5 h-5 mr-2" /> Амжилттай Үр Дүн
            </h3>
            <p className="text-sm text-gray-700">Бидний суралцагчид өндөр амжилт үзүүлдэг нь батлагдсан.</p>
          </div>
          <div className="p-6 rounded-xl bg-indigo-50 shadow-lg text-left">
            <h3 className="text-lg font-semibold text-indigo-800 mb-2 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" /> Байнгын Дэмжлэг
            </h3>
            <p className="text-sm text-gray-700">Багш болон техникийн багийн байнгын дэмжлэг, зөвлөгөө.</p>
          </div>
        </div>
      </section>

      <section
        ref={servicesRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${servicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Бидний үйлчилгээ</h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="p-6 rounded-xl bg-blue-100 shadow-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center justify-center">
              <BookOpen className="w-5 h-5 mr-2" /> 📚 Хичээлүүд
            </h3>
            <p className="text-sm text-gray-700">Олон төрлийн хичээлүүдээс сонголт хийж, мэдлэгээ гүнзгийрүүлээрэй.</p>
          </div>
          <div className="p-6 rounded-xl bg-purple-100 shadow-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 mr-2" /> 📝 Дасгалууд
            </h3>
            <p className="text-sm text-gray-700">Мэдлэгээ бататгах дасгал ажлуудыг хийж, өөрийгөө сориорой.</p>
          </div>
          <div className="p-6 rounded-xl bg-pink-100 shadow-lg">
            <h3 className="text-lg font-semibold text-pink-800 mb-3 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 mr-2" /> 📈 Хөгжил
            </h3>
            <p className="text-sm text-gray-700">Суралцах явцдаа ахиц дэвшилээ хянаж, зорилгодоо хүрээрэй.</p>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section
        ref={pricingRef}
        className={`w-full max-w-5xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <DollarSign className="w-6 h-6 mr-2 text-green-600" /> Үнийн Багцууд
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {pricingPlans.map(plan => (
            <div
              key={plan.id}
              className={`p-6 rounded-xl shadow-lg border-2 ${plan.isFeatured ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white border-blue-600 scale-105' : 'bg-gray-50 border-gray-200 text-gray-800'} transition-all duration-300 hover:scale-105`}
            >
              <h3 className={`text-xl font-bold mb-2 ${plan.isFeatured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
              <p className={`text-4xl font-extrabold mb-4 ${plan.isFeatured ? 'text-white' : 'text-blue-700'}`}>
                {plan.price}<span className={`text-base font-normal ${plan.isFeatured ? 'text-white/80' : 'text-gray-600'}`}>{plan.period}</span>
              </p>
              <ul className="text-sm space-y-2 mb-6 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className={`flex items-center ${plan.isFeatured ? 'text-white/90' : 'text-gray-700'}`}>
                    <Check className={`w-4 h-4 mr-2 ${plan.isFeatured ? 'text-white' : 'text-green-500'}`} /> {feature}
                  </li>
                ))}
              </ul>
              <a
                href={plan.buttonLink}
                className={`inline-block px-6 py-2.5 font-semibold text-sm rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${plan.isFeatured ? 'bg-white text-blue-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {plan.buttonText}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Courses Section */}
      <section
        ref={featuredCoursesRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${featuredCoursesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <BookText className="w-6 h-6 mr-2 text-blue-600" /> Онцлох Хичээлүүд
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {featuredCourses.map(course => (
            <div key={course.id} className="p-4 rounded-xl bg-blue-50 shadow-lg text-left">
              {/* Image optimization warning: For better performance, consider using Next.js <Image /> component. */}
              <img src={course.image} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">{course.title}</h3>
              <p className="text-sm text-gray-700 mb-4">{course.description}</p>
              <a href={course.link} className="text-blue-600 hover:underline text-sm font-medium">Дэлгэрэнгүй →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Course Categories Section */}
      <section
        ref={categoriesRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${categoriesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Folder className="w-6 h-6 mr-2 text-pink-600" /> Хичээлийн Ангилал
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
          {courseCategories.map(category => (
            <a key={category.id} href={category.link} className="p-5 rounded-xl bg-pink-50 shadow-md flex flex-col items-center justify-center text-center hover:bg-pink-100 transition-colors duration-200">
              <category.icon className="w-10 h-10 mb-3 text-pink-700" />
              <h3 className="text-lg font-semibold text-pink-800">{category.name}</h3>
              <p className="text-sm text-gray-600">{category.count}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Our teachers section */}
      <section
        ref={teachersRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${teachersVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Users className="w-6 h-6 mr-2 text-purple-600" /> Бидний багш нар
        </h2>
        <div className="relative w-full overflow-hidden py-4">
          {/* Mask effect (fade out on left and right) */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10"></div>

          <div className="flex animate-scroll-teachers gap-6">
            {/* Duplicate teacher info to create continuous scroll */}
            {[...teachers, ...teachers].map((teacher, index) => (
              <div key={`${teacher.id}-${index}`} className="flex-shrink-0 w-40 p-4 bg-gray-50 rounded-xl shadow-md text-center border border-gray-200">
                {/* Image optimization warning: For better performance, consider using Next.js <Image /> component. */}
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-2 border-blue-400"
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/150x150/CCCCCC/000000?text=Зураг+байхгүй'; }}
                />
                <h3 className="text-base font-semibold text-gray-800 mb-1">{teacher.name}</h3>
                <p className="text-xs text-gray-600">{teacher.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        ref={testimonialsRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Quote className="w-6 h-6 mr-2 text-orange-600" /> Хэрэглэгчийн Сэтгэгдэл
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {testimonials.map(testimonial => (
            <div key={testimonial.id} className="p-6 rounded-xl bg-orange-50 shadow-lg text-left relative">
              <Quote className="absolute top-4 left-4 w-8 h-8 text-orange-300 opacity-20" />
              {/* Removed extra double quotes to fix react/no-unescaped-entities error */}
              <p className="text-base text-gray-700 italic mb-4 pl-10">{testimonial.quote}</p>
              <div className="flex items-center justify-end">
                {/* Image optimization warning: For better performance, consider using Next.js <Image /> component. */}
                <img src={testimonial.avatar} alt={testimonial.author} className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-orange-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{testimonial.author}</p>
                  <p className="text-xs text-gray-600">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newly added Statistics section */}
      <section
        ref={statsRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Бидний статистик</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
          <div className="p-6 rounded-xl bg-green-50 shadow-lg flex flex-col items-center justify-center">
            <Users className="w-8 h-8 mb-3 text-green-700" />
            <p className="text-2xl font-bold text-green-800">10,000+</p>
            <p className="text-sm text-gray-700">Хэрэглэгчид</p>
          </div>
          <div className="p-6 rounded-xl bg-yellow-50 shadow-lg flex flex-col items-center justify-center">
            <UserCheck className="w-8 h-8 mb-3 text-yellow-700" />
            <p className="text-2xl font-bold text-yellow-800">50+</p>
            <p className="text-sm text-gray-700">Багш нар</p>
          </div>
          <div className="p-6 rounded-xl bg-red-50 shadow-lg flex flex-col items-center justify-center">
            <FileText className="w-8 h-8 mb-3 text-red-700" />
            <p className="text-2xl font-bold text-red-800">200+</p>
            <p className="text-sm text-gray-700">Тестүүд</p>
          </div>
          <div className="p-6 rounded-xl bg-indigo-50 shadow-lg flex flex-col items-center justify-center">
            <Award className="w-8 h-8 mb-3 text-indigo-700" />
            <p className="text-2xl font-bold text-indigo-800">500+</p>
            <p className="text-sm text-gray-700">Шалгалтууд</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        ref={faqRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 mr-2 text-green-600" /> Түгээмэл Асуулт Хариулт
        </h2>
        <div className="space-y-4 mt-8 text-left">
          {faqs.map(faq => (
            <details key={faq.id} className="p-4 rounded-xl bg-gray-50 shadow-sm cursor-pointer group">
              <summary className="flex justify-between items-center font-semibold text-gray-800">
                {faq.question}
                <span className="transform transition-transform duration-300 group-open:rotate-180">▼</span>
              </summary>
              <p className="text-sm text-gray-700 mt-2 pl-4">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={howItWorksRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${howItWorksVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 mr-2 text-purple-600" /> Хэрхэн Ажилладаг Вэ?
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="p-6 rounded-xl bg-purple-50 shadow-lg flex flex-col items-center justify-center">
            <UserPlus className="w-12 h-12 mb-3 text-purple-700" />
            <h3 className="text-lg font-semibold text-purple-800 mb-2">1. Бүртгүүлэх</h3>
            <p className="text-sm text-gray-700">Хялбар алхмаар бүртгэлээ үүсгэнэ.</p>
          </div>
          <div className="p-6 rounded-xl bg-purple-50 shadow-lg flex flex-col items-center justify-center">
            <Search className="w-12 h-12 mb-3 text-purple-700" />
            <h3 className="text-lg font-semibold text-purple-800 mb-2">2. Хичээлээ Сонгох</h3>
            <p className="text-sm text-gray-700">Өөрт тохирох хичээлээ сонгоно.</p>
          </div>
          <div className="p-6 rounded-xl bg-purple-50 shadow-lg flex flex-col items-center justify-center">
            <Play className="w-12 h-12 mb-3 text-purple-700" />
            <h3 className="text-lg font-semibold text-purple-800 mb-2">3. Суралцаж Эхлэх</h3>
            <p className="text-sm text-gray-700">Видео хичээл, дасгал ажлаар суралцана.</p>
          </div>
        </div>
      </section>

      {/* Teaching Methodology Section */}
      <section
        ref={methodologyRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${methodologyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 mr-2 text-indigo-600" /> Сургалтын Арга Зүй
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {teachingMethodology.map(method => (
            <div key={method.id} className="p-6 rounded-xl bg-indigo-50 shadow-lg text-left flex items-start">
              <method.icon className="w-8 h-8 mr-4 mt-1 text-indigo-700 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-indigo-800 mb-1">{method.title}</h3>
                <p className="text-sm text-gray-700">{method.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blog/News Section */}
      <section
        ref={blogRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Newspaper className="w-6 h-6 mr-2 text-blue-600" /> Блог / Мэдээ
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {blogPosts.map(post => (
            <div key={post.id} className="p-4 rounded-xl bg-gray-50 shadow-lg text-left">
              {/* Image optimization warning: For better performance, consider using Next.js <Image /> component. */}
              <img src={post.image} alt={post.title} className="w-full h-32 object-cover rounded-lg mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{post.title}</h3>
              <p className="text-sm text-gray-700 mb-4">{post.summary}</p>
              <a href={post.link} className="text-blue-600 hover:underline text-sm font-medium">Дэлгэрэнгүй унших →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Partners Section */}
      <section
        ref={partnersRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${partnersVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Handshake className="w-6 h-6 mr-2 text-purple-600" /> Хамтрагчид
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8 mt-8">
          {partners.map(partner => (
            <img key={partner.id} src={partner.logo} alt={partner.name} className="h-12 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
          ))}
        </div>
      </section>

      {/* Future Plans / Roadmap Section */}
      <section
        ref={roadmapRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${roadmapVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Calendar className="w-6 h-6 mr-2 text-red-600" /> Ирээдүйн Төлөвлөгөө
        </h2>
        <div className="text-left mt-8 space-y-4">
          <div className="p-4 rounded-xl bg-red-50 shadow-sm">
            <h3 className="text-lg font-semibold text-red-800 mb-1">Q4 2024: Шинэ хичээлийн модулиуд</h3>
            <p className="text-sm text-gray-700">Илүү олон хичээлийн сэдэв, гүнзгийрүүлсэн сургалтуудыг нэмнэ.</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 shadow-sm">
            <h3 className="text-lg font-semibold text-red-800 mb-1">Q1 2025: Мобайл апп хувилбар</h3>
            <p className="text-sm text-gray-700">iOS болон Android үйлдлийн системд зориулсан аппликейшн гаргана.</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 shadow-sm">
            <h3 className="text-lg font-semibold text-red-800 mb-1">Q2 2025: Интерактив лаборатори</h3>
            <p className="text-sm text-gray-700">Виртуал лабораторийн орчин үүсгэж, практик ур чадварыг хөгжүүлнэ.</p>
          </div>
        </div>
      </section>

      {/* Scholarships / Discounts Section */}
      <section
        ref={scholarshipsRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${scholarshipsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Gift className="w-6 h-6 mr-2 text-purple-600" /> Тэтгэлэг ба Хөнгөлөлт
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {scholarships.map(item => (
            <div key={item.id} className="p-6 rounded-xl bg-purple-50 shadow-lg text-left flex items-start">
              <item.icon className="w-8 h-8 mr-4 mt-1 text-purple-700 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-purple-800 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-700">{item.description}</p>
                <a href={item.link} className="text-blue-600 hover:underline text-sm font-medium mt-2 block">Дэлгэрэнгүй →</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enrollment Benefits / Perks Section */}
      <section
        ref={benefitsRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${benefitsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <Star className="w-6 h-6 mr-2 text-yellow-600" /> Бүртгэлийн Урамшуулал
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {enrollmentBenefits.map(benefit => (
            <div key={benefit.id} className="p-6 rounded-xl bg-yellow-50 shadow-lg text-left flex items-start">
              <benefit.icon className="w-8 h-8 mr-4 mt-1 text-yellow-700 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-700">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section
        ref={ctaRef}
        className={`w-full max-w-4xl mt-12 p-10 bg-gradient-to-r from-blue-700 to-purple-700 text-white rounded-3xl shadow-xl text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Өнөөдрөөс суралцаж эхлээрэй!</h2>
        <p className="text-lg mb-8">Манай платформд нэгдэж, мэдлэгээ дээшлүүлэн, амжилтанд хүрэх аялалаа эхлүүл.</p>
        <a
          href="/auth"
          className="inline-block px-10 py-4 bg-white text-blue-700 font-bold text-lg rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
        >
          Одоо Бүртгүүлэх
          <Rocket className="inline-block w-6 h-6 ml-2 -mt-1" />
        </a>
      </section>

      {/* Leave a Comment Section */}
      <section
        ref={leaveCommentRef}
        className={`w-full max-w-2xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center transition-all duration-700 ${leaveCommentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 mr-2 text-orange-600" /> Сэтгэгдэл Үлдээх
        </h2>
        <form onSubmit={handleSubmitComment} className="space-y-4 text-left">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Нэр:</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">И-мэйл (заавал биш):</label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Сэтгэгдэл:</label>
            <textarea
              id="comment"
              name="comment"
              rows={4}
              required
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
          >
            Илгээх
            <Send className="w-5 h-5 ml-2" />
          </button>
        </form>
      </section>

      <section
        ref={contactRef}
        className={`w-full max-w-4xl mt-12 p-8 bg-white rounded-3xl shadow-xl text-center mb-20 transition-all duration-700 ${contactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Холбоо барих</h2>
        <p className="text-sm text-gray-700 mb-4">Бидэнтэй холбогдохыг хүсвэл доорх мэдээллээр хандана уу.</p>
        <p className="text-sm text-gray-800 font-semibold flex items-center justify-center mb-2">
          <Mail className="w-4 h-4 mr-2" /> И-мэйл: support@neetlite.mn
        </p>
        <p className="text-sm text-gray-800 font-semibold flex items-center justify-center mb-2">
          <Phone className="w-4 h-4 mr-2" /> Утас: +976-8888-XXXX
        </p>
        <p className="text-sm text-gray-800 font-semibold flex items-center justify-center">
          <MapPin className="w-4 h-4 mr-2" /> Хаяг: Улаанбаатар хот, Монгол улс
        </p>
      </section>

      {/* Custom CSS for animations and blob effect */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
            border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%;
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
            border-radius: 40% 60% 70% 30% / 70% 40% 60% 30%;
          }
          100% {
            transform: translate(0px, 0px) scale(1);
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
        }
        @keyframes scrollTeachers {
          0% {
            transform: translateX(0);
          }
          100% {
            /* 5 cards * (160px width + 24px gap) = 5 * 184px = 920px */
            transform: translateX(-920px);
          }
        }

        .animate-fade-in-down {
          animation: fadeInDown 1s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
          animation-delay: 0.3s; /* Slight delay */
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-scroll-teachers {
          animation: scrollTeachers 25s linear infinite; /* Adjust speed as needed */
        }
      `}</style>
    </main>
  );
}
