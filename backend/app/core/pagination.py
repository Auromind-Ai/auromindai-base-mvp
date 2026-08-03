from fastapi import Query


class SkipLimitParams:
    """
    Reusable skip/limit pagination parameters.
    Example:
    ?skip=0&limit=50
    """

    def __init__(
        self,
        skip: int = Query(
            default=0,
            ge=0,
            description="Number of records to skip"
        ),
        limit: int = Query(
            default=50,
            ge=1,
            le=100,
            description="Maximum number of records to return"
        )
    ):
        self.skip = skip
        self.limit = limit


class PaginationParams:
    """
    Reusable page/limit pagination parameters.
    Example:
    ?page=1&limit=10
    """

    def __init__(
        self,
        page: int = Query(
            default=1,
            ge=1,
            description="Page number"
        ),
        limit: int = Query(
            default=10,
            ge=1,
            le=100,
            description="Records per page"
        )
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


def paginate_query(query, pagination):
    """
    Apply pagination to a SQLAlchemy query.
    """

    if hasattr(pagination, "offset"):
        return query.offset(pagination.offset).limit(pagination.limit)

    return query.offset(pagination.skip).limit(pagination.limit)