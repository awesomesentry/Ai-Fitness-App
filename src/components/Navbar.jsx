const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'workout', label: 'Workouts', icon: '🏋️' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'coach', label: 'AI Coach', icon: '🤖' }
]

export default function Navbar({
  activeTab,
  onTabChange,
  profile,
  user,
  guestMode,
  onEditProfile,
  onSignOut
}) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <button type="button" className="brand" onClick={() => onTabChange('dashboard')}>
          <span className="brand__mark" aria-hidden="true">
            ⚡
          </span>
          <span className="brand__text">
            <strong>AI Fitness Coach</strong>
            <small>Home &amp; resistance-band training</small>
          </span>
        </button>

        <nav className="nav" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav__item${activeTab === tab.id ? ' nav__item--active' : ''}`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => onTabChange(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="navbar__profile">
          <div className="avatar" aria-hidden="true">
            {(profile?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="navbar__profile-meta">
            <strong>{profile?.name || 'Athlete'}</strong>
            <small className="navbar__account">
              {user ? user.email : guestMode ? 'Demo mode - not signed in' : ''}
            </small>
            <div className="navbar__account-actions">
              <button type="button" className="link-button" onClick={onEditProfile}>
                Edit profile
              </button>
              <button type="button" className="link-button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
