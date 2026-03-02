/**
 * HTML-safe search text highlighting utilities.
 */

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function highlightText(text: string, search: string): string {
	const escaped = escapeHtml(text);
	if (!search) return escaped;
	const term = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`(${term})`, 'gi');
	return escaped.replace(regex, '<mark class="search-hl">$1</mark>');
}
