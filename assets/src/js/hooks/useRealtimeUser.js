import { usePermEvents } from './usePermEvents';
import { createUserHandlers } from '../broadcasts';

export function useRealtimeUser(user, setUser) {
  usePermEvents(createUserHandlers(user, setUser));
}