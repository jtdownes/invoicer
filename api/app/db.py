from contextlib import contextmanager
from typing import Any, Optional

import psycopg2
from psycopg2 import extras, pool

from .config import DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER

_pool: Optional[pool.ThreadedConnectionPool] = None


def _get_pool() -> pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
        )
        print(f"[DB] Pool ready: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    return _pool


@contextmanager
def get_db():
    connection = None
    try:
        connection = _get_pool().getconn()
        yield connection
    except Exception:
        if connection:
            connection.rollback()
        raise
    finally:
        if connection:
            _get_pool().putconn(connection)


def query_one(sql: str, params: tuple = ()) -> Optional[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def query_all(sql: str, params: tuple = ()) -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def execute(sql: str, params: tuple = (), returning: bool = False) -> Optional[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            result = cur.fetchone() if returning else None
        conn.commit()
    return result
