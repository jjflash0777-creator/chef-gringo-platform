import "server-only";

const BUFFER_ENDPOINT = "https://api.buffer.com";

type BufferGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export type BufferChannel = {
  id: string;
  name: string;
  service: string;
};

export type BufferScheduledPost = {
  id: string;
  text: string | null;
  dueAt: string | null;
  channelId: string;
};

function apiKey() {
  const value = process.env.BUFFER_API_KEY?.trim();
  if (!value) throw new Error("BUFFER_API_KEY is not configured.");
  return value;
}

async function bufferGraphQl<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(BUFFER_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const body = await response.json() as BufferGraphQlResponse<T>;
  if (!response.ok) throw new Error(`Buffer API returned HTTP ${response.status}.`);
  if (body.errors?.length) {
    throw new Error(body.errors.map((item) => item.message || "Unknown Buffer GraphQL error").join("; "));
  }
  if (!body.data) throw new Error("Buffer API returned no data.");
  return body.data;
}

export async function listBufferChannels(): Promise<BufferChannel[]> {
  const accountData = await bufferGraphQl<{
    account: { organizations: Array<{ id: string; name: string }> };
  }>(`
    query ChefGringoBufferOrganizations {
      account {
        organizations { id name }
      }
    }
  `);

  const preferredOrganizationId = process.env.BUFFER_ORGANIZATION_ID?.trim();
  const organization =
    accountData.account.organizations.find((item) => item.id === preferredOrganizationId) ??
    accountData.account.organizations[0];

  if (!organization) throw new Error("No Buffer organization is available to this API key.");

  const channelData = await bufferGraphQl<{
    channels: BufferChannel[];
  }>(`
    query ChefGringoBufferChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        service
      }
    }
  `, { organizationId: organization.id });

  return channelData.channels;
}

export async function pinterestBoardServiceId(channelId: string) {
  const configured = process.env.BUFFER_PINTEREST_BOARD_ID?.trim();
  if (configured) return configured;

  const data = await bufferGraphQl<{
    channel: {
      metadata: null | { boards?: Array<{ serviceId: string; name: string }> };
    };
  }>(`
    query ChefGringoPinterestBoard($channelId: ChannelId!) {
      channel(input: { id: $channelId }) {
        metadata {
          ... on PinterestMetadata {
            boards { serviceId name }
          }
        }
      }
    }
  `, { channelId });

  const preferredName = process.env.BUFFER_PINTEREST_BOARD_NAME?.trim().toLowerCase();
  const boards = data.channel.metadata?.boards ?? [];
  const board = preferredName
    ? boards.find((item) => item.name.toLowerCase() === preferredName)
    : boards[0];

  if (!board) throw new Error("No Pinterest board is available in Buffer.");
  return board.serviceId;
}

export async function createBufferScheduledPost(input: {
  channelId: string;
  text: string;
  dueAt: string;
  mediaUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<BufferScheduledPost> {
  const data = await bufferGraphQl<{
    createPost:
      | { post: BufferScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(`
    mutation ChefGringoCreateScheduledPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
            dueAt
            channelId
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `, {
    input: {
      text: input.text,
      channelId: input.channelId,
      schedulingType: "automatic",
      mode: "customScheduled",
      dueAt: input.dueAt,
      aiAssisted: true,
      assets: [{ image: { url: input.mediaUrl } }],
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });

  if ("message" in data.createPost && data.createPost.message) {
    throw new Error(data.createPost.message);
  }
  if (!("post" in data.createPost) || !data.createPost.post) {
    throw new Error("Buffer did not return the scheduled post.");
  }
  return data.createPost.post;
}
