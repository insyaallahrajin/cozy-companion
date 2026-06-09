import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth.functions";

export function useCurrentUser() {
  const fetchUser = useServerFn(getCurrentUser);
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => fetchUser(),
    staleTime: 60_000,
  });
}
