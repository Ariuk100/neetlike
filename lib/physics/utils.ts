/**
 * Нийт цахилгаан эсэргүүцлийг тооцоолох функц
 * R = rho * (L / A)
 * rho: хувийн эсэргүүцэл (resistivity)
 * L: урт (length)
 * A: хөндлөн огтлолын талбай (Area = width * thickness)
 * 2D системд өндрийг (height) өргөн, зузааныг (thickness) тогтмол гэж үзнэ.
 */
export const calculateTotalResistance = (
    resistivity: number | undefined,
    length: number,
    width: number,
    thickness: number = 1
): number => {
    // Хэрэв resistivity тодорхойлогдоогүй бол хязгааргүй эсэргүүцэлтэй (тусгаарлагч) гэж үзнэ
    if (resistivity === undefined) return Infinity;

    // Хөндлөн огтлолын талбай A = width * thickness
    const area = width * thickness;

    // Хэрэв талбай 0 бол эсэргүүцлийг хязгааргүй гэж үзнэ
    if (area <= 0) return Infinity;

    return resistivity * (length / area);
};

/**
 * Биеийн эзлэхүүнийг тооцоолох (Масс тооцоолоход хэрэгтэй)
 */
export const calculateRectangleVolume = (w: number, h: number, d: number = 1): number => w * h * d;
export const calculateSphereVolume = (r: number): number => (4 / 3) * Math.PI * Math.pow(r, 3);
export const calculateCylinderVolume = (r: number, h: number): number => Math.PI * Math.pow(r, 2) * h;

/**
 * Дулаан багтаамж тооцоолох (C = m * c)
 * m: масс (kg)
 * c: хувийн дулаан багтаамж (kJ/kg*K)
 */
export const calculateHeatCapacity = (mass: number, specificHeat: number): number => mass * specificHeat;

/**
 * Инерцийн момент тооцоолох (Moment of Inertia)
 * Matter.js өөрөө боддог ч 3D эзлэхүүн/масс дээр суурилж дахин тохируулахад хэрэгтэй.
 */

// Тэгш өнцөгт (Box, Rod): I = 1/12 * m * (w^2 + h^2)
export const calculateRectangleInertia = (m: number, w: number, h: number): number => (1 / 12) * m * (w * w + h * h);

// Бөмбөрцөг (Ball): I = 2/5 * m * r^2
export const calculateSphereInertia = (m: number, r: number): number => (2 / 5) * m * r * r;

// Диск эсвэл Цилиндр (Disk): I = 1/2 * m * r^2
export const calculateDiskInertia = (m: number, r: number): number => (1 / 2) * m * r * r;

/**
 * Гадаргуугийн талбай тооцоолох (Surface Area)
 * Агаарын үрэлт, дулаан алдагдал зэргийг бодоход хэрэгтэй.
 */
export const calculateRectangleSurfaceArea = (w: number, h: number, d: number): number => 2 * (w * h + w * d + h * d);
export const calculateSphereSurfaceArea = (r: number): number => 4 * Math.PI * r * r;
export const calculateCylinderSurfaceArea = (r: number, h: number): number => 2 * Math.PI * r * r + 2 * Math.PI * r * h;
