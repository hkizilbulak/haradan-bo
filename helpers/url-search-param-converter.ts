export default function checkAndConvertParams(params?: any): URLSearchParams {
  let uRLSearchParams = new URLSearchParams();
  if (!params) {
    return uRLSearchParams;
  }
  Object.keys(params).forEach((key) => {
    if ((params as any)[key] !== null) {
      uRLSearchParams.append(key, (params as any)[key]);
    }
  });
  return uRLSearchParams;
}
