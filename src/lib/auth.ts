import type { AuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { getDb } from '@/lib/db'

interface SsoRow {
  ms_tenant_id?: string
  ms_client_id?: string
  ms_client_secret?: string
}

function getSsoConfig() {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT ms_tenant_id, ms_client_id, ms_client_secret FROM system_config WHERE id = ?')
      .get('default') as SsoRow | undefined
    return {
      tenantId: row?.ms_tenant_id?.trim() || process.env.AZURE_AD_TENANT_ID || 'common',
      clientId: row?.ms_client_id?.trim() || process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: row?.ms_client_secret?.trim() || process.env.AZURE_AD_CLIENT_SECRET || '',
    }
  } catch {
    return { tenantId: 'common', clientId: '', clientSecret: '' }
  }
}

// Read once at server startup — changes to DB config require restart
const cfg = getSsoConfig()

export const authOptions: AuthOptions = {
  providers:
    cfg.clientId && cfg.clientSecret
      ? [
          AzureADProvider({
            clientId: cfg.clientId,
            clientSecret: cfg.clientSecret,
            tenantId: cfg.tenantId,
            authorization: {
              params: { scope: 'openid profile email User.Read' },
            },
          }),
        ]
      : [],
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (profile) {
        token.email = (profile as { mail?: string; userPrincipalName?: string }).mail
          ?? (profile as { mail?: string; userPrincipalName?: string }).userPrincipalName
          ?? token.email
      }
      return token
    },
    async session({ session, token }) {
      if (token.email) session.user = { ...session.user, email: token.email as string }
      return session
    },
  },
}
