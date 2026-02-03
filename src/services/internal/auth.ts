import { generateNonce, SiweMessage } from 'siwe'

export const AuthService = {
  generateNonce: () => {
    return generateNonce()
  },

  verifyMessage: async (message: string, signature: string) => {
    try {
      const siweMessage = new SiweMessage(message)
      const { data: fields } = await siweMessage.verify({ signature })
      return {
        success: true,
        data: fields,
      }
    } catch (error) {
      console.error('SIWE Verification Failed:', error)
      return {
        success: false,
        error,
      }
    }
  },
}
