import hashlib
import json
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Expense, IdempotencyRecord
from ..schemas import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _request_hash(payload: ExpenseCreate) -> str:
    canonical = json.dumps(payload.model_dump(mode="json"), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    response: Response,
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    request_hash = _request_hash(payload)

    if idempotency_key:
        existing = (
            db.query(IdempotencyRecord)
            .filter(IdempotencyRecord.key == idempotency_key)
            .first()
        )

        if existing:
            if existing.request_hash != request_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key already used with a different payload.",
                )

            expense = db.query(Expense).filter(Expense.id == existing.expense_id).first()
            if expense is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Stored idempotency record references missing expense.",
                )
            response.status_code = status.HTTP_200_OK
            return expense

    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.flush()

    if idempotency_key:
        db.add(
            IdempotencyRecord(
                key=idempotency_key, request_hash=request_hash, expense_id=expense.id
            )
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Retry-safe fallback when concurrent requests race on same idempotency key.
        if not idempotency_key:
            raise

        existing = (
            db.query(IdempotencyRecord)
            .filter(IdempotencyRecord.key == idempotency_key)
            .first()
        )
        if not existing or existing.request_hash != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key already used with a different payload.",
            )
        expense = db.query(Expense).filter(Expense.id == existing.expense_id).first()
        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stored idempotency record references missing expense.",
            )
        response.status_code = status.HTTP_200_OK
        return expense

    db.refresh(expense)
    return expense


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    db: Session = Depends(get_db),
    category: str | None = None,
    sort: Literal["date_desc"] | None = None,
):
    query = db.query(Expense)

    if category:
        query = query.filter(Expense.category == category)

    if sort == "date_desc":
        query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
    else:
        query = query.order_by(Expense.created_at.desc())

    return query.all()
