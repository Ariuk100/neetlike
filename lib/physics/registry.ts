export type MaterialState = 'SOLID' | 'LIQUID' | 'GAS';

export type PhysicsMaterialType =
    | 'ALUMINUM'
    | 'WOLFRAM'
    | 'IRON'
    | 'STEEL'
    | 'CAST_IRON'
    | 'LEAD'
    | 'COPPER'
    | 'BRASS'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | 'NICKEL'
    | 'NICHROME'
    | 'CONSTANTAN'
    | 'NICKEL_SILVER'
    | 'TANTALUM'
    | 'ZINC'
    | 'BISMUTH'
    | 'CESIUM'
    | 'LITHIUM'
    | 'LITHIUM_6'
    | 'LITHIUM_7'
    | 'CALCIUM'
    | 'ANTIMONY_CESIUM'
    | 'URANIUM_238'
    | 'URANIUM_235'
    | 'THORIUM_232'
    | 'RADIUM_226'
    | 'RADON_222'
    | 'NEPTUNIUM_237'
    | 'POLONIUM_218'
    | 'POLONIUM_212'
    | 'CARBON_12'
    | 'CARBON_14'
    | 'NITROGEN_14'
    | 'OXYGEN_16'
    | 'OXYGEN_17'
    | 'HYDROGEN_1'
    | 'HYDROGEN_2'
    | 'HYDROGEN_3'
    | 'HELIUM_3'
    | 'HELIUM_4'
    | 'BERYLLIUM_9'
    | 'BORON_10'
    | 'ICE'
    | 'WATER'
    | 'MERCURY'
    | 'BENZENE'
    | 'KEROSENE'
    | 'ALCOHOL'
    | 'GLYCERIN'
    | 'PETROLEUM'
    | 'SOAP_SOLUTION'
    | 'CONCRETE'
    | 'GLASS'
    | 'WOOD'
    | 'RUBBER'
    | 'PLASTIC'
    | 'EBONITE'
    | 'PARAFFIN'
    | 'MICA'
    | 'COAL'
    | 'GUNPOWDER'
    | 'AIR';

export interface PhysicsMaterial {
    name: string;
    state: MaterialState;
    color: string;
    density: number;             // g/cm³ -> 0.001 in simulation units
    friction: number;            // Dynamic friction
    frictionStatic?: number;
    frictionAir?: number;
    restitution?: number;         // Bounce (0 to 1)
    isConductor?: boolean;
    charge?: number;
    resistivity?: number;         // Ohm·m (at 20°C)
    tempCoeffResistance?: number; // 10^-3 / K (α)
    photoelectricThreshold?: number; // nm (λ_max)
    youngsModulus?: number;      // GPa
    specificHeat: number;        // kJ/(kg·K)
    latentHeatFusion?: number;   // MJ/kg
    latentHeatVaporization?: number; // MJ/kg
    expansionCoefficient?: number; // 10^-6 / K
    combustionHeat?: number;     // MJ/kg (q)
    surfaceTension?: number;     // mN/m (σ)
    meltingTemp?: number;        // °C (tm)
    dielectricConstant?: number; // ε (relative permittivity)
    // Nuclear Data
    atomicMass?: number;         // a.m.u
    bindingEnergy?: number;      // MeV
    halfLife?: string;           // Readable string (e.g. "4.56*10^9 years")
}

const CM3_TO_SIM_DENSITY = 0.001;

/**
 * Үзэгдэх гэрлийн спектрийн өгөгдөл (Visible Light Spectrum)
 */
export const VISIBLE_SPECTRUM = {
    RED: { min: 620, max: 760, name: 'Улаан' },
    ORANGE: { min: 590, max: 620, name: 'Улбар шар' },
    YELLOW: { min: 560, max: 590, name: 'Шар' },
    GREEN: { min: 500, max: 560, name: 'Ногоон' },
    CYAN: { min: 480, max: 500, name: 'Цэнхэр' },
    BLUE: { min: 450, max: 480, name: 'Хөх' },
    VIOLET: { min: 390, max: 450, name: 'Ягаан' }
};

export const PHYSICS_MATERIALS: Record<PhysicsMaterialType, PhysicsMaterial> = {
    ALUMINUM: {
        name: 'Хөнгөн цагаан',
        state: 'SOLID',
        color: '#D1D5DB',
        density: 2.7 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: true,
        charge: 0,
        resistivity: 0.028e-6,
        tempCoeffResistance: 4.2,
        youngsModulus: 70,
        specificHeat: 0.92,
        latentHeatFusion: 0.393,
        expansionCoefficient: 24,
        meltingTemp: 660,
        atomicMass: 26.98,
        bindingEnergy: 224.9
    },
    WOLFRAM: {
        name: 'Вольфрам',
        state: 'SOLID',
        color: '#4B5563',
        density: 19.3 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.002,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.055e-6,
        tempCoeffResistance: 5.0,
        photoelectricThreshold: 272,
        youngsModulus: 411,
        specificHeat: 0.15,
        expansionCoefficient: 4.5,
        meltingTemp: 3422
    },
    IRON: {
        name: 'Төмөр',
        state: 'SOLID',
        color: '#71717A',
        density: 7.9 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.2,
        isConductor: true,
        charge: 0,
        resistivity: 0.1e-6,
        tempCoeffResistance: 6.0,
        photoelectricThreshold: 268,
        youngsModulus: 200,
        specificHeat: 0.45,
        latentHeatFusion: 0.27,
        expansionCoefficient: 12,
        meltingTemp: 1540
    },
    STEEL: {
        name: 'Ган',
        state: 'SOLID',
        color: '#94A3B8',
        density: 7.8 * CM3_TO_SIM_DENSITY,
        friction: 0.15,
        frictionStatic: 0.2,
        frictionAir: 0.005,
        restitution: 0.2,
        isConductor: true,
        charge: 0,
        resistivity: 0.12e-6,
        youngsModulus: 210,
        specificHeat: 0.46,
        latentHeatFusion: 0.084,
        expansionCoefficient: 13,
        meltingTemp: 1400
    },
    CAST_IRON: {
        name: 'Ширэм',
        state: 'SOLID',
        color: '#3F3F46',
        density: 7.2 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.5,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.8e-6,
        youngsModulus: 170,
        specificHeat: 0.54,
        latentHeatFusion: 0.139,
        expansionCoefficient: 10,
        meltingTemp: 1200
    },
    LEAD: {
        name: 'Хар тугалга',
        state: 'SOLID',
        color: '#374151',
        density: 11.3 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.6,
        frictionAir: 0.003,
        restitution: 0.05,
        isConductor: true,
        charge: 0,
        resistivity: 0.21e-6,
        tempCoeffResistance: 2.5,
        youngsModulus: 17,
        specificHeat: 0.14,
        latentHeatFusion: 0.024,
        latentHeatVaporization: 0.86,
        expansionCoefficient: 29,
        meltingTemp: 327
    },
    COPPER: {
        name: 'Зэс',
        state: 'SOLID',
        color: '#B45309',
        density: 8.9 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: true,
        charge: 0,
        resistivity: 0.017e-6,
        tempCoeffResistance: 4.3,
        photoelectricThreshold: 270,
        youngsModulus: 110,
        specificHeat: 0.38,
        latentHeatFusion: 0.205,
        expansionCoefficient: 17,
        meltingTemp: 1084
    },
    BRASS: {
        name: 'Гууль',
        state: 'SOLID',
        color: '#F59E0B',
        density: 8.4 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: true,
        charge: 0,
        resistivity: 0.075e-6,
        tempCoeffResistance: 0.25,
        youngsModulus: 100,
        specificHeat: 0.39,
        expansionCoefficient: 18,
        meltingTemp: 930
    },
    SILVER: {
        name: 'Мөнгө',
        state: 'SOLID',
        color: '#E5E7EB',
        density: 10.5 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: true,
        charge: 0,
        resistivity: 0.016e-6,
        photoelectricThreshold: 260,
        youngsModulus: 83,
        specificHeat: 0.23,
        expansionCoefficient: 19,
        meltingTemp: 962
    },
    GOLD: {
        name: 'Алт',
        state: 'SOLID',
        color: '#FFD700',
        density: 19.3 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: true,
        charge: 0,
        resistivity: 0.022e-6,
        youngsModulus: 78,
        specificHeat: 0.129,
        expansionCoefficient: 14,
        meltingTemp: 1064
    },
    PLATINUM: {
        name: 'Цагаан алт (Platinum)',
        state: 'SOLID',
        color: '#E2E8F0',
        density: 21.45 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.106e-6,
        photoelectricThreshold: 200,
        youngsModulus: 168,
        specificHeat: 0.133,
        expansionCoefficient: 8.9,
        meltingTemp: 1768
    },
    NICKEL: {
        name: 'Никель',
        state: 'SOLID',
        color: '#A1A1AA',
        density: 8.8 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.2,
        isConductor: true,
        charge: 0,
        resistivity: 0.073e-6,
        tempCoeffResistance: 6.5,
        photoelectricThreshold: 255,
        youngsModulus: 200,
        specificHeat: 0.44,
        expansionCoefficient: 13,
        meltingTemp: 1455
    },
    NICHROME: {
        name: 'Нихром',
        state: 'SOLID',
        color: '#52525B',
        density: 8.4 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 1.1e-6,
        tempCoeffResistance: 0.1,
        youngsModulus: 200,
        specificHeat: 0.45,
        expansionCoefficient: 14,
        meltingTemp: 1400
    },
    CONSTANTAN: {
        name: 'Константан',
        state: 'SOLID',
        color: '#A8A29E',
        density: 8.9 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.5e-6,
        tempCoeffResistance: 0.05,
        youngsModulus: 160,
        specificHeat: 0.39,
        expansionCoefficient: 14
    },
    NICKEL_SILVER: {
        name: 'Никелийн (German Silver)',
        state: 'SOLID',
        color: '#D4D4D8',
        density: 8.7 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.4e-6,
        youngsModulus: 150,
        specificHeat: 0.39,
        expansionCoefficient: 18
    },
    TANTALUM: {
        name: 'Тантал',
        state: 'SOLID',
        color: '#64748B',
        density: 16.6 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.5,
        frictionAir: 0.002,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.13e-6,
        photoelectricThreshold: 308,
        youngsModulus: 186,
        specificHeat: 0.14,
        expansionCoefficient: 6.3,
        meltingTemp: 3017
    },
    ZINC: {
        name: 'Цинк',
        state: 'SOLID',
        color: '#CBD5E1',
        density: 7.14 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.2,
        isConductor: true,
        charge: 0,
        resistivity: 0.059e-6,
        photoelectricThreshold: 290,
        youngsModulus: 108,
        specificHeat: 0.388,
        expansionCoefficient: 30,
        meltingTemp: 419.5
    },
    BISMUTH: {
        name: 'Висмут',
        state: 'SOLID',
        color: '#E2E8F0',
        density: 9.78 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.05,
        isConductor: true,
        charge: 0,
        resistivity: 1.07e-6,
        photoelectricThreshold: 287,
        youngsModulus: 32,
        specificHeat: 0.122,
        expansionCoefficient: 13,
        meltingTemp: 271.4
    },
    CESIUM: {
        name: 'Цезий',
        state: 'SOLID',
        color: '#FDE68A',
        density: 1.93 * CM3_TO_SIM_DENSITY,
        friction: 0.5,
        frictionStatic: 0.7,
        frictionAir: 0.01,
        restitution: 0,
        isConductor: true,
        charge: 0,
        resistivity: 0.2e-6,
        photoelectricThreshold: 620,
        youngsModulus: 1.6,
        specificHeat: 0.242,
        expansionCoefficient: 97,
        meltingTemp: 28.4
    },
    LITHIUM: {
        name: 'Литий',
        state: 'SOLID',
        color: '#E2E8F0',
        density: 0.534 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        restitution: 0.1,
        isConductor: true,
        charge: 0,
        resistivity: 0.092e-6,
        photoelectricThreshold: 500,
        youngsModulus: 4.9,
        specificHeat: 3.58,
        expansionCoefficient: 46,
        meltingTemp: 180.5
    },
    LITHIUM_6: {
        name: 'Литий-6',
        state: 'SOLID',
        color: '#E2E8F0',
        density: 0.534 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        specificHeat: 3.58,
        expansionCoefficient: 46,
        atomicMass: 6.015125,
        bindingEnergy: 31.9870
    },
    LITHIUM_7: {
        name: 'Литий-7',
        state: 'SOLID',
        color: '#E2E8F0',
        density: 0.534 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        specificHeat: 3.58,
        expansionCoefficient: 46,
        atomicMass: 7.016004,
        bindingEnergy: 39.239
    },
    CALCIUM: {
        name: 'Кальций',
        state: 'SOLID',
        color: '#F1F5F9',
        density: 1.55 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        restitution: 0.2,
        isConductor: true,
        charge: 0,
        resistivity: 0.033e-6,
        photoelectricThreshold: 385,
        youngsModulus: 20,
        specificHeat: 0.63,
        expansionCoefficient: 22,
        meltingTemp: 842
    },
    ANTIMONY_CESIUM: {
        name: 'Сурьма-цезийн',
        state: 'SOLID',
        color: '#1E293B',
        density: 4.0 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        isConductor: true,
        charge: 0,
        resistivity: 1e-3,
        photoelectricThreshold: 670,
        specificHeat: 0.3,
        expansionCoefficient: 20
    },
    URANIUM_238: {
        name: 'Уран-238',
        state: 'SOLID',
        color: '#166534',
        density: 19.1 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.116,
        expansionCoefficient: 13.9,
        halfLife: '4.56 * 10^9 years',
        atomicMass: 238.0508,
        bindingEnergy: 1801.7
    },
    URANIUM_235: {
        name: 'Уран-235',
        state: 'SOLID',
        color: '#15803D',
        density: 19.1 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.116,
        expansionCoefficient: 13.9,
        halfLife: '7.13 * 10^8 years',
        atomicMass: 235.0439,
        bindingEnergy: 1783.8
    },
    THORIUM_232: {
        name: 'Торий-232',
        state: 'SOLID',
        color: '#064E3B',
        density: 11.7 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.113,
        expansionCoefficient: 11.0,
        halfLife: '1.4 * 10^10 years'
    },
    RADIUM_226: {
        name: 'Радий-226',
        state: 'SOLID',
        color: '#D1FAE5',
        density: 5.5 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.094,
        expansionCoefficient: 20.2,
        halfLife: '1617 years'
    },
    RADON_222: {
        name: 'Радон-222',
        state: 'GAS',
        color: '#F1F5F9',
        density: 0.00973 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 0.094,
        expansionCoefficient: 3670,
        halfLife: '3.82 days'
    },
    NEPTUNIUM_237: {
        name: 'Нептуний-237',
        state: 'SOLID',
        color: '#065F46',
        density: 20.45 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.12,
        expansionCoefficient: 24.0,
        halfLife: '2.2 * 10^6 years'
    },
    POLONIUM_218: {
        name: 'Полоний-218',
        state: 'SOLID',
        color: '#A7F3D0',
        density: 9.32 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.125,
        expansionCoefficient: 23.5,
        halfLife: '3.05 min'
    },
    POLONIUM_212: {
        name: 'Полоний-212',
        state: 'SOLID',
        color: '#6EE7B7',
        density: 9.32 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 0.125,
        expansionCoefficient: 23.5,
        halfLife: '3 * 10^-7 sec'
    },
    CARBON_12: {
        name: 'Нүүрстөрөгч-12',
        state: 'SOLID',
        color: '#262626',
        density: 2.26 * CM3_TO_SIM_DENSITY,
        friction: 0.5,
        specificHeat: 0.709,
        expansionCoefficient: 7.1,
        atomicMass: 12.000000,
        bindingEnergy: 92.156
    },
    CARBON_14: {
        name: 'Нүүрстөрөгч-14',
        state: 'SOLID',
        color: '#404040',
        density: 2.26 * CM3_TO_SIM_DENSITY,
        friction: 0.5,
        specificHeat: 0.709,
        expansionCoefficient: 7.1,
        halfLife: '5600 years'
    },
    NITROGEN_14: {
        name: 'Азот-14',
        state: 'GAS',
        color: '#F8FAFC',
        density: 0.00125 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 1.04,
        expansionCoefficient: 3670,
        atomicMass: 14.003074,
        bindingEnergy: 104.653
    },
    OXYGEN_16: {
        name: 'Хүчилтөрөгч-16',
        state: 'GAS',
        color: '#FDFCFB',
        density: 0.00143 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 0.918,
        expansionCoefficient: 3670,
        atomicMass: 15.994915,
        bindingEnergy: 127.612
    },
    OXYGEN_17: {
        name: 'Хүчилтөрөгч-17',
        state: 'GAS',
        color: '#FDFCFB',
        density: 0.00143 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 0.918,
        expansionCoefficient: 3670,
        atomicMass: 16.999133,
        bindingEnergy: 121.754
    },
    HYDROGEN_1: {
        name: 'Устөрөгч (Проти)',
        state: 'GAS',
        color: '#F1F5F9',
        density: 0.000089 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 14.3,
        expansionCoefficient: 3660,
        atomicMass: 1.007825
    },
    HYDROGEN_2: {
        name: 'Дейтери (H2)',
        state: 'GAS',
        color: '#F1F5F9',
        density: 0.000178 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 14.3,
        expansionCoefficient: 3660,
        atomicMass: 2.014102,
        bindingEnergy: 2.2241
    },
    HYDROGEN_3: {
        name: 'Трити (H3)',
        state: 'GAS',
        color: '#F1F5F9',
        density: 0.000267 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 14.3,
        expansionCoefficient: 3660,
        atomicMass: 3.016049,
        bindingEnergy: 8.4820
    },
    HELIUM_3: {
        name: 'Гели-3',
        state: 'GAS',
        color: '#FBFBFA',
        density: 0.000178 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 5.19,
        expansionCoefficient: 3660,
        atomicMass: 3.016022,
        bindingEnergy: 7.7243
    },
    HELIUM_4: {
        name: 'Гели-4',
        state: 'GAS',
        color: '#FBFBFA',
        density: 0.000178 * CM3_TO_SIM_DENSITY,
        friction: 0,
        specificHeat: 5.19,
        expansionCoefficient: 3660,
        atomicMass: 4.002603,
        bindingEnergy: 28.2937
    },
    BERYLLIUM_9: {
        name: 'Берилли-9',
        state: 'SOLID',
        color: '#94A3B8',
        density: 1.85 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 1.82,
        expansionCoefficient: 11.3,
        atomicMass: 9.012186,
        bindingEnergy: 58.153
    },
    BORON_10: {
        name: 'Бор-10',
        state: 'SOLID',
        color: '#57534E',
        density: 2.34 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        specificHeat: 1.02,
        expansionCoefficient: 5.0,
        atomicMass: 10.012949,
        bindingEnergy: 64.744
    },
    ICE: {
        name: 'Мөс',
        state: 'SOLID',
        color: '#BAE6FD',
        density: 0.9 * CM3_TO_SIM_DENSITY,
        friction: 0.01,
        frictionStatic: 0.03,
        frictionAir: 0.01,
        restitution: 0.05,
        isConductor: false,
        charge: 0,
        resistivity: 1e6,
        youngsModulus: 9,
        specificHeat: 2.1,
        latentHeatFusion: 0.33,
        expansionCoefficient: 50,
        meltingTemp: 0
    },
    WATER: {
        name: 'Ус',
        state: 'LIQUID',
        color: '#3B82F6',
        density: 1.0 * CM3_TO_SIM_DENSITY,
        friction: 0.01,
        frictionStatic: 0.01,
        frictionAir: 0.1,
        restitution: 0.1,
        isConductor: false,
        charge: 0,
        resistivity: 18e4,
        specificHeat: 4.19,
        latentHeatVaporization: 2.26,
        expansionCoefficient: 200,
        surfaceTension: 73,
        dielectricConstant: 81
    },
    MERCURY: {
        name: 'Мөнгөн ус',
        state: 'LIQUID',
        color: '#94A3B8',
        density: 13.6 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: true,
        charge: 0,
        resistivity: 0.96e-6,
        specificHeat: 0.14,
        latentHeatVaporization: 0.293,
        expansionCoefficient: 180,
        meltingTemp: -38.8
    },
    BENZENE: {
        name: 'Бензин',
        state: 'LIQUID',
        color: '#FDE047',
        density: 0.76 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: false,
        charge: 0,
        resistivity: 1e12,
        specificHeat: 2.1,
        latentHeatVaporization: 0.23,
        expansionCoefficient: 1240,
        combustionHeat: 45.5,
        meltingTemp: -60
    },
    KEROSENE: {
        name: 'Керосин',
        state: 'LIQUID',
        color: '#EAB308',
        density: 0.8 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: false,
        charge: 0,
        resistivity: 1e12,
        specificHeat: 2.0,
        expansionCoefficient: 960,
        combustionHeat: 46,
        surfaceTension: 24,
        dielectricConstant: 2.1
    },
    ALCOHOL: {
        name: 'Спирт',
        state: 'LIQUID',
        color: '#BFDBFE',
        density: 0.79 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: false,
        charge: 0,
        resistivity: 1e12,
        specificHeat: 2.4,
        expansionCoefficient: 1080,
        combustionHeat: 27,
        surfaceTension: 22
    },
    GLYCERIN: {
        name: 'Глицерин',
        state: 'LIQUID',
        color: '#F1F5F9',
        density: 1.26 * CM3_TO_SIM_DENSITY,
        friction: 0.1,
        frictionStatic: 0.2,
        frictionAir: 0.2,
        restitution: 0,
        isConductor: false,
        charge: 0,
        resistivity: 1e10,
        specificHeat: 2.43,
        expansionCoefficient: 500,
        surfaceTension: 63
    },
    PETROLEUM: {
        name: 'Нефт',
        state: 'LIQUID',
        color: '#171717',
        density: 0.85 * CM3_TO_SIM_DENSITY,
        friction: 0.1,
        frictionStatic: 0.2,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: false,
        charge: 0,
        resistivity: 1e11,
        specificHeat: 2.1,
        expansionCoefficient: 900,
        combustionHeat: 44.7
    },
    SOAP_SOLUTION: {
        name: 'Савангийн уусмал',
        state: 'LIQUID',
        color: '#F0FDFA',
        density: 1.01 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.1,
        restitution: 0,
        isConductor: true,
        charge: 0,
        resistivity: 10,
        specificHeat: 4.0,
        expansionCoefficient: 210,
        surfaceTension: 40
    },
    CONCRETE: {
        name: 'Бетон',
        state: 'SOLID',
        color: '#94A3B8',
        density: 2.4 * CM3_TO_SIM_DENSITY,
        friction: 0.6,
        frictionStatic: 0.8,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: false,
        charge: 0,
        resistivity: 1e6,
        youngsModulus: 30,
        specificHeat: 0.88,
        expansionCoefficient: 12
    },
    GLASS: {
        name: 'Шил',
        state: 'SOLID',
        color: '#E0F2FE',
        density: 2.5 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.4,
        isConductor: false,
        charge: 0,
        resistivity: 1e12,
        youngsModulus: 70,
        specificHeat: 0.84,
        expansionCoefficient: 9,
        dielectricConstant: 7
    },
    WOOD: {
        name: 'Мод',
        state: 'SOLID',
        color: '#8B4513',
        density: 0.6 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        restitution: 0.2,
        isConductor: false,
        charge: 0,
        resistivity: 1e14,
        youngsModulus: 10,
        specificHeat: 1.76,
        expansionCoefficient: 5,
        combustionHeat: 10
    },
    RUBBER: {
        name: 'Резин',
        state: 'SOLID',
        color: '#18181B',
        density: 1.1 * CM3_TO_SIM_DENSITY,
        friction: 0.8,
        frictionStatic: 0.9,
        frictionAir: 0.02,
        restitution: 0.8,
        isConductor: false,
        charge: 0,
        resistivity: 1e13,
        youngsModulus: 0.05,
        specificHeat: 1.25,
        expansionCoefficient: 80
    },
    PLASTIC: {
        name: 'Хуванцар',
        state: 'SOLID',
        color: '#38B2AC',
        density: 0.95 * CM3_TO_SIM_DENSITY,
        friction: 0.3,
        frictionStatic: 0.4,
        frictionAir: 0.005,
        restitution: 0.4,
        isConductor: false,
        charge: 0,
        resistivity: 1e14,
        youngsModulus: 2,
        specificHeat: 1.5,
        expansionCoefficient: 100,
        meltingTemp: 80,
        dielectricConstant: 3
    },
    EBONITE: {
        name: 'Эбонит',
        state: 'SOLID',
        color: '#1C1917',
        density: 1.15 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.5,
        frictionAir: 0.005,
        restitution: 0.3,
        isConductor: false,
        charge: 0,
        resistivity: 1e15,
        specificHeat: 1.4,
        expansionCoefficient: 80,
        dielectricConstant: 4
    },
    PARAFFIN: {
        name: 'Лааны тос (Paraffin)',
        state: 'SOLID',
        color: '#FEF3C7',
        density: 0.9 * CM3_TO_SIM_DENSITY,
        friction: 0.1,
        frictionStatic: 0.2,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: false,
        charge: 0,
        resistivity: 1e14,
        specificHeat: 2.5,
        expansionCoefficient: 150,
        meltingTemp: 55,
        dielectricConstant: 2.1
    },
    MICA: {
        name: 'Шилтгануур (Mica)',
        state: 'SOLID',
        color: '#FAFAFA',
        density: 2.8 * CM3_TO_SIM_DENSITY,
        friction: 0.2,
        frictionStatic: 0.3,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: false,
        charge: 0,
        resistivity: 1e13,
        specificHeat: 0.88,
        expansionCoefficient: 10,
        dielectricConstant: 7
    },
    COAL: {
        name: 'Нүүрс',
        state: 'SOLID',
        color: '#262626',
        density: 1.5 * CM3_TO_SIM_DENSITY,
        friction: 0.5,
        frictionStatic: 0.7,
        frictionAir: 0.005,
        restitution: 0.05,
        isConductor: false,
        charge: 0,
        resistivity: 1e8,
        specificHeat: 1.1,
        expansionCoefficient: 10,
        combustionHeat: 19
    },
    GUNPOWDER: {
        name: 'Дарь',
        state: 'SOLID',
        color: '#44403C',
        density: 1.7 * CM3_TO_SIM_DENSITY,
        friction: 0.4,
        frictionStatic: 0.6,
        frictionAir: 0.005,
        restitution: 0.1,
        isConductor: false,
        charge: 0,
        resistivity: 1e10,
        specificHeat: 0.8,
        expansionCoefficient: 50,
        combustionHeat: 3.8
    },
    AIR: {
        name: 'Агаар (Хий)',
        state: 'GAS',
        color: '#F8FAFC',
        density: 0.001225 * CM3_TO_SIM_DENSITY,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        restitution: 1,
        isConductor: false,
        charge: 0,
        resistivity: 1e15,
        specificHeat: 1.0,
        expansionCoefficient: 3670,
        meltingTemp: -213
    }
};

/**
 * Материалын төрлөөр шинж чанарыг авах туслах функц
 */
export const getMaterial = (type: PhysicsMaterialType): PhysicsMaterial => {
    return PHYSICS_MATERIALS[type];
};

/**
 * Бүх материалын жагсаалтыг авах (UI-д зориулж)
 */
export const getAllMaterials = () => {
    return Object.entries(PHYSICS_MATERIALS).map(([id, material]) => ({
        id: id as PhysicsMaterialType,
        ...material
    }));
};
