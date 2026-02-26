import {
  Connection,
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  TransactionInstruction,
  clusterApiUrl,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

// Connection
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta')

let _connection: Connection | null = null

export function getSolanaConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC, 'confirmed')
  }
  return _connection
}

/**
 * Build a VersionedTransaction for a native SOL transfer.
 * The caller is responsible for signing and sending.
 */
export async function buildSolTransfer(
  from: PublicKey,
  to: PublicKey,
  lamports: bigint
): Promise<VersionedTransaction> {
  const connection = getSolanaConnection()
  const { blockhash } = await connection.getLatestBlockhash('confirmed')

  const instructions: TransactionInstruction[] = [
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: BigInt(lamports),
    }),
  ]

  const messageV0 = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message()

  return new VersionedTransaction(messageV0)
}

/**
 * Build a VersionedTransaction for an SPL token transfer.
 * Creates the destination ATA if it doesn't exist.
 */
export async function buildSplTokenTransfer(
  from: PublicKey,
  to: PublicKey,
  mint: PublicKey,
  amount: bigint
): Promise<VersionedTransaction> {
  const connection = getSolanaConnection()
  const { blockhash } = await connection.getLatestBlockhash('confirmed')

  const sourceAta = await getAssociatedTokenAddress(mint, from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
  const destAta = await getAssociatedTokenAddress(mint, to, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)

  const instructions: TransactionInstruction[] = []

  // Create destination ATA if it doesn't exist
  try {
    await getAccount(connection, destAta)
  } catch {
    instructions.push(
      createAssociatedTokenAccountInstruction(from, destAta, to, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
    )
  }

  instructions.push(createTransferInstruction(sourceAta, destAta, from, BigInt(amount)))

  const messageV0 = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message()

  return new VersionedTransaction(messageV0)
}

/**
 * Deserialize a base64-encoded serialized Solana transaction (as returned by Rango).
 */
export function deserializeSolanaTransaction(serializedMessage: string): VersionedTransaction {
  const buffer = Buffer.from(serializedMessage, 'base64')
  return VersionedTransaction.deserialize(buffer)
}

// Solana address check 
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Native SOL "mint" address placeholder (Solana convention)
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111111'

export function isSolNative(address: string): boolean {
  return (
    address === NATIVE_SOL_MINT ||
    address === '11111111111111111111111111111111' ||
    address === '' ||
    address === 'native'
  )
}
