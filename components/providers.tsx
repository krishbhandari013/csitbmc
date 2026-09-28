"use client";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { getQueryClient } from "@/lib/query-client";

// Devtools are lazy-loaded and rendered in development only,
// so they never weigh down the production bundle.
const ReactQueryDevtools = dynamic(
  () => import("@tanstack/react-query-devtools").then((m) => m.ReactQueryDevtools),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
