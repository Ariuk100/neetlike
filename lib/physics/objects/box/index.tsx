import Matter from 'matter-js';
import { PhysicsMaterial } from '../../registry';
import {
    calculateRectangleVolume,
    calculateTotalResistance,
    calculateRectangleInertia,
    calculateHeatCapacity,
    calculateRectangleSurfaceArea
} from '../../utils';

export interface BoxOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    thickness?: number; // 3D зузаан (default: 1)
    material: PhysicsMaterial;
    label?: string;
}

/**
 * Хайрцаг (Box) объект үүсгэх функц.
 * Хайрцгийг хатуу тэгш өнцөгт бие гэж үзнэ.
 */
export const createBox = (options: BoxOptions): Matter.Body => {
    const { x, y, width, height, thickness = 1, material, label } = options;

    // Эзлэхүүн болон массыг тооцоолох (m = rho * V)
    const volume = calculateRectangleVolume(width, height, thickness);
    const mass = material.density * volume;

    // Инерцийн момент (I = 1/12 * m * (w^2 + h^2))
    const inertia = calculateRectangleInertia(mass, width, height);

    // Дулаан багтаамж (C = m * c)
    const heatCapacity = calculateHeatCapacity(mass, material.specificHeat);

    // Гадаргуугийн талбай (A = 2*(wh + wd + hd))
    const surfaceArea = calculateRectangleSurfaceArea(width, height, thickness);

    // Нийт эсэргүүцлийг тооцоолох (R = rho * L/A)
    const totalResistance = calculateTotalResistance(material.resistivity, width, height, thickness);

    const body = Matter.Bodies.rectangle(x, y, width, height, {
        friction: material.friction,
        frictionStatic: material.frictionStatic ?? 0.5,
        frictionAir: material.frictionAir ?? 0.01,
        restitution: material.restitution ?? 0.1,
        label: label || 'box',
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
            youngsModulus: material.youngsModulus,
            combustionHeat: material.combustionHeat
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
 * Canvas дээр хайрцгийг зурах функц
 */
export const renderBox = (ctx: CanvasRenderingContext2D, body: Matter.Body) => {
    const vertices = body.vertices;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = (body.render as Matter.IBodyRenderOptions).fillStyle || '#000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
};
