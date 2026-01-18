"""
Plinko Data Collector

Collects drop data from BGaming Plinko game.
Uses Playwright for browser automation and WebSocket interception.

This module provides:
- WebSocket message interception for real-time data collection
- Database persistence for collected drops
- Test data generation for development

Note: This is a template collector. The actual implementation
depends on BGaming's demo game structure and WebSocket/API endpoints.

Author: Crash Games Team
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import aiosqlite
from playwright.async_api import async_playwright, Page, WebSocket


# =============================================================================
# Logging Configuration
# =============================================================================

def setup_logger(name: str) -> logging.Logger:
    """
    Configure and return a logger with structured JSON formatting.

    Args:
        name: The name of the logger (typically __name__).

    Returns:
        logging.Logger: Configured logger instance with JSON output.
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

DATABASE_PATH: str = os.getenv("DATABASE_PATH", "plinko.db")

# Known field names for multiplier extraction from various message formats
MULTIPLIER_FIELDS: List[str] = [
    'multiplier', 'payout', 'result', 'coefficient',
    'odds', 'prize', 'win'
]

# Known field names for drop ID extraction
DROP_ID_FIELDS: List[str] = [
    'dropId', 'gameId', 'id', 'drop', 'dropNumber',
    'gameNumber', 'sessionId', 'ballId'
]

# Known field names for risk level extraction
RISK_LEVEL_FIELDS: List[str] = [
    'risk', 'riskLevel', 'risk_level', 'difficulty', 'mode'
]

# Known field names for rows extraction
ROWS_FIELDS: List[str] = [
    'rows', 'rowCount', 'row_count', 'pins', 'levels'
]

# Known field names for landing position extraction
POSITION_FIELDS: List[str] = [
    'position', 'landing', 'slot', 'bucket', 'landingPosition',
    'landing_position', 'finalPosition', 'final_position'
]

# Message types that indicate a drop has completed
END_MESSAGE_TYPES: List[str] = [
    'drop_result', 'result', 'finish', 'end', 'ball_landed',
    'drop_end', 'completed', 'landed'
]


# =============================================================================
# Custom Exceptions
# =============================================================================

class CollectorError(Exception):
    """Base exception for collector errors."""
    pass


class DatabaseError(CollectorError):
    """Raised when database operations fail."""
    pass


class ConnectionError(CollectorError):
    """Raised when connection to data source fails."""
    pass


class ParseError(CollectorError):
    """Raised when message parsing fails."""
    pass


# =============================================================================
# Plinko Collector Class
# =============================================================================

class PlinkoCollector:
    """
    Collects Plinko drop data from BGaming Plinko using Playwright.

    This collector uses browser automation to intercept WebSocket messages
    and extract drop data in real-time.

    Attributes:
        db_path: Path to the SQLite database file.
        running: Flag indicating if collection is active.
        drops_collected: Counter of successfully collected drops.
        max_retries: Maximum number of retry attempts for failed operations.
        retry_delay: Base delay between retries in seconds.

    Example:
        collector = PlinkoCollector()
        await collector.run(demo_url="https://demo.bgaming.com/plinko")
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        max_retries: int = 5,
        retry_delay: float = 2.0
    ) -> None:
        """
        Initialize the Plinko collector.

        Args:
            db_path: Path to SQLite database. Defaults to DATABASE_PATH env var.
            max_retries: Maximum retry attempts for failed operations.
            retry_delay: Base delay between retries in seconds.
        """
        self.db_path: str = db_path or DATABASE_PATH
        self.running: bool = False
        self.drops_collected: int = 0
        self.max_retries: int = max_retries
        self.retry_delay: float = retry_delay

        logger.info(f"PlinkoCollector initialized with db_path={self.db_path}")

    async def init_db(self) -> None:
        """
        Initialize the database schema.

        Creates the plinko_rounds table if it doesn't exist.

        Raises:
            DatabaseError: If database initialization fails.
        """
        logger.info("Initializing database...")

        try:
            async with aiosqlite.connect(self.db_path) as db:
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
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_created ON plinko_rounds(created_at DESC)"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_multiplier ON plinko_rounds(multiplier)"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_risk_level ON plinko_rounds(risk_level)"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_rows ON plinko_rounds(rows)"
                )
                await db.commit()
                logger.info("Database initialized successfully")
        except aiosqlite.Error as e:
            logger.error(f"Database initialization failed: {e}", exc_info=True)
            raise DatabaseError(f"Failed to initialize database: {e}") from e

    async def save_drop(
        self,
        drop_id: str,
        risk_level: str,
        rows: int,
        landing_position: int,
        multiplier: float
    ) -> bool:
        """
        Save a Plinko drop to the database.

        Args:
            drop_id: Unique identifier for the drop.
            risk_level: Risk level (low, medium, high).
            rows: Number of rows in the Plinko board (must be > 0).
            landing_position: Landing position (must be >= 0).
            multiplier: Multiplier value (must be > 0).

        Returns:
            bool: True if drop was saved successfully, False otherwise.

        Raises:
            ValueError: If parameters are invalid.
        """
        # Validate parameters
        if multiplier <= 0:
            logger.error(f"Invalid multiplier value: {multiplier} (must be > 0)")
            raise ValueError(f"Multiplier must be positive, got {multiplier}")

        if rows <= 0:
            logger.error(f"Invalid rows value: {rows} (must be > 0)")
            raise ValueError(f"Rows must be positive, got {rows}")

        if landing_position < 0:
            logger.error(f"Invalid landing_position value: {landing_position} (must be >= 0)")
            raise ValueError(f"Landing position must be non-negative, got {landing_position}")

        # Normalize risk level
        risk_level = risk_level.lower()
        if risk_level not in ['low', 'medium', 'high']:
            logger.warning(f"Unknown risk level '{risk_level}', defaulting to 'medium'")
            risk_level = 'medium'

        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """INSERT OR IGNORE INTO plinko_rounds
                       (drop_id, risk_level, rows, landing_position, multiplier)
                       VALUES (?, ?, ?, ?, ?)""",
                    (drop_id, risk_level, rows, landing_position, multiplier)
                )
                await db.commit()
                self.drops_collected += 1
                logger.info(
                    f"Drop saved: drop_id={drop_id}, risk={risk_level}, rows={rows}, "
                    f"pos={landing_position}, multiplier={multiplier:.2f}x, "
                    f"total_collected={self.drops_collected}"
                )
                return True
        except aiosqlite.IntegrityError:
            logger.debug(f"Drop {drop_id} already exists (duplicate)")
            return False
        except aiosqlite.Error as e:
            logger.error(f"Failed to save drop {drop_id}: {e}", exc_info=True)
            return False

    async def collect_with_playwright(self, demo_url: str) -> None:
        """
        Collect data using Playwright browser automation.

        Intercepts WebSocket messages from the game to extract drop data.
        Implements exponential backoff for reconnection attempts.

        Args:
            demo_url: URL of the demo game to collect data from.

        Raises:
            ConnectionError: If unable to connect after max retries.
        """
        logger.info(f"Starting Playwright collection from {demo_url}")

        retry_count: int = 0

        while self.running and retry_count < self.max_retries:
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context()
                    page = await context.new_page()

                    # Set up WebSocket message handler
                    page.on("websocket", lambda ws: self._setup_websocket_handler(ws))

                    try:
                        await page.goto(demo_url, wait_until="networkidle", timeout=60000)
                        logger.info("Page loaded successfully, monitoring for drops...")

                        # Reset retry count on successful connection
                        retry_count = 0

                        # Keep collecting while running
                        while self.running:
                            await asyncio.sleep(1)

                    except Exception as e:
                        logger.error(f"Page navigation error: {e}", exc_info=True)
                        raise

                    finally:
                        await browser.close()
                        logger.info("Browser closed")

            except Exception as e:
                retry_count += 1
                wait_time = self.retry_delay * (2 ** (retry_count - 1))  # Exponential backoff

                logger.warning(
                    f"Collection failed (attempt {retry_count}/{self.max_retries}): {e}. "
                    f"Retrying in {wait_time:.1f}s..."
                )

                if retry_count < self.max_retries:
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Max retries ({self.max_retries}) exceeded. Stopping collection.")
                    raise ConnectionError(
                        f"Failed to connect after {self.max_retries} attempts"
                    ) from e

    def _setup_websocket_handler(self, ws: WebSocket) -> None:
        """
        Set up handlers for WebSocket message events.

        Args:
            ws: Playwright WebSocket object.
        """
        logger.info(f"WebSocket connected: {ws.url}")

        def on_message(payload: str) -> None:
            """Handle incoming WebSocket message."""
            try:
                self._process_websocket_message(payload)
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}", exc_info=True)

        ws.on("framereceived", lambda payload: on_message(payload))
        ws.on("close", lambda: logger.info(f"WebSocket closed: {ws.url}"))

    def _process_websocket_message(self, message: str) -> None:
        """
        Process a raw WebSocket message.

        Args:
            message: Raw WebSocket message string.
        """
        try:
            data = json.loads(message) if isinstance(message, str) else message
            self.parse_ws_message(data)
        except json.JSONDecodeError as e:
            logger.debug(f"Non-JSON message received: {message[:100]}...")
        except Exception as e:
            logger.error(f"Failed to process message: {e}", exc_info=True)

    def parse_ws_message(self, data: Union[Dict[str, Any], List, Any]) -> None:
        """
        Parse WebSocket message to extract Plinko drop data.

        This method attempts to extract drop ID, risk level, rows, landing position,
        and multiplier from various possible message formats used by different game providers.

        Args:
            data: Parsed WebSocket message (dict, list, or other).

        Note:
            The actual message format depends on BGaming's API structure.
            This implementation handles common patterns found in Plinko games.
        """
        if not isinstance(data, dict):
            logger.debug(f"Skipping non-dict message: {type(data)}")
            return

        # Check if this is a drop-end message
        msg_type = self._extract_message_type(data)
        if msg_type and msg_type.lower() not in END_MESSAGE_TYPES:
            logger.debug(f"Skipping non-end message type: {msg_type}")
            return

        # Extract required fields
        multiplier = self._extract_multiplier(data)
        if multiplier is None:
            logger.debug("No multiplier found in message")
            return

        landing_position = self._extract_landing_position(data)
        if landing_position is None:
            logger.debug("No landing position found in message")
            return

        # Validate required values
        if multiplier <= 0:
            logger.warning(f"Invalid multiplier value: {multiplier}")
            return

        if landing_position < 0:
            logger.warning(f"Invalid landing position: {landing_position}")
            return

        # Extract optional fields with defaults
        drop_id = self._extract_drop_id(data)
        if drop_id is None:
            # Generate a drop ID if not found
            drop_id = f"plinko_{datetime.now().timestamp()}"
            logger.debug(f"Generated drop_id: {drop_id}")

        risk_level = self._extract_risk_level(data)
        if risk_level is None:
            risk_level = "medium"
            logger.debug("No risk level found, defaulting to 'medium'")

        rows = self._extract_rows(data)
        if rows is None:
            rows = 12
            logger.debug("No rows found, defaulting to 12")

        # Save the drop asynchronously
        asyncio.create_task(
            self.save_drop(
                str(drop_id),
                str(risk_level),
                int(rows),
                int(landing_position),
                float(multiplier)
            )
        )

    def _extract_message_type(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extract message type from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[str]: Message type if found, None otherwise.
        """
        for field in ['type', 't', 'action', 'event', 'messageType', 'cmd']:
            if field in data:
                return str(data[field])
        return None

    def _extract_multiplier(self, data: Dict[str, Any]) -> Optional[float]:
        """
        Extract multiplier value from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[float]: Multiplier value if found and valid, None otherwise.
        """
        for field in MULTIPLIER_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, (int, float)):
                        return float(value)
                    elif isinstance(value, str):
                        return float(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to float: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_multiplier(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_multiplier(data['data'])

        return None

    def _extract_landing_position(self, data: Dict[str, Any]) -> Optional[int]:
        """
        Extract landing position from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[int]: Landing position if found and valid, None otherwise.
        """
        for field in POSITION_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, (int, float)):
                        return int(value)
                    elif isinstance(value, str):
                        return int(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to int: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_landing_position(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_landing_position(data['data'])

        return None

    def _extract_drop_id(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extract drop ID from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[str]: Drop ID if found, None otherwise.
        """
        for field in DROP_ID_FIELDS:
            if field in data:
                return str(data[field])

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_drop_id(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_drop_id(data['data'])

        return None

    def _extract_risk_level(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extract risk level from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[str]: Risk level if found, None otherwise.
        """
        for field in RISK_LEVEL_FIELDS:
            if field in data:
                return str(data[field]).lower()

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_risk_level(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_risk_level(data['data'])

        return None

    def _extract_rows(self, data: Dict[str, Any]) -> Optional[int]:
        """
        Extract number of rows from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[int]: Number of rows if found and valid, None otherwise.
        """
        for field in ROWS_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, (int, float)):
                        return int(value)
                    elif isinstance(value, str):
                        return int(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to int: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_rows(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_rows(data['data'])

        return None

    async def generate_test_data(self, count: int = 100) -> None:
        """
        Generate test data for development and testing.

        Creates simulated Plinko drops with realistic distribution.
        The distribution follows binomial probability for Plinko mechanics.

        Args:
            count: Number of test drops to generate.
        """
        import random

        logger.info(f"Generating {count} test drops...")

        # Plinko payout tables (99% RTP)
        PLINKO_PAYOUTS = {
            "low": {
                8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
                12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
                16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
            },
            "medium": {
                8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
                12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
                16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            },
            "high": {
                8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
                12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
                16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
            }
        }

        risk_levels = ["low", "medium", "high"]
        row_options = [8, 12, 16]

        for i in range(count):
            # Random configuration
            risk_level = random.choice(risk_levels)
            rows = random.choice(row_options)

            # Simulate binomial distribution for landing position
            # Each peg has 50/50 chance to go left or right
            position = 0
            for _ in range(rows):
                if random.random() < 0.5:
                    position += 1

            # Get multiplier from payout table
            payouts = PLINKO_PAYOUTS[risk_level][rows]
            multiplier = payouts[position]

            drop_id = f"test_{datetime.now().timestamp()}_{i}"

            try:
                await self.save_drop(drop_id, risk_level, rows, position, multiplier)
            except ValueError as e:
                logger.warning(f"Skipping invalid test drop: {e}")

            # Small delay to avoid overwhelming the database
            await asyncio.sleep(0.01)

        logger.info(f"Test data generation complete: {count} drops created")

    async def run(
        self,
        demo_url: Optional[str] = None,
        test_mode: bool = False
    ) -> None:
        """
        Main collection loop.

        Initializes the database and starts data collection from either
        a live demo URL or generates test data.

        Args:
            demo_url: URL of the demo game to collect from.
            test_mode: If True, generate test data instead of collecting.

        Raises:
            ValueError: If neither demo_url nor test_mode is specified.
        """
        logger.info("Starting Plinko collector...")

        await self.init_db()
        self.running = True

        try:
            if test_mode:
                logger.info("Running in test mode - generating test data")
                await self.generate_test_data(1000)
            elif demo_url:
                logger.info(f"Collecting from demo URL: {demo_url}")
                await self.collect_with_playwright(demo_url)
            else:
                error_msg = "No demo URL provided and not in test mode"
                logger.error(error_msg)
                raise ValueError(error_msg)
        except Exception as e:
            logger.error(f"Collection failed: {e}", exc_info=True)
            raise
        finally:
            self.running = False
            logger.info(
                f"Collector stopped. Total drops collected: {self.drops_collected}"
            )

    def stop(self) -> None:
        """
        Stop the collector gracefully.

        Sets the running flag to False, which will cause the collection
        loop to exit on its next iteration.
        """
        logger.info("Stop requested - collector will shut down gracefully")
        self.running = False


# =============================================================================
# Main Entry Point
# =============================================================================

async def main() -> None:
    """
    Main entry point for the collector.

    Parses command line arguments and starts the collector in either
    test mode or live collection mode.
    """
    import sys

    collector = PlinkoCollector()

    # Check for test mode flag
    test_mode = "--test" in sys.argv

    if test_mode:
        logger.info("Starting in test mode")
        await collector.run(test_mode=True)
    else:
        # Try to collect from BGaming demo
        demo_url = os.getenv("DEMO_URL", "https://demo.bgaming.com/plinko")
        logger.info(f"Starting collection from: {demo_url}")
        logger.info("Note: This may require additional configuration based on BGaming's demo structure")

        try:
            await collector.run(demo_url=demo_url)
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
            collector.stop()
        except Exception as e:
            logger.error(f"Collector failed: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    asyncio.run(main())
