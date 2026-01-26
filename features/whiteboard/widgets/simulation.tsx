import { WhiteboardElement } from '../types';

interface SimulationWidgetProps {
    element: WhiteboardElement;
    isTeacher: boolean;
    updateElement: (id: string, data: Partial<WhiteboardElement>) => void;
}

export default function SimulationWidget({ element, isTeacher, updateElement }: SimulationWidgetProps) {
    if (!element.url) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-300 text-gray-500">
                URL тохируулаагүй байна
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group">
            <iframe
                src={element.url}
                className="w-full h-full border-none pointer-events-auto"
                title="Simulation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
            {/* Overlay for teacher to allow dragging/resizing without interacting with iframe content */}
            {isTeacher && (
                <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-blue-200/50" />
            )}
        </div>
    );
}
