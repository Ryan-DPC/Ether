import axios from 'axios';
import electronAPI from '../tauri-adapter';

// API Base URL is configured in axiosConfig, so we use relative paths or the configured instance
// Assuming global axios or importing the instance if available. 
// For now using axios directly, expecting base URL to be set or using relative /api

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class StatsService {
    private currentSessionId: string | null = null;
    private currentGameId: string | null = null;

    constructor() {
        this.initListeners();
    }

    private initListeners() {
        electronAPI.onGameExited(async (data: any) => {
            console.log('Game exited:', data);
            if (this.currentSessionId && this.currentGameId === data.gameId) {
                await this.endSession(this.currentSessionId);
            } else if (this.currentSessionId) {
                // Fallback: if gameId mismatch but session is open, close it anyway
                console.warn('Closing session with mismatched GameID');
                await this.endSession(this.currentSessionId);
            }
        });
    }

    async startSession(gameId: string): Promise<string | null> {
        try {
            const response = await axios.post(`${API_URL}/stats/session/start`, { gameId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            this.currentSessionId = response.data.sessionId;
            this.currentGameId = gameId;
            return this.currentSessionId;
        } catch (error) {
            console.error('Failed to start session:', error);
            return null;
        }
    }

    async endSession(sessionId: string): Promise<void> {
        try {
            await axios.post(`${API_URL}/stats/session/end`, { sessionId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            this.currentSessionId = null;
            this.currentGameId = null;
        } catch (error) {
            console.error('Failed to end session:', error);
        }
    }

    async getGlobalStats(): Promise<any> {
        try {
            const response = await axios.get(`${API_URL}/stats/global`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch global stats:', error);
            return null;
        }
    }

    async getGameStats(gameId: string): Promise<any> {
        try {
            const response = await axios.get(`${API_URL}/stats/${gameId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch game stats:', error);
            return null;
        }
    }
}

export const statsService = new StatsService();
