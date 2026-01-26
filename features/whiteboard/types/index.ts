import { ReactNode } from "react";

/**
 * Самбар дээрх элемент (Текст, Зураг, Виджет г.м)
 */
export interface WhiteboardElement {
    id: string;
    type: string; // "text", "image", "photon_game", etc.
    x: number;
    y: number;
    width: number;
    height: number;

    // Rotating & Layering
    rotation?: number;
    zIndex?: number;

    // Common content props
    content?: string; // For text
    url?: string;     // For image/video/iframe

    // Styling
    style?: {
        color?: string;
        fontSize?: number;
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
        backgroundColor?: string;
        border?: string;

        // Text Styles
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
    };

    // Widget specific data
    [key: string]: any;
}

/**
 * Виджетийн тохиргооны интерфейс
 */
export interface WidgetConfig {
    type: string;           // Unique ID (e.g. 'photon_game')
    label: string;          // Toolbar label
    icon: React.ElementType;  // Toolbar icon component
    component: React.ComponentType<{
        element: WhiteboardElement;
        isTeacher: boolean;
        updateElement: (id: string, data: Partial<WhiteboardElement>) => void | Promise<void>;
        sessionId: string;
        currentPage: number;
        userName: string;
        collectionName?: string;
    }>;
    defaultSize: { width: number; height: number };
}
