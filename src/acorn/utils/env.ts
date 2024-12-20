export const env = (key: string) => {
  return process.env[key] ?? "";
};
