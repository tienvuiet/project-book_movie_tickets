const messages = {
  RESOURCE_NOT_FOUND: 'Không tìm thấy dữ liệu.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ.',
  ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
  EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng.',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa.',
  BUSINESS_ERROR: 'Không thể thực hiện nghiệp vụ này.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn.',
}

export function friendlyError(error) {
  const code = error?.response?.data?.errorCode || error?.errorCode
  const serverMessage = error?.response?.data?.message
  if (serverMessage) return serverMessage
  return messages[code] || error?.response?.data?.message || error?.message || 'Đã có lỗi xảy ra.'
}
