import { useSyncExternalStore } from 'react'

function getMatches(query: string): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
	return useSyncExternalStore(
		(onStoreChange) => {
			const mediaQueryList = window.matchMedia(query)
			mediaQueryList.addEventListener('change', onStoreChange)

			return () => mediaQueryList.removeEventListener('change', onStoreChange)
		},
		() => getMatches(query),
		() => false,
	)
}
