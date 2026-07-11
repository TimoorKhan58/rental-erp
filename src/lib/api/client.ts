import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiConfig } from "@/config/api";
import type {
  ErrorApiResponse,
  SuccessApiResponse,
} from "@/types/api";
import { ApiClientError } from "./types";

function normalizeAxiosError(error: AxiosError<ErrorApiResponse>): ApiClientError {
  const response = error.response;
  const apiError = response?.data?.error;

  if (apiError) {
    return new ApiClientError({
      message: apiError.message,
      code: apiError.code,
      status: response?.status ?? 500,
      details: apiError.details,
      requestId: response?.data.requestId,
    });
  }

  if (error.code === "ECONNABORTED") {
    return new ApiClientError({
      message: "Request timed out. Please try again.",
      code: "REQUEST_TIMEOUT",
      status: 408,
    });
  }

  return new ApiClientError({
    message: error.message || "An unexpected network error occurred.",
    code: "NETWORK_ERROR",
    status: response?.status ?? 0,
  });
}

function attachRequestInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers.set("Accept", "application/json");

    if (config.data !== undefined && !config.headers.has("Content-Type")) {
      config.headers.set("Content-Type", "application/json");
    }

    return config;
  });
}

function attachResponseInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<ErrorApiResponse>) => {
      throw normalizeAxiosError(error);
    },
  );
}

export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: apiConfig.baseUrl,
    timeout: apiConfig.timeout,
    withCredentials: apiConfig.withCredentials,
    headers: {
      Accept: "application/json",
    },
  });

  attachRequestInterceptor(instance);
  attachResponseInterceptor(instance);

  return instance;
}

export const apiClient = createApiClient();

export function unwrapApiResponse<T>(response: AxiosResponse<SuccessApiResponse<T>>): T {
  return response.data.data;
}
