import axios from 'axios';

/** Replace with env-based URL when you add react-native-config / build flavors */
export const api = axios.create({
  baseURL: 'https://api.sazda.app',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});
