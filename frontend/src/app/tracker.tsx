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

  return (
    <main className="container">
      <h1>Expense Tracker</h1>

      <section className="panel">
        <h2>Add Expense</h2>
        <form className="expense-form" onSubmit={handleSubmit}>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          <label>
            Category
            <input
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            />
          </label>
          <label>
            Description
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label>
            Filter by category
            <select
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
          <label>
            Sort
            <select value={sortOrder} onChange={(event) => void handleSortChange(event.target.value)}>
              <option value="date_desc">Date (newest first)</option>
            </select>
          </label>
        </div>

        <p className="total">Total: ₹{totalAmount.toFixed(2)}</p>

        {errorMessage ? <p className="error">{errorMessage}</p> : null}
        {pendingRetry ? (
          <button type="button" onClick={handleRetrySubmission} disabled={isSubmitting}>
            Retry last submission
          </button>
        ) : null}

        {isLoading ? (
          <p>Loading expenses...</p>
        ) : hasExpenses ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.category}</td>
                  <td>{expense.description}</td>
                  <td>₹{Number(expense.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No expenses found.</p>
        )}
      </section>
    </main>
  );
}
