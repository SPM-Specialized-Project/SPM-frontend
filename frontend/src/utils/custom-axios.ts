import axios from 'axios';

import storage from '@/helpers/storage';

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? '/api',
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token: string | null = storage.getItem('token');
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error('Error in axios');
    Promise.reject(error);
  },
);

export default instance;
