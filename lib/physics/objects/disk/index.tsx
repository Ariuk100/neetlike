import Matter from 'matter-js';
import { PhysicsMaterial } from '../../registry';
import {
    calculateCylinderVolume,
    calculateDiskInertia,
    calculateHeatCapacity,
    calculateTotalResistance,
    calculateCylinderSurfaceArea
} from '../../utils';

export interface DiskOptions {
    x: number;
    y: number;
    radius: number;
    thickness?: number; // Дискний зузаан (default: 2)
    material: PhysicsMaterial;
    label?: string;
}

/**
 * Диск (Disk) объект үүсгэх функц.
 * Дискийг цилиндр хэлбэртэй бие гэж үзнэ.
 */
export const createDisk = (options: DiskOptions): Matter.Body => {
    const { x, y, radius, thickness = 2, material, label } = options;

    // Эзлэхүүн болон массыг тооцоолох (m = rho * V)
    const volume = calculateCylinderVolume(radius, thickness);
    const mass = material.density * volume;

    // Инерцийн момент (I = 1/2 * m * r^2)
    const inertia = calculateDiskInertia(mass, radius);

    // Дулаан багтаамж (C = m * c)
    const heatCapacity = calculateHeatCapacity(mass, material.specificHeat);

    // Гадаргуугийн талбай (Цилиндр)
    const surfaceArea = calculateCylinderSurfaceArea(radius, thickness);

    // Эсэргүүцэл (Диаметрын дагуу гүйдэл гүйнэ гэж үзвэл L=2r, A=r*thickness)
    const totalResistance = calculateTotalResistance(material.resistivity, radius * 2, radius, thickness);

    const body = Matter.Bodies.circle(x, y, radius, {
        friction: material.friction,
        frictionStatic: material.frictionStatic ?? 0.5,
        frictionAir: material.frictionAir ?? 0.01,
        restitution: material.restitution ?? 0.1,
        label: label || 'disk',
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
            totalResistance: totalResistance,
            thickness: thickness,
            thermalExpansionCoefficient: material.expansionCoefficient,
            photoelectricThreshold: material.photoelectricThreshold,
            meltingTemp: material.meltingTemp,
            latentHeatFusion: material.latentHeatFusion,
            latentHeatVaporization: material.latentHeatVaporization,
            dielectricConstant: material.dielectricConstant,
            youngsModulus: material.youngsModulus
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
 * Canvas дээр дискийг зурах функц
 */
export const renderDisk = (ctx: CanvasRenderingContext2D, body: Matter.Body) => {
    const radius = body.circleRadius!;
    const { x, y } = body.position;
    const angle = body.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Үндсэн диск
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = (body.render as Matter.IBodyRenderOptions).fillStyle || '#000';
    ctx.fill();

    // Дискний ирмэг
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Төв цэг
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Эргэлтийг харуулах шугам
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    ctx.restore();
};
