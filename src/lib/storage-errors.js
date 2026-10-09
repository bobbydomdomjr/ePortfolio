export function describeImageUploadError(error) {
  const message = typeof error?.message === 'string' ? error.message : ''
  const detail = [message, error?.statusCode].filter(Boolean).join(' ')

  if (/bucket.*not found|not found.*bucket/i.test(detail)) {
    return 'The portfolio-images bucket is missing. Run the portfolio image Storage migration in the Supabase SQL Editor, then try again.'
  }
  if (/row-level security|permission denied|not authorized|unauthorized|\b403\b/i.test(detail)) {
    return 'Supabase denied this upload. Run the portfolio image Storage migration and sign out and back in with your portfolio admin account.'
  }
  if (/mime|content.?type|media type/i.test(detail)) {
    return 'Supabase rejected this image format. Choose a JPG, PNG, WebP, or GIF image.'
  }
  if (/too large|payload too large|file size|\b413\b/i.test(detail)) {
    return 'Supabase rejected the image because it is too large. Choose an image no larger than 5 MB.'
  }

  const status = error?.statusCode ? ` (${error.statusCode})` : ''
  return `Image upload failed${status}: ${message || 'Supabase returned an unknown error.'}`
}
