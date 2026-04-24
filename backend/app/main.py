from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routes.expenses import router as expenses_router

app = FastAPI(title="Expense Tracker API")
Base.metadata.create_all(bind=engine)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(expenses_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
