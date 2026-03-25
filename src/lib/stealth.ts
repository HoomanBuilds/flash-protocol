import {
  generateKeysFromSignature,
  extractViewingPrivateKeyNode,
  generateEphemeralPrivateKey,
  generateStealthAddresses,
  predictStealthSafeAddressWithBytecode,
  generateStealthPrivateKey,
} from '@fluidkey/stealth-account-kit'
import { privateKeyToAccount } from 'viem/accounts'
import { type WalletClient } from 'viem'

// Deterministic message for key generation 
const STEALTH_KEY_MESSAGE = 'Sign this message to generate your Flash Protocol stealth keys.\n\nThis signature is used to derive private keys for privacy-protected payments. It does not authorize any transaction.'

// Safe v1.3.0 proxy bytecode 
const SAFE_PROXY_BYTECODE = '0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050609b806101296000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564' as `0x${string}`

/**
 * CLIENT-SIDE ONLY: Generate stealth key pair from wallet signature.
 * Returns the spending public key, viewing key node (safe to store), and meta-address.
 * The spending PRIVATE key is derived from the signature but never persisted.
 */
export async function generateStealthKeys(walletClient: WalletClient) {
  if (!walletClient.account) throw new Error('Wallet not connected')

  const signature = await walletClient.signMessage({
    message: STEALTH_KEY_MESSAGE,
    account: walletClient.account,
  })

  const { spendingPrivateKey, viewingPrivateKey } = generateKeysFromSignature(signature)

  // Derive public spending key from private
  const spendingAccount = privateKeyToAccount(spendingPrivateKey)
  const spendingPublicKey = spendingAccount.address

  // Extract the viewing key node (BIP-32 HD node)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewingKeyNode = extractViewingPrivateKeyNode(viewingPrivateKey) as any

  // Serialize the HD node for storage (JSON-safe)
  const serializedNode = serializeHDKey(viewingKeyNode)

  // The stealth meta-address is the spending public key 
  const stealthMetaAddress = spendingAccount.publicKey

  return {
    spendingPublicKey,
    viewingKeyNodeSerialized: serializedNode,
    stealthMetaAddress,
  }
}

/**
 * SERVER-SIDE SAFE: Generate a stealth Safe address for a payment.
 * Uses the stored viewing key node + incrementing nonce.
 */
export function generateStealthAddress({
  viewingKeyNodeSerialized,
  spendingPublicKey,
  nonce,
  chainId,
}: {
  viewingKeyNodeSerialized: string
  spendingPublicKey: `0x${string}`
  nonce: number
  chainId: number
}) {
  const viewingKeyNode = deserializeHDKey(viewingKeyNodeSerialized)

  // Generate ephemeral key from viewing node + nonce
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ephemeralPrivateKey } = generateEphemeralPrivateKey({
    viewingPrivateKeyNode: viewingKeyNode as any,
    nonce: BigInt(nonce),
    chainId,
  })

  // Derive the ephemeral public key for later claim
  const ephemeralAccount = privateKeyToAccount(ephemeralPrivateKey)
  const ephemeralPublicKey = ephemeralAccount.address

  // Generate the stealth address (EOA) controlled by the spending key + ephemeral key
  const { stealthAddresses } = generateStealthAddresses({
    spendingPublicKeys: [spendingPublicKey],
    ephemeralPrivateKey,
  })

  const stealthAddress = stealthAddresses[0]

  // Predict the Safe address that will be deployed at this stealth address
  const { stealthSafeAddress } = predictStealthSafeAddressWithBytecode({
    safeProxyBytecode: SAFE_PROXY_BYTECODE,
    threshold: 1,
    stealthAddresses: [stealthAddress],
    chainId,
    safeVersion: '1.3.0',
    useDefaultAddress: true,
  })

  return {
    stealthSafeAddress,
    stealthAddress,
    ephemeralPublicKey: ephemeralPublicKey as `0x${string}`,
  }
}

/**
 * CLIENT-SIDE ONLY: Re-derive the spending private key for claiming.
 * The merchant signs the same message again to get the spending key.
 */
export async function deriveClaimKey({
  walletClient,
  ephemeralPublicKey,
}: {
  walletClient: WalletClient
  ephemeralPublicKey: `0x${string}`
}) {
  if (!walletClient.account) throw new Error('Wallet not connected')

  // Re-sign the same message to get the keys back
  const signature = await walletClient.signMessage({
    message: STEALTH_KEY_MESSAGE,
    account: walletClient.account,
  })

  const { spendingPrivateKey } = generateKeysFromSignature(signature)

  // Derive the stealth private key using spending key + ephemeral public key
  const { stealthPrivateKey } = generateStealthPrivateKey({
    spendingPrivateKey,
    ephemeralPublicKey,
  })

  return { stealthPrivateKey }
}

/**
 * Build a Safe deployment + sweep transaction.
 * Deploys the counterfactual Safe and sweeps all native token to the merchant's wallet.
 */
export function buildClaimTransaction({
  stealthPrivateKey,
  stealthSafeAddress,
  merchantWallet,
  amount,
}: {
  stealthPrivateKey: `0x${string}`
  stealthSafeAddress: `0x${string}`
  merchantWallet: `0x${string}`
  amount: bigint
}) {
  // The stealth private key controls the EOA that owns the Safe
  const stealthAccount = privateKeyToAccount(stealthPrivateKey)

  // Reserve gas for the sweep tx (conservative estimate)
  const gasReserve = BigInt(50000) * BigInt(30e9) // 50k gas * 30 gwei
  const sweepAmount = amount - gasReserve

  if (sweepAmount <= BigInt(0)) {
    throw new Error('Balance too low to cover gas for claiming')
  }

  return {
    stealthAccount,
    sweepAmount,
    to: merchantWallet,
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeHDKey(node: any): string {
  return JSON.stringify({
    chainCode: node.chainCode ? Buffer.from(node.chainCode).toString('hex') : null,
    privateKey: node.privateKey ? Buffer.from(node.privateKey).toString('hex') : null,
    publicKey: node.publicKey ? Buffer.from(node.publicKey).toString('hex') : null,
    index: node.index,
    depth: node.depth,
    parentFingerprint: node.parentFingerprint,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeHDKey(serialized: string): any {
  const data = JSON.parse(serialized)

  // Reconstruct using @scure/bip32 HDKey directly
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HDKey } = require('@scure/bip32')

  const hasPrivateKey = !!data.privateKey

  const hdkey = new HDKey({
    chainCode: data.chainCode ? Uint8Array.from(Buffer.from(data.chainCode, 'hex')) : undefined,
    privateKey: hasPrivateKey ? Uint8Array.from(Buffer.from(data.privateKey, 'hex')) : undefined,
    publicKey: (!hasPrivateKey && data.publicKey) ? Uint8Array.from(Buffer.from(data.publicKey, 'hex')) : undefined,
    index: data.index,
    depth: data.depth,
    parentFingerprint: data.parentFingerprint,
  })

  return hdkey
}
