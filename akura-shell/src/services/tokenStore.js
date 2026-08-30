let refreshToken = ''

export function getRefreshToken() {
  return refreshToken
}

export function setRefreshToken(token) {
  refreshToken = typeof token === 'string' ? token : ''
}

export function clearRefreshToken() {
  refreshToken = ''
}
