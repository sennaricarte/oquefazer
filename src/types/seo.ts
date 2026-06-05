export interface SeoProps {
	title: string;
	description: string;
	canonicalURL: string;
	ogImage: string;
	ogType?: string;
	noindex?: boolean;
	author?: string;
	datePublished?: string | Date;
	dateModified?: string | Date;
	publisherLogo?: string;
	wordCount?: number;
	readingTimeMinutes?: number;
}

export interface BaseLayoutProps extends SeoProps {
	logoSrc?: string;
	heroImageSrc?: string;
	themeColor?: string;
}
