/**
 * Tests for the CrosspostClient and platform adapters
 */

// Mock every-plugin/zod
jest.mock("every-plugin/zod", () => {
  const mockZodType: any = {
    parse: jest.fn(),
    safeParse: jest.fn(() => ({ success: true, data: "test" })),
    optional: jest.fn(() => mockZodType),
    max: jest.fn(() => mockZodType),
    min: jest.fn(() => mockZodType),
    url: jest.fn(() => mockZodType),
    email: jest.fn(() => mockZodType),
    refine: jest.fn(() => mockZodType),
  };

  return {
    z: {
      enum: jest.fn(() => mockZodType),
      object: jest.fn(() => mockZodType),
      string: jest.fn(() => mockZodType),
      array: jest.fn(() => mockZodType),
      number: jest.fn(() => mockZodType),
      optional: jest.fn(() => mockZodType),
      boolean: jest.fn(() => mockZodType),
      union: jest.fn(() => mockZodType),
      record: jest.fn(() => mockZodType),
      unknown: jest.fn(() => mockZodType),
    },
  };
});

import {
  CrosspostClient,
  TwitterAdapter,
  LinkedInAdapter,
  FacebookAdapter,
  InstagramAdapter,
  MastodonAdapter,
  BlueskyAdapter,
  type PlatformConfig,
  type PostContent,
} from "../src/client";

// Mock fetch globally
global.fetch = jest.fn();

describe("CrosspostClient", () => {
  let client: CrosspostClient;
  let mockPlatformConfigs: PlatformConfig[];

  beforeEach(() => {
    mockPlatformConfigs = [
      {
        platform: "twitter",
        enabled: true,
        credentials: {
          apiKey: "test-api-key",
          apiSecret: "test-api-secret",
          accessToken: "test-access-token",
          accessTokenSecret: "test-access-token-secret",
        },
      },
      {
        platform: "linkedin",
        enabled: true,
        credentials: {
          accessToken: "test-linkedin-token",
        },
      },
    ];

    client = new CrosspostClient(mockPlatformConfigs);
    (fetch as jest.Mock).mockClear();
  });

  describe("initialization", () => {
    it("should initialize with provided platform configurations", () => {
      expect(client.getSupportedPlatforms()).toEqual(["twitter", "linkedin"]);
    });

    it("should skip disabled platforms", () => {
      const configs = [
        ...mockPlatformConfigs,
        {
          platform: "facebook" as const,
          enabled: false,
          credentials: { accessToken: "test" },
        },
      ];

      const testClient = new CrosspostClient(configs);
      expect(testClient.getSupportedPlatforms()).toEqual([
        "twitter",
        "linkedin",
      ]);
    });
  });

  describe("postToAll", () => {
    const testContent: PostContent = {
      text: "Test post content",
      hashtags: ["test", "crosspost"],
      links: ["https://example.com"],
    };

    it("should post to all configured platforms", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "test-id" } }),
      });

      const results = await client.postToAll(testContent);

      expect(results).toHaveLength(2);
      expect(results[0].platform).toBe("twitter");
      expect(results[1].platform).toBe("linkedin");
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should post to specific platforms when provided", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "test-id" } }),
      });

      const results = await client.postToAll(testContent, ["twitter"]);

      expect(results).toHaveLength(1);
      expect(results[0].platform).toBe("twitter");
    });

    it("should handle platform not configured error", async () => {
      const results = await client.postToAll(testContent, ["facebook"]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("not configured");
    });
  });

  describe("scheduling", () => {
    const testContent: PostContent = {
      text: "Scheduled post content",
      hashtags: ["scheduled"],
    };

    it("should schedule a post", async () => {
      const scheduledAt = Date.now() + 60000; // 1 minute from now
      const scheduledPost = await client.schedulePost(
        testContent,
        ["twitter"],
        scheduledAt,
      );

      expect(scheduledPost.id).toBeDefined();
      expect(scheduledPost.content).toEqual(testContent);
      expect(scheduledPost.platforms).toEqual(["twitter"]);
      expect(scheduledPost.scheduledAt).toBe(scheduledAt);
      expect(scheduledPost.status).toBe("pending");
    });

    it("should retrieve scheduled posts", async () => {
      const scheduledAt = Date.now() + 60000;
      const scheduledPost = await client.schedulePost(
        testContent,
        ["twitter"],
        scheduledAt,
      );

      const posts = client.getScheduledPosts();
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe(scheduledPost.id);
    });

    it("should cancel a scheduled post", async () => {
      const scheduledAt = Date.now() + 60000;
      const scheduledPost = await client.schedulePost(
        testContent,
        ["twitter"],
        scheduledAt,
      );

      const cancelled = await client.cancelScheduledPost(scheduledPost.id);
      expect(cancelled).toBe(true);

      const post = client.getScheduledPost(scheduledPost.id);
      expect(post?.status).toBe("cancelled");
    });

    it("should execute a scheduled post", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "test-id" } }),
      });

      const scheduledAt = Date.now() + 60000;
      const scheduledPost = await client.schedulePost(
        testContent,
        ["twitter"],
        scheduledAt,
      );

      const executedPost = await client.executeScheduledPost(scheduledPost.id);
      expect(executedPost?.status).toBe("posted");
      expect(executedPost?.results).toBeDefined();
    });
  });

  describe("credential validation", () => {
    it("should validate all platform credentials", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const results = await client.validateAllCredentials();

      expect(results.twitter).toBe(true);
      expect(results.linkedin).toBe(true);
    });
  });
});

describe("TwitterAdapter", () => {
  let adapter: TwitterAdapter;

  beforeEach(() => {
    adapter = new TwitterAdapter({
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
      accessToken: "test-access-token",
      accessTokenSecret: "test-access-token-secret",
    });
    (fetch as jest.Mock).mockClear();
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should not be configured with missing credentials", () => {
    const invalidAdapter = new TwitterAdapter({});
    expect(invalidAdapter.isConfigured()).toBe(false);
  });

  it("should format content correctly", () => {
    const content: PostContent = {
      text: "Test tweet",
      hashtags: ["test", "twitter"],
    };

    const formatted = adapter.formatContent(content);
    expect(formatted.text).toBe("Test tweet #test #twitter");
  });

  it("should truncate long content", () => {
    const longText = "a".repeat(300);
    const content: PostContent = { text: longText };

    const formatted = adapter.formatContent(content);
    expect(formatted.text.length).toBeLessThanOrEqual(280);
    expect(formatted.text.endsWith("...")).toBe(true);
  });

  it("should return character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(280);
  });

  it("should post successfully", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "tweet-123" } }),
    });

    const content: PostContent = { text: "Test tweet" };
    const result = await adapter.post(content);

    expect(result.success).toBe(true);
    expect(result.platform).toBe("twitter");
    expect(result.postId).toBe("tweet-123");
  });

  it("should handle post failure", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Invalid credentials" }),
    });

    const content: PostContent = { text: "Test tweet" };
    const result = await adapter.post(content);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Twitter API error");
  });
});

describe("LinkedInAdapter", () => {
  let adapter: LinkedInAdapter;

  beforeEach(() => {
    adapter = new LinkedInAdapter({
      accessToken: "test-linkedin-token",
    });
    (fetch as jest.Mock).mockClear();
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should format content for LinkedIn", () => {
    const content: PostContent = {
      text: "Professional update",
      hashtags: ["linkedin", "professional"],
    };

    const formatted = adapter.formatContent(content);
    expect(formatted.text).toBe(
      "Professional update\n\n#linkedin #professional",
    );
  });

  it("should return correct character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(3000);
  });

  it("should validate credentials", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true });

    const isValid = await adapter.validateCredentials();
    expect(isValid).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/people/~",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-linkedin-token",
        }),
      }),
    );
  });
});

describe("FacebookAdapter", () => {
  let adapter: FacebookAdapter;

  beforeEach(() => {
    adapter = new FacebookAdapter({
      accessToken: "test-facebook-token",
      pageId: "test-page-id",
    });
    (fetch as jest.Mock).mockClear();
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should not be configured without page ID", () => {
    const invalidAdapter = new FacebookAdapter({ accessToken: "token" });
    expect(invalidAdapter.isConfigured()).toBe(false);
  });

  it("should return correct character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(63206);
  });
});

describe("InstagramAdapter", () => {
  let adapter: InstagramAdapter;

  beforeEach(() => {
    adapter = new InstagramAdapter({
      accessToken: "test-instagram-token",
      instagramAccountId: "test-account-id",
    });
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should return correct character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(2200);
  });
});

describe("MastodonAdapter", () => {
  let adapter: MastodonAdapter;

  beforeEach(() => {
    adapter = new MastodonAdapter({
      accessToken: "test-mastodon-token",
      instanceUrl: "https://mastodon.social",
    });
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should use default instance URL", () => {
    const defaultAdapter = new MastodonAdapter({
      accessToken: "test-token",
    });
    expect(defaultAdapter.isConfigured()).toBe(true);
  });

  it("should return correct character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(500);
  });
});

describe("BlueskyAdapter", () => {
  let adapter: BlueskyAdapter;

  beforeEach(() => {
    adapter = new BlueskyAdapter({
      identifier: "test.bsky.social",
      password: "test-password",
    });
    (fetch as jest.Mock).mockClear();
  });

  it("should be configured with valid credentials", () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it("should return correct character limit", () => {
    expect(adapter.getCharacterLimit()).toBe(300);
  });

  it("should validate credentials and store JWT", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessJwt: "test-jwt-token" }),
    });

    const isValid = await adapter.validateCredentials();
    expect(isValid).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "test.bsky.social",
          password: "test-password",
        }),
      }),
    );
  });
});







