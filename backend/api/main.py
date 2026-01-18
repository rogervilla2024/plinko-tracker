"""
Plinko Tracker - Backend API

FastAPI application for serving Plinko game statistics.
This module provides REST API endpoints for accessing Plinko game data
including drops, statistics, and distribution analysis.

Author: Crash Games Team
Version: 1.0.0
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

import aiosqlite
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Game-specific statistics
from game_stats import create_plinko_router


# =============================================================================
# Logging Configuration
# =============================================================================

def setup_logger(name: str) -> logging.Logger:
    """
    Configure and return a logger with structured formatting.

    Args:
        name: The name of the logger (typically __name__).

    Returns:
        logging.Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "module": "%(module)s", '
            '"function": "%(funcName)s", "line": %(lineno)d, '
            '"message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


logger = setup_logger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Database path from environment variable with default fallback
DATABASE_PATH: str = os.getenv("DATABASE_PATH", "plinko.db")

# CORS allowed origins - configurable via environment
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", "https://plinkotracker.com"),
    os.getenv("SECONDARY_DOMAIN", "https://www.plinkotracker.com"),
]

# Constants for multiplier distribution buckets
DISTRIBUTION_BUCKETS: List[tuple] = [
    ("instant", "= 1"),
    ("1.01-1.5x", "BETWEEN 1.01 AND 1.5"),
    ("1.51-2x", "BETWEEN 1.51 AND 2"),
    ("2.01-3x", "BETWEEN 2.01 AND 3"),
    ("3.01-5x", "BETWEEN 3.01 AND 5"),
    ("5.01-10x", "BETWEEN 5.01 AND 10"),
    ("10.01-50x", "BETWEEN 10.01 AND 50"),
    ("50.01-100x", "BETWEEN 50.01 AND 100"),
    ("100x+", ">= 100.01"),
]


# =============================================================================
# Pydantic Models
# =============================================================================

class Drop(BaseModel):
    """
    Represents a single Plinko drop.

    Attributes:
        drop_id: Unique identifier for the drop.
        risk_level: Risk level (low, medium, high).
        rows: Number of rows in the Plinko board.
        landing_position: Position where the ball landed.
        multiplier: The multiplier value for the landing position.
        created_at: Timestamp when the drop was recorded.
    """
    drop_id: str = Field(..., description="Unique identifier for the drop")
    risk_level: str = Field(..., description="Risk level (low, medium, high)")
    rows: int = Field(..., gt=0, description="Number of rows (must be > 0)")
    landing_position: int = Field(..., ge=0, description="Landing position (must be >= 0)")
    multiplier: float = Field(..., gt=0, description="Multiplier value (must be > 0)")
    created_at: datetime = Field(..., description="Timestamp when drop was recorded")


class DropsResponse(BaseModel):
    """
    Response model for paginated drops endpoint.

    Attributes:
        items: List of Drop objects.
        total: Total number of drops in the database.
    """
    items: List[Drop] = Field(..., description="List of Plinko drops")
    total: int = Field(..., ge=0, description="Total number of drops")


class SummaryStats(BaseModel):
    """
    Summary statistics for all Plinko drops.

    Attributes:
        total_drops: Total number of drops played.
        avg_multiplier: Average multiplier across all drops.
        median_multiplier: Median multiplier value.
        max_multiplier: Highest multiplier recorded.
        min_multiplier: Lowest multiplier recorded.
        under_2x_count: Number of drops that resulted below 2x.
        over_10x_count: Number of drops that reached 10x or higher.
    """
    total_drops: int = Field(..., ge=0, description="Total number of drops")
    avg_multiplier: float = Field(..., ge=0, description="Average multiplier")
    median_multiplier: float = Field(..., ge=0, description="Median multiplier")
    max_multiplier: float = Field(..., ge=0, description="Maximum multiplier")
    min_multiplier: float = Field(..., ge=0, description="Minimum multiplier")
    under_2x_count: int = Field(..., ge=0, description="Drops that resulted below 2x")
    over_10x_count: int = Field(..., ge=0, description="Drops that reached 10x or higher")


class RecentStats(BaseModel):
    """
    Statistics for recent Plinko drops.

    Attributes:
        avg_multiplier: Average multiplier for recent drops.
        under_2x_pct: Percentage of drops that resulted below 2x.
    """
    avg_multiplier: float = Field(..., ge=0, description="Average multiplier for recent drops")
    under_2x_pct: float = Field(..., ge=0, le=100, description="Percentage of drops below 2x")


class DistributionBucket(BaseModel):
    """
    Represents a bucket in the multiplier distribution.

    Attributes:
        range: Human-readable range label (e.g., "1.01-1.5x").
        count: Number of drops in this range.
        percentage: Percentage of total drops in this range.
    """
    range: str = Field(..., description="Multiplier range label")
    count: int = Field(..., ge=0, description="Number of drops in range")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of total drops")


class HealthResponse(BaseModel):
    """
    Health check response model.

    Attributes:
        status: Current health status ('healthy' or 'unhealthy').
        game: Name of the game being tracked.
        database: Database connection status.
        last_data_update: Timestamp of most recent data.
        timestamp: Current server timestamp.
    """
    status: str = Field(..., description="Health status")
    game: str = Field(..., description="Game name")
    database: str = Field(..., description="Database connection status")
    last_data_update: Optional[str] = Field(None, description="Last data update timestamp")
    timestamp: str = Field(..., description="Current server timestamp")


class ErrorResponse(BaseModel):
    """
    Standardized error response model.

    Attributes:
        error: Error type identifier.
        detail: Human-readable error description.
        timestamp: When the error occurred.
        request_id: Optional request tracking ID.
    """
    error: str = Field(..., description="Error type identifier")
    detail: str = Field(..., description="Error description")
    timestamp: str = Field(..., description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Request tracking ID")


# =============================================================================
# Database Connection Management
# =============================================================================

class DatabaseManager:
    """
    Manages database connections using context managers for proper cleanup.

    This class provides async context manager for database connections,
    ensuring connections are properly closed after use.
    """

    def __init__(self, db_path: str) -> None:
        """
        Initialize the database manager.

        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = db_path

    @asynccontextmanager
    async def connect(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """
        Get a database connection using async context manager.

        Yields:
            aiosqlite.Connection: Database connection with Row factory set.

        Raises:
            DatabaseError: If connection cannot be established.
        """
        db: Optional[aiosqlite.Connection] = None
        try:
            db = await aiosqlite.connect(self.db_path)
            db.row_factory = aiosqlite.Row
            logger.debug(f"Database connection established to {self.db_path}")
            yield db
        except aiosqlite.Error as e:
            logger.error(f"Database connection error: {e}")
            raise HTTPException(
                status_code=503,
                detail="Database connection failed"
            ) from e
        finally:
            if db:
                await db.close()
                logger.debug("Database connection closed")


# Create singleton database manager
db_manager = DatabaseManager(DATABASE_PATH)


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """
    Dependency function for database connection injection.

    Yields:
        aiosqlite.Connection: Database connection.

    Example:
        @app.get("/api/data")
        async def get_data(db: aiosqlite.Connection = Depends(get_db)):
            cursor = await db.execute("SELECT * FROM table")
    """
    async with db_manager.connect() as db:
        yield db


# =============================================================================
# FastAPI Application Setup
# =============================================================================

app = FastAPI(
    title="Plinko Tracker API",
    description="Real-time statistics API for BGaming Plinko game",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# =============================================================================
# CORS Configuration (Security Fix)
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # API doesn't require credentials
    allow_methods=["GET", "HEAD", "OPTIONS"],  # Read-only API
    allow_headers=["Content-Type", "Accept"],
    expose_headers=["Content-Length", "Content-Range"],
    max_age=3600,
)


# =============================================================================
# Exception Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: The incoming request that caused the exception.
        exc: The exception that was raised.

    Returns:
        JSONResponse: Standardized error response with 500 status code.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    error_response = ErrorResponse(
        error="internal_error",
        detail="An internal server error occurred",
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handler for HTTP exceptions.

    Args:
        request: The incoming request.
        exc: The HTTPException that was raised.

    Returns:
        JSONResponse: Standardized error response.
    """
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    error_response = ErrorResponse(
        error="http_error",
        detail=str(exc.detail),
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """
    Handler for validation errors.

    Args:
        request: The incoming request.
        exc: The ValueError that was raised.

    Returns:
        JSONResponse: Standardized error response with 422 status code.
    """
    logger.warning(f"Validation error: {exc}")
    error_response = ErrorResponse(
        error="validation_error",
        detail=str(exc),
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=422,
        content=error_response.model_dump()
    )


# =============================================================================
# Startup Event
# =============================================================================

@app.on_event("startup")
async def startup() -> None:
    """
    Application startup event handler.

    Creates the database table and indexes if they don't exist.
    Logs the startup process for monitoring.
    """
    logger.info("Starting Plinko Tracker API...")

    try:
        async with db_manager.connect() as db:
            # Create main table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS plinko_rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    drop_id TEXT UNIQUE NOT NULL,
                    risk_level TEXT NOT NULL,
                    rows INTEGER NOT NULL,
                    landing_position INTEGER NOT NULL,
                    multiplier REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create indexes for performance
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_multiplier ON plinko_rounds(multiplier)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_created ON plinko_rounds(created_at DESC)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_drop_id ON plinko_rounds(drop_id)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_risk_level ON plinko_rounds(risk_level)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_rows ON plinko_rounds(rows)"
            )

            await db.commit()
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/api/drops", response_model=DropsResponse)
async def get_drops(
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of drops to return (1-500)"
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Number of drops to skip (must be >= 0)"
    ),
    db: aiosqlite.Connection = Depends(get_db)
) -> DropsResponse:
    """
    Get paginated list of Plinko drops.

    Retrieves Plinko drops ordered by creation time (most recent first).
    Supports pagination through limit and offset parameters.

    Args:
        limit: Maximum number of drops to return (default: 50, max: 500).
        offset: Number of drops to skip for pagination (default: 0).
        db: Database connection (injected).

    Returns:
        DropsResponse: Paginated list of drops with total count.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/drops?limit=100&offset=0
        Response: {"items": [...], "total": 5000}
    """
    logger.debug(f"Fetching drops with limit={limit}, offset={offset}")

    try:
        # Get total count
        cursor = await db.execute("SELECT COUNT(*) FROM plinko_rounds")
        total = (await cursor.fetchone())[0]

        # Get paginated drops
        cursor = await db.execute(
            """
            SELECT drop_id, risk_level, rows, landing_position, multiplier, created_at
            FROM plinko_rounds
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        )
        rows = await cursor.fetchall()

        items = [
            Drop(
                drop_id=row["drop_id"],
                risk_level=row["risk_level"],
                rows=row["rows"],
                landing_position=row["landing_position"],
                multiplier=row["multiplier"],
                created_at=row["created_at"]
            )
            for row in rows
        ]

        logger.info(f"Retrieved {len(items)} drops (total: {total})")
        return DropsResponse(items=items, total=total)

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching drops: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch drops from database"
        ) from e


@app.get("/api/stats/summary", response_model=SummaryStats)
async def get_summary(db: aiosqlite.Connection = Depends(get_db)) -> SummaryStats:
    """
    Get summary statistics for all Plinko drops.

    Calculates aggregate statistics including average, median, min, max
    multipliers and count of drops in specific ranges.

    Args:
        db: Database connection (injected).

    Returns:
        SummaryStats: Aggregate statistics for all drops.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/stats/summary
        Response: {"total_drops": 5000, "avg_multiplier": 2.45, ...}
    """
    logger.debug("Fetching summary statistics")

    try:
        # Get main statistics in a single query
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                AVG(multiplier) as avg,
                MAX(multiplier) as max,
                MIN(multiplier) as min,
                SUM(CASE WHEN multiplier < 2 THEN 1 ELSE 0 END) as under_2x,
                SUM(CASE WHEN multiplier >= 10 THEN 1 ELSE 0 END) as over_10x
            FROM plinko_rounds
        """)
        row = await cursor.fetchone()

        # Calculate median
        cursor = await db.execute("""
            SELECT multiplier FROM plinko_rounds
            ORDER BY multiplier
            LIMIT 1 OFFSET (SELECT COUNT(*) FROM plinko_rounds) / 2
        """)
        median_row = await cursor.fetchone()
        median = median_row[0] if median_row else 0.0

        result = SummaryStats(
            total_drops=row[0] or 0,
            avg_multiplier=round(row[1] or 0, 4),
            max_multiplier=row[2] or 0,
            min_multiplier=row[3] or 0,
            median_multiplier=round(median, 4),
            under_2x_count=row[4] or 0,
            over_10x_count=row[5] or 0
        )

        logger.info(f"Summary stats: {result.total_drops} total drops")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch summary statistics"
        ) from e


@app.get("/api/stats/recent", response_model=RecentStats)
async def get_recent_stats(
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
        description="Number of recent drops to analyze (1-1000)"
    ),
    db: aiosqlite.Connection = Depends(get_db)
) -> RecentStats:
    """
    Get statistics for recent Plinko drops.

    Analyzes the most recent N drops to provide current trend data.

    Args:
        limit: Number of recent drops to analyze (default: 100, max: 1000).
        db: Database connection (injected).

    Returns:
        RecentStats: Statistics for recent drops.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/stats/recent?limit=500
        Response: {"avg_multiplier": 2.35, "under_2x_pct": 52.4}
    """
    logger.debug(f"Fetching recent stats for last {limit} drops")

    try:
        cursor = await db.execute("""
            SELECT
                AVG(multiplier) as avg_multiplier,
                SUM(CASE WHEN multiplier < 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as under_2x_pct
            FROM (
                SELECT multiplier
                FROM plinko_rounds
                ORDER BY created_at DESC
                LIMIT ?
            )
        """, (limit,))
        row = await cursor.fetchone()

        result = RecentStats(
            avg_multiplier=round(row[0] or 0, 4),
            under_2x_pct=round(row[1] or 0, 2)
        )

        logger.info(f"Recent stats (last {limit}): avg={result.avg_multiplier}")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching recent stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch recent statistics"
        ) from e


@app.get("/api/distribution", response_model=List[DistributionBucket])
async def get_distribution(
    db: aiosqlite.Connection = Depends(get_db)
) -> List[DistributionBucket]:
    """
    Get multiplier distribution across predefined ranges.

    Returns the count and percentage of drops that fall into each
    multiplier range bucket for visualization and analysis.

    Args:
        db: Database connection (injected).

    Returns:
        List[DistributionBucket]: Distribution data for each range bucket.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/distribution
        Response: [
            {"range": "instant", "count": 300, "percentage": 6.0},
            {"range": "1.01-1.5x", "count": 1500, "percentage": 30.0},
            ...
        ]
    """
    logger.debug("Fetching multiplier distribution")

    try:
        # Get total count first
        cursor = await db.execute("SELECT COUNT(*) FROM plinko_rounds")
        total = (await cursor.fetchone())[0] or 1  # Avoid division by zero

        result: List[DistributionBucket] = []

        # Query each bucket (could be optimized with CASE statements in single query)
        for name, condition in DISTRIBUTION_BUCKETS:
            cursor = await db.execute(
                f"SELECT COUNT(*) FROM plinko_rounds WHERE multiplier {condition}"
            )
            count = (await cursor.fetchone())[0]
            percentage = round((count / total) * 100, 2)

            result.append(DistributionBucket(
                range=name,
                count=count,
                percentage=percentage
            ))

        logger.info(f"Distribution calculated for {total} drops")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching distribution: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch distribution data"
        ) from e


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """
    Health check endpoint for monitoring and orchestration.

    Checks database connectivity and returns the service health status
    along with the timestamp of the most recent data update.

    Returns:
        HealthResponse: Service health status and metadata.

    Example:
        GET /api/health
        Response: {
            "status": "healthy",
            "game": "plinko",
            "database": "connected",
            "last_data_update": "2026-01-17T10:30:00",
            "timestamp": "2026-01-17T10:35:00"
        }
    """
    logger.debug("Health check requested")

    try:
        async with db_manager.connect() as db:
            # Check database connectivity and get last update time
            cursor = await db.execute(
                "SELECT MAX(created_at) FROM plinko_rounds"
            )
            last_update_row = await cursor.fetchone()
            last_update = last_update_row[0] if last_update_row and last_update_row[0] else None

            response = HealthResponse(
                status="healthy",
                game="plinko",
                database="connected",
                last_data_update=str(last_update) if last_update else "No data",
                timestamp=datetime.utcnow().isoformat()
            )

            logger.info("Health check: healthy")
            return response

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthResponse(
            status="unhealthy",
            game="plinko",
            database="disconnected",
            last_data_update=None,
            timestamp=datetime.utcnow().isoformat()
        )


# =============================================================================
# Main Entry Point
# =============================================================================


# Game-specific statistics router
plinko_stats_router = create_plinko_router(db_manager)
app.include_router(plinko_stats_router)


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Plinko Tracker API server...")
    uvicorn.run(app, host="0.0.0.0", port=8004)
