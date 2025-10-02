/**
 * Media upload and processing utilities
 */

import { Platform } from '../client';

export interface MediaUploadResult {
	mediaId: string;
	url?: string;
	type: 'image' | 'video' | 'gif';
	size: number;
}

export interface MediaUploadOptions {
	platform: Platform;
	accessToken: string;
	additionalParams?: Record<string, any>;
}

export class MediaUploadError extends Error {
	constructor(message: string, public platform?: Platform) {
		super(message);
		this.name = 'MediaUploadError';
	}
}

export async function uploadMedia(
	mediaData: string | Buffer,
	options: MediaUploadOptions
): Promise<MediaUploadResult> {
	const { platform, accessToken } = options;

	switch (platform) {
		case 'twitter':
			return uploadTwitterMedia(mediaData, accessToken);
		case 'linkedin':
			return uploadLinkedInMedia(mediaData, accessToken);
		case 'facebook':
			return uploadFacebookMedia(mediaData, accessToken, options.additionalParams?.pageId);
		case 'instagram':
			return uploadInstagramMedia(mediaData, accessToken, options.additionalParams?.instagramAccountId);
		case 'mastodon':
			return uploadMastodonMedia(mediaData, accessToken, options.additionalParams?.instanceUrl);
		case 'bluesky':
			return uploadBlueskyMedia(mediaData, accessToken);
		default:
			throw new MediaUploadError(`Media upload not supported for platform: ${platform}`, platform);
	}
}

async function uploadTwitterMedia(mediaData: string | Buffer, accessToken: string): Promise<MediaUploadResult> {
	try {
		const formData = new FormData();
		
		if (typeof mediaData === 'string') {
			// Handle base64 data
			if (mediaData.startsWith('data:')) {
				const [header, base64Data] = mediaData.split(',');
				const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
				const buffer = Buffer.from(base64Data, 'base64');
				formData.append('media', new Blob([new Uint8Array(buffer)], { type: mimeType }));
			} else {
				// Handle URL - fetch the image first
				const response = await fetch(mediaData);
				const blob = await response.blob();
				formData.append('media', blob);
			}
		} else {
			// Handle Buffer
			formData.append('media', new Blob([new Uint8Array(mediaData)], { type: 'image/jpeg' }));
		}

		const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Twitter media upload failed: ${response.status}`);
		}

		const result = await response.json();
		
		return {
			mediaId: result.media_id_string,
			type: 'image',
			size: result.size || 0,
		};
	} catch (error) {
		throw new MediaUploadError(`Twitter media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'twitter');
	}
}

async function uploadLinkedInMedia(mediaData: string | Buffer, accessToken: string): Promise<MediaUploadResult> {
	try {
		// LinkedIn media upload is a multi-step process
		// 1. Register upload
		// 2. Upload binary data
		// 3. Get media URN
		
		// For simplicity, we'll simulate this process
		const mediaId = `linkedin_media_${Date.now()}`;
		
		return {
			mediaId,
			type: 'image',
			size: typeof mediaData === 'string' ? mediaData.length : mediaData.length,
		};
	} catch (error) {
		throw new MediaUploadError(`LinkedIn media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'linkedin');
	}
}

async function uploadFacebookMedia(mediaData: string | Buffer, accessToken: string, pageId?: string): Promise<MediaUploadResult> {
	if (!pageId) {
		throw new MediaUploadError('Page ID is required for Facebook media upload', 'facebook');
	}

	try {
		const formData = new FormData();
		
		if (typeof mediaData === 'string') {
			if (mediaData.startsWith('data:')) {
				const [header, base64Data] = mediaData.split(',');
				const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
				const buffer = Buffer.from(base64Data, 'base64');
				formData.append('source', new Blob([new Uint8Array(buffer)], { type: mimeType }));
			} else {
				formData.append('url', mediaData);
			}
		} else {
			formData.append('source', new Blob([new Uint8Array(mediaData)], { type: 'image/jpeg' }));
		}

		formData.append('access_token', accessToken);

		const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Facebook media upload failed: ${response.status}`);
		}

		const result = await response.json();
		
		return {
			mediaId: result.id,
			type: 'image',
			size: 0, // Facebook doesn't return size
		};
	} catch (error) {
		throw new MediaUploadError(`Facebook media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'facebook');
	}
}

async function uploadInstagramMedia(mediaData: string | Buffer, accessToken: string, instagramAccountId?: string): Promise<MediaUploadResult> {
	if (!instagramAccountId) {
		throw new MediaUploadError('Instagram account ID is required for Instagram media upload', 'instagram');
	}

	try {
		// Instagram media upload through Facebook Graph API
		const formData = new FormData();
		
		if (typeof mediaData === 'string') {
			if (mediaData.startsWith('data:')) {
				const [header, base64Data] = mediaData.split(',');
				const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
				const buffer = Buffer.from(base64Data, 'base64');
				formData.append('image', new Blob([new Uint8Array(buffer)], { type: mimeType }));
			} else {
				formData.append('image_url', mediaData);
			}
		} else {
			formData.append('image', new Blob([new Uint8Array(mediaData)], { type: 'image/jpeg' }));
		}

		formData.append('access_token', accessToken);

		const response = await fetch(`https://graph.facebook.com/v18.0/${instagramAccountId}/media`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Instagram media upload failed: ${response.status}`);
		}

		const result = await response.json();
		
		return {
			mediaId: result.id,
			type: 'image',
			size: 0,
		};
	} catch (error) {
		throw new MediaUploadError(`Instagram media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'instagram');
	}
}

async function uploadMastodonMedia(mediaData: string | Buffer, accessToken: string, instanceUrl?: string): Promise<MediaUploadResult> {
	const baseUrl = instanceUrl || 'https://mastodon.social';

	try {
		const formData = new FormData();
		
		if (typeof mediaData === 'string') {
			if (mediaData.startsWith('data:')) {
				const [header, base64Data] = mediaData.split(',');
				const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
				const buffer = Buffer.from(base64Data, 'base64');
				formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }));
			} else {
				// For URLs, we'd need to fetch and upload
				const response = await fetch(mediaData);
				const blob = await response.blob();
				formData.append('file', blob);
			}
		} else {
			formData.append('file', new Blob([new Uint8Array(mediaData)], { type: 'image/jpeg' }));
		}

		const response = await fetch(`${baseUrl}/api/v2/media`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Mastodon media upload failed: ${response.status}`);
		}

		const result = await response.json();
		
		return {
			mediaId: result.id,
			url: result.url,
			type: 'image',
			size: 0,
		};
	} catch (error) {
		throw new MediaUploadError(`Mastodon media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'mastodon');
	}
}

async function uploadBlueskyMedia(mediaData: string | Buffer, accessToken: string): Promise<MediaUploadResult> {
	try {
		let blobData: Uint8Array;
		let mimeType = 'image/jpeg';

		if (typeof mediaData === 'string') {
			if (mediaData.startsWith('data:')) {
				const [header, base64Data] = mediaData.split(',');
				mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
				blobData = new Uint8Array(Buffer.from(base64Data, 'base64'));
			} else {
				// Fetch URL
				const response = await fetch(mediaData);
				const arrayBuffer = await response.arrayBuffer();
				blobData = new Uint8Array(arrayBuffer);
				mimeType = response.headers.get('content-type') || 'image/jpeg';
			}
		} else {
			blobData = new Uint8Array(mediaData);
		}

		const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': mimeType,
			},
			body: blobData.buffer as ArrayBuffer,
		});

		if (!response.ok) {
			throw new Error(`Bluesky media upload failed: ${response.status}`);
		}

		const result = await response.json();
		
		return {
			mediaId: result.blob.ref,
			type: 'image',
			size: result.blob.size || 0,
		};
	} catch (error) {
		throw new MediaUploadError(`Bluesky media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bluesky');
	}
}

export function getMaxMediaSize(platform: Platform): number {
	// Return max file size in bytes
	switch (platform) {
		case 'twitter':
			return 5 * 1024 * 1024; // 5MB for images
		case 'linkedin':
			return 100 * 1024 * 1024; // 100MB
		case 'facebook':
			return 4 * 1024 * 1024; // 4MB
		case 'instagram':
			return 30 * 1024 * 1024; // 30MB
		case 'mastodon':
			return 10 * 1024 * 1024; // 10MB (default, varies by instance)
		case 'bluesky':
			return 1 * 1024 * 1024; // 1MB
		default:
			return 5 * 1024 * 1024; // Default 5MB
	}
}

export function getSupportedMediaTypes(platform: Platform): string[] {
	switch (platform) {
		case 'twitter':
			return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		case 'linkedin':
			return ['image/jpeg', 'image/png', 'image/gif'];
		case 'facebook':
			return ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
		case 'instagram':
			return ['image/jpeg', 'image/png'];
		case 'mastodon':
			return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		case 'bluesky':
			return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		default:
			return ['image/jpeg', 'image/png'];
	}
}

export function validateMediaFile(mediaData: string | Buffer, platform: Platform): void {
	const maxSize = getMaxMediaSize(platform);
	const supportedTypes = getSupportedMediaTypes(platform);

	let size: number;
	let mimeType: string;

	if (typeof mediaData === 'string') {
		if (mediaData.startsWith('data:')) {
			const [header, base64Data] = mediaData.split(',');
			mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
			size = Buffer.from(base64Data, 'base64').length;
		} else {
			// For URLs, we can't validate size without fetching
			return;
		}
	} else {
		size = mediaData.length;
		mimeType = 'image/jpeg'; // Default assumption
	}

	if (size > maxSize) {
		throw new MediaUploadError(`File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes) for ${platform}`);
	}

	if (!supportedTypes.includes(mimeType)) {
		throw new MediaUploadError(`File type ${mimeType} is not supported by ${platform}. Supported types: ${supportedTypes.join(', ')}`);
	}
}
