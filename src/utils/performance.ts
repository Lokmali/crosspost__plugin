/**
 * Performance optimization utilities
 */

import { PostResult, Platform } from "../client";

// Simple in-memory cache
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number = 300000): void {
    // Default 5 minutes
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired items first
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Connection pooling for HTTP requests
export class ConnectionPool {
  private pools = new Map<string, { connections: number; lastUsed: number }>();
  private readonly maxConnections = 10;
  private readonly connectionTtl = 30000; // 30 seconds

  getConnection(host: string): boolean {
    const now = Date.now();
    const pool = this.pools.get(host);

    if (!pool) {
      this.pools.set(host, { connections: 1, lastUsed: now });
      return true;
    }

    // Clean up old connections
    if (now - pool.lastUsed > this.connectionTtl) {
      pool.connections = 1;
      pool.lastUsed = now;
      return true;
    }

    if (pool.connections < this.maxConnections) {
      pool.connections++;
      pool.lastUsed = now;
      return true;
    }

    return false; // Pool exhausted
  }

  releaseConnection(host: string): void {
    const pool = this.pools.get(host);
    if (pool && pool.connections > 0) {
      pool.connections--;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [host, pool] of this.pools.entries()) {
      if (now - pool.lastUsed > this.connectionTtl * 2) {
        this.pools.delete(host);
      }
    }
  }
}

// Batch processor for efficient bulk operations
export class BatchProcessor<T, R> {
  private queue: Array<{
    item: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;
  private readonly batchSize: number;
  private readonly batchDelay: number;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    batchDelay: number = 100,
  ) {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.scheduleProcessing();
    });
  }

  private scheduleProcessing(): void {
    if (this.processing) return;

    // Process immediately if batch is full
    if (this.queue.length >= this.batchSize) {
      this.processBatch();
      return;
    }

    // Schedule processing after delay
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map((b) => b.item);

    try {
      const results = await this.processor(items);

      // Resolve all promises in the batch
      batch.forEach((b, index) => {
        if (results[index] !== undefined) {
          b.resolve(results[index]);
        } else {
          b.reject(new Error("No result for batch item"));
        }
      });
    } catch (error) {
      // Reject all promises in the batch
      batch.forEach((b) => {
        b.reject(error instanceof Error ? error : new Error(String(error)));
      });
    } finally {
      this.processing = false;

      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    return new Promise<void>((resolve) => {
      const checkEmpty = () => {
        if (this.queue.length === 0 && !this.processing) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };

      this.processBatch();
      checkEmpty();
    });
  }
}

// Debounce utility for rate limiting
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResolve: ((value: ReturnType<T>) => void) | null = null;
  let lastReject: ((reason: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        if (lastReject) {
          lastReject(new Error("Debounced call cancelled"));
        }
      }

      lastResolve = resolve;
      lastReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (lastResolve) {
            lastResolve(result);
          }
        } catch (error) {
          if (lastReject) {
            lastReject(error);
          }
        } finally {
          timeoutId = null;
          lastResolve = null;
          lastReject = null;
        }
      }, waitMs);
    });
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number,
): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    return new Promise<ReturnType<T> | null>((resolve) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall >= limitMs) {
        lastCall = now;
        resolve(func(...args));
      } else {
        const remainingTime = limitMs - timeSinceLastCall;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          resolve(func(...args));
          timeoutId = null;
        }, remainingTime);
      }
    });
  };
}

// Parallel execution with concurrency limit
export async function parallelLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = processor(items[i]).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let j = executing.length - 1; j >= 0; j--) {
        if (
          await Promise.race([
            executing[j].then(() => true),
            Promise.resolve(false),
          ])
        ) {
          executing.splice(j, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics = new Map<
    string,
    { count: number; totalTime: number; avgTime: number }
  >();

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      this.recordMetric(name, Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordMetric(name, Date.now() - startTime);
      throw error;
    }
  }

  private recordMetric(name: string, duration: number): void {
    const existing = this.metrics.get(name) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
    };

    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;

    this.metrics.set(name, existing);
  }

  getMetrics(): Record<
    string,
    { count: number; totalTime: number; avgTime: number }
  > {
    const result: Record<
      string,
      { count: number; totalTime: number; avgTime: number }
    > = {};

    for (const [name, metric] of this.metrics) {
      result[name] = { ...metric };
    }

    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Global instances
export const globalCache = new MemoryCache();
export const globalConnectionPool = new ConnectionPool();
export const globalPerformanceMonitor = new PerformanceMonitor();

// Cleanup function to be called periodically
export function performCleanup(): void {
  globalConnectionPool.cleanup();
  // Cache cleanup is handled automatically by expiry
}

// Auto cleanup every 5 minutes
setInterval(performCleanup, 5 * 60 * 1000);








