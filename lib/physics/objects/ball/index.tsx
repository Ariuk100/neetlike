import Matter from 'matter-js';
import { PhysicsMaterial } from '../../registry';
import { calculateSphereVolume, calculateSphereInertia, calculateHeatCapacity, calculateSphereSurfaceArea } from '../../utils';

export interface BallOptions {
    x: number;
    y: number;
    radius: number;
    material: PhysicsMaterial;
    label?: string;
}

/**
 * Бөмбөг (Ball) объект үүсгэх функц.
 * Бөмбөгийг бөмбөрцөг (Sphere) бие гэж үзнэ.
 */
export const createBall = (options: BallOptions): Matter.Body => {
    const { x, y, radius, material, label } = options;

    // Бөмбөрцөгийн эзлэхүүн болон массыг тооцоолох (m = rho * V)
    const volume = calculateSphereVolume(radius);
    const mass = material.density * volume;

    // Инерцийн момент (I = 2/5 * m * r^2)
    const inertia = calculateSphereInertia(mass, radius);

    // Дулаан багтаамж (C = m * c)
    const heatCapacity = calculateHeatCapacity(mass, material.specificHeat);

    // Гадаргуугийн талбай (A = 4 * PI * r^2)
    const surfaceArea = calculateSphereSurfaceArea(radius);

    const body = Matter.Bodies.circle(x, y, radius, {
        friction: material.friction,
        frictionStatic: material.frictionStatic ?? 0.5,
        frictionAir: material.frictionAir ?? 0.01,
        restitution: material.restitution ?? 0.1,
        label: label || 'ball',
        plugin: {
            materialName: material.name,
            materialState: material.state,
            density: material.density,
            volume: volume,
            mass: mass,
            inertia: inertia,
            surfaceArea: surfaceArea,
            heatCapacity: heatCapacity,
            specificHeat: material.specificHeat,
            isConductor: material.isConductor ?? false,
            charge: material.charge ?? 0,
            resistivity: material.resistivity,
            photoelectricThreshold: material.photoelectricThreshold,
            thermalExpansionCoefficient: material.expansionCoefficient,
            meltingTemp: material.meltingTemp,
            latentHeatFusion: material.latentHeatFusion,
            latentHeatVaporization: material.latentHeatVaporization,
            dielectricConstant: material.dielectricConstant,
            youngsModulus: material.youngsModulus,
            atomicMass: material.atomicMass,
            bindingEnergy: material.bindingEnergy,
            halfLife: material.halfLife
        },
        render: {
            fillStyle: material.color
        }
    });

    // Физик утгуудыг оноох
    Matter.Body.setMass(body, mass);
    Matter.Body.setInertia(body, inertia);

    return body;
};

/**
 * Canvas дээр бөмбөлгийг зурах функц
 */
export const renderBall = (ctx: CanvasRenderingContext2D, body: Matter.Body) => {
    const radius = body.circleRadius!;
    const { x, y } = body.position;
    const angle = body.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Үндсэн бөмбөлөг
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = (body.render as Matter.IBodyRenderOptions).fillStyle || '#000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Эргэлтийг харуулах шугам
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    ctx.restore();
};
