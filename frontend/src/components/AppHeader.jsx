import { Link } from 'react-router-dom'
import TopNav from './TopNav'

export default function AppHeader({ title, subtitle, primaryAction }) {
  return (
    <>
      <TopNav />
      <header className="page-title-row">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {primaryAction && (
          <Link to={primaryAction.to} className="primary-button">
            {primaryAction.label}
          </Link>
        )}
      </header>
    </>
  )
}
