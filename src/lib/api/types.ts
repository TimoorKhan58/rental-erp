import type { AxiosRequestConfig } from "axios";
import type { ApiRequestConfig } from "@/types/api";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(options: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = ApiRequestConfig & {
  method?: HttpMethod;
  data?: unknown;
};

export type AxiosRequestOptions = AxiosRequestConfig & {
  skipErrorNormalization?: boolean;
};
