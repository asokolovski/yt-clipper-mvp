import { Client, Connection } from "@temporalio/client";

import { getRequiredEnvironmentVariable } from "../config/env.js";

const temporalNamespace = "default";

let sharedTemporalClientPromise: Promise<Client> | undefined;

export async function createTemporalClient(): Promise<{
  client: Client;
  connection: Connection;
}> {
  const connection = await Connection.connect({
    address: getRequiredEnvironmentVariable("TEMPORAL_ADDRESS"),
  });

  const client = new Client({
    connection,
    namespace: temporalNamespace,
  });

  return { client, connection };
}

export function getTemporalClient(): Promise<Client> {
  if (!sharedTemporalClientPromise) {
    sharedTemporalClientPromise = createTemporalClient()
      .then(({ client }) => client)
      .catch((error: unknown) => {
        sharedTemporalClientPromise = undefined;
        throw error;
      });
  }

  return sharedTemporalClientPromise;
}
