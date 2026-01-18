import React from 'react';
import { PlinkoStatsPage } from '../components/GameStats';
import gameConfig from '../config/gameConfig';

/**
 * Statistics Page for Plinko Tracker
 * Uses game-specific statistics component
 */
export default function StatsPage() {
  return (
    <PlinkoStatsPage
      gameId={gameConfig.gameId}
      apiBaseUrl={gameConfig.apiBaseUrl}
    />
  );
}
