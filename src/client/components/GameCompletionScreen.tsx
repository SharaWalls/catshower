/**
 * 游戏结算界面组件 - 坚持时长挑战版本
 * 基于新的卡片式设计，展示游戏结果和统计数据
 * 
 * @author 开发者B - UI/UX 界面负责人
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { LeaderboardRankingScreen } from './LeaderboardRankingScreen';

interface GameCompletionScreenProps {
  onPlayAgain: () => void;
  onBackToStart: () => void;
  gameStats: {
    roundsCompleted: number;
    totalTime: number;
    finalComfort: number;
  };
  playerInfo: {
    playerName: string;
    continentId: string;
    catAvatarId: string;
  };
}

export const GameCompletionScreen: React.FC<GameCompletionScreenProps> = ({
  onPlayAgain,
  onBackToStart,
  gameStats,
  playerInfo,
}) => {
  const [showRanking, setShowRanking] = useState(false);
  
  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取洲际名称
  const getContinentName = (continentId: string): string => {
    const continentNames: { [key: string]: string } = {
      'AS': 'Asia',
      'EU': 'Europe', 
      'NA': 'North America',
      'SA': 'South America',
      'AF': 'Africa',
      'OC': 'Oceania'
    };
    return continentNames[continentId] || continentId;
  };

  // 计算表现百分比（基于坚持时长）
  const getPerformancePercentage = (): number => {
    // 基于坚持时长的性能计算
    const enduranceScore = Math.min(99, Math.max(1, gameStats.totalTime * 2)); // 每秒2分
    return Math.floor(enduranceScore);
  };

  // 获取表现等级
  const getPerformanceGrade = (): { grade: string; color: string; emoji: string } => {
    const time = gameStats.totalTime;
    if (time >= 120) return { grade: 'S', color: '#FFD700', emoji: '👑' }; // 2分钟以上
    if (time >= 90) return { grade: 'A', color: '#FF6B6B', emoji: '🔥' }; // 1.5分钟以上
    if (time >= 60) return { grade: 'B', color: '#4ECDC4', emoji: '💪' }; // 1分钟以上
    if (time >= 30) return { grade: 'C', color: '#45B7D1', emoji: '👍' }; // 30秒以上
    return { grade: 'D', color: '#96CEB4', emoji: '🌱' }; // 30秒以下
  };

  // 动态生成猫咪数据
  const generateCats = () => {
    // 根据坚持时长生成猫咪数量
    const catCount = Math.max(5, Math.min(15, Math.floor(gameStats.totalTime / 10))); // 每10秒一只猫，最少5只，最多15只
    
    const catImages = ["/Cat_1.png", "/Cat_2.png", "/Cat_3.png", "/Cat_5.png", "/Cat_6.png", "/Cat_7.png", "/Cat_2-1.png"];
    
    // 主猫咪和玩家姓名标签组合位置（居中）
    const centerX = 394 / 2; // 卡片宽度的一半
    const mainCatAndNameTagArea = {
      left: centerX - 105/2, // 以姓名标签宽度为准居中
      top: 48,
      width: 120, // 以主猫咪宽度为准
      height: 66 + 120, // 姓名标签高度 + 主猫咪高度
    };
    
    // 生成其他猫咪
    const otherCats: Array<{
      src: string;
      size: number;
      top: number;
      left: number;
      isMain: boolean;
      flipped: boolean;
    }> = [];
    const usedPositions: Array<{
      left: number;
      top: number;
      right: number;
      bottom: number;
    }> = [];
    
    // 添加主猫咪和姓名标签组合区域到已使用位置
    usedPositions.push({
      left: mainCatAndNameTagArea.left - 5,
      top: mainCatAndNameTagArea.top - 5,
      right: mainCatAndNameTagArea.left + mainCatAndNameTagArea.width + 5,
      bottom: mainCatAndNameTagArea.top + mainCatAndNameTagArea.height + 5,
    });
    
    // 检查位置是否冲突
    const isPositionValid = (left: number, top: number, size: number) => {
      for (const usedPos of usedPositions) {
        if (
          left < usedPos.right &&
          left + size > usedPos.left &&
          top < usedPos.bottom &&
          top + size > usedPos.top
        ) {
          return false;
        }
      }
      return left >= 16 && left + size <= 378 && top >= 114 && top + size <= 280; // 卡片边界限制
    };
    
    // 生成其他猫咪
    let attempts = 0;
    while (otherCats.length < catCount - 1 && attempts < 100) {
      // 70%概率生成50-100px的猫咪，30%概率生成45-49px的猫咪
      const size = Math.random() > 0.3 
        ? Math.floor(Math.random() * 51) + 50  // 50-100px
        : Math.floor(Math.random() * 5) + 45; // 45-49px
      const left = Math.floor(Math.random() * (394 - size - 32)) + 16; // 卡片内随机位置
      const top = Math.floor(Math.random() * (280 - size - 114)) + 114; // 避开上方区域
      
      if (isPositionValid(left, top, size)) {
        otherCats.push({
          src: catImages[Math.floor(Math.random() * catImages.length)] || "/Cat_1.png",
          size,
          top,
          left,
          isMain: false,
          flipped: Math.random() > 0.5, // 随机决定是否翻转
        });
        
        // 添加到已使用位置
        usedPositions.push({
          left: left - 2,
          top: top - 2,
          right: left + size + 2,
          bottom: top + size + 2,
        });
      }
      attempts++;
    }
    
    return otherCats; // 只返回其他猫咪，主猫咪单独渲染
  };

  const cats = generateCats();
  const performanceGrade = getPerformanceGrade();

  // 如果显示排名界面，返回排名组件
  if (showRanking) {
    console.log('[GameCompletionScreen] Attempting to render LeaderboardRankingScreen');
    return <LeaderboardRankingScreen onBack={() => setShowRanking(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="w-[724px] h-[584px] bg-[#2f2f2f] overflow-hidden relative">
        {/* 简化的游戏主界面背景 */}
        <div className="absolute inset-0">
          {/* 背景图像 */}
          <div className="absolute inset-0 bg-[url(/background.png)] bg-cover bg-center" />

          {/* 舒适度进度条 */}
          <div className="absolute left-[48px] top-[108px] w-[628px] h-[24px]">
            <div className="w-full h-full bg-[#d9d9d9] border-4 border-[#3a3656] opacity-60">
              <div className="h-full bg-[#5ff367] w-[75%]" />
            </div>
          </div>

          {/* 温度进度条系统 */}
          <div className="absolute left-[48px] top-[136px] w-[628px] h-[78px] opacity-60">
            <div className="absolute top-[9px] w-[628px] h-[24px] bg-[#d9d9d9] border-4 border-[#3a3656]">
              <div className="absolute top-0 h-full bg-[#ff9500] opacity-60 left-[40%] w-[20%]" />
              <div className="h-full bg-[#728cff] w-[50%]" />
            </div>
            <div className="absolute w-[16px] h-[40px] bg-[#f8cb56] border-[#3a3656] border-[5px] left-[306px] top-0" />
          </div>

          {/* 控制按钮 */}
          <div className="absolute left-[84px] top-[460px] w-[56px] h-[56px] opacity-60">
            <img className="w-full h-full object-cover" src="/button-temp-minus.png" />
          </div>
          <div className="absolute left-[584px] top-[460px] w-[56px] h-[56px] opacity-60">
            <img className="w-full h-full object-cover" src="/button-temp-plus.png" />
          </div>
        </div>

        <div className="relative h-[639px] top-[-53px]">

          {/* 半透明遮罩 */}
          <div className="absolute w-[724px] h-[584px] top-[53px] left-0 bg-[#545454] opacity-50" />

          {/* 主游戏卡片 */}
          <Card className="absolute w-[394px] h-[521px] top-[90px] left-[165px] border-0 overflow-visible">
            <CardContent className="p-0">
              <img
                className="w-full h-full object-cover"
                alt="Card background"
                src="/card-bg-1.png"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.background = '#f0f0f0';
                }}
              />

              {/* 主猫咪和玩家姓名标签组合 */}
              <div className="absolute flex flex-col items-center top-[48px] left-1/2 transform -translate-x-1/2 animate-float">
                {/* 玩家姓名标签 */}
                <div className="w-[105px] h-[66px] mb-0">
                  <div className="relative w-[103px] h-[66px] bg-[url(/nametag.png)] bg-[100%_100%]">
                    <div 
                      className="absolute left-0 right-0 font-bold text-black tracking-[0] leading-[normal] whitespace-nowrap text-center" 
                      style={{ 
                        fontFamily: 'lores-12', 
                        fontSize: `${Math.max(12, 30 - playerInfo.playerName.length * 2)}px`,
                        top: `${26 - (Math.max(12, 30 - playerInfo.playerName.length * 2) - 20) * 0.2}px` // 根据字体大小调整居中位置
                      }}
                    >
                      {playerInfo.playerName.slice(0, 8)}
                    </div>
                  </div>
                </div>
                
                {/* 主猫咪 */}
                <img
                  className="object-cover"
                  style={{
                    width: '120px',
                    height: '120px',
                  }}
                  alt="Main Cat"
                  src="/Cat_1.png"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/Cat_1.png";
                  }}
                />
              </div>

              {/* 其他猫咪动画 */}
              {cats.map((cat, index) => (
                <img
                  key={`cat-${index}`}
                  className={`absolute object-cover ${cat.flipped ? 'scale-x-[-1]' : ''}`}
                  style={{
                    width: `${cat.size}px`,
                    height: `${cat.size}px`,
                    top: `${cat.top}px`,
                    left: `${cat.left}px`,
                  }}
                  alt="Cat"
                  src={cat.src}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/Cat_1.png";
                  }}
                />
              ))}

              {/* 排名状态卡片 */}
              <div className="absolute w-[350px] h-[63px] top-[316px] left-[16px] bg-[#e6f9ff] rounded-[15px]">
                <div className="h-[34px] top-[11px] leading-[normal] absolute w-[291px] left-[59px] font-normal text-transparent text-2xl tracking-[0]" style={{ fontFamily: 'lores-12' }}>
                  <span className="text-black">{getContinentName(playerInfo.continentId)} is </span>
                  <span className="text-[#fab817] font-bold text-[28px]">#1</span>
                </div>

                <img
                  className="absolute w-9 h-9 top-3 left-3.5 object-cover"
                  alt="Ranking badge"
                  src="/rankingbadge--1.png"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>

              {/* 坚持时长成绩卡片 */}
              <div className="absolute w-[350px] h-[72px] top-[391px] left-[16px] bg-[#e6f9ff] rounded-[15px]">
                <div className="top-[9px] leading-6 absolute w-[291px] left-[59px] font-normal text-transparent text-2xl tracking-[0]" style={{ fontFamily: 'lores-12' }}>
                  <span className="text-black">
                    Survived for {formatTime(gameStats.totalTime)}, earned grade{" "}
                  </span>
                  <span 
                    className="font-bold text-[28px]"
                    style={{ color: performanceGrade.color }}
                  >
                    {performanceGrade.grade}
                  </span>
                  <span className="text-black"> {performanceGrade.emoji}</span>
                </div>

                <img
                  className="absolute w-9 h-9 top-[15px] left-3.5 object-cover"
                  alt="Victory hand"
                  src="/icon-victoryhand.png"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>

              {/* 操作按钮 */}
              <div className="absolute flex gap-4 justify-center w-full bottom-[-10px]">
                <Button
                  variant="ghost"
                  className="w-14 h-14 p-0 rounded-md"
                  onClick={onPlayAgain}
                >
                  <img
                    className="w-full h-full object-cover"
                    alt="Restart"
                    src="/icon-restart.png"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.alt = "🔄";
                    }}
                  />
                </Button>

                <Button
                  variant="ghost"
                  className="w-14 h-14 p-0 rounded-md"
                  onClick={() => {
                    // 分享功能
                    if (navigator.share) {
                      navigator.share({
                        title: 'Cat Comfort Game',
                        text: `I survived ${formatTime(gameStats.totalTime)} in Cat Comfort Game and earned grade ${performanceGrade.grade}!`,
                        url: window.location.href
                      });
                    }
                  }}
                >
                  <img
                    className="w-full h-full object-cover"
                    alt="Share"
                    src="/icon-share.png"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.alt = "📤";
                    }}
                  />
                </Button>

                <Button
                  variant="ghost"
                  className="w-[59px] h-[59px] p-0 rounded-md"
                  onClick={() => {
                    console.log('[GameCompletionScreen] Ranking button clicked, setting showRanking to true');
                    setShowRanking(true);
                  }}
                >
                  <img
                    className="w-full h-full object-cover"
                    alt="Ranking"
                    src="/icon-ranking.png"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.alt = "🏆";
                    }}
                  />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 标题横幅 */}
          <div className="w-[363px] h-[206px] left-[180.5px] absolute top-0">
            <div className="relative w-[361px] h-[153px] top-[53px] -left-1">
              <img
                className="w-[309px] h-[153px] left-[26px] object-cover absolute top-0"
                alt="Banner"
                src="/banner-succ.png"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />

              {/* 洲际文字 */}
              <div 
                className="absolute w-[120px] h-[25px] top-[29px] left-[119px] flex items-center justify-center silkscreen-text"
                style={{
                  color: '#F0BC08',
                  fontSize: '24px',
                }}
              >
                {getContinentName(playerInfo.continentId)}
              </div>
            </div>
          </div>

          {/* 下载按钮 */}
          <Button
            variant="ghost"
            className="absolute w-14 h-14 top-[108px] left-[570px] p-0 rounded-md"
            onClick={() => {
              // 下载功能（可以保存截图或成绩）
              window.print();
            }}
          >
            <img
              className="w-full h-full object-cover"
              alt="Download"
              src="/icon-download.png"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.alt = "💾";
              }}
            />
          </Button>
        </div>
      </div>
    </div>
  );
};