import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { avatarPath } from "@/lib/avatar";
import { supabase } from "@/lib/supabase";
import { CALENDAR_KEY, type Person } from "@/lib/queries/sessions";

export type Account = Person & { email: string; approved: boolean };

const ACCOUNTS_KEY = ["accounts"];

/** Only the administrator account may promote coaches and delete accounts. */
export function useIsAdmin() {
  const userId = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data === true;
    },
    enabled: !!userId,
  });
}

/** Every account with its email. Refused by the database to anyone but the administrator. */
export function useAccounts(enabled: boolean) {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_accounts");
      if (error) throw error;
      return data as Account[];
    },
    enabled,
  });
}

// The calendar also shows names and roles. Returned so that a mutation stays
// pending until the lists are fresh.
function refreshLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
    queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
  ]);
}

export function usePromoteToCoach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<Person> => {
      const { data, error } = await supabase.rpc("promote_to_coach", { p_email: email });
      if (error) throw new Error(error.message);
      const row = (data as { id: string; full_name: string | null }[])[0];
      return { id: row.id, full_name: row.full_name, role: "coach" };
    },
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useApproveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("approve_account", { p_user_id: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      // Their photo would otherwise stay public in storage. Nothing to remove is fine.
      await supabase.storage.from("avatars").remove([avatarPath(userId)]);
      const { error } = await supabase.rpc("delete_account", { p_user_id: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => refreshLists(queryClient),
  });
}
