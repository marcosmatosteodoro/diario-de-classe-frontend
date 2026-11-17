'use client';

import { createContext, useContext } from 'react';

const NonceContext = createContext(undefined);

export const useNonce = () => useContext(NonceContext);

export const NonceProvider = ({ nonce, children }) => (
  <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>
);
