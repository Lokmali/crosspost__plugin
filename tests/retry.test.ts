/**
 * Tests for retry and rate limiting utilities
 */

import { withRetry, RateLimiter, createPlatformRateLimiter, DEFAULT_RETRY_OPTIONS } from '../src/utils/retry';

// Mock setTimeout for testing
jest.useFakeTimers();

describe('withRetry', () => {
	beforeEach(() => {
		jest.clearAllTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
	});

	it('should succeed on first attempt', async () => {
		const operation = jest.fn().mockResolvedValue('success');

		const result = await withRetry(operation);

		expect(result).toBe('success');
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('should retry on retryable errors', async () => {
		const operation = jest.fn()
			.mockRejectedValueOnce({ status: 500 })
			.mockRejectedValueOnce({ status: 429 })
			.mockResolvedValue('success');

		const promise = withRetry(operation, { maxRetries: 2 });

		// Fast-forward through retry delays
		jest.runAllTimers();

		const result = await promise;

		expect(result).toBe('success');
		expect(operation).toHaveBeenCalledTimes(3);
	});

	it('should not retry on non-retryable errors', async () => {
		const operation = jest.fn().mockRejectedValue({ status: 400 });

		await expect(withRetry(operation)).rejects.toEqual({ status: 400 });
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('should respect maxRetries limit', async () => {
		const operation = jest.fn().mockRejectedValue({ status: 500 });

		const promise = withRetry(operation, { maxRetries: 2 });
		jest.runAllTimers();

		await expect(promise).rejects.toEqual({ status: 500 });
		expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
	});

	it('should use custom retry condition', async () => {
		const operation = jest.fn().mockRejectedValue({ code: 'CUSTOM_ERROR' });
		const retryCondition = (error: any) => error.code === 'CUSTOM_ERROR';

		const promise = withRetry(operation, { maxRetries: 1, retryCondition });
		jest.runAllTimers();

		await expect(promise).rejects.toEqual({ code: 'CUSTOM_ERROR' });
		expect(operation).toHaveBeenCalledTimes(2);
	});

	it('should use exponential backoff', async () => {
		const operation = jest.fn()
			.mockRejectedValueOnce({ status: 500 })
			.mockRejectedValueOnce({ status: 500 })
			.mockResolvedValue('success');

		const promise = withRetry(operation, {
			maxRetries: 2,
			baseDelay: 1000,
			backoffFactor: 2,
		});

		// Check that delays increase exponentially
		expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
		jest.advanceTimersByTime(1000);

		expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
		jest.advanceTimersByTime(2000);

		const result = await promise;
		expect(result).toBe('success');
	});

	it('should respect maxDelay', async () => {
		const operation = jest.fn()
			.mockRejectedValueOnce({ status: 500 })
			.mockResolvedValue('success');

		const promise = withRetry(operation, {
			maxRetries: 1,
			baseDelay: 10000,
			maxDelay: 5000,
		});

		expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
		jest.advanceTimersByTime(5000);

		const result = await promise;
		expect(result).toBe('success');
	});
});

describe('RateLimiter', () => {
	beforeEach(() => {
		jest.clearAllTimers();
		jest.spyOn(Date, 'now').mockReturnValue(0);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.runOnlyPendingTimers();
	});

	it('should allow requests within limit', async () => {
		const limiter = new RateLimiter(5, 60000); // 5 requests per minute

		// Should allow 5 requests immediately
		for (let i = 0; i < 5; i++) {
			await limiter.acquire();
		}

		// No delays should have been set
		expect(setTimeout).not.toHaveBeenCalled();
	});

	it('should delay requests exceeding limit', async () => {
		const limiter = new RateLimiter(2, 60000); // 2 requests per minute

		// First 2 requests should be immediate
		await limiter.acquire();
		await limiter.acquire();

		// Third request should be delayed
		const promise = limiter.acquire();
		expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

		// Advance time and resolve
		jest.advanceTimersByTime(60000);
		await promise;
	});

	it('should clean up old requests', async () => {
		const limiter = new RateLimiter(2, 60000);

		// Make 2 requests at time 0
		await limiter.acquire();
		await limiter.acquire();

		// Advance time by 61 seconds
		(Date.now as jest.Mock).mockReturnValue(61000);

		// Should allow new requests without delay
		await limiter.acquire();
		await limiter.acquire();

		expect(setTimeout).not.toHaveBeenCalled();
	});
});

describe('createPlatformRateLimiter', () => {
	it('should create Twitter rate limiter', () => {
		const limiter = createPlatformRateLimiter('twitter');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create LinkedIn rate limiter', () => {
		const limiter = createPlatformRateLimiter('linkedin');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create Facebook rate limiter', () => {
		const limiter = createPlatformRateLimiter('facebook');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create Instagram rate limiter', () => {
		const limiter = createPlatformRateLimiter('instagram');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create Mastodon rate limiter', () => {
		const limiter = createPlatformRateLimiter('mastodon');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create Bluesky rate limiter', () => {
		const limiter = createPlatformRateLimiter('bluesky');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});

	it('should create default rate limiter for unknown platform', () => {
		const limiter = createPlatformRateLimiter('unknown-platform');
		expect(limiter).toBeInstanceOf(RateLimiter);
	});
});

describe('DEFAULT_RETRY_OPTIONS', () => {
	it('should have correct default values', () => {
		expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
		expect(DEFAULT_RETRY_OPTIONS.baseDelay).toBe(1000);
		expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(30000);
		expect(DEFAULT_RETRY_OPTIONS.backoffFactor).toBe(2);
		expect(DEFAULT_RETRY_OPTIONS.retryCondition).toBeDefined();
	});

	it('should retry on network errors', () => {
		const condition = DEFAULT_RETRY_OPTIONS.retryCondition!;
		expect(condition({ code: 'NETWORK_ERROR' })).toBe(true);
	});

	it('should retry on server errors', () => {
		const condition = DEFAULT_RETRY_OPTIONS.retryCondition!;
		expect(condition({ status: 500 })).toBe(true);
		expect(condition({ status: 502 })).toBe(true);
		expect(condition({ status: 503 })).toBe(true);
	});

	it('should retry on rate limit errors', () => {
		const condition = DEFAULT_RETRY_OPTIONS.retryCondition!;
		expect(condition({ status: 429 })).toBe(true);
	});

	it('should not retry on client errors', () => {
		const condition = DEFAULT_RETRY_OPTIONS.retryCondition!;
		expect(condition({ status: 400 })).toBe(false);
		expect(condition({ status: 401 })).toBe(false);
		expect(condition({ status: 403 })).toBe(false);
		expect(condition({ status: 404 })).toBe(false);
	});
});
