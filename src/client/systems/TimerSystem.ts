/**
 * 计时系统
 * 负责处理游戏中的时间管理逻辑
 * 
 * @author 开发者A - 游戏核心逻辑负责人
 */

import { GameConfig } from '../types/GameTypes';

export class TimerSystem {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * 更新游戏计时器（现在是正计时，记录坚持时长）
   * Update game timer (now counting up, recording endurance duration)
   */
  updateGameTimer(currentTimer: number, deltaTime: number): number {
    // 现在是正计时，记录玩家坚持了多长时间
    return currentTimer + deltaTime;
  }

  /**
   * 更新干扰计时器
   * Update interference timer
   */
  updateInterferenceTimer(currentTimer: number, deltaTime: number): number {
    return Math.max(0, currentTimer - deltaTime);
  }

  /**
   * 更新成功保持计时器
   * Update success hold timer
   */
  updateSuccessHoldTimer(
    currentTimer: number,
    isMaxComfort: boolean,
    deltaTime: number
  ): number {
    if (isMaxComfort) {
      return currentTimer + deltaTime;
    } else {
      return 0;
    }
  }

  /**
   * 检查是否达到成功条件（保持最大舒适度足够长时间）
   * Check if success condition is met (maintaining max comfort for enough time)
   */
  isSuccessConditionMet(successHoldTimer: number): boolean {
    return successHoldTimer >= this.config.SUCCESS_HOLD_TIME;
  }

  /**
   * 格式化时间显示
   * Format time display
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 获取时间等级（基于坚持时长）
   * Get time grade (based on endurance duration)
   */
  getTimeGrade(seconds: number): { grade: string; color: string } {
    if (seconds >= 300) return { grade: 'S+', color: '#FFD700' }; // 5分钟以上
    if (seconds >= 240) return { grade: 'S', color: '#FFD700' }; // 4分钟以上
    if (seconds >= 180) return { grade: 'A+', color: '#FF6B6B' }; // 3分钟以上
    if (seconds >= 120) return { grade: 'A', color: '#FF6B6B' }; // 2分钟以上
    if (seconds >= 90) return { grade: 'B+', color: '#4ECDC4' }; // 1.5分钟以上
    if (seconds >= 60) return { grade: 'B', color: '#4ECDC4' }; // 1分钟以上
    if (seconds >= 30) return { grade: 'C', color: '#45B7D1' }; // 30秒以上
    return { grade: 'D', color: '#96CEB4' }; // 30秒以下
  }
}