"""
Crash Games Network - Plinko Specific Statistics API

Provides specialized statistics for Plinko:
- Slot distribution analysis
- Risk level comparisons
- Edge vs center analysis
- Theoretical vs actual distribution
- Jackpot tracking

Features unique to Plinko:
- Physics-based ball drop
- Multiple risk levels (Low/Medium/High)
- Slot-based payouts
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import statistics
import math

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


# =============================================================================
# Configuration
# =============================================================================

class PlinkoRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Standard Plinko slot configurations (16 slots, center = 0)
# Multipliers vary by risk level
PLINKO_SLOTS = {
    "low": {
        0: 0.5, 1: 0.5, 2: 0.5, 3: 0.7, 4: 0.7, 5: 1.0, 6: 1.0, 7: 1.4,
        8: 1.4, 9: 1.0, 10: 1.0, 11: 0.7, 12: 0.7, 13: 0.5, 14: 0.5, 15: 0.5
    },
    "medium": {
        0: 0.3, 1: 0.4, 2: 0.5, 3: 0.7, 4: 1.0, 5: 1.5, 6: 2.0, 7: 9.0,
        8: 9.0, 9: 2.0, 10: 1.5, 11: 1.0, 12: 0.7, 13: 0.5, 14: 0.4, 15: 0.3
    },
    "high": {
        0: 0.2, 1: 0.2, 2: 0.3, 3: 0.5, 4: 1.0, 5: 2.0, 6: 7.0, 7: 110.0,
        8: 110.0, 9: 7.0, 10: 2.0, 11: 1.0, 12: 0.5, 13: 0.3, 14: 0.2, 15: 0.2
    }
}

# Theoretical slot probabilities (binomial distribution)
# For 16 slots, probability peaks at center
THEORETICAL_DISTRIBUTION = {
    0: 0.003, 1: 0.018, 2: 0.054, 3: 0.108, 4: 0.162, 5: 0.194, 6: 0.194, 7: 0.162,
    8: 0.162, 9: 0.194, 10: 0.194, 11: 0.162, 12: 0.108, 13: 0.054, 14: 0.018, 15: 0.003
}


# =============================================================================
# Models
# =============================================================================

class SlotStats(BaseModel):
    """Statistics for a single slot."""
    slot_id: int
    multiplier: float
    hit_count: int
    percentage: float = Field(..., description="Actual hit percentage")
    theoretical_percentage: float
    deviation: float = Field(..., description="Deviation from theoretical")


class SlotDistribution(BaseModel):
    """Complete slot distribution analysis."""
    total_drops: int
    risk_level: str
    slots: List[SlotStats]

    # Summary
    most_hit_slot: int
    least_hit_slot: int
    avg_multiplier: float

    # Edge vs Center
    edge_rate: float = Field(..., description="Edge slots (0-2, 13-15) rate (%)")
    center_rate: float = Field(..., description="Center slots (6-9) rate (%)")

    # Jackpot (highest multiplier slots)
    jackpot_rate: float = Field(..., description="Jackpot slots (7,8) hit rate (%)")


class RiskLevelComparison(BaseModel):
    """Comparison across risk levels."""
    risk_level: str
    total_drops: int
    avg_multiplier: float
    median_multiplier: float
    std_deviation: float
    rtp_actual: float
    rtp_theoretical: float = Field(default=99.0)

    # Win distribution
    loss_rate: float = Field(..., description="Rounds with multiplier < 1x (%)")
    small_win_rate: float = Field(..., description="1x-2x (%)")
    medium_win_rate: float = Field(..., description="2x-10x (%)")
    big_win_rate: float = Field(..., description="10x+ (%)")

    # Jackpot
    jackpot_rate: float = Field(..., description="Max multiplier hit rate (%)")
    max_multiplier: float


class TheoreticalVsActual(BaseModel):
    """Comparison of theoretical vs actual distribution."""
    risk_level: str
    chi_square_score: float = Field(..., description="Chi-square goodness of fit")
    deviation_score: float = Field(..., description="Overall deviation (0-1)")
    is_fair: bool = Field(..., description="Passes fairness test")

    # Per-slot comparison
    slot_comparisons: List[Dict[str, Any]]

    # Analysis
    overperforming_slots: List[int] = Field(..., description="Slots hitting more than expected")
    underperforming_slots: List[int] = Field(..., description="Slots hitting less than expected")


class JackpotTracker(BaseModel):
    """Jackpot (110x on high risk) tracking."""
    total_jackpots: int
    last_jackpot_time: Optional[datetime] = None
    drops_since_jackpot: int
    average_drops_between: Optional[float] = None
    jackpot_probability: float = Field(..., description="Theoretical probability (%)")
    current_drought: bool = Field(..., description="Longer than expected without jackpot")


class PlinkoStatistics(BaseModel):
    """Complete Plinko statistics."""
    game: str = "plinko"
    period: str
    generated_at: datetime

    # By risk level
    slot_distributions: Dict[str, SlotDistribution]
    risk_comparisons: List[RiskLevelComparison]

    # Fairness analysis
    fairness_analysis: Dict[str, TheoreticalVsActual]

    # Jackpot tracking
    jackpot_tracker: JackpotTracker

    # Overall stats
    total_drops: int
    overall_avg_multiplier: float
    overall_rtp: float


# =============================================================================
# Calculator
# =============================================================================

class PlinkoCalculator:
    """Calculates Plinko-specific statistics."""

    def analyze_slot_distribution(
        self,
        drops: List[Dict],
        risk_level: str,
    ) -> SlotDistribution:
        """Analyze slot distribution for a risk level."""
        if not drops:
            return SlotDistribution(
                total_drops=0,
                risk_level=risk_level,
                slots=[],
                most_hit_slot=7,
                least_hit_slot=0,
                avg_multiplier=1.0,
                edge_rate=0,
                center_rate=0,
                jackpot_rate=0,
            )

        slot_counts = {i: 0 for i in range(16)}
        multipliers = []

        for drop in drops:
            slot = drop.get('slot', drop.get('landing_slot', 7))
            mult = drop.get('multiplier', 1.0)
            if 0 <= slot < 16:
                slot_counts[slot] += 1
            multipliers.append(mult)

        n = len(drops)
        slot_mults = PLINKO_SLOTS.get(risk_level, PLINKO_SLOTS['medium'])

        # Build slot stats
        slots = []
        for slot_id in range(16):
            count = slot_counts[slot_id]
            pct = count / n * 100 if n > 0 else 0
            theo_pct = THEORETICAL_DISTRIBUTION.get(slot_id, 0.0625) * 100
            deviation = pct - theo_pct

            slots.append(SlotStats(
                slot_id=slot_id,
                multiplier=slot_mults.get(slot_id, 1.0),
                hit_count=count,
                percentage=round(pct, 2),
                theoretical_percentage=round(theo_pct, 2),
                deviation=round(deviation, 2),
            ))

        # Find most/least hit
        sorted_slots = sorted(slot_counts.items(), key=lambda x: x[1], reverse=True)
        most_hit = sorted_slots[0][0]
        least_hit = sorted_slots[-1][0]

        # Edge vs center
        edge_slots = [0, 1, 2, 13, 14, 15]
        center_slots = [6, 7, 8, 9]
        edge_rate = sum(slot_counts[s] for s in edge_slots) / n * 100 if n > 0 else 0
        center_rate = sum(slot_counts[s] for s in center_slots) / n * 100 if n > 0 else 0

        # Jackpot rate (slots 7 and 8)
        jackpot_rate = (slot_counts[7] + slot_counts[8]) / n * 100 if n > 0 else 0

        return SlotDistribution(
            total_drops=n,
            risk_level=risk_level,
            slots=slots,
            most_hit_slot=most_hit,
            least_hit_slot=least_hit,
            avg_multiplier=round(statistics.mean(multipliers), 4) if multipliers else 1.0,
            edge_rate=round(edge_rate, 2),
            center_rate=round(center_rate, 2),
            jackpot_rate=round(jackpot_rate, 4),
        )

    def compare_risk_levels(
        self,
        all_drops: Dict[str, List[Dict]],
    ) -> List[RiskLevelComparison]:
        """Compare statistics across risk levels."""
        results = []

        for risk_level, drops in all_drops.items():
            if not drops:
                continue

            multipliers = [d.get('multiplier', 1.0) for d in drops]
            n = len(multipliers)

            # Win distribution
            loss = sum(1 for m in multipliers if m < 1.0) / n * 100
            small = sum(1 for m in multipliers if 1.0 <= m < 2.0) / n * 100
            medium = sum(1 for m in multipliers if 2.0 <= m < 10.0) / n * 100
            big = sum(1 for m in multipliers if m >= 10.0) / n * 100

            # Get max multiplier for this risk level
            slot_mults = PLINKO_SLOTS.get(risk_level, PLINKO_SLOTS['medium'])
            max_mult = max(slot_mults.values())
            jackpot = sum(1 for m in multipliers if m >= max_mult) / n * 100

            # Actual RTP
            avg_mult = statistics.mean(multipliers)
            actual_rtp = avg_mult * 100  # Simplified RTP calculation

            results.append(RiskLevelComparison(
                risk_level=risk_level,
                total_drops=n,
                avg_multiplier=round(avg_mult, 4),
                median_multiplier=round(statistics.median(multipliers), 4),
                std_deviation=round(statistics.stdev(multipliers), 4) if n > 1 else 0,
                rtp_actual=round(actual_rtp, 2),
                loss_rate=round(loss, 2),
                small_win_rate=round(small, 2),
                medium_win_rate=round(medium, 2),
                big_win_rate=round(big, 2),
                jackpot_rate=round(jackpot, 4),
                max_multiplier=max_mult,
            ))

        return results

    def analyze_fairness(
        self,
        drops: List[Dict],
        risk_level: str,
    ) -> TheoreticalVsActual:
        """Compare theoretical vs actual distribution."""
        slot_counts = {i: 0 for i in range(16)}

        for drop in drops:
            slot = drop.get('slot', drop.get('landing_slot', 7))
            if 0 <= slot < 16:
                slot_counts[slot] += 1

        n = len(drops)
        if n == 0:
            return TheoreticalVsActual(
                risk_level=risk_level,
                chi_square_score=0,
                deviation_score=0,
                is_fair=True,
                slot_comparisons=[],
                overperforming_slots=[],
                underperforming_slots=[],
            )

        # Chi-square calculation
        chi_square = 0
        comparisons = []
        overperforming = []
        underperforming = []

        for slot_id in range(16):
            observed = slot_counts[slot_id]
            expected = THEORETICAL_DISTRIBUTION.get(slot_id, 0.0625) * n

            if expected > 0:
                chi_square += ((observed - expected) ** 2) / expected

            actual_pct = observed / n * 100
            theo_pct = THEORETICAL_DISTRIBUTION.get(slot_id, 0.0625) * 100
            deviation = actual_pct - theo_pct

            comparisons.append({
                "slot": slot_id,
                "observed": observed,
                "expected": round(expected, 2),
                "actual_pct": round(actual_pct, 2),
                "theoretical_pct": round(theo_pct, 2),
                "deviation": round(deviation, 2),
            })

            if deviation > 1.0:  # More than 1% over
                overperforming.append(slot_id)
            elif deviation < -1.0:  # More than 1% under
                underperforming.append(slot_id)

        # Deviation score (0-1, lower is better)
        total_deviation = sum(abs(c["deviation"]) for c in comparisons)
        deviation_score = min(total_deviation / 100, 1.0)

        # Fairness test (chi-square critical value for df=15 at 95% is ~25)
        is_fair = chi_square < 25

        return TheoreticalVsActual(
            risk_level=risk_level,
            chi_square_score=round(chi_square, 4),
            deviation_score=round(deviation_score, 4),
            is_fair=is_fair,
            slot_comparisons=comparisons,
            overperforming_slots=overperforming,
            underperforming_slots=underperforming,
        )

    def track_jackpots(
        self,
        drops: List[Dict],
        risk_level: str = "high",
    ) -> JackpotTracker:
        """Track jackpot occurrences."""
        slot_mults = PLINKO_SLOTS.get(risk_level, PLINKO_SLOTS['high'])
        max_mult = max(slot_mults.values())

        jackpot_indices = []
        for i, drop in enumerate(drops):
            mult = drop.get('multiplier', 1.0)
            if mult >= max_mult:
                jackpot_indices.append(i)

        total = len(jackpot_indices)
        drops_since = jackpot_indices[0] if jackpot_indices else len(drops)

        # Last jackpot time
        last_time = None
        if jackpot_indices and 'created_at' in drops[jackpot_indices[0]]:
            last_time = drops[jackpot_indices[0]]['created_at']

        # Average between jackpots
        avg_between = None
        if len(jackpot_indices) > 1:
            gaps = [jackpot_indices[i] - jackpot_indices[i+1] for i in range(len(jackpot_indices)-1)]
            avg_between = statistics.mean(gaps)

        # Theoretical probability (roughly 0.3% for high risk jackpot)
        theo_prob = 0.3
        expected_drops = int(100 / theo_prob)  # ~333 drops

        # Is current drought longer than expected?
        drought = drops_since > expected_drops * 1.5

        return JackpotTracker(
            total_jackpots=total,
            last_jackpot_time=last_time,
            drops_since_jackpot=drops_since,
            average_drops_between=round(avg_between, 1) if avg_between else None,
            jackpot_probability=theo_prob,
            current_drought=drought,
        )


# =============================================================================
# Service
# =============================================================================

class PlinkoStatsService:
    """Service for Plinko statistics."""

    def __init__(self, db_pool):
        self.db_pool = db_pool
        self.calculator = PlinkoCalculator()

    async def get_drops(
        self,
        hours: Optional[int] = None,
        risk_level: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict]:
        """Fetch Plinko drops from database."""
        query = "SELECT * FROM rounds WHERE 1=1"
        params = []

        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            query += " AND created_at >= ?"
            params.append(cutoff)

        if risk_level:
            query += " AND risk_level = ?"
            params.append(risk_level)

        query += " ORDER BY created_at DESC"

        if limit:
            query += f" LIMIT {limit}"

        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]

    async def get_statistics(
        self,
        period: str = "24h",
    ) -> PlinkoStatistics:
        """Get complete Plinko statistics."""
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 24)

        # Fetch data by risk level
        all_drops = {}
        for risk in ["low", "medium", "high"]:
            drops = await self.get_drops(hours=hours, risk_level=risk)
            if drops:
                all_drops[risk] = drops

        # Also get all drops for overall stats
        all_data = await self.get_drops(hours=hours)

        # Slot distributions
        slot_dists = {}
        fairness = {}
        for risk, drops in all_drops.items():
            slot_dists[risk] = self.calculator.analyze_slot_distribution(drops, risk)
            fairness[risk] = self.calculator.analyze_fairness(drops, risk)

        # Risk comparisons
        risk_comparisons = self.calculator.compare_risk_levels(all_drops)

        # Jackpot tracking (high risk)
        high_drops = all_drops.get("high", [])
        jackpot_tracker = self.calculator.track_jackpots(high_drops, "high")

        # Overall stats
        all_multipliers = [d.get('multiplier', 1.0) for d in all_data]
        overall_avg = statistics.mean(all_multipliers) if all_multipliers else 1.0
        overall_rtp = overall_avg * 100

        return PlinkoStatistics(
            period=period,
            generated_at=datetime.utcnow(),
            slot_distributions=slot_dists,
            risk_comparisons=risk_comparisons,
            fairness_analysis=fairness,
            jackpot_tracker=jackpot_tracker,
            total_drops=len(all_data),
            overall_avg_multiplier=round(overall_avg, 4),
            overall_rtp=round(overall_rtp, 2),
        )


# =============================================================================
# Router Factory
# =============================================================================

def create_plinko_router(db_pool) -> APIRouter:
    """Create router for Plinko statistics."""
    router = APIRouter(prefix="/api/v2/plinko", tags=["plinko-stats"])
    service = PlinkoStatsService(db_pool)

    @router.get(
        "",
        response_model=PlinkoStatistics,
        summary="Get Plinko Statistics",
    )
    async def get_plinko_stats(
        period: str = Query("24h", regex="^(1h|6h|24h|7d|30d)$"),
    ):
        return await service.get_statistics(period)

    @router.get(
        "/slots/{risk_level}",
        response_model=SlotDistribution,
        summary="Get Slot Distribution",
    )
    async def get_slot_distribution(
        risk_level: PlinkoRiskLevel,
        period: str = Query("24h"),
    ):
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 24)
        drops = await service.get_drops(hours=hours, risk_level=risk_level.value)
        return service.calculator.analyze_slot_distribution(drops, risk_level.value)

    @router.get(
        "/fairness/{risk_level}",
        response_model=TheoreticalVsActual,
        summary="Get Fairness Analysis",
    )
    async def get_fairness_analysis(
        risk_level: PlinkoRiskLevel,
        period: str = Query("7d"),
    ):
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 168)
        drops = await service.get_drops(hours=hours, risk_level=risk_level.value)
        return service.calculator.analyze_fairness(drops, risk_level.value)

    @router.get(
        "/jackpot",
        response_model=JackpotTracker,
        summary="Get Jackpot Tracker",
    )
    async def get_jackpot_tracker(
        period: str = Query("30d"),
    ):
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 720)
        drops = await service.get_drops(hours=hours, risk_level="high")
        return service.calculator.track_jackpots(drops, "high")

    @router.get(
        "/risk-comparison",
        response_model=List[RiskLevelComparison],
        summary="Get Risk Level Comparison",
    )
    async def get_risk_comparison(
        period: str = Query("7d"),
    ):
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 168)

        all_drops = {}
        for risk in ["low", "medium", "high"]:
            drops = await service.get_drops(hours=hours, risk_level=risk)
            if drops:
                all_drops[risk] = drops

        return service.calculator.compare_risk_levels(all_drops)

    return router
