from fastapi import FastAPI

from .db import Base, engine
from .routes.expenses import router as expenses_router

app = FastAPI(title="Expense Tracker API")
Base.metadata.create_all(bind=engine)
app.include_router(expenses_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
