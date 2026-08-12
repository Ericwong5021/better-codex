export type PublisherProvider = "postiz" | "aitoearn";

export type PublisherMedia = {
  url: string;
  id?: string;
};

export type PublisherTarget = {
  account_id: string;
  platform: string;
  content?: string;
  title?: string;
  media?: PublisherMedia[];
  settings?: Record<string, unknown>;
};

export type PublisherRequest = {
  provider: PublisherProvider;
  mode: "now" | "schedule";
  publish_at: string;
  content: string;
  title?: string;
  media?: PublisherMedia[];
  targets: PublisherTarget[];
};

export type PublisherTask = {
  id: string;
  platform: string;
  account_id: string;
  status: string;
  public_url: string | null;
  published_at: string | null;
  error: string | null;
};

export type PublisherSubmission = {
  provider: PublisherProvider;
  submission_id: string;
  tasks: PublisherTask[];
};

type PublisherConfiguration = {
  provider: PublisherProvider;
  base_url: string;
  configured: boolean;
};

function cleanBaseUrl(value: string, fallback: string) {
  const baseUrl = (value.trim() || fallback).replace(/\/+$/, "");
  const parsed = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("publisher_base_url_invalid");
  return baseUrl;
}

function isoDate(value: string, error: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error(error);
  return new Date(timestamp).toISOString();
}

function requiredString(value: unknown, error: string, maximum = 100000) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) throw new Error(error);
  return value.trim();
}

function optionalString(value: unknown, error: string, maximum = 100000) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw new Error(error);
  return value.trim() || undefined;
}

function mediaList(value: unknown, error: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) throw new Error(error);
  return value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(error);
    const media = item as Record<string, unknown>;
    const url = requiredString(media.url, error, 4096);
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(error);
    return { url, id: optionalString(media.id, error, 500) };
  });
}

function objectValue(value: unknown, error: string) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(error);
  return value as Record<string, unknown>;
}

export function publisherRequest(value: Record<string, unknown>): PublisherRequest {
  const provider = value.provider;
  if (provider !== "postiz" && provider !== "aitoearn") throw new Error("publisher_provider_invalid");
  const mode = value.mode;
  if (mode !== "now" && mode !== "schedule") throw new Error("publisher_mode_invalid");
  if (!Array.isArray(value.targets) || value.targets.length < 1 || value.targets.length > 20) throw new Error("publisher_targets_invalid");
  const content = requiredString(value.content, "publisher_content_required");
  const title = optionalString(value.title, "publisher_title_invalid", 500);
  const media = mediaList(value.media, "publisher_media_invalid");
  const targets = value.targets.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("publisher_targets_invalid");
    const target = item as Record<string, unknown>;
    return {
      account_id: requiredString(target.account_id, "publisher_account_required", 300),
      platform: requiredString(target.platform, "publisher_platform_required", 100),
      content: optionalString(target.content, "publisher_content_invalid"),
      title: optionalString(target.title, "publisher_title_invalid", 500),
      media: mediaList(target.media, "publisher_media_invalid"),
      settings: objectValue(target.settings, "publisher_settings_invalid"),
    };
  });
  return { provider, mode, publish_at: isoDate(requiredString(value.publish_at, "publisher_publish_at_required", 100), "publisher_publish_at_invalid"), content, title, media, targets };
}

function configuration(provider: PublisherProvider): PublisherConfiguration {
  if (provider === "postiz") return {
    provider,
    base_url: cleanBaseUrl(process.env.BETTER_CODEX_POSTIZ_URL || "", "https://api.postiz.com/public/v1"),
    configured: Boolean(process.env.BETTER_CODEX_POSTIZ_API_KEY?.trim()),
  };
  return {
    provider,
    base_url: cleanBaseUrl(process.env.BETTER_CODEX_AITOEARN_URL || "", "http://127.0.0.1:3000"),
    configured: Boolean(process.env.BETTER_CODEX_AITOEARN_API_KEY?.trim()),
  };
}

export function listPublisherConfigurations() {
  return [configuration("postiz"), configuration("aitoearn")];
}

function apiKey(provider: PublisherProvider) {
  const value = provider === "postiz" ? process.env.BETTER_CODEX_POSTIZ_API_KEY : process.env.BETTER_CODEX_AITOEARN_API_KEY;
  if (!value?.trim()) throw new Error("publisher_not_configured");
  return value.trim();
}

async function responseJson(response: Response) {
  const value = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(`publisher_http_${response.status}`);
  return value;
}

function aitoearnData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("publisher_response_invalid");
  const envelope = value as Record<string, unknown>;
  if (envelope.code !== undefined && envelope.code !== 0 && envelope.code !== "0") throw new Error("publisher_remote_rejected");
  const data = envelope.data ?? value;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("publisher_response_invalid");
  return data as Record<string, unknown>;
}

function taskFromAitoearn(value: unknown): PublisherTask | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : "";
  const platform = typeof item.platform === "string" ? item.platform : "";
  const accountId = typeof item.accountId === "string" ? item.accountId : "";
  if (!id || !platform) return null;
  const publicUrl = typeof item.workLink === "string" && /^https:\/\//i.test(item.workLink) ? item.workLink : null;
  const publishedAtValue = typeof item.publishTime === "string" && !Number.isNaN(Date.parse(item.publishTime)) ? new Date(item.publishTime).toISOString() : null;
  return { id, platform, account_id: accountId, status: String(item.status ?? "queued"), public_url: publicUrl, published_at: publicUrl ? publishedAtValue : null, error: typeof item.errorMsg === "string" ? item.errorMsg : null };
}

async function submitAitoearn(request: PublisherRequest): Promise<PublisherSubmission> {
  const baseUrl = configuration("aitoearn").base_url;
  const flowId = globalThis.crypto.randomUUID();
  const response = await fetch(`${baseUrl}/v2/channels/publish/flows`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey("aitoearn") },
    body: JSON.stringify({
      flowId,
      content: {
        title: request.title,
        body: request.content,
        media: (request.media || []).map(item => ({ url: item.url, options: {} })),
      },
      publishAt: request.mode === "now" ? new Date().toISOString() : request.publish_at,
      context: { taskId: flowId, source: "api" },
      items: request.targets.map(target => ({
        accountId: target.account_id,
        platform: target.platform,
        option: target.settings,
        overrides: target.content || target.title || target.media ? {
          title: target.title,
          body: target.content,
          media: target.media?.map(item => ({ url: item.url, options: {} })),
        } : undefined,
      })),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = aitoearnData(await responseJson(response));
  const submissionId = typeof data.flowId === "string" ? data.flowId : flowId;
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(taskFromAitoearn).filter((item): item is PublisherTask => Boolean(item)) : [];
  if (!tasks.length) throw new Error("publisher_response_invalid");
  return { provider: "aitoearn", submission_id: submissionId, tasks };
}

async function refreshAitoearn(submissionId: string): Promise<PublisherSubmission> {
  const baseUrl = configuration("aitoearn").base_url;
  const response = await fetch(`${baseUrl}/v2/channels/publish/flows/${encodeURIComponent(submissionId)}`, {
    headers: { "x-api-key": apiKey("aitoearn") },
    signal: AbortSignal.timeout(30000),
  });
  const data = aitoearnData(await responseJson(response));
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(taskFromAitoearn).filter((item): item is PublisherTask => Boolean(item)) : [];
  if (!tasks.length) throw new Error("publisher_response_invalid");
  return { provider: "aitoearn", submission_id: submissionId, tasks };
}

type PostizCreateResult = { postId: string; integration: string };

function postizCreateResults(value: unknown): PostizCreateResult[] {
  if (!Array.isArray(value)) throw new Error("publisher_response_invalid");
  const results = value.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    return typeof row.postId === "string" && typeof row.integration === "string" ? [{ postId: row.postId, integration: row.integration }] : [];
  });
  if (!results.length) throw new Error("publisher_response_invalid");
  return results;
}

async function submitPostiz(request: PublisherRequest): Promise<PublisherSubmission> {
  const baseUrl = configuration("postiz").base_url;
  const postizMedia = request.targets.flatMap(target => target.media || request.media || []);
  if (postizMedia.some(item => !item.id)) throw new Error("publisher_postiz_media_id_required");
  const response = await fetch(`${baseUrl}/posts`, {
    method: "POST",
    headers: { authorization: apiKey("postiz"), "content-type": "application/json" },
    body: JSON.stringify({
      type: request.mode,
      date: request.publish_at,
      shortLink: false,
      tags: [],
      posts: request.targets.map(target => ({
        integration: { id: target.account_id },
        value: [{
          content: target.content || request.content,
          image: (target.media || request.media || []).map(item => ({ id: item.id, path: item.url })),
        }],
        settings: { ...(target.settings || {}), __type: target.platform, ...(["youtube", "medium", "devto", "hashnode", "wordpress", "dribbble"].includes(target.platform) && (target.title || request.title) ? { title: target.title || request.title } : {}) },
      })),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const results = postizCreateResults(await responseJson(response));
  const targetByAccount = new Map(request.targets.map(target => [target.account_id, target]));
  return {
    provider: "postiz",
    submission_id: results.map(item => item.postId).join(","),
    tasks: results.map(item => ({ id: item.postId, platform: targetByAccount.get(item.integration)?.platform || "unknown", account_id: item.integration, status: request.mode === "now" ? "publishing" : "scheduled", public_url: null, published_at: null, error: null })),
  };
}

async function refreshPostiz(submissionId: string): Promise<PublisherSubmission> {
  const baseUrl = configuration("postiz").base_url;
  const postIds = new Set(submissionId.split(",").map(item => item.trim()).filter(Boolean));
  if (!postIds.size) throw new Error("publisher_submission_invalid");
  const endDate = new Date(Date.now() + 365 * 86400000).toISOString();
  const startDate = new Date(Date.now() - 365 * 86400000).toISOString();
  const url = new URL(`${baseUrl}/posts`);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  const response = await fetch(url, { headers: { authorization: apiKey("postiz") }, signal: AbortSignal.timeout(30000) });
  const value = await responseJson(response);
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray((value as Record<string, unknown>).posts)) throw new Error("publisher_response_invalid");
  const tasks = ((value as Record<string, unknown>).posts as unknown[]).flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    if (!postIds.has(id)) return [];
    const integration = row.integration && typeof row.integration === "object" && !Array.isArray(row.integration) ? row.integration as Record<string, unknown> : {};
    const publicUrl = typeof row.releaseURL === "string" && /^https:\/\//i.test(row.releaseURL) ? row.releaseURL : null;
    const publishedAt = typeof row.publishDate === "string" && !Number.isNaN(Date.parse(row.publishDate)) ? new Date(row.publishDate).toISOString() : null;
    return [{ id, platform: typeof integration.providerIdentifier === "string" ? integration.providerIdentifier : "unknown", account_id: typeof integration.id === "string" ? integration.id : "", status: publicUrl ? "published" : "pending", public_url: publicUrl, published_at: publicUrl ? publishedAt : null, error: null } satisfies PublisherTask];
  });
  if (!tasks.length) throw new Error("publisher_submission_not_found");
  return { provider: "postiz", submission_id: submissionId, tasks };
}

export function submitPublisher(request: PublisherRequest) {
  return request.provider === "postiz" ? submitPostiz(request) : submitAitoearn(request);
}

export function refreshPublisher(provider: PublisherProvider, submissionId: string) {
  return provider === "postiz" ? refreshPostiz(submissionId) : refreshAitoearn(submissionId);
}
