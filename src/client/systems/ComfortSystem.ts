/**
 * 舒适度管理系统
 * 负责处理游戏中的舒适度变化逻辑
 * 
 * @author 开发者A - 游戏核心逻辑负责人
 */

import { GameConfig } from '../types/GameTypes';

export class ComfortSystem {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * 更新舒适度基于温度是否在容忍范围内
   * Update comfort based on whether temperature is within tolerance range
   */
  updateComfort(
    currentComfort: number,
    isInToleranceRange: boolean,
    deltaTime: number
  ): number {
    let newComfort = currentComfort;

    if (isInToleranceRange) {
      newComfort += this.config.COMFORT_CHANGE_RATE * deltaTime;
    } else {
      newComfort -= this.config.COMFORT_CHANGE_RATE * deltaTime;
    }

    return Math.max(0, Math.min(1, newComfort));
  }

  /**
   * 检查舒适度是否达到失败条件
   * Check if comfort level has reached failure condition
   */
  isComfortFailure(comfortLevel: number): boolean {
    // 当舒适度降到0或以下时，游戏失败
    return comfortLevel <= 0;
  }

  /**
   * 检查舒适度是否达到最大值
   * Check if comfort level has reached maximum
   */
  isMaxComfort(comfortLevel: number): boolean {
    return comfortLevel >= 1.0;
  }

  /**
   * 获取舒适度对应的猫咪头像
   * Get cat avatar based on comfort level
   */
  getComfortAvatar(comfortLevel: number): string {
    if (comfortLevel >= 0.8) {
      return "/avatar-yellowsmiley.png";
    } else if (comfortLevel <= 0.3) {
      return "/avatar-bad.png";
    } else {
      return "/avatar-yellowsmiley.png";
    }
  }

  /**
   * 获取舒适度状态描述
   * Get comfort status description
   */
  getComfortStatus(comfortLevel: number): string {
    if (comfortLevel >= 0.8) {
      return "Very Happy";
    } else if (comfortLevel >= 0.6) {
      return "Happy";
    } else if (comfortLevel >= 0.4) {
      return "Neutral";
    } else if (comfortLevel >= 0.2) {
      return "Uncomfortable";
    } else {
      return "Very Unhappy";
    }
  }
}