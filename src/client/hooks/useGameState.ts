/**
 * 游戏状态管理 Hook
 * 封装游戏状态逻辑，供组件使用
 * 
 * @author 开发者C - 数据管理负责人
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameConfig } from '../types/GameTypes';
import { GameStateManager } from '../systems/GameStateManager';

export const useGameState = (config: GameConfig) => {
  // 游戏状态管理器实例
  const gameStateManagerRef = useRef<GameStateManager | null>(null);
  
  // 初始化游戏状态管理器
  if (!gameStateManagerRef.current) {
    gameStateManagerRef.current = new GameStateManager(config);
  }

  // 游戏状态
  const [gameState, setGameState] = useState<GameState>(() => 
    gameStateManagerRef.current!.createInitialState()
  );

  // 当前回合（坚持时长挑战中不再使用回合概念，但保留兼容性）
  const [currentRound, setCurrentRound] = useState(1);

  // 游戏循环引用
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // 温度控制处理器
  const handlePlusPress = useCallback(() => {
    setGameState(prev => ({ ...prev, isPlusHeld: true }));
  }, []);

  const handlePlusRelease = useCallback(() => {
    setGameState(prev => ({ ...prev, isPlusHeld: false }));
  }, []);

  const handleMinusPress = useCallback(() => {
    setGameState(prev => ({ ...prev, isMinusHeld: true }));
  }, []);

  const handleMinusRelease = useCallback(() => {
    setGameState(prev => ({ ...prev, isMinusHeld: false }));
  }, []);

  // 中心按钮处理器
  const handleCenterButtonClick = useCallback(() => {
    if (!gameStateManagerRef.current) return;
    
    setGameState(prev => 
      gameStateManagerRef.current!.handleCenterButtonClick(prev)
    );
  }, []);

  // 重置游戏
  const resetGame = useCallback(() => {
    if (!gameStateManagerRef.current) return;
    
    setCurrentRound(1);
    setGameState(gameStateManagerRef.current.resetGameState());
    lastUpdateTimeRef.current = Date.now();
  }, []);

  // 开始下一回合（在坚持时长挑战中，这实际上是重新开始）
  const startNextRound = useCallback(() => {
    if (!gameStateManagerRef.current) return;
    
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    setGameState(gameStateManagerRef.current.resetGameState());
    lastUpdateTimeRef.current = Date.now();
  }, [currentRound]);

  // 主游戏循环
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      if (!gameStateManagerRef.current) return;
      
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTimeRef.current) / 1000; // 转换为秒
      lastUpdateTimeRef.current = currentTime;

      // 限制 deltaTime 以避免大的跳跃
      const clampedDeltaTime = Math.min(deltaTime, 1/30); // 最大 1/30 秒

      setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        return gameStateManagerRef.current!.updateGameState(prevState, clampedDeltaTime);
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastUpdateTimeRef.current = Date.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState.gameStatus]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  return {
    gameState,
    currentRound,
    handlePlusPress,
    handlePlusRelease,
    handleMinusPress,
    handleMinusRelease,
    handleCenterButtonClick,
    resetGame,
    startNextRound,
  };
};