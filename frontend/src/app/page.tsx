import ExpenseTracker, { Expense } from "./tracker";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function getInitialExpenses(): Promise<Expense[]> {
  const response = await fetch(`${API_BASE_URL}/expenses?sort=date_desc`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  return (await response.json()) as Expense[];
}

export default async function Home() {
  const initialExpenses = await getInitialExpenses();
  return (
    <ExpenseTracker initialExpenses={initialExpenses} apiBaseUrl={API_BASE_URL} />
  );
}
