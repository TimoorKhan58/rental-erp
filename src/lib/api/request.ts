import type { AxiosResponse } from "axios";
import type { SuccessApiResponse } from "@/types/api";
import { apiClient, unwrapApiResponse } from "./client";
import type { RequestOptions } from "./types";

function buildAxiosConfig(options: RequestOptions = {}) {
  const { params, signal, headers, data, method } = options;

  return {
    method,
    params,
    signal,
    headers,
    data,
  };
}

export async function apiGet<T>(
  url: string,
  options: Omit<RequestOptions, "method" | "data"> = {},
): Promise<T> {
  const response: AxiosResponse<SuccessApiResponse<T>> = await apiClient.get(
    url,
    buildAxiosConfig({ ...options, method: "GET" }),
  );

  return unwrapApiResponse(response);
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  options: Omit<RequestOptions, "method" | "data"> = {},
): Promise<T> {
  const response: AxiosResponse<SuccessApiResponse<T>> = await apiClient.post(
    url,
    data,
    buildAxiosConfig({ ...options, method: "POST", data }),
  );

  return unwrapApiResponse(response);
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  options: Omit<RequestOptions, "method" | "data"> = {},
): Promise<T> {
  const response: AxiosResponse<SuccessApiResponse<T>> = await apiClient.put(
    url,
    data,
    buildAxiosConfig({ ...options, method: "PUT", data }),
  );

  return unwrapApiResponse(response);
}

export async function apiPatch<T>(
  url: string,
  data?: unknown,
  options: Omit<RequestOptions, "method" | "data"> = {},
): Promise<T> {
  const response: AxiosResponse<SuccessApiResponse<T>> = await apiClient.patch(
    url,
    data,
    buildAxiosConfig({ ...options, method: "PATCH", data }),
  );

  return unwrapApiResponse(response);
}

export async function apiDelete<T>(
  url: string,
  options: Omit<RequestOptions, "method" | "data"> = {},
): Promise<T> {
  const response: AxiosResponse<SuccessApiResponse<T>> = await apiClient.delete(
    url,
    buildAxiosConfig({ ...options, method: "DELETE" }),
  );

  return unwrapApiResponse(response);
}
