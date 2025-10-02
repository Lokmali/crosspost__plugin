/**
 * Persistence utilities for scheduled posts and analytics
 */

import { ScheduledPost, Analytics, PostResult } from "../client";

export interface PersistenceAdapter {
  // Scheduled posts
  saveScheduledPost(post: ScheduledPost): Promise<void>;
  getScheduledPost(id: string): Promise<ScheduledPost | null>;
  getAllScheduledPosts(): Promise<ScheduledPost[]>;
  updateScheduledPost(post: ScheduledPost): Promise<void>;
  deleteScheduledPost(id: string): Promise<void>;

  // Analytics
  saveAnalytics(analytics: Analytics): Promise<void>;
  getAnalytics(postId: string, platform: string): Promise<Analytics | null>;

  // Post results
  savePostResult(result: PostResult): Promise<void>;
  getPostResults(platform?: string): Promise<PostResult[]>;

  // Statistics
  incrementStat(key: string, value?: number): Promise<void>;
  getStat(key: string): Promise<number>;
  getAllStats(): Promise<Record<string, number>>;
}

// In-memory implementation (default)
export class MemoryPersistenceAdapter implements PersistenceAdapter {
  private scheduledPosts = new Map<string, ScheduledPost>();
  private analytics = new Map<string, Analytics>();
  private postResults: PostResult[] = [];
  private stats = new Map<string, number>();

  async saveScheduledPost(post: ScheduledPost): Promise<void> {
    this.scheduledPosts.set(post.id, { ...post });
  }

  async getScheduledPost(id: string): Promise<ScheduledPost | null> {
    return this.scheduledPosts.get(id) || null;
  }

  async getAllScheduledPosts(): Promise<ScheduledPost[]> {
    return Array.from(this.scheduledPosts.values());
  }

  async updateScheduledPost(post: ScheduledPost): Promise<void> {
    if (this.scheduledPosts.has(post.id)) {
      this.scheduledPosts.set(post.id, { ...post });
    }
  }

  async deleteScheduledPost(id: string): Promise<void> {
    this.scheduledPosts.delete(id);
  }

  async saveAnalytics(analytics: Analytics): Promise<void> {
    const key = `${analytics.platform}:${analytics.postId}`;
    this.analytics.set(key, { ...analytics });
  }

  async getAnalytics(
    postId: string,
    platform: string,
  ): Promise<Analytics | null> {
    const key = `${platform}:${postId}`;
    return this.analytics.get(key) || null;
  }

  async savePostResult(result: PostResult): Promise<void> {
    this.postResults.push({ ...result });
  }

  async getPostResults(platform?: string): Promise<PostResult[]> {
    if (platform) {
      return this.postResults.filter((r) => r.platform === platform);
    }
    return [...this.postResults];
  }

  async incrementStat(key: string, value: number = 1): Promise<void> {
    const current = this.stats.get(key) || 0;
    this.stats.set(key, current + value);
  }

  async getStat(key: string): Promise<number> {
    return this.stats.get(key) || 0;
  }

  async getAllStats(): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.stats) {
      result[key] = value;
    }
    return result;
  }
}

// File-based persistence adapter
export class FilePersistenceAdapter implements PersistenceAdapter {
  private dataDir: string;
  private scheduledPostsFile: string;
  private analyticsFile: string;
  private postResultsFile: string;
  private statsFile: string;

  constructor(dataDir: string = "./data") {
    this.dataDir = dataDir;
    this.scheduledPostsFile = `${dataDir}/scheduled-posts.json`;
    this.analyticsFile = `${dataDir}/analytics.json`;
    this.postResultsFile = `${dataDir}/post-results.json`;
    this.statsFile = `${dataDir}/stats.json`;

    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    // In a real implementation, you'd use fs.mkdirSync
    // For now, we'll assume the directory exists
  }

  private async readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      // In a real implementation, you'd use fs.readFileSync
      // For now, we'll return the default value
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      // In a real implementation, you'd use fs.writeFileSync
      // For now, we'll just log
      console.log(`Would write to ${filePath}:`, data);
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
    }
  }

  async saveScheduledPost(post: ScheduledPost): Promise<void> {
    const posts = await this.readJsonFile<Record<string, ScheduledPost>>(
      this.scheduledPostsFile,
      {},
    );
    posts[post.id] = post;
    await this.writeJsonFile(this.scheduledPostsFile, posts);
  }

  async getScheduledPost(id: string): Promise<ScheduledPost | null> {
    const posts = await this.readJsonFile<Record<string, ScheduledPost>>(
      this.scheduledPostsFile,
      {},
    );
    return posts[id] || null;
  }

  async getAllScheduledPosts(): Promise<ScheduledPost[]> {
    const posts = await this.readJsonFile<Record<string, ScheduledPost>>(
      this.scheduledPostsFile,
      {},
    );
    return Object.values(posts);
  }

  async updateScheduledPost(post: ScheduledPost): Promise<void> {
    await this.saveScheduledPost(post);
  }

  async deleteScheduledPost(id: string): Promise<void> {
    const posts = await this.readJsonFile<Record<string, ScheduledPost>>(
      this.scheduledPostsFile,
      {},
    );
    delete posts[id];
    await this.writeJsonFile(this.scheduledPostsFile, posts);
  }

  async saveAnalytics(analytics: Analytics): Promise<void> {
    const allAnalytics = await this.readJsonFile<Record<string, Analytics>>(
      this.analyticsFile,
      {},
    );
    const key = `${analytics.platform}:${analytics.postId}`;
    allAnalytics[key] = analytics;
    await this.writeJsonFile(this.analyticsFile, allAnalytics);
  }

  async getAnalytics(
    postId: string,
    platform: string,
  ): Promise<Analytics | null> {
    const allAnalytics = await this.readJsonFile<Record<string, Analytics>>(
      this.analyticsFile,
      {},
    );
    const key = `${platform}:${postId}`;
    return allAnalytics[key] || null;
  }

  async savePostResult(result: PostResult): Promise<void> {
    const results = await this.readJsonFile<PostResult[]>(
      this.postResultsFile,
      [],
    );
    results.push(result);
    await this.writeJsonFile(this.postResultsFile, results);
  }

  async getPostResults(platform?: string): Promise<PostResult[]> {
    const results = await this.readJsonFile<PostResult[]>(
      this.postResultsFile,
      [],
    );
    if (platform) {
      return results.filter((r) => r.platform === platform);
    }
    return results;
  }

  async incrementStat(key: string, value: number = 1): Promise<void> {
    const stats = await this.readJsonFile<Record<string, number>>(
      this.statsFile,
      {},
    );
    stats[key] = (stats[key] || 0) + value;
    await this.writeJsonFile(this.statsFile, stats);
  }

  async getStat(key: string): Promise<number> {
    const stats = await this.readJsonFile<Record<string, number>>(
      this.statsFile,
      {},
    );
    return stats[key] || 0;
  }

  async getAllStats(): Promise<Record<string, number>> {
    return await this.readJsonFile<Record<string, number>>(this.statsFile, {});
  }
}

// Enhanced scheduler with persistence
export class PersistentScheduler {
  private persistence: PersistenceAdapter;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    persistence: PersistenceAdapter = new MemoryPersistenceAdapter(),
  ) {
    this.persistence = persistence;
  }

  start(checkIntervalMs: number = 30000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processScheduledPosts();
    }, checkIntervalMs);

    console.log("Persistent scheduler started");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("Persistent scheduler stopped");
  }

  async schedulePost(post: ScheduledPost): Promise<void> {
    await this.persistence.saveScheduledPost(post);
    await this.persistence.incrementStat("scheduled_posts_created");
  }

  async getScheduledPost(id: string): Promise<ScheduledPost | null> {
    return await this.persistence.getScheduledPost(id);
  }

  async getAllScheduledPosts(): Promise<ScheduledPost[]> {
    return await this.persistence.getAllScheduledPosts();
  }

  async cancelScheduledPost(id: string): Promise<boolean> {
    const post = await this.persistence.getScheduledPost(id);
    if (!post || post.status !== "pending") {
      return false;
    }

    post.status = "cancelled";
    post.updatedAt = Date.now();
    await this.persistence.updateScheduledPost(post);
    await this.persistence.incrementStat("scheduled_posts_cancelled");
    return true;
  }

  async executeScheduledPost(
    id: string,
    executeCallback: (post: ScheduledPost) => Promise<PostResult[]>,
  ): Promise<ScheduledPost | null> {
    const post = await this.persistence.getScheduledPost(id);
    if (!post || post.status !== "pending") {
      return null;
    }

    try {
      const results = await executeCallback(post);

      post.results = results;
      post.status = results.every((r) => r.success) ? "posted" : "failed";
      post.updatedAt = Date.now();

      await this.persistence.updateScheduledPost(post);

      // Save individual results
      for (const result of results) {
        await this.persistence.savePostResult(result);
      }

      await this.persistence.incrementStat("scheduled_posts_executed");
      if (post.status === "posted") {
        await this.persistence.incrementStat("scheduled_posts_successful");
      } else {
        await this.persistence.incrementStat("scheduled_posts_failed");
      }

      return post;
    } catch (error) {
      post.status = "failed";
      post.updatedAt = Date.now();
      await this.persistence.updateScheduledPost(post);
      await this.persistence.incrementStat("scheduled_posts_failed");
      throw error;
    }
  }

  private async processScheduledPosts(): Promise<void> {
    try {
      const posts = await this.persistence.getAllScheduledPosts();
      const now = Date.now();

      for (const post of posts) {
        if (post.status === "pending" && post.scheduledAt <= now) {
          // This would need to be connected to the actual posting logic
          console.log(`Processing scheduled post ${post.id}`);
        }
      }
    } catch (error) {
      console.error("Error processing scheduled posts:", error);
    }
  }

  async getStats(): Promise<Record<string, number>> {
    return await this.persistence.getAllStats();
  }
}
