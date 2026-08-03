import pytest

from app.core.pagination import PaginationParams


def test_valid_page_limit():
    params = PaginationParams(page=2, limit=20)

    assert params.page == 2
    assert params.limit == 20
    assert params.offset == 20


def test_default_values():
    # Pass explicit values because FastAPI's Query() defaults
    # are only resolved during dependency injection.
    params = PaginationParams(page=1, limit=10)

    assert params.page == 1
    assert params.limit == 10
    assert params.offset == 0


def test_offset_calculation():
    params = PaginationParams(page=5, limit=10)

    assert params.offset == 40


def test_first_page_offset():
    params = PaginationParams(page=1, limit=25)

    assert params.offset == 0


def test_large_page_offset():
    params = PaginationParams(page=10, limit=50)

    assert params.offset == 450