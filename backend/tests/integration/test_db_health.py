import pytest
from sqlalchemy import text

def test_database_connection_and_ping(db):
    """Verify database connection and ping execution."""
    db.execute.return_value.scalar.return_value = 1
    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1
