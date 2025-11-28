export function setToken({
  accessToken,
  refreshToken,
  tokenType,
  expiresIn,
  user,
}) {
  const token = {
    accessToken,
    refreshToken,
    tokenType,
    expiresIn,
    user,
  };
  localStorage.setItem('token', JSON.stringify(token));
}

export function getToken() {
  const tokenString = localStorage.getItem('token');
  return tokenString ? JSON.parse(tokenString) : null;
}

export function removeToken() {
  localStorage.removeItem('token');
}
