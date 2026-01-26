import { WidgetConfig } from '../types';

// Registry of all available widgets
// This will be populated as we migrate widgets
import OpticsGameWidget from './games/optics-game';
import PhotonRaceGameWidget from './games/photon-race-game';
import QuizGameWidget from './games/quiz-game';
import SimulationWidget from './simulation';
import { Lightbulb, Flag, HelpCircle, Globe } from 'lucide-react';

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
    'optics_game': {
        type: 'optics_game',
        label: 'Оптик тоглоом',
        icon: Lightbulb,
        component: OpticsGameWidget,
        defaultSize: { width: 60, height: 60 }
    },
    'photon_race_game': {
        type: 'photon_race_game',
        label: 'Фотон уралдаан',
        icon: Flag,
        component: PhotonRaceGameWidget,
        defaultSize: { width: 80, height: 35 }
    },
    'quiz_game': {
        type: 'quiz_game',
        label: 'Quiz Game',
        icon: HelpCircle,
        component: QuizGameWidget,
        defaultSize: { width: 80, height: 35 }
    },
    'simulation': {
        type: 'simulation',
        label: 'Simulation / Embed',
        icon: Globe,
        component: SimulationWidget,
        defaultSize: { width: 60, height: 34 }
    }
};

export const getWidgetComponent = (type: string) => {
    return WIDGET_REGISTRY[type]?.component || null;
};
