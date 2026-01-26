import Matter from 'matter-js';
import { PhysicsMaterial } from '../../registry';
import {
    calculateRectangleVolume,
    calculateTotalResistance,
    calculateRectangleInertia,
    calculateHeatCapacity,
    calculateRectangleSurfaceArea
} from '../../utils';

export interface RodOptions {
    x: number;
    y: number;
    length: number;
    height?: number; // 2D зузаан (савааны өргөн)
    thickness?: number; // 3D зузаан (эзлэхүүн тооцоход)
    material: PhysicsMaterial;
    label?: string;
}

/**
 * Саваа (Rod) объект үүсгэх функц.
 * Савааг хавтгай тэгш өнцөгт бие гэж үзнэ.
 */
export const createRod = (options: RodOptions): Matter.Body => {
    const { x, y, length, height = 5, thickness = 1, material, label } = options;
    const width = length; // Matter.js-д өргөн нь урт болно

    // Эзлэхүүн болон массыг тооцоолох (m = rho * V)
    const volume = calculateRectangleVolume(width, height, thickness);
    const mass = material.density * volume;

    // Инерцийн момент (I = 1/12 * m * (L^2 + H^2))
    const inertia = calculateRectangleInertia(mass, width, height);

    // Дулаан багтаамж (C = m * c)
    const heatCapacity = calculateHeatCapacity(mass, material.specificHeat);

    // Гадаргуугийн талбай
    const surfaceArea = calculateRectangleSurfaceArea(width, height, thickness);

    // Нийт цахилгаан эсэргүүцлийг тооцоолох (R = rho * L/A)
    // Урт нь length, хөндлөн огтлол нь height * thickness
    const totalResistance = calculateTotalResistance(material.resistivity, length, height, thickness);

    const body = Matter.Bodies.rectangle(x, y, width, height, {
        friction: material.friction,
        frictionStatic: material.frictionStatic ?? 0.5,
        frictionAir: material.frictionAir ?? 0.01,
        restitution: material.restitution ?? 0.1,
        label: label || 'rod',
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
 * Canvas дээр савааг зурах функц
 */
export const renderRod = (ctx: CanvasRenderingContext2D, body: Matter.Body) => {
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

    // Савааны ирмэг
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Төв цэг (Rotation indicator)
    const { x, y } = body.position;
    const angle = body.angle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    ctx.restore();

    ctx.restore();
};
