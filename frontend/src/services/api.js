import axios from 'axios';

const API_BASE_URL = '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('edushare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Stats
  getStats: () => client.get('/stats').then((res) => res.data),
  getTransfers: () => client.get('/stats/transfers').then((res) => res.data),

  // Schools
  getSchools: () => client.get('/schools').then((res) => res.data),
  getSchool: (id) => client.get(`/schools/${id}`).then((res) => res.data),

  // Auth & Profile
  register: (data) => client.post('/auth/register', data).then((res) => res.data),
  login: (data) => client.post('/auth/login', data).then((res) => res.data),
  getMe: () => client.get('/auth/me').then((res) => res.data),
  updateProfile: (data) => client.put('/auth/profile', data).then((res) => res.data),

  // Surplus
  getSurplus: (params) => client.get('/surplus', { params }).then((res) => res.data),
  createSurplus: (data) => client.post('/surplus', data).then((res) => res.data),
  analyzeImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/surplus/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },

  // Needs
  getNeeds: (params) => client.get('/needs', { params }).then((res) => res.data),
  createNeed: (data) => client.post('/needs', data).then((res) => res.data),

  // Agent & HITL
  getTasks: (params) => client.get('/agent/tasks', { params }).then((res) => res.data),
  approveTask: (taskId) => client.post(`/agent/approve/${taskId}`).then((res) => res.data),
  rejectTask: (taskId) => client.post(`/agent/reject/${taskId}`).then((res) => res.data),
};

export default api;
