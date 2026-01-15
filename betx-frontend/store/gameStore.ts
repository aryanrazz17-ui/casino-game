import { create } from 'zustand'
import { Game } from '@/types'

interface GameState {
    currentGame: string | null
    gameHistory: Game[]
    isPlaying: boolean

    // Actions
    setCurrentGame: (game: string | null) => void
    setIsPlaying: (playing: boolean) => void
    addToHistory: (game: Game) => void
    clearHistory: () => void
}

export const useGameStore = create<GameState>((set) => ({
    currentGame: null,
    gameHistory: [],
    isPlaying: false,

    setCurrentGame: (game) => {
        set({ currentGame: game })
    },

    setIsPlaying: (playing) => {
        set({ isPlaying: playing })
    },

    addToHistory: (game) => {
        set((state) => ({
            gameHistory: [game, ...state.gameHistory].slice(0, 50), // Keep last 50 games
        }))
    },

    clearHistory: () => {
        set({ gameHistory: [] })
    },
}))
