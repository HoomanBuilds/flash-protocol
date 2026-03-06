import { config } from 'dotenv'
config({ path: '.env.local' })

import { createConfig, getTokens } from '@lifi/sdk'
import { RangoClient } from 'rango-sdk-basic'
import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

createConfig({ integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol' })
OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT

async function main() {
  console.log('=== SOLANA TOKENS FROM PROVIDERS ===\n')

  // LiFi - Solana chainId is 1151111081099710
  try {
    const res = await getTokens({ chains: [1151111081099710] })
    const tokens = res.tokens?.[1151111081099710] || []
    console.log(`LiFi Solana tokens: ${tokens.length}`)
    tokens.slice(0, 10).forEach((t: any) => console.log(`  ${t.symbol.padEnd(12)} ${t.address.slice(0,20)}... decimals=${t.decimals}`))
    if (tokens.length > 10) console.log(`  ... +${tokens.length - 10} more`)
  } catch (e) { console.error('LiFi failed:', e) }

  // Rango
  try {
    const apiKey = process.env.RANGO_API_KEY
    if (apiKey && apiKey.length > 10) {
      const client = new RangoClient(apiKey)
      const meta = await client.meta()
      const solTokens = (meta.tokens || []).filter((t: any) => t.blockchain === 'SOLANA')
      console.log(`\nRango Solana tokens: ${solTokens.length}`)
      solTokens.slice(0, 10).forEach((t: any) => console.log(`  ${(t.symbol||'?').padEnd(12)} ${(t.address||'native').slice(0,20)}... decimals=${t.decimals}`))
      if (solTokens.length > 10) console.log(`  ... +${solTokens.length - 10} more`)
    }
  } catch (e) { console.error('Rango failed:', e) }

  // NEAR Intents
  try {
    if (process.env.NEAR_INTENTS_JWT) {
      const tokens = await OneClickService.getTokens()
      const solTokens = (tokens || []).filter((t: any) => t.blockchain === 'solana')
      console.log(`\nNEAR Intents Solana tokens: ${solTokens.length}`)
      solTokens.slice(0, 10).forEach((t: any) => console.log(`  ${(t.symbol||'?').padEnd(12)} ${(t.contractAddress||'native').slice(0,20)}... decimals=${t.decimals} assetId=${t.assetId}`))
      if (solTokens.length > 10) console.log(`  ... +${solTokens.length - 10} more`)
    }
  } catch (e) { console.error('NEAR failed:', e) }

  // Bitcoin
  console.log('\n=== BITCOIN CHAIN TOKENS ===\n')
  try {
    if (process.env.NEAR_INTENTS_JWT) {
      const tokens = await OneClickService.getTokens()
      const btcTokens = (tokens || []).filter((t: any) => t.blockchain === 'bitcoin')
      console.log(`NEAR Intents Bitcoin tokens: ${btcTokens.length}`)
      btcTokens.forEach((t: any) => console.log(`  ${(t.symbol||'?').padEnd(12)} ${(t.contractAddress||'native')} decimals=${t.decimals} assetId=${t.assetId}`))
    }
  } catch (e) { console.error('NEAR BTC failed:', e) }

  try {
    const apiKey = process.env.RANGO_API_KEY
    if (apiKey && apiKey.length > 10) {
      const client = new RangoClient(apiKey)
      const meta = await client.meta()
      const btcTokens = (meta.tokens || []).filter((t: any) => t.blockchain === 'BTC')
      console.log(`\nRango Bitcoin tokens: ${btcTokens.length}`)
      btcTokens.forEach((t: any) => console.log(`  ${(t.symbol||'?').padEnd(12)} ${(t.address||'native')} decimals=${t.decimals}`))
    }
  } catch (e) { console.error('Rango BTC failed:', e) }
}

main().catch(e => { console.error(e); process.exit(1) })
