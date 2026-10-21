import { resolveMediaUrl } from '../services/media'

export default function Avatar({ username = '?', displayName, avatarUrl, size = 36, hideImage = false, className = '' }) {
  const label = (displayName || username || '?').trim()
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }
  if (avatarUrl && !hideImage) {
    return <img className={`avatar avatar-img ${className}`} style={style} src={resolveMediaUrl(avatarUrl)} alt={label} />
  }
  return (
    <span className={`avatar ${className}`} style={style} aria-label={label}>
      {label.charAt(0).toUpperCase()}
    </span>
  )
}
