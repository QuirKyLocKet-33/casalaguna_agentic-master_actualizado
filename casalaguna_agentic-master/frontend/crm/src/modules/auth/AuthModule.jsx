import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../shared/services/api';
import { FaUser, FaLock, FaArrowRight } from 'react-icons/fa';
import './Auth.css';

function AuthModule({ setIsAuthenticated, setUser }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(username, password);
      console.log('✅ Login exitoso:', response);
      if (setIsAuthenticated) setIsAuthenticated(true);
      if (setUser) setUser(response.user || response);
      setTimeout(() => {
        navigate('/panel');
      }, 500);
    } catch (err) {
      console.error('❌ Error de login:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Error al iniciar sesión';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Elementos decorativos animados */}
      <div className="auth-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>

      <div className="auth-layout">
        {/* Panel izquierdo — Hero visual */}
        <div className="auth-hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Casa<br />
              <span className="hero-accent">Laguna</span>
            </h1>
            <p className="hero-subtitle">
              Gestión inteligente de reservas, conversaciones y clientes en un solo lugar.
            </p>
            <div className="hero-features">
              <div className="hero-feature">
                <span className="feature-dot"></span>
                <span>Automatiza reservas sin esfuerzo</span>
              </div>
              <div className="hero-feature">
                <span className="feature-dot"></span>
                <span>IA que anticipa las necesidades de tus clientes</span>
              </div>
              <div className="hero-feature">
                <span className="feature-dot"></span>
                <span>Conecta y gestiona desde cualquier canal</span>
              </div>
            </div>
            <div className="hero-badge">
              <span className="badge-title">ReserveFlow</span>
              <span className="badge-subtitle">by SynaptiQ</span>
            </div>
          </div>
          <div className="hero-decoration">
            <div className="deco-ring ring-1"></div>
            <div className="deco-ring ring-2"></div>
            <div className="deco-ring ring-3"></div>
          </div>
        </div>

        {/* Panel derecho — Formulario de login */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="card-header">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para acceder al panel</p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className={`input-group ${focusedField === 'username' ? 'focused' : ''} ${username ? 'has-value' : ''}`}>
                <div className="input-icon">
                  <FaUser size={14} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Usuario"
                  disabled={loading}
                  autoComplete="username"
                />
                <div className="input-line"></div>
              </div>

              <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                <div className="input-icon">
                  <FaLock size={14} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Contraseña"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <div className="input-line"></div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="login-btn">
                <span className="btn-text">
                  {loading ? 'Verificando...' : 'Acceder al Panel'}
                </span>
                {!loading && <FaArrowRight className="btn-arrow" size={14} />}
                {loading && <div className="btn-spinner"></div>}
              </button>
            </form>

            <div className="card-footer">
              <span>Sistema exclusivo para administradores</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModule;
