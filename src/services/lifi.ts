import { createConfig, getRoutes, getStatus, RoutesRequest, GetStatusRequest, StatusResponse } from '@lifi/sdk'

// Initialize LI.FI SDK
createConfig({
  integrator: 'crypto-payment-gateway',
})

export const LifiService = {
  getQuote: async (params: RoutesRequest) => {
    try {
      const routes = await getRoutes(params)
      return {
        success: true,
        routes: routes.routes,
      }
    } catch (error) {
      console.error('LI.FI Quote Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quotes',
      }
    }
  },

  getTransactionStatus: async (params: GetStatusRequest): Promise<StatusResponse | null> => {
    try {
      const status = await getStatus(params)
      return status
    } catch (error) {
      console.error('LI.FI Status Error:', error)
      return null
    }
  },
}
