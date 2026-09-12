import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentSchool, setCurrentSchool] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('edushare_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then((school) => {
          setCurrentSchool(school);
        })
        .catch(() => {
          localStorage.removeItem('edushare_token');
          setToken(null);
          setCurrentSchool(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    localStorage.setItem('edushare_token', res.access_token);
    setToken(res.access_token);
    setCurrentSchool(res.school);
    return res.school;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem('edushare_token', res.access_token);
    setToken(res.access_token);
    setCurrentSchool(res.school);
    return res.school;
  };

  const updateProfile = async (updateData) => {
    const updated = await api.updateProfile(updateData);
    setCurrentSchool(updated);
    return updated;
  };

  const logout = () => {
    localStorage.removeItem('edushare_token');
    setToken(null);
    setCurrentSchool(null);
  };

  return (
    <AuthContext.Provider value={{
      currentSchool,
      token,
      loading,
      login,
      register,
      updateProfile,
      logout,
      isAuthenticated: !!currentSchool
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
