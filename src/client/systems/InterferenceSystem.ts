/**
 * 干扰事件系统
 * 负责处理游戏中的各种干扰事件
 * 
 * @author 开发者A - 游戏核心逻辑负责人
 */

import { GameConfig, InterferenceEvent, InterferenceType } from '../types/GameTypes';

export class InterferenceSystem {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * 生成随机干扰间隔时间
   * Generate random interference interval
   */
  generateRandomInterferenceInterval(): number {
    return Math.random() * 
      (this.config.INTERFERENCE_MAX_INTERVAL - this.config.INTERFERENCE_MIN_INTERVAL) + 
      this.config.INTERFERENCE_MIN_INTERVAL;
  }

  /**
   * 获取随机干扰类型
   * Get random interference type
   */
  getRandomInterferenceType(): InterferenceType {
    const types: InterferenceType[] = ['controls_reversed', 'temperature_shock', 'bubble_obstruction'];
    return types[Math.floor(Math.random() * types.length)] || 'controls_reversed';
  }

  /**
   * 创建干扰事件
   * Create interference event
   */
  createInterferenceEvent(type: InterferenceType): InterferenceEvent {
    return {
      type,
      isActive: true,
      duration: this.config.INTERFERENCE_DURATION,
      remainingTime: this.config.INTERFERENCE_DURATION,
    };
  }

  /**
   * 清除干扰事件
   * Clear interference event
   */
  clearInterferenceEvent(): InterferenceEvent {
    return {
      type: 'none',
      isActive: false,
      duration: 0,
      remainingTime: 0,
    };
  }

  /**
   * 应用温度冲击效果
   * Apply temperature shock effect
   */
  applyTemperatureShock(): number {
    return Math.random() > 0.5 ? 0.9 : 0.1;
  }

  /**
   * 检查是否应该触发干扰
   * Check if interference should be triggered
   */
  shouldTriggerInterference(
    interferenceTimer: number,
    isInterferenceActive: boolean
  ): boolean {
    return interferenceTimer <= 0 && !isInterferenceActive;
  }

  /**
   * 检查干扰是否可以通过点击清除
   * Check if interference can be cleared by clicking
   */
  canBeClearedByClick(interferenceType: InterferenceType): boolean {
    // 控制反转不能通过点击清除，只能等时间自动清除
    return interferenceType !== 'controls_reversed';
  }

  /**
   * 获取干扰事件的描述信息
   * Get interference event description
   */
  getInterferenceDescription(interferenceType: InterferenceType): {
    icon: string;
    title: string;
    description: string;
    bgColor: string;
  } {
    switch (interferenceType) {
      case 'controls_reversed':
        return {
          icon: '🔄',
          title: 'Controls Reversed!',
          description: 'The + and - buttons are swapped!',
          bgColor: 'bg-purple-500',
        };
      case 'temperature_shock':
        return {
          icon: '⚡',
          title: 'Temperature Shock!',
          description: 'The target temperature has shifted!',
          bgColor: 'bg-orange-500',
        };
      case 'bubble_obstruction':
        return {
          icon: '🫧',
          title: 'Bubble Trouble!',
          description: 'Bubbles are blocking your view!',
          bgColor: 'bg-blue-500',
        };
      default:
        return {
          icon: '⚠️',
          title: 'Interference!',
          description: 'Something is wrong!',
          bgColor: 'bg-red-500',
        };
    }
  }
}