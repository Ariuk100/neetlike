'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Eye, TrendingUp, Calculator } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// Types
interface Point {
    id: string;
    x: number;
    y: number;
}

interface GraphData {
    points: Point[];
    renderMode: 'line' | 'curve';
    sharedToTeacher: boolean;
    studentName: string;
    lastUpdated: number;
    slope?: number | null; // NEW: calculated slope
    slopePoints?: { point1: Point; point2: Point } | null; // NEW: points used for slope
}

interface GraphPlotterElement {
    id: string;
    type: string;
}

interface GraphPlotterProps {
    isTeacher: boolean;
    element: GraphPlotterElement;
    sessionId: string;
    currentPage: number;
    userName: string;
}

export default function GraphPlotter(props: GraphPlotterProps) {
    const { isTeacher, element, sessionId, currentPage, userName } = props;

    const myId = userName.replace(/\s+/g, '_');

    // Local state
    const [myData, setMyData] = useState<GraphData>({
        points: [
            { id: 'p1', x: 0, y: 0 },
            { id: 'p2', x: 0, y: 0 }
        ],
        renderMode: 'line',
        sharedToTeacher: false,
        studentName: userName,
        lastUpdated: Date.now()
    });

    const [activeStudentView, setActiveStudentView] = useState<string>('');
    const [allStudentsData, setAllStudentsData] = useState<Record<string, GraphData>>({});

    // Firestore paths - must have even number of segments (collection/doc pairs)
    const graphDataPath = `whiteboard_sessions/${sessionId}/pages/${currentPage}/graph_data/${element.id}`;
    const myDataPath = `${graphDataPath}/students/${myId}`;
    const activeViewPath = `${graphDataPath}/meta/activeView`; // Added 'meta' collection to make path valid

    // Subscribe to my own data (for students)
    useEffect(() => {
        if (isTeacher) return;

        const unsub = onSnapshot(doc(db, myDataPath), (docSnap) => {
            if (docSnap.exists()) {
                setMyData(docSnap.data() as GraphData);
            }
        });

        return () => unsub();
    }, [myDataPath, isTeacher]);

    // Subscribe to active student view (for teacher)
    useEffect(() => {
        if (!isTeacher) return;

        const unsub = onSnapshot(doc(db, activeViewPath), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setActiveStudentView(data.studentName || '');
            }
        });

        return () => unsub();
    }, [isTeacher, activeViewPath]);

    // Subscribe to the active student's data (for teacher)
    useEffect(() => {
        if (!isTeacher || !activeStudentView) return;

        const activeStudentId = activeStudentView.replace(/\s+/g, '_');
        const activeStudentPath = `${graphDataPath}/students/${activeStudentId}`;

        const unsub = onSnapshot(doc(db, activeStudentPath), (docSnap) => {
            if (docSnap.exists()) {
                const studentData = docSnap.data() as GraphData;
                setAllStudentsData(prev => ({
                    ...prev,
                    [activeStudentView]: studentData
                }));
            }
        });

        return () => unsub();
    }, [isTeacher, activeStudentView, graphDataPath]);

    // Update my data in Firestore
    const updateMyData = async (updates: Partial<GraphData>) => {
        const newData = {
            ...myData,
            ...updates,
            lastUpdated: Date.now()
        };
        setMyData(newData);

        try {
            await setDoc(doc(db, myDataPath), newData, { merge: true });
        } catch (e) {
            console.error('Failed to update graph data:', e);
            toast.error('Өгөгдөл хадгалахад алдаа гарлаа');
        }
    };

    // Handle point value change
    const handlePointChange = (pointId: string, field: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        const newPoints = myData.points.map(p =>
            p.id === pointId ? { ...p, [field]: numValue } : p
        );
        updateMyData({ points: newPoints });
    };

    // Add new row
    const handleAddRow = () => {
        const newPoint: Point = {
            id: `p${Date.now()}`,
            x: 0,
            y: 0
        };
        updateMyData({ points: [...myData.points, newPoint] });
    };

    // Toggle render mode
    const toggleRenderMode = () => {
        updateMyData({ renderMode: myData.renderMode === 'line' ? 'curve' : 'line' });
    };

    // Share to teacher
    const handleShareToTeacher = async () => {
        try {
            await updateMyData({ sharedToTeacher: true });
            await setDoc(doc(db, activeViewPath), {
                studentName: userName,
                timestamp: Date.now()
            });
            toast.success('Багшид харуулж байна');
        } catch (e) {
            console.error('Failed to share:', e);
            toast.error('Алдаа гарлаа');
        }
    };

    // NEW: Calculate best-fit line using Linear Regression (Least Squares)
    const calculateSlope = () => {
        if (myData.points.length < 2) {
            toast.error('Налалт бодох нь нааш цааш 2 цэг хэрэгтэй');
            return;
        }

        const n = myData.points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        // Calculate sums for least squares regression
        myData.points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        });

        // Calculate slope (m) and intercept (b) for y = mx + b
        const denominator = (n * sumX2 - sumX * sumX);

        if (Math.abs(denominator) < 0.0001) {
            toast.warning('Босоо шугам - налалт тодорхойгүй (∞)');
            return;
        }

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // Find min and max x values to draw the regression line
        const xValues = myData.points.map(p => p.x);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);

        // Create two points on the regression line at min and max x
        const point1: Point = {
            id: 'regression_start',
            x: minX,
            y: slope * minX + intercept
        };
        const point2: Point = {
            id: 'regression_end',
            x: maxX,
            y: slope * maxX + intercept
        };

        updateMyData({
            slope,
            slopePoints: { point1, point2 }
        });

        toast.success(`Налалт: ${slope.toFixed(3)}`);
    };

    // Calculate coordinate system bounds with intelligent auto-scaling
    const bounds = useMemo(() => {
        const viewData = isTeacher && activeStudentView
            ? allStudentsData[activeStudentView] || myData
            : myData;

        const points = viewData.points;
        if (points.length === 0) {
            return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
        }

        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);

        let minX = Math.min(...xs);
        let maxX = Math.max(...xs);
        let minY = Math.min(...ys);
        let maxY = Math.max(...ys);

        // Calculate ranges
        let rangeX = maxX - minX;
        let rangeY = maxY - minY;

        // Handle case where all points are the same (range = 0)
        if (rangeX === 0) {
            // Create a range based on magnitude of the value
            const magnitude = Math.abs(minX) || 10;
            const range = Math.max(magnitude * 0.2, 2); // At least 20% of value or 2
            minX -= range;
            maxX += range;
            rangeX = maxX - minX;
        }

        if (rangeY === 0) {
            const magnitude = Math.abs(minY) || 10;
            const range = Math.max(magnitude * 0.2, 2);
            minY -= range;
            maxY += range;
            rangeY = maxY - minY;
        }

        // Adaptive padding: 20% for normal ranges, but ensure minimum padding
        // For very small ranges (< 1), use at least 0.5
        // For very large ranges (> 1000), use 15% to keep within bounds
        const calcPadding = (range: number, magnitude: number) => {
            if (range < 1) {
                return Math.max(range * 0.3, 0.5);
            } else if (range > 1000) {
                return range * 0.15;
            } else {
                return range * 0.2;
            }
        };

        const avgMagnitudeX = (Math.abs(minX) + Math.abs(maxX)) / 2;
        const avgMagnitudeY = (Math.abs(minY) + Math.abs(maxY)) / 2;

        const paddingX = calcPadding(rangeX, avgMagnitudeX);
        const paddingY = calcPadding(rangeY, avgMagnitudeY);

        // Always try to include origin (0,0) if it's close to the data range
        // This helps provide context for scale
        const finalMinX = Math.min(minX - paddingX, 0);
        const finalMaxX = Math.max(maxX + paddingX, 0);
        const finalMinY = Math.min(minY - paddingY, 0);
        const finalMaxY = Math.max(maxY + paddingY, 0);

        return {
            minX: finalMinX,
            maxX: finalMaxX,
            minY: finalMinY,
            maxY: finalMaxY
        };
    }, [myData, isTeacher, activeStudentView, allStudentsData]);

    // Convert point to SVG coordinates
    const toSVG = (x: number, y: number, svgWidth: number, svgHeight: number) => {
        const { minX, maxX, minY, maxY } = bounds;
        const rangeX = maxX - minX;
        const rangeY = maxY - minY;

        const svgX = ((x - minX) / rangeX) * svgWidth;
        const svgY = svgHeight - ((y - minY) / rangeY) * svgHeight; // Flip Y axis

        return { x: svgX, y: svgY };
    };

    // Catmull-Rom spline interpolation
    const getCatmullRomPath = (points: Point[], svgWidth: number, svgHeight: number) => {
        if (points.length < 2) return '';

        const svgPoints = points.map(p => toSVG(p.x, p.y, svgWidth, svgHeight));

        if (points.length === 2) {
            // Just draw a line
            return `M ${svgPoints[0].x} ${svgPoints[0].y} L ${svgPoints[1].x} ${svgPoints[1].y}`;
        }

        // Catmull-Rom spline
        let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;

        for (let i = 0; i < svgPoints.length - 1; i++) {
            const p0 = i > 0 ? svgPoints[i - 1] : svgPoints[i];
            const p1 = svgPoints[i];
            const p2 = svgPoints[i + 1];
            const p3 = i < svgPoints.length - 2 ? svgPoints[i + 2] : p2;

            // Calculate control points for cubic Bezier
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    };

    // Get line path
    const getLinePath = (points: Point[], svgWidth: number, svgHeight: number) => {
        if (points.length < 2) return '';

        const svgPoints = points.map(p => toSVG(p.x, p.y, svgWidth, svgHeight));

        return svgPoints.reduce((path, point, i) => {
            return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
        }, '');
    };

    // Render coordinate system
    const renderCoordinateSystem = () => {
        const svgWidth = 400;
        const svgHeight = 400;
        const { minX, maxX, minY, maxY } = bounds;

        const viewData = isTeacher && activeStudentView
            ? allStudentsData[activeStudentView] || myData
            : myData;

        // Grid lines
        const gridLines = [];
        const stepX = (maxX - minX) / 10;
        const stepY = (maxY - minY) / 10;

        for (let i = 0; i <= 10; i++) {
            const x = minX + i * stepX;
            const y = minY + i * stepY;
            const svgXPos = toSVG(x, minY, svgWidth, svgHeight).x;
            const svgYPos = toSVG(minX, y, svgWidth, svgHeight).y;

            gridLines.push(
                <line key={`vline-${i}`} x1={svgXPos} y1={0} x2={svgXPos} y2={svgHeight} stroke="#e0e0e0" strokeWidth="1" />
            );
            gridLines.push(
                <line key={`hline-${i}`} x1={0} y1={svgYPos} x2={svgWidth} y2={svgYPos} stroke="#e0e0e0" strokeWidth="1" />
            );
        }

        // Axes
        const origin = toSVG(0, 0, svgWidth, svgHeight);

        // Path for points
        const path = viewData.renderMode === 'curve'
            ? getCatmullRomPath(viewData.points, svgWidth, svgHeight)
            : getLinePath(viewData.points, svgWidth, svgHeight);

        return (
            <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="bg-white border border-gray-300 rounded">
                {/* Grid */}
                {gridLines}

                {/* Axes */}
                <line x1={0} y1={origin.y} x2={svgWidth} y2={origin.y} stroke="#666" strokeWidth="2" />
                <line x1={origin.x} y1={0} x2={origin.x} y2={svgHeight} stroke="#666" strokeWidth="2" />

                {/* Regression Line (Best-Fit) - Red */}
                {viewData.slopePoints && (
                    (() => {
                        const { point1, point2 } = viewData.slopePoints;
                        const svg1 = toSVG(point1.x, point1.y, svgWidth, svgHeight);
                        const svg2 = toSVG(point2.x, point2.y, svgWidth, svgHeight);

                        return (
                            <line
                                x1={svg1.x}
                                y1={svg1.y}
                                x2={svg2.x}
                                y2={svg2.y}
                                stroke="#ef4444"
                                strokeWidth="3"
                                strokeDasharray="8,4"
                                opacity="0.8"
                            />
                        );
                    })()
                )}

                {/* Path */}
                {path && (
                    <path
                        d={path}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Points */}
                {viewData.points.map((point, idx) => {
                    const svgPoint = toSVG(point.x, point.y, svgWidth, svgHeight);
                    return (
                        <g key={point.id}>
                            <circle
                                cx={svgPoint.x}
                                cy={svgPoint.y}
                                r="5"
                                fill="#ef4444"
                                stroke="white"
                                strokeWidth="2"
                            />
                            <text
                                x={svgPoint.x + 10}
                                y={svgPoint.y - 10}
                                fontSize="12"
                                fill="#333"
                            >
                                {idx + 1}
                            </text>
                        </g>
                    );
                })}

                {/* Slope Triangle Visualization */}
                {viewData.slopePoints && (
                    (() => {
                        const { point1, point2 } = viewData.slopePoints;
                        const svg1 = toSVG(point1.x, point1.y, svgWidth, svgHeight);
                        const svg2 = toSVG(point2.x, point2.y, svgWidth, svgHeight);

                        // Create right triangle: point1 -> horizontal -> point2 -> back
                        const cornerX = svg2.x;
                        const cornerY = svg1.y;

                        return (
                            <g>
                                {/* Triangle lines */}
                                <line
                                    x1={svg1.x} y1={svg1.y}
                                    x2={cornerX} y2={cornerY}
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                                <line
                                    x1={cornerX} y1={cornerY}
                                    x2={svg2.x} y2={svg2.y}
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />

                                {/* Labels */}
                                <text
                                    x={(svg1.x + cornerX) / 2}
                                    y={cornerY - 5}
                                    fontSize="11"
                                    fill="#10b981"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    run: {Math.abs(point2.x - point1.x).toFixed(2)}
                                </text>
                                <text
                                    x={cornerX + 5}
                                    y={(cornerY + svg2.y) / 2}
                                    fontSize="11"
                                    fill="#10b981"
                                    fontWeight="bold"
                                >
                                    rise: {Math.abs(point2.y - point1.y).toFixed(2)}
                                </text>

                                {/* Highlight slope points */}
                                <circle cx={svg1.x} cy={svg1.y} r="7" fill="none" stroke="#10b981" strokeWidth="2" />
                                <circle cx={svg2.x} cy={svg2.y} r="7" fill="none" stroke="#10b981" strokeWidth="2" />
                            </g>
                        );
                    })()
                )}

                {/* Axis labels */}
                <text x={svgWidth - 20} y={origin.y - 10} fontSize="14" fill="#666" fontWeight="bold">X</text>
                <text x={origin.x + 10} y={20} fontSize="14" fill="#666" fontWeight="bold">Y</text>
            </svg>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
            {/* Left: Table */}
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg p-2 sm:p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
                    <h3 className="font-bold text-sm sm:text-lg text-gray-800">Координатын хүснэгт</h3>
                    {!isTeacher && (
                        <Button
                            onClick={handleShareToTeacher}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-xs sm:text-sm"
                        >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Багшид харуулах
                        </Button>
                    )}
                </div>

                {isTeacher && activeStudentView && (
                    <div className="mb-2 p-2 bg-blue-100 rounded text-sm">
                        <strong>{activeStudentView}</strong>-ийн график
                        {(() => {
                            const studentData = allStudentsData[activeStudentView];
                            if (studentData?.slope !== undefined && studentData?.slope !== null) {
                                return (
                                    <div className="mt-1 text-green-700 font-bold">
                                        Налалт: {studentData.slope.toFixed(3)}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}

                {/* Teacher: All Students Slopes Summary */}
                {isTeacher && Object.keys(allStudentsData).length > 0 && (
                    <div className="mb-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded">
                        <div className="text-xs font-bold text-green-800 mb-2">Бүх сурагчдын налалт:</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(allStudentsData).map(([studentName, data]) => (
                                <div key={studentName} className="flex justify-between bg-white rounded px-2 py-1 border border-green-100">
                                    <span className="font-medium truncate max-w-[100px]">{studentName}:</span>
                                    <span className="font-bold text-green-700 ml-1">
                                        {data.slope !== undefined && data.slope !== null
                                            ? data.slope.toFixed(3)
                                            : '-'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                        <thead className="sticky top-0 bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 p-1 sm:p-2 w-12 sm:w-16">#</th>
                                <th className="border border-gray-300 p-1 sm:p-2">x</th>
                                <th className="border border-gray-300 p-1 sm:p-2">y</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // Show active student's data for teacher, or own data for student
                                const viewData = isTeacher && activeStudentView
                                    ? allStudentsData[activeStudentView] || myData
                                    : myData;

                                return viewData.points.map((point, idx) => (
                                    <tr key={point.id}>
                                        <td className="border border-gray-300 p-1 sm:p-2 text-center font-semibold bg-gray-50">
                                            {idx + 1}
                                        </td>
                                        <td className="border border-gray-300 p-0">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={point.x}
                                                onChange={(e) => handlePointChange(point.id, 'x', e.target.value)}
                                                className="w-full p-1 sm:p-2 text-center outline-none focus:bg-blue-50"
                                                disabled={isTeacher}
                                            />
                                        </td>
                                        <td className="border border-gray-300 p-0">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={point.y}
                                                onChange={(e) => handlePointChange(point.id, 'y', e.target.value)}
                                                className="w-full p-1 sm:p-2 text-center outline-none focus:bg-blue-50"
                                                disabled={isTeacher}
                                            />
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {!isTeacher && (
                    <div className="flex flex-col gap-2 mt-2 sm:mt-4 flex-shrink-0">
                        <Button onClick={handleAddRow} size="sm" className="w-full">
                            <Plus className="w-4 h-4 mr-1" />
                            Мөр нэмэх
                        </Button>
                        <Button
                            onClick={calculateSlope}
                            size="sm"
                            variant="outline"
                            className="w-full border-green-500 text-green-700 hover:bg-green-50"
                        >
                            <Calculator className="w-4 h-4 mr-1" />
                            Налалт бодох
                        </Button>
                        {myData.slope !== undefined && myData.slope !== null && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-center">
                                <div className="text-xs text-green-600 font-medium">Налалт:</div>
                                <div className="text-lg font-bold text-green-700">{myData.slope.toFixed(3)}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Coordinate System */}
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg p-2 sm:p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
                    <h3 className="font-bold text-sm sm:text-lg text-gray-800">График</h3>
                    {!isTeacher && (
                        <Button
                            onClick={toggleRenderMode}
                            size="sm"
                            variant="outline"
                            className="text-xs sm:text-sm"
                        >
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {myData.renderMode === 'line' ? 'Шулуун' : 'Муруй'}
                        </Button>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden">
                    {renderCoordinateSystem()}
                </div>
            </div>
        </div>
    );
}
