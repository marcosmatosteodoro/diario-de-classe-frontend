import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useHealth = (options = {}) => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    ...options,
  });
};
