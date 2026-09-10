declare const __APP_ID__: string

/**
 * The app this core bundle serves ('dimcrochet' | 'dimknit'), injected by the
 * app's Vite define. Drives per-app storage namespacing and interchange
 * envelope ids so sibling apps never share data or read each other's files.
 */
export const APP_ID: string = typeof __APP_ID__ !== 'undefined' ? __APP_ID__ : 'dimcrochet'
