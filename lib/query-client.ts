"use client";
import { QueryClient } from "@tanstack/react-query";
import { shouldRetry } from "./api-client";

let browserClient: QueryClient | undefined;

/** Single shared client for the browser session (never recreated per render). */
export function getQueryClient(): QueryClient {
  if (!browserClient) {
    browserClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          retry: shouldRetry,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return browserClient;
}
