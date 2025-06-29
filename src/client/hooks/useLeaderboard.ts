/**
 * 排行榜数据管理 Hook
 * 处理排行榜相关的数据获取和提交
 * 
 * @author 开发者C - 数据管理负责人
 */

import { useState, useCallback } from 'react';
import { PlayerScore, LeaderboardData } from '../../shared/types/leaderboard';

export const useLeaderboard = () => {
  const [playerBest, setPlayerBest] = useState<PlayerScore | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 提交玩家分数到排行榜
   */
  const submitScore = useCallback(async (
    playerName: string,
    enduranceDuration: number,
    catAvatarId: string,
    continentId: string,
    roundsCompleted: number = 0,
    totalTime: number = 0,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    countryCode: string = 'US'
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 生成唯一的玩家ID（在实际应用中，这应该来自Reddit用户ID）
      const playerId = `player_${playerName}_${Date.now()}`;

      const playerScore: PlayerScore = {
        playerId,
        playerName,
        enduranceDuration, // 坚持时长是主要的排名依据
        catAvatarId,
        continentId,
        completedAt: Date.now(),
        // 可选字段
        roundsCompleted,
        totalTime,
        difficulty,
        countryCode,
      };

      console.log('[useLeaderboard] Submitting score:', playerScore);

      const response = await fetch('/api/submit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerScore),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('[useLeaderboard] Score submitted successfully:', result.data);
        
        // 更新玩家最佳成绩
        setPlayerBest(playerScore);
        
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to submit score');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useLeaderboard] Error submitting score:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取排行榜数据
   */
  const fetchLeaderboard = useCallback(async (continentId?: string, limit: number = 100) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/leaderboard', window.location.origin);
      if (continentId) {
        url.searchParams.set('continentId', continentId);
      }
      url.searchParams.set('limit', limit.toString());

      console.log('[useLeaderboard] Fetching leaderboard:', url.toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('[useLeaderboard] Leaderboard fetched successfully:', result.data);
        setLeaderboardData(result.data);
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useLeaderboard] Error fetching leaderboard:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取玩家个人最佳成绩
   */
  const fetchPlayerBest = useCallback(async (playerId?: string) => {
    if (!playerId) {
      console.log('[useLeaderboard] No playerId provided for fetchPlayerBest');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/player-best', window.location.origin);
      url.searchParams.set('playerId', playerId);

      console.log('[useLeaderboard] Fetching player best:', url.toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('[useLeaderboard] Player best fetched successfully:', result.data);
        setPlayerBest(result.data);
        return result.data;
      } else {
        console.log('[useLeaderboard] No player best found');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useLeaderboard] Error fetching player best:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取洲际统计数据
   */
  const fetchContinentStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useLeaderboard] Fetching continent stats');

      const response = await fetch('/api/leaderboard/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('[useLeaderboard] Continent stats fetched successfully:', result.data);
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch continent stats');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useLeaderboard] Error fetching continent stats:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // 状态
    playerBest,
    leaderboardData,
    loading,
    error,
    
    // 方法
    submitScore,
    fetchLeaderboard,
    fetchPlayerBest,
    fetchContinentStats,
    
    // 清理方法
    clearError: () => setError(null),
    clearData: () => {
      setPlayerBest(null);
      setLeaderboardData(null);
      setError(null);
    },
  };
};