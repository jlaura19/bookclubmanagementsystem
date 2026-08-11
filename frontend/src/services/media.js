const API_ORIGIN = import.meta.env.VITE_API_ORIGIN
  || `${window.location.protocol}//${window.location.hostname}:8080`

export function resolveMediaUrl(url) {
  if (!url) {
    return ''
  }

  const trimmedUrl = url.trim()
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl
  }

  if (trimmedUrl.startsWith('/uploads/')) {
    return `${API_ORIGIN}${trimmedUrl}`
  }

  return trimmedUrl
}
