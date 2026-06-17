import type {
  ActionRecommendation,
  DashboardSummary,
  DatasetInfo,
  DatasetPreview,
  ForecastResponse,
  InventoryProduct,
  PurchaseOrderDraft,
  ScenarioRequest,
  ScenarioResponse,
} from "./types";
import { offlineResponse } from "./mockData";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
      ...options,
    });
  } catch (caught) {
    const fallback = offlineResponse<T>(path, options);
    if (fallback) return fallback;
    throw caught;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.detail === "string"
        ? payload.detail
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  activeDataset: () => request<DatasetInfo>("/datasets/active"),
  activeDatasetPreview: (limit = 8) =>
    request<DatasetPreview>(`/datasets/active/preview?limit=${limit}`),
  importDataset: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request<DatasetInfo>("/datasets/import", {
      method: "POST",
      body: data,
    });
  },
  resetDataset: () =>
    request<DatasetInfo>("/datasets/reset", { method: "POST" }),
  summary: () => request<DashboardSummary>("/dashboard/summary"),
  products: () => request<InventoryProduct[]>("/products"),
  actions: () => request<ActionRecommendation[]>("/actions"),
  createDraft: (actionId: string) =>
    request<PurchaseOrderDraft>(`/actions/${actionId}/draft`, {
      method: "POST",
    }),
  forecast: (productId: string, horizon: number) =>
    request<ForecastResponse>(`/forecast/${productId}?horizon=${horizon}`),
  scenario: (payload: ScenarioRequest) =>
    request<ScenarioResponse>("/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
