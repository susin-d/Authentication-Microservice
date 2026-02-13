import { useState, useEffect } from 'react'
import axios from 'axios'

// Configure axios defaults
axios.defaults.withCredentials = true

function App() {
  const [apiUrl] = useState('https://auth.susindran.in/api/v1/auth')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [healthStatus, setHealthStatus] = useState('checking')
  const [profile, setProfile] = useState(null)

  // Form states
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    frontendUrl: 'https://susindran.in'
  })

  const [signinData, setSigninData] = useState({
    email: '',
    password: ''
  })

  const [profileData, setProfileData] = useState({
    full_name: '',
    phone_number: '',
    bio: '',
    date_of_birth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  })

  // Check health status on mount
  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      const res = await axios.get('https://auth.susindran.in/health')
      setHealthStatus(res.data.status === 'UP' ? 'online' : 'offline')
    } catch (error) {
      setHealthStatus('offline')
    }
  }

  const displayResponse = (data, type = 'success') => {
    setResponse({
      data: JSON.stringify(data, null, 2),
      type,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`${apiUrl}/signup`, signupData)
      displayResponse({
        status: 'success',
        message: 'User created successfully!',
        data: res.data
      }, 'success')
      // Clear form
      setSignupData({ email: '', password: '', frontendUrl: 'https://susindran.in' })
    } catch (error) {
      displayResponse({
        status: 'error',
        message: error.response?.data?.error || error.message,
        details: error.response?.data?.details
      }, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`${apiUrl}/signin`, signinData)
      setAccessToken(res.data.access_token)
      displayResponse({
        status: 'success',
        message: 'Signed in successfully!',
        user: res.data.user,
        token_preview: res.data.access_token.substring(0, 50) + '...'
      }, 'success')
      // Clear form
      setSigninData({ email: '', password: '' })
    } catch (error) {
      displayResponse({
        status: 'error',
        message: error.response?.data?.error || error.message,
        remainingMinutes: error.response?.data?.remainingMinutes
      }, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    displayResponse({
      status: 'info',
      message: 'Redirecting to Google OAuth...',
      note: 'After authentication, you will be redirected back to this page'
    }, 'info')
    // Pass the current frontend URL so backend knows where to redirect after OAuth
    const currentUrl = window.location.origin
    window.location.href = `${apiUrl}/google?frontend_url=${encodeURIComponent(currentUrl)}`
  }

  const handleDeleteAccount = async () => {
    if (!accessToken) {
      displayResponse({
        status: 'error',
        message: 'Please sign in first to get an access token'
      }, 'error')
      return
    }

    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const res = await axios.delete(`${apiUrl}/delete-account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      setAccessToken('')
      setProfile(null)
      displayResponse({
        status: 'success',
        message: 'Account deleted successfully!',
        data: res.data
      }, 'success')
    } catch (error) {
      displayResponse({
        status: 'error',
        message: error.response?.data?.error || error.message
      }, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGetProfile = async () => {
    if (!accessToken) {
      displayResponse({
        status: 'error',
        message: 'Please sign in first to get an access token'
      }, 'error')
      return
    }

    setLoading(true)
    try {
      const res = await axios.get(`${apiUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      setProfile(res.data)
      setProfileData({
        full_name: res.data.full_name || '',
        phone_number: res.data.phone_number || '',
        bio: res.data.bio || '',
        date_of_birth: res.data.date_of_birth || '',
        address: res.data.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        }
      })
      displayResponse({
        status: 'success',
        message: 'Profile fetched successfully!',
        profile: res.data
      }, 'success')
    } catch (error) {
      displayResponse({
        status: 'error',
        message: error.response?.data?.error || error.message
      }, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!accessToken) {
      displayResponse({
        status: 'error',
        message: 'Please sign in first to get an access token'
      }, 'error')
      return
    }

    setLoading(true)
    try {
      const res = await axios.put(`${apiUrl}/profile`, profileData, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      setProfile(res.data.profile)
      displayResponse({
        status: 'success',
        message: 'Profile updated successfully!',
        profile: res.data.profile
      }, 'success')
    } catch (error) {
      displayResponse({
        status: 'error',
        message: error.response?.data?.error || error.message
      }, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>
          M-Auth API Test
          <span className="version">v1.0.2</span>
        </h1>
        <p>React Frontend for Testing Authentication APIs</p>
        <div className="api-url">API: {apiUrl}</div>
        <div className="health-status">
          <div className={`status-indicator ${healthStatus === 'offline' ? 'offline' : ''}`}></div>
          <span>Server Status: <strong>{healthStatus === 'online' ? '🟢 Online' : '🔴 Offline'}</strong></span>
          <button onClick={checkHealth} style={{ marginLeft: 'auto', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd' }}>
            Refresh
          </button>
        </div>
        {accessToken && profile && (
          <div className="user-info">
            <strong>👤 {profile.email}</strong>
            {profile.full_name && <span> • {profile.full_name}</span>}
            <span style={{ marginLeft: 'auto', fontSize: '0.9em', color: '#666' }}>
              Provider: {profile.provider || 'password'}
            </span>
          </div>
        )}
      </div>

      <div className="container">
        {/* Signup Card */}
        <div className="card">
          <h2>
            <span>📝 Sign Up</span>
            <span className="badge">POST</span>
          </h2>
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                placeholder="Password123!"
                required
              />
              <small>Min 8 chars, uppercase, lowercase, number</small>
            </div>
            <div className="form-group">
              <label>Frontend URL (Optional)</label>
              <input
                type="url"
                value={signupData.frontendUrl}
                onChange={(e) => setSignupData({ ...signupData, frontendUrl: e.target.value })}
                placeholder="https://yourdomain.com"
              />
              <small>Must be HTTPS. Used for email verification redirect.</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner"></span> : '✉️'} Sign Up
            </button>
          </form>
        </div>

        {/* Signin Card */}
        <div className="card">
          <h2>
            <span>🔐 Sign In</span>
            <span className="badge">POST</span>
          </h2>
          <form onSubmit={handleSignin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={signinData.email}
                onChange={(e) => setSigninData({ ...signinData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={signinData.password}
                onChange={(e) => setSigninData({ ...signinData, password: e.target.value })}
                placeholder="Password123!"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner"></span> : '🔑'} Sign In
            </button>
          </form>

          <button 
            onClick={handleGoogleAuth} 
            className="btn btn-google"
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* Delete Account Card */}
        <div className="card">
          <h2>
            <span>🗑️ Delete Account</span>
            <span className="badge delete">DELETE</span>
          </h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Requires access token from sign in. This action is permanent.
          </p>
          {accessToken && (
            <div className="token-display">
              <strong>Current Access Token:</strong>
              <code>{accessToken.substring(0, 60)}...</code>
            </div>
          )}
          <button 
            onClick={handleDeleteAccount} 
            className="btn btn-danger"
            disabled={loading || !accessToken}
            style={{ marginTop: accessToken ? '15px' : '0' }}
          >
            {loading ? <span className="spinner"></span> : '⚠️'} Delete Account
          </button>
          {!accessToken && (
            <small style={{ display: 'block', marginTop: '10px', color: '#999', textAlign: 'center' }}>
              Sign in first to get an access token
            </small>
          )}
        </div>

        {/* Get Profile Card */}
        <div className="card">
          <h2>
            <span>👤 Get Profile</span>
            <span className="badge">GET</span>
          </h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Fetch your complete user profile with all details.
          </p>
          <button 
            onClick={handleGetProfile} 
            className="btn btn-primary"
            disabled={loading || !accessToken}
          >
            {loading ? <span className="spinner"></span> : '📥'} Get Profile
          </button>
          {!accessToken && (
            <small style={{ display: 'block', marginTop: '10px', color: '#999', textAlign: 'center' }}>
              Sign in first to get an access token
            </small>
          )}
          {profile && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, fontSize: '1.1em', marginBottom: '10px' }}>Profile Info</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '0.95em' }}>
                <div><strong>Email:</strong> {profile.email}</div>
                {profile.full_name && <div><strong>Name:</strong> {profile.full_name}</div>}
                {profile.phone_number && <div><strong>Phone:</strong> {profile.phone_number}</div>}
                {profile.bio && <div><strong>Bio:</strong> {profile.bio}</div>}
                {profile.date_of_birth && <div><strong>DOB:</strong> {profile.date_of_birth}</div>}
                <div><strong>Provider:</strong> {profile.provider}</div>
                <div><strong>Verified:</strong> {profile.email_verified ? '✅ Yes' : '❌ No'}</div>
                {profile.last_login_at && <div><strong>Last Login:</strong> {new Date(profile.last_login_at).toLocaleString()}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Update Profile Card */}
        <div className="card">
          <h2>
            <span>✏️ Update Profile</span>
            <span className="badge update">PUT</span>
          </h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profileData.phone_number}
                onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                placeholder="+1-555-0123"
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={profileData.date_of_birth}
                onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
              />
            </div>
            <div style={{ marginTop: '15px', marginBottom: '10px' }}>
              <strong>Address</strong>
            </div>
            <div className="form-group">
              <label>Street</label>
              <input
                type="text"
                value={profileData.address.street}
                onChange={(e) => setProfileData({ 
                  ...profileData, 
                  address: { ...profileData.address, street: e.target.value }
                })}
                placeholder="123 Main St"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profileData.address.city}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    address: { ...profileData.address, city: e.target.value }
                  })}
                  placeholder="San Francisco"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={profileData.address.state}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    address: { ...profileData.address, state: e.target.value }
                  })}
                  placeholder="CA"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>ZIP</label>
                <input
                  type="text"
                  value={profileData.address.zip}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    address: { ...profileData.address, zip: e.target.value }
                  })}
                  placeholder="94102"
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={profileData.address.country}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    address: { ...profileData.address, country: e.target.value }
                  })}
                  placeholder="USA"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !accessToken}>
              {loading ? <span className="spinner"></span> : '💾'} Update Profile
            </button>
            {!accessToken && (
              <small style={{ display: 'block', marginTop: '10px', color: '#999', textAlign: 'center' }}>
                Sign in first to update your profile
              </small>
            )}
          </form>
        </div>

        {/* Response Display */}
        {response && (
          <div className="card response-container">
            <h2>📡 Response</h2>
            <small style={{ color: '#999', display: 'block', marginBottom: '10px' }}>
              {response.timestamp}
            </small>
            <div className={`response-box ${response.type}`}>
              {response.data}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
