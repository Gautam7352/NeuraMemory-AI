import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://neuramemory-ai.onrender.com',
  withCredentials: true,
});
