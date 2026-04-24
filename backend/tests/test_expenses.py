import os
from pathlib import Path

from fastapi.testclient import TestClient

TEST_DB = Path(__file__).resolve().parent / "test_expenses.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from app.main import app  # noqa: E402

client = TestClient(app)


def setup_function() -> None:
    from app.db import Base, engine

    # Reset all tables between tests without deleting the SQLite file.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_create_expense() -> None:
    payload = {
        "amount": "499.50",
        "category": "Food",
        "description": "Lunch",
        "date": "2026-04-24",
    }
    response = client.post("/expenses", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == "499.50"
    assert body["category"] == "Food"


def test_idempotent_retry_returns_same_expense() -> None:
    payload = {
        "amount": "100.00",
        "category": "Travel",
        "description": "Cab fare",
        "date": "2026-04-23",
    }
    headers = {"Idempotency-Key": "same-key-1"}

    first = client.post("/expenses", json=payload, headers=headers)
    second = client.post("/expenses", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_filter_by_category() -> None:
    client.post(
        "/expenses",
        json={
            "amount": "80.00",
            "category": "Travel",
            "description": "Metro",
            "date": "2026-04-20",
        },
    )
    client.post(
        "/expenses",
        json={
            "amount": "120.00",
            "category": "Food",
            "description": "Dinner",
            "date": "2026-04-21",
        },
    )

    response = client.get("/expenses?category=Food")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["category"] == "Food"


def test_sort_by_date_desc() -> None:
    client.post(
        "/expenses",
        json={
            "amount": "50.00",
            "category": "Bills",
            "description": "Internet",
            "date": "2026-04-01",
        },
    )
    client.post(
        "/expenses",
        json={
            "amount": "75.00",
            "category": "Bills",
            "description": "Electricity",
            "date": "2026-04-10",
        },
    )

    response = client.get("/expenses?sort=date_desc")
    assert response.status_code == 200
    items = response.json()
    assert items[0]["date"] == "2026-04-10"
    assert items[1]["date"] == "2026-04-01"
