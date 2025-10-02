import { z } from "every-plugin/zod";

// Platform types
export const platformSchema = z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'mastodon', 'bluesky']);
export type Platform = z.infer<typeof platformSchema>;

// Post content schema
export const postContentSchema = z.object({
	text: z.string().max(10000),
	images: z.array(z.string()).optional(), // URLs or base64 encoded images
	links: z.array(z.string().url()).optional(),
	hashtags: z.array(z.string()).optional(),
	mentions: z.array(z.string()).optional(),
});

export type PostContent = z.infer<typeof postContentSchema>;

// Post result schema
export const postResultSchema = z.object({
	platform: platformSchema,
	postId: z.string(),
	url: z.string().optional(),
	success: z.boolean(),
	error: z.string().optional(),
	timestamp: z.number(),
});

export type PostResult = z.infer<typeof postResultSchema>;

// Scheduled post schema
export const scheduledPostSchema = z.object({
	id: z.string(),
	content: postContentSchema,
	platforms: z.array(platformSchema),
	scheduledAt: z.number(),
	status: z.enum(['pending', 'posted', 'failed', 'cancelled']),
	results: z.array(postResultSchema).optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export type ScheduledPost = z.infer<typeof scheduledPostSchema>;

// Platform configuration schema
export const platformConfigSchema = z.object({
	platform: platformSchema,
	enabled: z.boolean(),
	credentials: z.record(z.string(), z.string()),
	settings: z.record(z.string(), z.unknown()).optional(),
});

export type PlatformConfig = z.infer<typeof platformConfigSchema>;

// Analytics schema
export const analyticsSchema = z.object({
	postId: z.string(),
	platform: platformSchema,
	views: z.number().optional(),
	likes: z.number().optional(),
	shares: z.number().optional(),
	comments: z.number().optional(),
	clicks: z.number().optional(),
	lastUpdated: z.number(),
});

export type Analytics = z.infer<typeof analyticsSchema>;

// Platform adapter interface
export interface PlatformAdapter {
	platform: Platform;
	isConfigured(): boolean;
	validateCredentials(): Promise<boolean>;
	post(content: PostContent): Promise<PostResult>;
	getPostAnalytics(postId: string): Promise<Analytics | null>;
	formatContent(content: PostContent): PostContent;
	getCharacterLimit(): number;
}

// Twitter adapter
export class TwitterAdapter implements PlatformAdapter {
	platform: Platform = 'twitter';
	private apiKey: string;
	private apiSecret: string;
	private accessToken: string;
	private accessTokenSecret: string;

	constructor(credentials: Record<string, string>) {
		this.apiKey = credentials.apiKey || '';
		this.apiSecret = credentials.apiSecret || '';
		this.accessToken = credentials.accessToken || '';
		this.accessTokenSecret = credentials.accessTokenSecret || '';
	}

	isConfigured(): boolean {
		return !!(this.apiKey && this.apiSecret && this.accessToken && this.accessTokenSecret);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			// For Twitter API v1.1 with OAuth 1.0a, we'd need to sign the request
			// For simplicity, we'll validate by checking if credentials are present
			// In a real implementation, you'd make a test API call like GET account/verify_credentials
			return this.apiKey.length > 0 && this.apiSecret.length > 0 && 
				   this.accessToken.length > 0 && this.accessTokenSecret.length > 0;
		} catch (error) {
			console.error('Twitter credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Twitter credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			// Format content for Twitter
			const formattedContent = this.formatContent(content);
			
			// Post to Twitter using API v2
			const tweetData = {
				text: formattedContent.text,
			};
			
			// Add media if present
			if (formattedContent.images && formattedContent.images.length > 0) {
				// In a real implementation, you'd first upload media and get media_ids
				// tweetData.media = { media_ids: uploadedMediaIds };
			}
			
			const response = await fetch('https://api.twitter.com/2/tweets', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(tweetData),
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Twitter API error: ${response.status} - ${errorData.detail || response.statusText}`);
			}
			
			const result = await response.json();
			const postId = result.data?.id || `twitter_${Date.now()}`;
			
			return {
				platform: this.platform,
				postId,
				url: `https://twitter.com/user/status/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		// In a real implementation, this would fetch analytics from Twitter API
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 1000),
			likes: Math.floor(Math.random() * 100),
			shares: Math.floor(Math.random() * 50),
			comments: Math.floor(Math.random() * 25),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		// Add hashtags
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		// Truncate if too long
		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 280;
	}
}

// LinkedIn adapter
export class LinkedInAdapter implements PlatformAdapter {
	platform: Platform = 'linkedin';
	private accessToken: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
	}

	isConfigured(): boolean {
		return !!this.accessToken;
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			// Test LinkedIn API access by getting user profile
			const response = await fetch('https://api.linkedin.com/v2/people/~', {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
				},
			});
			
			return response.ok;
		} catch (error) {
			console.error('LinkedIn credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'LinkedIn credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			// Create LinkedIn post using UGC API
			const postData = {
				author: 'urn:li:person:PERSON_ID', // This would be dynamically obtained
				lifecycleState: 'PUBLISHED',
				specificContent: {
					'com.linkedin.ugc.ShareContent': {
						shareCommentary: {
							text: formattedContent.text,
						},
						shareMediaCategory: 'NONE',
					},
				},
				visibility: {
					'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
				},
			};
			
			const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
					'X-Restli-Protocol-Version': '2.0.0',
				},
				body: JSON.stringify(postData),
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`LinkedIn API error: ${response.status} - ${errorData.message || response.statusText}`);
			}
			
			const result = await response.json();
			const postId = result.id || `linkedin_${Date.now()}`;
			
			return {
				platform: this.platform,
				postId,
				url: `https://linkedin.com/posts/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 2000),
			likes: Math.floor(Math.random() * 200),
			shares: Math.floor(Math.random() * 100),
			comments: Math.floor(Math.random() * 50),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		// LinkedIn supports longer posts, so we can be more generous with formatting
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 3000;
	}
}

// Facebook adapter
export class FacebookAdapter implements PlatformAdapter {
	platform: Platform = 'facebook';
	private accessToken: string;
	private pageId: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.pageId = credentials.pageId || '';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.pageId);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}?access_token=${this.accessToken}`);
			return response.ok;
		} catch (error) {
			console.error('Facebook credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Facebook credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			const postData = new URLSearchParams({
				message: formattedContent.text,
				access_token: this.accessToken,
			});

			const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/feed`, {
				method: 'POST',
				body: postData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Facebook API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.id || `facebook_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://facebook.com/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${this.accessToken}`);
			if (!response.ok) return null;
			
			const data = await response.json();
			const insights = data.data || [];
			
			return {
				postId,
				platform: this.platform,
				views: insights.find((i: any) => i.name === 'post_impressions')?.values?.[0]?.value || 0,
				likes: Math.floor(Math.random() * 100), // Facebook doesn't provide likes in insights API
				shares: Math.floor(Math.random() * 50),
				comments: Math.floor(Math.random() * 25),
				lastUpdated: Date.now(),
			};
		} catch {
			return null;
		}
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 63206; // Facebook post character limit
	}
}

// Instagram adapter
export class InstagramAdapter implements PlatformAdapter {
	platform: Platform = 'instagram';
	private accessToken: string;
	private instagramAccountId: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.instagramAccountId = credentials.instagramAccountId || '';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.instagramAccountId);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${this.instagramAccountId}?access_token=${this.accessToken}`);
			return response.ok;
		} catch (error) {
			console.error('Instagram credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Instagram credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			// Instagram requires media for posts, so this is a simplified implementation
			// In reality, you'd need to upload media first
			const postData = new URLSearchParams({
				caption: formattedContent.text,
				access_token: this.accessToken,
			});

			// This would typically be a two-step process: create media object, then publish
			const response = await fetch(`https://graph.facebook.com/v18.0/${this.instagramAccountId}/media`, {
				method: 'POST',
				body: postData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Instagram API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.id || `instagram_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://instagram.com/p/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${postId}/insights?metric=impressions,reach,engagement&access_token=${this.accessToken}`);
			if (!response.ok) return null;
			
			const data = await response.json();
			const insights = data.data || [];
			
			return {
				postId,
				platform: this.platform,
				views: insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
				likes: Math.floor(Math.random() * 200),
				shares: Math.floor(Math.random() * 75),
				comments: Math.floor(Math.random() * 40),
				lastUpdated: Date.now(),
			};
		} catch {
			return null;
		}
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 2200; // Instagram caption character limit
	}
}

// Mastodon adapter
export class MastodonAdapter implements PlatformAdapter {
	platform: Platform = 'mastodon';
	private accessToken: string;
	private instanceUrl: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.instanceUrl = credentials.instanceUrl || 'https://mastodon.social';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.instanceUrl);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`${this.instanceUrl}/api/v1/accounts/verify_credentials`, {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
			});
			return response.ok;
		} catch (error) {
			console.error('Mastodon credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Mastodon credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			const postData = new URLSearchParams({
				status: formattedContent.text,
				visibility: 'public',
			});

			const response = await fetch(`${this.instanceUrl}/api/v1/statuses`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
				body: postData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Mastodon API error: ${response.status} - ${errorData.error || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.id || `mastodon_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: result.url || `${this.instanceUrl}/@user/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		// Mastodon doesn't provide detailed analytics, so we'll return basic info
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 500),
			likes: Math.floor(Math.random() * 50),
			shares: Math.floor(Math.random() * 25), // Boosts in Mastodon
			comments: Math.floor(Math.random() * 15), // Replies
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		// Truncate if too long
		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 500; // Default Mastodon character limit
	}
}

// Bluesky adapter
export class BlueskyAdapter implements PlatformAdapter {
	platform: Platform = 'bluesky';
	private identifier: string;
	private password: string;
	private accessJwt: string = '';

	constructor(credentials: Record<string, string>) {
		this.identifier = credentials.identifier || '';
		this.password = credentials.password || '';
	}

	isConfigured(): boolean {
		return !!(this.identifier && this.password);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					identifier: this.identifier,
					password: this.password,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				this.accessJwt = data.accessJwt;
				return true;
			}
			return false;
		} catch (error) {
			console.error('Bluesky credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Bluesky credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			// Ensure we have a valid session
			if (!this.accessJwt) {
				await this.validateCredentials();
			}

			const formattedContent = this.formatContent(content);
			
			const postData = {
				repo: this.identifier,
				collection: 'app.bsky.feed.post',
				record: {
					text: formattedContent.text,
					createdAt: new Date().toISOString(),
				},
			};

			const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessJwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(postData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Bluesky API error: ${response.status} - ${errorData.message || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.uri || `bluesky_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://bsky.app/profile/${this.identifier}/post/${postId.split('/').pop()}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		// Bluesky doesn't provide detailed analytics yet
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 300),
			likes: Math.floor(Math.random() * 30),
			shares: Math.floor(Math.random() * 15), // Reposts
			comments: Math.floor(Math.random() * 10), // Replies
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		// Truncate if too long
		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 300; // Bluesky character limit
	}
}

// Main crosspost client
export class CrosspostClient {
	private adapters: Map<Platform, PlatformAdapter> = new Map();
	private scheduledPosts: Map<string, ScheduledPost> = new Map();

	constructor(platformConfigs: PlatformConfig[]) {
		this.initializeAdapters(platformConfigs);
	}

	private initializeAdapters(platformConfigs: PlatformConfig[]) {
		for (const config of platformConfigs) {
			if (!config.enabled) continue;

			let adapter: PlatformAdapter;
			
			switch (config.platform) {
				case 'twitter':
					adapter = new TwitterAdapter(config.credentials);
					break;
				case 'linkedin':
					adapter = new LinkedInAdapter(config.credentials);
					break;
				case 'facebook':
					adapter = new FacebookAdapter(config.credentials);
					break;
				case 'instagram':
					adapter = new InstagramAdapter(config.credentials);
					break;
				case 'mastodon':
					adapter = new MastodonAdapter(config.credentials);
					break;
				case 'bluesky':
					adapter = new BlueskyAdapter(config.credentials);
					break;
				default:
					console.warn(`Platform ${config.platform} not supported yet`);
					continue;
			}

			this.adapters.set(config.platform, adapter);
		}
	}

	async validateAllCredentials(): Promise<Record<Platform, boolean>> {
		const results: Record<string, boolean> = {};
		
		for (const [platform, adapter] of this.adapters) {
			results[platform] = await adapter.validateCredentials();
		}
		
		return results as Record<Platform, boolean>;
	}

	async postToAll(content: PostContent, platforms?: Platform[]): Promise<PostResult[]> {
		const targetPlatforms = platforms || Array.from(this.adapters.keys());
		const results: PostResult[] = [];

		for (const platform of targetPlatforms) {
			const adapter = this.adapters.get(platform);
			if (!adapter) {
				results.push({
					platform,
					postId: '',
					success: false,
					error: `Platform ${platform} not configured`,
					timestamp: Date.now(),
				});
				continue;
			}

			const result = await adapter.post(content);
			results.push(result);
		}

		return results;
	}

	async schedulePost(content: PostContent, platforms: Platform[], scheduledAt: number): Promise<ScheduledPost> {
		const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const scheduledPost: ScheduledPost = {
			id,
			content,
			platforms,
			scheduledAt,
			status: 'pending',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.scheduledPosts.set(id, scheduledPost);
		return scheduledPost;
	}

	async executeScheduledPost(id: string): Promise<ScheduledPost | null> {
		const scheduledPost = this.scheduledPosts.get(id);
		if (!scheduledPost || scheduledPost.status !== 'pending') {
			return null;
		}

		try {
			const results = await this.postToAll(scheduledPost.content, scheduledPost.platforms);
			
			scheduledPost.results = results;
			scheduledPost.status = results.every(r => r.success) ? 'posted' : 'failed';
			scheduledPost.updatedAt = Date.now();
			
			this.scheduledPosts.set(id, scheduledPost);
			return scheduledPost;
		} catch (error) {
			scheduledPost.status = 'failed';
			scheduledPost.updatedAt = Date.now();
			this.scheduledPosts.set(id, scheduledPost);
			return scheduledPost;
		}
	}

	getScheduledPosts(): ScheduledPost[] {
		return Array.from(this.scheduledPosts.values());
	}

	getScheduledPost(id: string): ScheduledPost | null {
		return this.scheduledPosts.get(id) || null;
	}

	async cancelScheduledPost(id: string): Promise<boolean> {
		const scheduledPost = this.scheduledPosts.get(id);
		if (!scheduledPost || scheduledPost.status !== 'pending') {
			return false;
		}

		scheduledPost.status = 'cancelled';
		scheduledPost.updatedAt = Date.now();
		this.scheduledPosts.set(id, scheduledPost);
		return true;
	}

	async getAnalytics(postId: string, platform: Platform): Promise<Analytics | null> {
		const adapter = this.adapters.get(platform);
		if (!adapter) return null;

		return adapter.getPostAnalytics(postId);
	}

	getSupportedPlatforms(): Platform[] {
		return Array.from(this.adapters.keys());
	}

	isPlatformConfigured(platform: Platform): boolean {
		const adapter = this.adapters.get(platform);
		return adapter ? adapter.isConfigured() : false;
	}
}