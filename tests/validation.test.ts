/**
 * Tests for validation utilities
 */

import {
	validatePostContent,
	validatePlatforms,
	validateScheduledAt,
	sanitizePostContent,
	sanitizeText,
	sanitizeHashtags,
	sanitizeLinks,
	sanitizeMentions,
	ValidationError,
} from '../src/utils/validation';
import { PostContent, Platform } from '../src/client';

describe('validatePostContent', () => {
	it('should validate valid post content', () => {
		const content: PostContent = {
			text: 'Valid post content',
			hashtags: ['test', 'valid'],
			links: ['https://example.com'],
			mentions: ['@user'],
		};

		expect(() => validatePostContent(content)).not.toThrow();
	});

	it('should throw error for missing content', () => {
		expect(() => validatePostContent(null as any)).toThrow(ValidationError);
		expect(() => validatePostContent(undefined as any)).toThrow(ValidationError);
	});

	it('should throw error for missing text', () => {
		const content = { hashtags: ['test'] } as PostContent;
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for empty text', () => {
		const content: PostContent = { text: '' };
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for text that is too long', () => {
		const content: PostContent = { text: 'a'.repeat(10001) };
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for invalid hashtags', () => {
		const content: PostContent = {
			text: 'Test',
			hashtags: 'invalid' as any,
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for too many hashtags', () => {
		const content: PostContent = {
			text: 'Test',
			hashtags: Array(31).fill('tag'),
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for invalid hashtag characters', () => {
		const content: PostContent = {
			text: 'Test',
			hashtags: ['valid-tag', 'invalid tag with spaces'],
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for invalid links', () => {
		const content: PostContent = {
			text: 'Test',
			links: ['not-a-url', 'also-invalid'],
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for too many links', () => {
		const content: PostContent = {
			text: 'Test',
			links: Array(11).fill('https://example.com'),
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for too many mentions', () => {
		const content: PostContent = {
			text: 'Test',
			mentions: Array(21).fill('@user'),
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for too many images', () => {
		const content: PostContent = {
			text: 'Test',
			images: Array(5).fill('https://example.com/image.jpg'),
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should throw error for invalid image URLs', () => {
		const content: PostContent = {
			text: 'Test',
			images: ['not-a-url', 'invalid-image'],
		};
		expect(() => validatePostContent(content)).toThrow(ValidationError);
	});

	it('should accept valid base64 images', () => {
		const content: PostContent = {
			text: 'Test',
			images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A'],
		};
		expect(() => validatePostContent(content)).not.toThrow();
	});
});

describe('validatePlatforms', () => {
	it('should validate valid platforms', () => {
		const platforms: Platform[] = ['twitter', 'linkedin', 'facebook'];
		expect(() => validatePlatforms(platforms)).not.toThrow();
	});

	it('should throw error for non-array platforms', () => {
		expect(() => validatePlatforms('twitter' as any)).toThrow(ValidationError);
	});

	it('should throw error for empty platforms array', () => {
		expect(() => validatePlatforms([])).toThrow(ValidationError);
	});

	it('should throw error for too many platforms', () => {
		const platforms = Array(11).fill('twitter') as Platform[];
		expect(() => validatePlatforms(platforms)).toThrow(ValidationError);
	});

	it('should throw error for invalid platform', () => {
		const platforms = ['twitter', 'invalid-platform'] as Platform[];
		expect(() => validatePlatforms(platforms)).toThrow(ValidationError);
	});

	it('should throw error for duplicate platforms', () => {
		const platforms: Platform[] = ['twitter', 'linkedin', 'twitter'];
		expect(() => validatePlatforms(platforms)).toThrow(ValidationError);
	});
});

describe('validateScheduledAt', () => {
	it('should validate future timestamp', () => {
		const futureTime = Date.now() + 60000; // 1 minute from now
		expect(() => validateScheduledAt(futureTime)).not.toThrow();
	});

	it('should throw error for non-number timestamp', () => {
		expect(() => validateScheduledAt('invalid' as any)).toThrow(ValidationError);
	});

	it('should throw error for past timestamp', () => {
		const pastTime = Date.now() - 60000; // 1 minute ago
		expect(() => validateScheduledAt(pastTime)).toThrow(ValidationError);
	});

	it('should throw error for timestamp too far in future', () => {
		const farFuture = Date.now() + (366 * 24 * 60 * 60 * 1000); // More than 1 year
		expect(() => validateScheduledAt(farFuture)).toThrow(ValidationError);
	});
});

describe('sanitizeText', () => {
	it('should remove control characters', () => {
		const dirtyText = 'Hello\x00\x01\x02World\x7F';
		const clean = sanitizeText(dirtyText);
		expect(clean).toBe('HelloWorld');
	});

	it('should preserve newlines and tabs', () => {
		const text = 'Hello\nWorld\tTest';
		const clean = sanitizeText(text);
		expect(clean).toBe('Hello\nWorld\tTest');
	});

	it('should trim whitespace', () => {
		const text = '  Hello World  ';
		const clean = sanitizeText(text);
		expect(clean).toBe('Hello World');
	});

	it('should handle non-string input', () => {
		expect(sanitizeText(null as any)).toBe('');
		expect(sanitizeText(undefined as any)).toBe('');
		expect(sanitizeText(123 as any)).toBe('');
	});
});

describe('sanitizeHashtags', () => {
	it('should clean and format hashtags', () => {
		const hashtags = ['test', '#valid', 'with spaces', 'with-dashes'];
		const clean = sanitizeHashtags(hashtags);
		expect(clean).toEqual(['#test', '#valid', '#withspaces', '#withdashes']);
	});

	it('should remove empty hashtags', () => {
		const hashtags = ['valid', '', '#', '   '];
		const clean = sanitizeHashtags(hashtags);
		expect(clean).toEqual(['#valid']);
	});

	it('should limit to 30 hashtags', () => {
		const hashtags = Array(35).fill('tag').map((_, i) => `tag${i}`);
		const clean = sanitizeHashtags(hashtags);
		expect(clean).toHaveLength(30);
	});

	it('should handle non-array input', () => {
		expect(sanitizeHashtags(null as any)).toEqual([]);
		expect(sanitizeHashtags('not-array' as any)).toEqual([]);
	});
});

describe('sanitizeLinks', () => {
	it('should filter valid URLs', () => {
		const links = [
			'https://example.com',
			'http://test.org',
			'not-a-url',
			'ftp://files.example.com',
		];
		const clean = sanitizeLinks(links);
		expect(clean).toEqual([
			'https://example.com',
			'http://test.org',
			'ftp://files.example.com',
		]);
	});

	it('should limit to 10 links', () => {
		const links = Array(15).fill('https://example.com');
		const clean = sanitizeLinks(links);
		expect(clean).toHaveLength(10);
	});

	it('should handle non-array input', () => {
		expect(sanitizeLinks(null as any)).toEqual([]);
	});
});

describe('sanitizeMentions', () => {
	it('should clean mentions', () => {
		const mentions = ['@user1', 'user2', '<script>alert("xss")</script>'];
		const clean = sanitizeMentions(mentions);
		expect(clean).toEqual(['@user1', 'user2', 'scriptalert("xss")/script']);
	});

	it('should remove long mentions', () => {
		const mentions = ['valid', 'a'.repeat(51)];
		const clean = sanitizeMentions(mentions);
		expect(clean).toEqual(['valid']);
	});

	it('should limit to 20 mentions', () => {
		const mentions = Array(25).fill('user');
		const clean = sanitizeMentions(mentions);
		expect(clean).toHaveLength(20);
	});
});

describe('sanitizePostContent', () => {
	it('should sanitize all content fields', () => {
		const dirtyContent: PostContent = {
			text: '  Hello\x00World  ',
			hashtags: ['test', 'with spaces', ''],
			links: ['https://example.com', 'not-a-url'],
			mentions: ['@user', '<script>'],
			images: ['https://example.com/image.jpg', 'not-a-url'],
		};

		const clean = sanitizePostContent(dirtyContent);

		expect(clean.text).toBe('HelloWorld');
		expect(clean.hashtags).toEqual(['#test', '#withspaces']);
		expect(clean.links).toEqual(['https://example.com']);
		expect(clean.mentions).toEqual(['@user', 'script']);
		expect(clean.images).toEqual(['https://example.com/image.jpg']);
	});

	it('should handle undefined optional fields', () => {
		const content: PostContent = { text: 'Hello World' };
		const clean = sanitizePostContent(content);

		expect(clean.text).toBe('Hello World');
		expect(clean.hashtags).toBeUndefined();
		expect(clean.links).toBeUndefined();
		expect(clean.mentions).toBeUndefined();
		expect(clean.images).toBeUndefined();
	});
});
