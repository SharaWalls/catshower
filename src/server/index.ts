import express from 'express';
import { createServer, getContext, getServerPort } from '@devvit/server';
import { InitResponse, GameDataResponse, UpdateGameResponse, ResetGameResponse } from '../shared/types/game';
import { postConfigGet, postConfigNew, postConfigMaybeGet, handleButtonPress, resetGame, processGameUpdate } from './core/post';
import { 
  submitScore, 
  getLeaderboard, 
  getPlayerBest, 
  debugLeaderboard,
  getContinentStats,
  PlayerScore,
  LeaderboardData,
  ContinentStats
} from './core/leaderboard';

const app = express();

// 确保开启 JSON 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// ==================== 现有的游戏API路由 ====================

router.get('/init', async (_req, res): Promise<void> => {
  try {
    const { postId, redis } = getContext();

    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    let config = await postConfigMaybeGet({ redis, postId });
    if (!config) {
      await postConfigNew({ redis, postId });
    }

    res.json({
      status: 'success',
      postId: postId,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error during initialization';
    res.status(500).json({ status: 'error', message });
  }
});

router.get('/game-data', async (_req, res): Promise<void> => {
  try {
    const { postId, redis } = getContext();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    const config = await postConfigGet({ redis, postId });
    
    res.json({
      status: 'success',
      gameState: config.gameState,
      currentRound: config.currentRound,
    });
  } catch (error) {
    console.error('API Game Data Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

router.post('/update-game', async (req, res): Promise<void> => {
  try {
    const { deltaTime } = req.body;
    const { postId, redis } = getContext();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    if (typeof deltaTime !== 'number') {
      res.status(400).json({ status: 'error', message: 'deltaTime is required' });
      return;
    }

    const updatedGameState = await processGameUpdate({ redis, postId, deltaTime });
    
    res.json({
      status: 'success',
      gameState: updatedGameState,
    });
  } catch (error) {
    console.error('API Update Game Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

router.post('/button-press', async (req, res): Promise<void> => {
  try {
    const { buttonType, isPressed } = req.body;
    const { postId, redis } = getContext();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    if (!buttonType || typeof isPressed !== 'boolean') {
      res.status(400).json({ status: 'error', message: 'buttonType and isPressed are required' });
      return;
    }

    const gameState = await handleButtonPress({ redis, postId, buttonType, isPressed });
    
    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('API Button Press Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

router.post('/reset-game', async (req, res): Promise<void> => {
  try {
    const { newRound } = req.body;
    const { postId, redis } = getContext();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    const result = await resetGame({ redis, postId, newRound });
    
    res.json({
      status: 'success',
      gameState: result.gameState,
      currentRound: result.currentRound,
    });
  } catch (error) {
    console.error('API Reset Game Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

// ==================== 坚持时长排行榜API路由 ====================

/**
 * 提交分数到全球排行榜
 * Submit score to global leaderboard
 * POST /api/submit-score
 */
router.post('/submit-score', async (req, res): Promise<void> => {
  try {
    console.log('Submit score API called with body:', req.body);
    
    const playerScore: PlayerScore = req.body;
    const { redis } = getContext();

    // 验证必需字段
    if (!playerScore.playerId || !playerScore.playerName || typeof playerScore.enduranceDuration !== 'number') {
      const errorMsg = 'Missing required fields: playerId, playerName, or enduranceDuration';
      console.error('Submit score validation error:', errorMsg);
      res.status(400).json({ 
        status: 'error', 
        message: errorMsg
      });
      return;
    }

    // 验证洲际ID
    if (!playerScore.continentId) {
      const errorMsg = 'continentId is required';
      console.error('Submit score validation error:', errorMsg);
      res.status(400).json({ 
        status: 'error', 
        message: errorMsg
      });
      return;
    }

    console.log(`Processing score submission: ${playerScore.playerName} (${playerScore.playerId})`);
    console.log(`Endurance duration: ${playerScore.enduranceDuration}s, Continent: ${playerScore.continentId}`);

    // 添加时间戳
    const playerScoreWithTimestamp: PlayerScore = {
      ...playerScore,
      completedAt: Date.now()
    };

    const result = await submitScore({
      redis,
      playerScore: playerScoreWithTimestamp
    });

    console.log('Score submission result:', result);

    res.status(201).json({
      status: 'success',
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('API Submit Score Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: 'error', 
      message 
    });
  }
});

/**
 * 获取排行榜数据 (支持洲际过滤)
 * Get leaderboard data (supports continent filtering)
 * GET /api/leaderboard?continentId=XX
 */
router.get('/leaderboard', async (req, res): Promise<void> => {
  try {
    console.log('Leaderboard API called with query:', req.query);
    
    const limit = parseInt(req.query.limit as string) || 100;
    const continentId = req.query.continentId as string;
    const { redis } = getContext();

    console.log(`Getting leaderboard with limit: ${limit}, continentId: ${continentId || 'global'}`);

    // 调试：打印 Redis 中的数据
    await debugLeaderboard(redis);

    const leaderboardData: LeaderboardData = await getLeaderboard({ 
      redis, 
      limit,
      continentId 
    });

    console.log('Leaderboard data retrieved:', {
      entriesCount: leaderboardData.entries.length,
      totalPlayers: leaderboardData.totalPlayers,
      continentId: leaderboardData.continentId
    });

    res.json({
      status: 'success',
      data: leaderboardData
    });
  } catch (error) {
    console.error('API Leaderboard Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: 'error', 
      message 
    });
  }
});

/**
 * 获取洲际统计数据
 * Get continent statistics
 * GET /api/leaderboard/stats
 */
router.get('/leaderboard/stats', async (_req, res): Promise<void> => {
  try {
    console.log('Continent stats API called');
    
    const { redis } = getContext();
    const continentStats: ContinentStats[] = await getContinentStats({ redis });

    console.log('Continent statistics retrieved:', continentStats);

    res.json({
      status: 'success',
      data: continentStats
    });
  } catch (error) {
    console.error('API Continent Stats Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: 'error', 
      message 
    });
  }
});

/**
 * 获取玩家个人最佳成绩
 * Get player's personal best score
 * GET /api/player-best
 */
router.get('/player-best', async (req, res): Promise<void> => {
  try {
    console.log('Player best API called with query:', req.query);
    
    const playerId = req.query.playerId as string;
    const { redis } = getContext();

    if (!playerId) {
      res.status(400).json({ 
        status: 'error', 
        message: 'playerId is required' 
      });
      return;
    }

    console.log(`Getting best score for player: ${playerId}`);

    const playerBest = await getPlayerBest({ redis, playerId });

    console.log('Player best score retrieved:', playerBest);

    res.json({
      status: 'success',
      data: playerBest
    });
  } catch (error) {
    console.error('API Player Best Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

/**
 * 添加测试数据到排行榜
 * Add test data to leaderboard
 * POST /api/add-test-data
 */
router.post('/add-test-data', async (_req, res): Promise<void> => {
  try {
    const { redis } = getContext();
    
    // 创建测试玩家数据
    const testPlayers: PlayerScore[] = [
      {
        playerId: 'test_player_1',
        playerName: 'CatMaster',
        enduranceDuration: 180, // 3分钟
        catAvatarId: '1',
        continentId: 'AS',
        completedAt: Date.now() - 3600000, // 1小时前
        difficulty: 'hard'
      },
      {
        playerId: 'test_player_2',
        playerName: 'WaterWhiskers',
        enduranceDuration: 150, // 2.5分钟
        catAvatarId: '2',
        continentId: 'EU',
        completedAt: Date.now() - 7200000, // 2小时前
        difficulty: 'medium'
      },
      {
        playerId: 'test_player_3',
        playerName: 'BubblePaws',
        enduranceDuration: 120, // 2分钟
        catAvatarId: '3',
        continentId: 'NA',
        completedAt: Date.now() - 10800000, // 3小时前
        difficulty: 'medium'
      },
      {
        playerId: 'test_player_4',
        playerName: 'SoapyTail',
        enduranceDuration: 90, // 1.5分钟
        catAvatarId: '4',
        continentId: 'SA',
        completedAt: Date.now() - 14400000, // 4小时前
        difficulty: 'easy'
      },
      {
        playerId: 'test_player_5',
        playerName: 'CleanKitty',
        enduranceDuration: 75, // 1.25分钟
        catAvatarId: '5',
        continentId: 'AF',
        completedAt: Date.now() - 18000000, // 5小时前
        difficulty: 'easy'
      },
      {
        playerId: 'test_player_6',
        playerName: 'ShowerCat',
        enduranceDuration: 60, // 1分钟
        catAvatarId: '6',
        continentId: 'OC',
        completedAt: Date.now() - 21600000, // 6小时前
        difficulty: 'medium'
      }
    ];

    // 提交所有测试数据
    const results = [];
    for (const player of testPlayers) {
      try {
        const result = await submitScore({ redis, playerScore: player });
        results.push(result);
        console.log(`Added test player: ${player.playerName} - ${player.enduranceDuration}s`);
      } catch (error) {
        console.error(`Failed to add test player ${player.playerName}:`, error);
      }
    }

    res.json({
      status: 'success',
      message: `Added ${results.length} test players to leaderboard`,
      data: results
    });
  } catch (error) {
    console.error('Add test data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add test data'
    });
  }
});

// ==================== 调试和管理API路由 ====================

/**
 * 调试排行榜数据
 * Debug leaderboard data
 * GET /api/debug-leaderboard
 */
router.get('/debug-leaderboard', async (_req, res): Promise<void> => {
  try {
    const { redis } = getContext();
    await debugLeaderboard(redis);
    res.json({ 
      status: 'success', 
      message: 'Endurance leaderboard debug info printed to console' 
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Debug failed' 
    });
  }
});

/**
 * 健康检查
 * Health check
 * GET /api/health
 */
router.get('/health', async (_req, res): Promise<void> => {
  try {
    const { redis } = getContext();
    
    // 简单的 Redis 连接测试
    await redis.ping();
    
    res.json({
      status: 'success',
      message: 'Server and Redis are healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 应用路由 - 将路由挂载到 /api 路径
app.use('/api', router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => {
  console.log(`🚀 Endurance Leaderboard Server running on http://localhost:${port}`);
  console.log('📊 Available endpoints:');
  console.log('  POST /api/submit-score - Submit player score to global leaderboard');
  console.log('  GET  /api/leaderboard - Get global leaderboard data');
  console.log('  GET  /api/leaderboard?continentId=XX - Get continent-specific leaderboard');
  console.log('  GET  /api/leaderboard/stats - Get continent statistics');
  console.log('  GET  /api/player-best - Get player personal best score');
  console.log('  POST /api/add-test-data - Add test data to leaderboard');
  console.log('  GET  /api/debug-leaderboard - Debug leaderboard data');
  console.log('  GET  /api/health - Health check');
});