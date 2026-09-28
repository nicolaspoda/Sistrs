import { QueryClient } from "@tanstack/react-query";

// Client TanStack Query partagé par toute l'app.
// - retry: 1 → une seule retentative en cas d'échec (évite de matraquer
//   Supabase sur des erreurs non transitoires comme une policy RLS).
// - staleTime: 5 min → les données sont considérées fraîches assez
//   longtemps pour limiter les refetch inutiles sur une app mobile.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
