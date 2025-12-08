'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Play, Trophy, ArrowRight, Pause } from 'lucide-react';

// Types
interface Point {
    x: number;
    y: number;
}

interface OpticalTool {
    id: string;
    type: 'mirror' | 'lens' | 'prism' | 'block';
    x: number;
    y: number;
    rotation: number; // in degrees
    width: number;
    height: number;
    params?: {
        focalLength?: number; // for lenses
        refractiveIndex?: number; // for blocks/prisms
    };
    isLocked?: boolean; // if true, cannot be moved (part of level design)
}

interface LevelConfig {
    id: number;
    name: string;
    source: { x: number; y: number; angle: number };
    target: { x: number; y: number; radius: number };
    obstacles: OpticalTool[]; // Static walls/barriers
    availableTools: { type: OpticalTool['type']; count: number }[];
    description: string;
}

interface OpticsGameElement {
    id: string;
    type: string;
    gameStatus?: 'playing' | 'completed';
    currentLevel?: number;
    bestTimes?: Record<string, number>; // playerId -> time in ms
}

interface OpticsGameProps {
    isTeacher: boolean;
    element: OpticsGameElement;
    sessionId: string;
    currentPage: number;
    userName: string;
}

export default function OpticsGame({ element }: OpticsGameProps) {
    const [level, setLevel] = useState<number>(element.currentLevel || 1);
    const [tools, setTools] = useState<OpticalTool[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isLevelComplete, setIsLevelComplete] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Levels Configuration
    const levels: LevelConfig[] = [
        {
            id: 1,
            name: "1. The Reflection",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 300, radius: 25 },
            obstacles: [{ id: 'w1', type: 'block', x: 400, y: 300, width: 20, height: 200, rotation: 0, isLocked: true }],
            availableTools: [{ type: 'mirror', count: 2 }],
            description: "Hit the target using reflection."
        },
        {
            id: 2,
            name: "2. Around the Corner",
            source: { x: 50, y: 100, angle: 0 },
            target: { x: 100, y: 500, radius: 25 },
            obstacles: [
                { id: 'w1', type: 'block', x: 200, y: 200, width: 300, height: 20, rotation: 0, isLocked: true }
            ],
            availableTools: [{ type: 'mirror', count: 2 }],
            description: "Guide the light around the wall."
        },
        {
            id: 3,
            name: "3. Refraction Intro",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 350, radius: 25 },
            obstacles: [],
            availableTools: [
                { type: 'block', count: 1 },
                { type: 'mirror', count: 0 }
            ],
            description: "Use the glass block to bend the light (Refraction)."
        },
        {
            id: 4,
            name: "4. Zig Zag",
            source: { x: 50, y: 50, angle: 45 },
            target: { x: 700, y: 50, radius: 25 },
            obstacles: [],
            availableTools: [{ type: 'mirror', count: 3 }],
            description: "Bounce the beam across the screen."
        },
        {
            id: 5,
            name: "5. Internal Reflection",
            source: { x: 50, y: 400, angle: -30 },
            target: { x: 400, y: 400, radius: 25 },
            obstacles: [],
            availableTools: [{ type: 'block', count: 1 }],
            description: "Try to achieve Total Internal Reflection inside the block."
        },
        {
            id: 6,
            name: "6. The Lens Effect",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 300, radius: 20 },
            obstacles: [
                { id: 'w1', type: 'block', x: 300, y: 100, width: 20, height: 400, rotation: 10, isLocked: true },
                { id: 'w2', type: 'block', x: 350, y: 500, width: 20, height: 400, rotation: -10, isLocked: true }
            ],
            availableTools: [{ type: 'mirror', count: 4 }],
            description: "Navigate through the tight gap."
        },
        {
            id: 7,
            name: "7. Mixed Optics",
            source: { x: 50, y: 100, angle: 20 },
            target: { x: 700, y: 500, radius: 25 },
            obstacles: [],
            availableTools: [{ type: 'mirror', count: 2 }, { type: 'block', count: 2 }],
            description: "Combine Mirrors and Glass Blocks."
        },
        {
            id: 8,
            name: "8. The Maze",
            source: { x: 400, y: 50, angle: 90 },
            target: { x: 400, y: 550, radius: 20 },
            obstacles: [
                { id: 'o1', type: 'block', x: 200, y: 300, width: 200, height: 20, rotation: 0, isLocked: true },
                { id: 'o2', type: 'block', x: 600, y: 300, width: 200, height: 20, rotation: 0, isLocked: true },
            ],
            availableTools: [{ type: 'mirror', count: 4 }],
            description: "Find a path through the barriers."
        },
        {
            id: 9,
            name: "9. Precision",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 750, y: 300, radius: 10 },
            obstacles: [
                { id: 'b1', type: 'block', x: 200, y: 300, width: 20, height: 100, rotation: 0, isLocked: true },
                { id: 'b2', type: 'block', x: 400, y: 300, width: 20, height: 100, rotation: 0, isLocked: true },
                { id: 'b3', type: 'block', x: 600, y: 300, width: 20, height: 100, rotation: 0, isLocked: true },
            ],
            availableTools: [{ type: 'block', count: 3 }],
            description: "Align multiple refractions perfectly."
        },
        {
            id: 10,
            name: "10. Master Challenge",
            source: { x: 100, y: 100, angle: 45 },
            target: { x: 100, y: 100, radius: 30 }, // Target back at start? Hard. 
            // Let's do a loop
            obstacles: [
                { id: 'c1', type: 'block', x: 400, y: 300, width: 50, height: 50, rotation: 45, isLocked: true }
            ],
            availableTools: [{ type: 'mirror', count: 5 }, { type: 'block', count: 2 }],
            description: "Bending light in a full loop around the center."
        }
    ];

    const currentLevelConfig = levels.find(l => l.id === level) || levels[0];

    // Resize Canvas
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Game Loop (Timer)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && !isLevelComplete) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 100);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isLevelComplete]);

    // Render Loop
    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const { source, target, obstacles } = currentLevelConfig;

            // --- PHYSICS ENGINE: Ray Tracing ---
            const maxBounces = 100;
            const newRays: Point[][] = [];

            // Initial Ray from Source
            let currentRayOrigin = { x: source.x, y: source.y };
            let currentRayAngle = source.angle * (Math.PI / 180); // Convert to radians
            const currentPath: Point[] = [currentRayOrigin];

            for (let i = 0; i < maxBounces; i++) {
                // Find closest intersection
                let closestDist = Infinity;
                let closestPoint: Point | null = null;
                let hitObject: OpticalTool | null = null; // Tool or Obstacle
                let hitNormal = 0; // Angle of normal at hit point

                // ... (rest of logic) ...


                // 1. Check Intersection with Bounds (Screen edges)
                // (Simplified: just treat edges as absorbers for now, or stop ray)
                // Left
                if (Math.cos(currentRayAngle) < 0) {
                    const d = currentRayOrigin.x;
                    if (d < closestDist) { closestDist = d; closestPoint = { x: 0, y: currentRayOrigin.y + d * Math.tan(currentRayAngle) }; hitObject = null; }
                }
                // Right
                if (Math.cos(currentRayAngle) > 0) {
                    const d = canvas.width - currentRayOrigin.x;
                    if (d < closestDist) { closestDist = d; closestPoint = { x: canvas.width, y: currentRayOrigin.y + d * Math.tan(currentRayAngle) }; hitObject = null; }
                }
                // (Add Top/Bottom checks similarly if needed, but tools are main focus)

                // 2. Check Intersection with Tools and Obstacles
                const allObjects = [...obstacles, ...tools];

                for (const obj of allObjects) {
                    // Simple AABB or Circle check first, then precise line intersection
                    // For Mirrors (Line Segments)
                    if (obj.type === 'mirror') {
                        // Calculate mirror endpoints based on x,y, width, rotation
                        const rad = obj.rotation * (Math.PI / 180);
                        const dx = (obj.width / 2) * Math.cos(rad);
                        const dy = (obj.width / 2) * Math.sin(rad);
                        const p1 = { x: obj.x - dx, y: obj.y - dy };
                        const p2 = { x: obj.x + dx, y: obj.y + dy };

                        // Ray-Line Intersection
                        const x1 = currentRayOrigin.x;
                        const y1 = currentRayOrigin.y;
                        const x2 = x1 + Math.cos(currentRayAngle) * 2000; // Far point
                        const y2 = y1 + Math.sin(currentRayAngle) * 2000;

                        const x3 = p1.x; const y3 = p1.y;
                        const x4 = p2.x; const y4 = p2.y;

                        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                        if (den === 0) continue; // Parallel

                        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
                        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

                        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                            // Intersection found!
                            // t is fraction along ray, but since ray is infinite, we need dist
                            const px = x1 + t * (x2 - x1);
                            const py = y1 + t * (y2 - y1);
                            const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

                            if (dist < closestDist && dist > 1) { // >1 to avoid self-intersection at start
                                closestDist = dist;
                                closestPoint = { x: px, y: py };
                                hitObject = obj;
                                // Normal angle: mirror rotation + 90 deg
                                hitNormal = rad + Math.PI / 2;
                            }
                        }
                    }
                    // For Blocks (Rectangles)
                    if (obj.type === 'block') {
                        // Transform ray to local space of the block for easier AABB check
                        // Or just checking 4 segments
                        const rad = obj.rotation * (Math.PI / 180);
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const w2 = obj.width / 2;
                        const h2 = (obj.height || 40) / 2; // Default height for block

                        // Get corners in world space
                        const corners = [
                            { x: -w2, y: -h2 },
                            { x: w2, y: -h2 },
                            { x: w2, y: h2 },
                            { x: -w2, y: h2 }
                        ].map(p => ({
                            x: obj.x + (p.x * cos - p.y * sin),
                            y: obj.y + (p.x * sin + p.y * cos)
                        }));

                        // Check intersection with each of the 4 edges
                        for (let k = 0; k < 4; k++) {
                            const p1 = corners[k];
                            const p2 = corners[(k + 1) % 4];

                            // Ray-Line Intersection
                            const x1 = currentRayOrigin.x;
                            const y1 = currentRayOrigin.y;
                            const x2 = x1 + Math.cos(currentRayAngle) * 2000;
                            const y2 = y1 + Math.sin(currentRayAngle) * 2000;

                            const x3 = p1.x; const y3 = p1.y;
                            const x4 = p2.x; const y4 = p2.y;

                            const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                            if (den === 0) continue;

                            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
                            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

                            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                                const px = x1 + t * (x2 - x1);
                                const py = y1 + t * (y2 - y1);
                                const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

                                if (dist < closestDist && dist > 1) {
                                    closestDist = dist;
                                    closestPoint = { x: px, y: py };
                                    hitObject = obj;

                                    // Normal calculation
                                    const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                                    hitNormal = edgeAngle - Math.PI / 2;
                                }
                            }
                        }
                    }
                    // TODO: Add Lenses / Prisms / Blocks intersection
                }

                if (closestPoint) {
                    currentPath.push(closestPoint);

                    if (hitObject) {
                        if (hitObject.type === 'mirror') {
                            // REFLECTION (Code from previous step...)
                            const rx = Math.cos(currentRayAngle);
                            const ry = Math.sin(currentRayAngle);
                            const nx = Math.cos(hitNormal);
                            const ny = Math.sin(hitNormal);
                            const dot = rx * nx + ry * ny;

                            // Reflected Vector
                            const rOutX = rx - 2 * dot * nx;
                            const rOutY = ry - 2 * dot * ny;
                            currentRayAngle = Math.atan2(rOutY, rOutX);
                            currentRayOrigin = closestPoint;
                        } else if (hitObject.type === 'block') {
                            // REFRACTION
                            // n1 sin(theta1) = n2 sin(theta2)
                            // We need to know if we are entering or exiting
                            // Assume Air = 1.0
                            const nGlass = 1.5;
                            const nAir = 1.0;

                            const rx = Math.cos(currentRayAngle);
                            const ry = Math.sin(currentRayAngle);
                            const nx = Math.cos(hitNormal);
                            const ny = Math.sin(hitNormal);

                            // Check dot product to see if entering or exiting
                            // If dot < 0, ray is opposing normal => Entering (if normal points out)
                            // We assumed normal points out ( rotated -90 from edge).

                            // Real interaction check
                            let n1 = nAir;
                            let n2 = nGlass;

                            const dot = rx * nx + ry * ny;
                            if (dot > 0) {
                                // Exiting (Ray and Normal generally same dir)
                                // Only true if normal points OUT and we were INSIDE.
                                // Actually, simpler: Is the current ray origin inside the block?
                                // Let's track "inMedium" state?
                                // Or purely local: dot product sign.
                                // If dot > 0, we are hitting "backface", so exiting?
                                n1 = nGlass;
                                n2 = nAir;
                            }

                            // Snell's Law Vector Form
                            // r_out = r_in * (n1/n2) + N * ( ... )
                            // Simple Angle Form:
                            // Angle of incidence theta1 (angle between Ray and Normal)

                            // Ensure normal points AGAINST ray for standard calc
                            let effectiveNormal = hitNormal;
                            if (dot > 0) {
                                effectiveNormal = hitNormal + Math.PI; // Backface
                                n1 = nGlass; n2 = nAir;
                            } else {
                                n1 = nAir; n2 = nGlass;
                            }

                            // Calculate theta 1
                            // Angle between Ray and Normal
                            // Ray Angle: currentRayAngle
                            // Normal Angle: effectiveNormal
                            // theta1 = current - normal?
                            let theta1 = currentRayAngle - effectiveNormal;
                            // Normalize to -PI..PI
                            while (theta1 > Math.PI) theta1 -= 2 * Math.PI;
                            while (theta1 < -Math.PI) theta1 += 2 * Math.PI;

                            // Critical Angle Check (Total Internal Reflection)
                            // sin(theta_c) = n2/n1 (if n1 > n2)

                            const sinTheta1 = Math.sin(theta1);
                            const sinTheta2 = (n1 / n2) * sinTheta1;

                            if (Math.abs(sinTheta2) > 1) {
                                // Total Internal Reflection
                                // Treat as mirror
                                // R = I - 2(N.I)N
                                const rOutX = rx - 2 * (rx * Math.cos(effectiveNormal) + ry * Math.sin(effectiveNormal)) * Math.cos(effectiveNormal);
                                const rOutY = ry - 2 * (rx * Math.cos(effectiveNormal) + ry * Math.sin(effectiveNormal)) * Math.sin(effectiveNormal);
                                currentRayAngle = Math.atan2(rOutY, rOutX);
                            } else {
                                // Refraction
                                const theta2 = Math.asin(sinTheta2);
                                // The new ray angle is Normal + theta2 (preserving sign of theta1)
                                currentRayAngle = effectiveNormal + theta2;
                            }

                            currentRayOrigin = closestPoint;
                        }
                    } else {
                        // Hit wall/screen edge
                        break;
                    }
                } else {
                    // No hit, extend to infinity (or screen edge)
                    currentPath.push({
                        x: currentRayOrigin.x + Math.cos(currentRayAngle) * 2000,
                        y: currentRayOrigin.y + Math.sin(currentRayAngle) * 2000
                    });
                    break;
                }
            }
            newRays.push(currentPath); // Only one path for now (no splitting yet)
            // setRays(newRays); // Do not set state inside render loop! It causes infinite re-render.
            // Move setRays to useEffect dependency or calc outside.
            // Actually, we should calculate physics inside a useEffect that depends on Tools, not inside requestAnimationFrame/render

            // --- DRAWING ---
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Source
            ctx.fillStyle = '#fbbf24'; // amber-400
            ctx.beginPath();
            ctx.arc(source.x, source.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbbf24';
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw Target
            ctx.fillStyle = isLevelComplete ? '#22c55e' : '#ef4444';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw Rays
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            newRays.forEach(path => {
                if (path.length < 2) return;

                // Outer Glow
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let j = 1; j < path.length; j++) {
                    ctx.lineTo(path[j].x, path[j].y);
                }
                ctx.stroke();

                // Inner Core
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let j = 1; j < path.length; j++) {
                    ctx.lineTo(path[j].x, path[j].y);
                }
                ctx.stroke();
            });

            // Check Win Condition
            // If any ray endpoint is inside target
            const lastPoint = newRays[0][newRays[0].length - 1]; // Simplified
            const distToTarget = Math.sqrt(
                (lastPoint.x - target.x) ** 2 + (lastPoint.y - target.y) ** 2
            );

            if (distToTarget < target.radius) {
                if (!isLevelComplete) setIsLevelComplete(true);
            } else {
                if (isLevelComplete) setIsLevelComplete(false);
            }
        };
        render();
    }, [currentLevelConfig, tools, isLevelComplete]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-slate-900 overflow-hidden rounded-lg border border-slate-700">
            {/* Headers / HUD */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
                <div className="bg-slate-800/80 p-2 rounded text-white backdrop-blur-sm">
                    <h3 className="font-bold text-lg">{currentLevelConfig.name}</h3>
                    <p className="text-xs text-slate-300">{currentLevelConfig.description}</p>
                </div>
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <div className="bg-slate-800/80 p-2 rounded text-white font-mono text-xl text-center min-w-[100px] backdrop-blur-sm">
                        {(elapsedTime / 1000).toFixed(1)}s
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"}
                    >
                        {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                        {isPlaying ? "Pause" : "Start"}
                    </Button>
                </div>
            </div>

            {/* Canvas Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

            {/* Tool Layer (DOM) */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className="absolute group cursor-move"
                        style={{
                            left: tool.x,
                            top: tool.y,
                            width: tool.width,
                            height: 10, // Thin for mirror
                            transform: `translate(-50%, -50%) rotate(${tool.rotation}deg)`,
                        }}
                        onPointerDown={(e) => {
                            // Handle Drag Start
                            // Simple implementation for now - could be improved with dedicated hook
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startToolX = tool.x;
                            const startToolY = tool.y;

                            const handleMove = (moveEvent: PointerEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;
                                setTools(prev => prev.map(t =>
                                    t.id === tool.id ? { ...t, x: startToolX + dx, y: startToolY + dy } : t
                                ));
                            };

                            const handleUp = () => {
                                window.removeEventListener('pointermove', handleMove);
                                window.removeEventListener('pointerup', handleUp);
                            };

                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            // Right click to rotate 45 degrees
                            setTools(prev => prev.map(t =>
                                t.id === tool.id ? { ...t, rotation: (t.rotation + 45) % 360 } : t
                            ));
                        }}
                    >
                        {/* Visual Representation */}
                        {tool.type === 'mirror' && (
                            <div className="w-full h-full bg-slate-300 border-b-4 border-slate-500 rounded-sm shadow-md overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent opacity-50" />
                                {/* Reflection Hint */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-white shadow-[0_0_10px_white]" />
                            </div>
                        )}
                        {tool.type === 'block' && (
                            <div className="w-full h-full bg-blue-100/30 border border-blue-300/50 backdrop-blur-[2px] rounded-sm shadow-inner relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-blue-500/10" />
                            </div>
                        )}

                        {/* Rotation Handle (Visible on hover) */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-[10px] px-1 rounded pointer-events-none">
                            {tool.rotation}° (Right Click to Rotate)
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar (Bottom) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 p-2 rounded-full border border-slate-600 flex gap-2 pointer-events-auto z-20 backdrop-blur-md">
                {currentLevelConfig.availableTools.map((toolConf, idx) => {
                    const usedCount = tools.filter(t => t.type === toolConf.type).length;
                    const canAdd = usedCount < toolConf.count;

                    return (
                        <div key={idx} className="relative group">
                            <Button
                                variant="secondary"
                                disabled={!canAdd}
                                className={`w-12 h-12 rounded-full p-0 overflow-hidden border-2 transition-all shadow-lg 
                                    ${canAdd ? 'border-slate-500 hover:border-blue-400 hover:scale-110 active:scale-95' : 'border-slate-700 opacity-50 cursor-not-allowed'}
                                `}
                                onClick={() => {
                                    if (!canAdd) return;

                                    const newTool: OpticalTool = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: toolConf.type,
                                        x: containerRef.current ? containerRef.current.clientWidth / 2 : 400,
                                        y: containerRef.current ? containerRef.current.clientHeight / 2 : 300,
                                        rotation: toolConf.type === 'block' ? 0 : 45,
                                        width: toolConf.type === 'block' ? 60 : 80,
                                        height: toolConf.type === 'block' ? 100 : 10
                                    };
                                    setTools(prev => [...prev, newTool]);
                                }}
                            >
                                {/* Icon based on type */}
                                {toolConf.type === 'mirror' && (
                                    <div className="w-8 h-2 bg-slate-300 border-b-2 border-slate-500 rotate-45 transform" />
                                )}
                                {toolConf.type === 'block' && (
                                    <div className="w-6 h-8 bg-blue-400/50 border border-blue-300 rounded-sm" />
                                )}
                            </Button>
                            <span className={`absolute -top-2 -right-2 text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm ${canAdd ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-400'}`}>
                                {toolConf.count - usedCount}
                            </span>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                                Add {toolConf.type}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Level Complete Overlay */}
            {isLevelComplete && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-green-500/50 text-center shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-300 max-w-sm w-full mx-4">
                        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-white mb-2">Level Completed!</h2>
                        <div className="text-4xl font-mono text-green-400 mb-6 font-bold">
                            {(elapsedTime / 1000).toFixed(2)}s
                        </div>
                        <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-lg py-6 shadow-lg shadow-green-500/20"
                            onClick={() => {
                                if (level < 10) {
                                    setLevel(l => l + 1);
                                    setIsLevelComplete(false);
                                    setTools([]); // Clear tools for next level
                                    setElapsedTime(0);
                                    setIsPlaying(true);
                                } else {
                                    toast.success("Congratulations! You completed all levels!");
                                    // Maybe reset or show final screen
                                    setIsLevelComplete(false);
                                }
                            }}
                        >
                            {level < 10 ? <>Next Level <ArrowRight className="ml-2" /></> : "Finish Game"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
