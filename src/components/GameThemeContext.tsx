import { createContext, useContext } from 'react';

export interface GameThemeContextValue {
  label?: string;
  onOpenPicker?: () => void;
  pdiSafeBottom: boolean;
  onTogglePdiSafeBottom: () => void;
}

export const GameThemeContext = createContext<GameThemeContextValue | null>(null);

export function useGameThemeContext(): GameThemeContextValue | null {
  return useContext(GameThemeContext);
}
