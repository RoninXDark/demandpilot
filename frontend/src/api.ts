import type {
  DashboardSummary,
  ForecastResponse,
  InventoryProduct,
  ScenarioRequest,
  ScenarioResponse,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  summary: () => request<DashboardSummary>("/dashboard/summary"),
  products: () => request<InventoryProduct[]>("/products"),
  forecast: (productId: string, horizon: number) =>
    request<ForecastResponse>(`/forecast/${productId}?horizon=${horizon}`),
  scenario: (payload: ScenarioRequest) =>
    request<ScenarioResponse>("/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
