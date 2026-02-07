// Auth disabled — stub client
export const authClient = {
  useSession: () => ({ data: null }),
  signOut: async () => {},
}
