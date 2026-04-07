import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(onStoreChange: () => void) {
	const mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
	mediaQueryList.addEventListener("change", onStoreChange)
	return () => mediaQueryList.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
	if (typeof window === 'undefined') {
		return false
	}

	return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
	return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
