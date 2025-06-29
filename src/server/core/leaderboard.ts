/**
 * 全局游戏排行榜系统 - 服务端逻辑 (坚持时长排行榜版本)
 * Global Game Leaderboard System - Server Logic (Endurance Duration Leaderboard Version)
 */

import { Context } from '@devvit/public-api';
import { RedisClient } from '@devvit/redis';

// Redis 键名常量
const LEADERBOARD_KEY = 'global_leaderboard';
const PLAYER_SCORES_KEY = 'player_scores_hash';

// 玩家分数数据结构
export interface PlayerScore {
  playerId: string;
  playerName: string;
  catAvatarId: string; // 选择的猫的ID
  continentId: string; // 选择的地区ID
  enduranceDuration: number; // 坚持时长（秒）- 唯一排名依据
  completedAt: number; // 完成时间戳
  
  // 保留的可选字段（向后兼容）
  completionTime?: number;
  roundsCompleted?: number;
  totalTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  countryCode?: string;
}

// 排行榜条目
export interface LeaderboardEntry extends PlayerScore {
  rank: number; // 排名
}

// 排行榜数据
export interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalPlayers: number;
  lastUpdated: number;
  continentId?: string; // 如果是洲际排行榜
}

// 洲际统计数据
export interface ContinentStats {
  continentId: string;
  continentName: string;
  playerCount: number;
  flag: string;
}

// 洲际信息映射
const CONTINENT_INFO = {
  'AS': { name: 'Asia', flag: '🌏' },
  'EU': { name: 'Europe', flag: '🌍' },
  'AF': { name: 'Africa', flag: '🌍' },
  'NA': { name: 'North America', flag: '🌎' },
  'SA': { name: 'South America', flag: '🌎' },
  'OC': { name: 'Oceania', flag: '🌏' },
};

/**
 * 安全的JSON解析函数
 * Safe JSON parsing function
 */
function safeJsonParse<T>(jsonString: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error, 'Raw data:', jsonString);
    return fallback;
  }
}

/**
 * 提交玩家分数到全球排行榜
 * Submit player score to global leaderboard
 */
export async function submitScore({
  redis,
  playerScore
}: {
  redis: Context['redis'] | RedisClient;
  playerScore: PlayerScore;
}): Promise<{ success: boolean; rank: number; message: string; enduranceDuration: number }> {
  try {
    console.log(`[submitScore] Submitting score for player ${playerScore.playerId} (${playerScore.playerName})`);
    console.log(`[submitScore] Endurance duration: ${playerScore.enduranceDuration}s, Continent: ${playerScore.continentId}`);
    
    // 验证必需字段
    if (!playerScore.playerId || !playerScore.playerName || typeof playerScore.enduranceDuration !== 'number') {
      throw new Error('Missing required fields: playerId, playerName, or enduranceDuration');
    }

    // 验证洲际ID和猫ID
    if (!playerScore.continentId || !playerScore.catAvatarId) {
      throw new Error('continentId and catAvatarId are required');
    }

    // 保存玩家详细数据到 Hash
    await redis.hSet(PLAYER_SCORES_KEY, playerScore.playerId, JSON.stringify(playerScore));
    console.log(`[submitScore] Saved player data to Redis hash: ${playerScore.playerId}`);
    
    // 使用坚持时长作为分数，时间越长排名越高
    const score = playerScore.enduranceDuration;
    
    // 将玩家分数添加到全球排行榜 (使用 zRevRange 获取时需要时间长的在前面)
    await redis.zAdd(LEADERBOARD_KEY, {
      member: playerScore.playerId,
      score: score
    });
    
    console.log(`[submitScore] Player ${playerScore.playerName} added to global leaderboard with endurance duration ${score}s`);
    
    // 获取玩家在排行榜中的排名
    const rank = await getPlayerRank(redis, playerScore.playerId);
    
    console.log(`[submitScore] Player ${playerScore.playerName} current rank: ${rank}`);
    
    return {
      success: true,
      rank: rank,
      enduranceDuration: playerScore.enduranceDuration,
      message: `Score submitted successfully. Current rank: ${rank}`
    };
  } catch (error) {
    console.error('[submitScore] Error submitting score:', error);
    throw error;
  }
}

/**
 * 获取全球排行榜数据 (支持按洲际过滤)
 * Get global leaderboard data (supports filtering by continent)
 */
export async function getLeaderboard({
  redis,
  limit = 100,
  continentId
}: {
  redis: Context['redis'] | RedisClient;
  limit?: number;
  continentId?: string;
}): Promise<LeaderboardData> {
  try {
    const leaderboardType = continentId ? `continent (${continentId})` : 'global';
    console.log(`[getLeaderboard] Getting ${leaderboardType} leaderboard with limit: ${limit}`);
    
    // 从 Redis 获取排行榜前 N 名（按分数降序，时间越长越好）
    const topPlayerIds = await redis.zRevRange(LEADERBOARD_KEY, 0, limit - 1, { by: 'rank' });
    console.log(`[getLeaderboard] Retrieved ${topPlayerIds.length} player IDs from leaderboard:`, topPlayerIds);
    
    const entries: LeaderboardEntry[] = [];
    
    // 获取每个玩家的详细数据并过滤
    for (let i = 0; i < topPlayerIds.length; i++) {
      const playerId = topPlayerIds[i];
      const playerDataStr = await redis.hGet(PLAYER_SCORES_KEY, playerId);
      
      if (playerDataStr) {
        const playerData = safeJsonParse<PlayerScore>(playerDataStr);
        
        if (playerData) {
          // 如果指定了洲际，只包含该洲际的玩家
          if (!continentId || playerData.continentId === continentId) {
            const entry: LeaderboardEntry = {
              ...playerData,
              rank: entries.length + 1 // 重新计算排名
            };
            entries.push(entry);
            console.log(`[getLeaderboard] Rank ${entry.rank}: ${entry.playerName} (${entry.continentId}) - ${entry.enduranceDuration}s`);
          }
        } else {
          console.warn(`[getLeaderboard] Invalid JSON data for player ${playerId}, skipping`);
          // 可选：清理无效数据
          await redis.hDel(PLAYER_SCORES_KEY, playerId);
        }
      } else {
        console.warn(`[getLeaderboard] No player data found for ${playerId}`);
      }
    }

    // 获取总玩家数
    let totalPlayers: number;
    if (continentId) {
      // 计算特定洲际的玩家数
      totalPlayers = entries.length;
    } else {
      totalPlayers = await redis.zCard(LEADERBOARD_KEY);
    }
    
    console.log(`[getLeaderboard] Total players in ${leaderboardType} leaderboard: ${totalPlayers}`);
    
    const result = {
      entries,
      totalPlayers,
      lastUpdated: Date.now(),
      continentId
    };
    
    console.log(`[getLeaderboard] Preparing to return entries:`, entries);
    console.log(`[getLeaderboard] Final leaderboard data:`, result);
    
    return result;
  } catch (error) {
    console.error('[getLeaderboard] Error getting leaderboard:', error);
    return {
      entries: [],
      totalPlayers: 0,
      lastUpdated: Date.now(),
      continentId
    };
  }
}

/**
 * 获取洲际统计数据
 * Get continent statistics
 */
export async function getContinentStats({
  redis
}: {
  redis: Context['redis'] | RedisClient;
}): Promise<ContinentStats[]> {
  try {
    console.log('[getContinentStats] Getting continent statistics');
    
    // 获取所有玩家数据
    const allPlayerData = await redis.hGetAll(PLAYER_SCORES_KEY);
    console.log(`[getContinentStats] Found ${Object.keys(allPlayerData).length} players in database`);
    
    // 统计每个洲际的玩家数量
    const continentCounts: { [key: string]: number } = {};
    
    for (const [playerId, playerDataStr] of Object.entries(allPlayerData)) {
      const playerData = safeJsonParse<PlayerScore>(playerDataStr);
      
      if (playerData) {
        const continent = playerData.continentId || 'Unknown';
        continentCounts[continent] = (continentCounts[continent] || 0) + 1;
      } else {
        console.warn(`[getContinentStats] Invalid JSON data for player ${playerId}, cleaning up`);
        // 清理无效数据
        await redis.hDel(PLAYER_SCORES_KEY, playerId);
      }
    }
    
    // 转换为统计数组
    const stats: ContinentStats[] = [];
    for (const [continentId, count] of Object.entries(continentCounts)) {
      if (continentId !== 'Unknown' && CONTINENT_INFO[continentId as keyof typeof CONTINENT_INFO]) {
        const info = CONTINENT_INFO[continentId as keyof typeof CONTINENT_INFO];
        stats.push({
          continentId,
          continentName: info.name,
          playerCount: count,
          flag: info.flag
        });
      }
    }
    
    // 按玩家数量降序排序
    stats.sort((a, b) => b.playerCount - a.playerCount);
    
    console.log('[getContinentStats] Continent statistics:', stats);
    return stats;
  } catch (error) {
    console.error('[getContinentStats] Error getting continent statistics:', error);
    return [];
  }
}

/**
 * 获取特定玩家的排名
 * Get specific player's rank
 */
export async function getPlayerRank(
  redis: Context['redis'] | RedisClient, 
  playerId: string
): Promise<number> {
  try {
    // 获取玩家的分数
    const playerScore = await redis.zScore(LEADERBOARD_KEY, playerId);
    if (playerScore === null) {
      console.log(`[getPlayerRank] Player ${playerId} not found in leaderboard`);
      return -1;
    }
    
    // 计算有多少玩家的分数比当前玩家高
    // 由于我们要时间长的排在前面，所以计算分数大于当前玩家分数的玩家数量
    const playersWithHigherScores = await redis.zCount(LEADERBOARD_KEY, `(${playerScore}`, '+inf');
    
    // 排名 = 比当前玩家分数高的玩家数量 + 1
    const rank = playersWithHigherScores + 1;
    
    console.log(`[getPlayerRank] Player ${playerId} score: ${playerScore}, rank: ${rank}`);
    return rank;
  } catch (error) {
    console.error('[getPlayerRank] Error getting player rank:', error);
    return -1;
  }
}

/**
 * 获取玩家个人最佳成绩
 * Get player's personal best score
 */
export async function getPlayerBest({
  redis,
  playerId
}: {
  redis: Context['redis'] | RedisClient;
  playerId: string;
}): Promise<PlayerScore | null> {
  try {
    console.log(`[getPlayerBest] Getting best score for player: ${playerId}`);
    
    const playerDataStr = await redis.hGet(PLAYER_SCORES_KEY, playerId);
    if (playerDataStr) {
      const playerData = safeJsonParse<PlayerScore>(playerDataStr);
      
      if (playerData) {
        console.log(`[getPlayerBest] Found best score for player ${playerId}:`, playerData);
        return playerData;
      } else {
        console.warn(`[getPlayerBest] Invalid JSON data for player ${playerId}, cleaning up`);
        // 清理无效数据
        await redis.hDel(PLAYER_SCORES_KEY, playerId);
        return null;
      }
    }
    
    console.log(`[getPlayerBest] No best score found for player: ${playerId}`);
    return null;
  } catch (error) {
    console.error('[getPlayerBest] Error getting player best score:', error);
    return null;
  }
}

/**
 * 清理排行榜（保留前 1000 名）
 * Clean up leaderboard (keep top 1000)
 */
export async function cleanupLeaderboard(redis: Context['redis'] | RedisClient): Promise<void> {
  try {
    const totalPlayers = await redis.zCard(LEADERBOARD_KEY);
    
    if (totalPlayers > 1000) {
      // 删除排名 1000 以后的玩家（保留前 1000 名）
      await redis.zRemRangeByRank(LEADERBOARD_KEY, 0, totalPlayers - 1001);
      console.log(`[cleanupLeaderboard] Cleaned up leaderboard, removed ${totalPlayers - 1000} entries`);
    }
  } catch (error) {
    console.error('[cleanupLeaderboard] Error cleaning up leaderboard:', error);
  }
}

/**
 * 清理损坏的数据
 * Clean up corrupted data
 */
export async function cleanupCorruptedData(redis: Context['redis'] | RedisClient): Promise<void> {
  try {
    console.log('[cleanupCorruptedData] Starting cleanup of corrupted data...');
    
    const allPlayerData = await redis.hGetAll(PLAYER_SCORES_KEY);
    let cleanedCount = 0;
    
    for (const [playerId, playerDataStr] of Object.entries(allPlayerData)) {
      const playerData = safeJsonParse<PlayerScore>(playerDataStr);
      
      if (!playerData) {
        console.log(`[cleanupCorruptedData] Removing corrupted data for player ${playerId}`);
        await redis.hDel(PLAYER_SCORES_KEY, playerId);
        // 同时从排行榜中移除
        await redis.zRem(LEADERBOARD_KEY, playerId);
        cleanedCount++;
      }
    }
    
    console.log(`[cleanupCorruptedData] Cleanup completed. Removed ${cleanedCount} corrupted entries.`);
  } catch (error) {
    console.error('[cleanupCorruptedData] Error during cleanup:', error);
  }
}

/**
 * 调试函数：获取 Redis 中的所有排行榜数据
 * Debug function: Get all leaderboard data from Redis
 */
export async function debugLeaderboard(redis: Context['redis'] | RedisClient): Promise<void> {
  try {
    console.log('=== ENDURANCE LEADERBOARD DEBUG INFO ===');
    
    // 检查排行榜大小
    const leaderboardSize = await redis.zCard(LEADERBOARD_KEY);
    console.log(`[debugLeaderboard] Global leaderboard size: ${leaderboardSize}`);
    
    if (leaderboardSize > 0) {
      // 获取前 10 名用于调试 (使用 zRevRange 因为时间长的排前面)
      const topPlayerIds = await redis.zRevRange(LEADERBOARD_KEY, 0, 9, { by: 'rank' });
      console.log('[debugLeaderboard] Top 10 players (by endurance duration - longest first):');
      
      for (let i = 0; i < topPlayerIds.length; i++) {
        const playerId = topPlayerIds[i];
        const playerDataStr = await redis.hGet(PLAYER_SCORES_KEY, playerId);
        
        if (playerDataStr) {
          const playerData = safeJsonParse<PlayerScore>(playerDataStr);
          
          if (playerData) {
            console.log(`[debugLeaderboard] Rank ${i + 1}: ${playerData.playerName} (${playerData.continentId}) - ${playerData.enduranceDuration}s`);
          } else {
            console.log(`[debugLeaderboard] Rank ${i + 1}: [Invalid JSON] ${playerId}`);
          }
        } else {
          console.log(`[debugLeaderboard] Rank ${i + 1}: [No Data] ${playerId}`);
        }
      }
    }
    
    // 检查洲际统计
    const continentStats = await getContinentStats({ redis });
    console.log('[debugLeaderboard] Continent statistics:', continentStats);
    
    console.log('=== END ENDURANCE LEADERBOARD DEBUG INFO ===');
  } catch (error) {
    console.error('[debugLeaderboard] Error in debug function:', error);
  }
}