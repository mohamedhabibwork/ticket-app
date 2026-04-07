import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@ticket-app/api/routers/index";
import { env } from "@ticket-app/env/native";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

export const link = new RPCLink({
  url: `${env.EXPO_PUBLIC_SERVER_URL}/rpc`,
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
