"use client";

import { FormEvent, useMemo, useState } from "react";

export type Expense = {
  id: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  created_at: string;
};

type ExpensePayload = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

type Props = {
  initialExpenses: Expense[];
  apiBaseUrl: string;
};

export default function ExpenseTracker({ initialExpenses, apiBaseUrl }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRetry, setPendingRetry] = useState<{
    payload: ExpensePayload;
    key: string;
  } | null>(null);

  const categories = useMemo(() => {
    const values = Array.from(new Set(expenses.map((expense) => expense.category)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses]
  );

  async function fetchExpenses(categoryValue: string, sortValue: string) {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams({ sort: sortValue });
    if (categoryValue) {
      params.set("category", categoryValue);
    }

    try {
      const response = await fetch(`${apiBaseUrl}/expenses?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load expenses.");
      }
      const data = (await response.json()) as Expense[];
      setExpenses(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load expenses."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function submitExpense(payload: ExpensePayload, key: string) {
    const response = await fetch(`${apiBaseUrl}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payloadError = (await response.json().catch(() => null)) as
        | { detail?: string }
        | null;
      throw new Error(payloadError?.detail ?? "Unable to save expense.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const payload: ExpensePayload = {
      amount,
      category: category.trim(),
      description: description.trim(),
      date: expenseDate,
    };

    const retryKey = crypto.randomUUID();
    setPendingRetry({ payload, key: retryKey });
    setIsSubmitting(true);

    try {
      await submitExpense(payload, retryKey);
      setAmount("");
      setCategory("");
      setDescription("");
      setExpenseDate("");
      setPendingRetry(null);
      await fetchExpenses(filterCategory, sortOrder);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${error.message} Please retry submission.`
          : "Unable to save expense. Please retry submission."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetrySubmission() {
    if (!pendingRetry) {
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await submitExpense(pendingRetry.payload, pendingRetry.key);
      setPendingRetry(null);
      await fetchExpenses(filterCategory, sortOrder);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Retry request failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFilterChange(value: string) {
    setFilterCategory(value);
    await fetchExpenses(value, sortOrder);
  }

  async function handleSortChange(value: string) {
    setSortOrder(value);
    await fetchExpenses(filterCategory, value);
  }

  const hasExpenses = expenses.length > 0;
  const inputClassName =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-lg shadow-blue-100/40 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Personal Finance
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Expense Tracker
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Add expenses, filter by category, and track your visible total in real time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Add Expense</h2>
          <form className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="text-sm font-medium text-slate-700">
            Amount
            <input
              className={inputClassName}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Category
            <input
              className={inputClassName}
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <input
              className={inputClassName}
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Date
            <input
              className={inputClassName}
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
            />
          </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
            {isSubmitting ? "Saving..." : "Add Expense"}
          </button>
        </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md lg:col-span-3">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="text-sm font-medium text-slate-700">
            Filter by category
            <select
              className={inputClassName}
              value={filterCategory}
              onChange={(event) => void handleFilterChange(event.target.value)}
            >
              <option value="">All</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
            <label className="text-sm font-medium text-slate-700">
            Sort
            <select
              className={inputClassName}
              value={sortOrder}
              onChange={(event) => void handleSortChange(event.target.value)}
            >
              <option value="date_desc">Date (newest first)</option>
            </select>
          </label>
        </div>

          <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow">
            <p className="text-xs uppercase tracking-wider text-blue-100">Visible Total</p>
            <p className="mt-1 text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
          </div>

        {errorMessage ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
        ) : null}
        {pendingRetry ? (
            <button
              type="button"
              onClick={handleRetrySubmission}
              disabled={isSubmitting}
              className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            >
            Retry last submission
          </button>
        ) : null}

        {isLoading ? (
            <p className="mt-5 text-sm text-slate-600">Loading expenses...</p>
        ) : hasExpenses ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="transition hover:bg-blue-50/60">
                      <td className="px-4 py-3 text-sm text-slate-700">{expense.date}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{expense.description}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        ₹{Number(expense.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No expenses found for the current filter.
            </div>
        )}
        </section>
      </div>
    </main>
  );
}
