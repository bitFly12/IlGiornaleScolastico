# Nota sulla Sicurezza - API Keys

## ⚠️ IMPORTANTE: Chiavi API nel Codice Client

### Supabase Keys

Le chiavi Supabase (SUPABASE_URL e SUPABASE_KEY) sono **intenzionalmente** esposte nel codice client perché:

1. **Supabase Anon Key** è progettata per essere pubblica
2. La sicurezza è garantita da **Row Level Security (RLS)** nel database
3. Tutte le operazioni sensibili sono protette da RLS policies
4. È il pattern standard raccomandato da Supabase

### Resend API Key

La chiave Resend è salvata nel database per questi motivi:

1. **Non dovrebbe** essere usata direttamente dal client
2. Deve essere spostata in una **Supabase Edge Function**
3. La Edge Function leggerà la chiave dal database o da Supabase Secrets
4. Il client chiamerà solo la Edge Function, non Resend direttamente

## 🔒 Raccomandazioni per Produzione

### 1. Resend API (PRIORITÀ ALTA)

```javascript
// ❌ MAI fare questo dal client:
const resend = new Resend(API_KEY);

// ✅ SEMPRE usare Edge Function:
const { data } = await supabase.functions.invoke('send-newsletter', {
  body: { articleId }
});
```

### 2. Boss Emails (PRIORITÀ MEDIA)

Invece di hardcodare:
```javascript
const bossEmails = ['capo@cesaris.edu', 'admin@cesaris.edu'];
```

Creare una tabella:
```sql
CREATE TABLE admin_emails (
  email TEXT PRIMARY KEY,
  role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT true
);
```

### 3. Supabase Keys (PRIORITÀ BASSA)

Le chiavi Supabase sono OK nel client SE:
- ✅ RLS è configurato correttamente
- ✅ Policies proteggono tutti i dati sensibili
- ✅ Service Role key NON è mai esposta
- ✅ Anon key ha solo permessi pubblici

## 📋 Checklist Sicurezza

Prima del deployment in produzione:

- [ ] Verificare che tutte le tabelle hanno RLS abilitato
- [ ] Testare che utenti non autenticati non vedano dati sensibili
- [ ] Spostare Resend API in Edge Function
- [ ] Spostare boss emails in database
- [ ] Configurare Supabase Secrets per chiavi sensibili
- [ ] Testare con utente non privilegiato
- [ ] Audit RLS policies
- [ ] Abilitare rate limiting su Edge Functions

## 🛡️ Row Level Security (RLS)

Esempi di policies da verificare:

```sql
-- Solo utenti autenticati possono vedere profili
CREATE POLICY "Authenticated users can view profiles"
ON profili_redattori FOR SELECT
TO authenticated
USING (true);

-- Solo proprietario può modificare articolo
CREATE POLICY "Users can update own articles"
ON articoli FOR UPDATE
TO authenticated
USING (autore_id = auth.uid());

-- Solo admin possono eliminare
CREATE POLICY "Only admins can delete"
ON articoli FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profili_redattori
    WHERE id = auth.uid()
    AND ruolo = 'Caporedattore'
  )
);
```

## 🔧 Setup Edge Function per Newsletter

```bash
# 1. Crea la funzione
supabase functions new send-newsletter

# 2. Configura il secret (NON nel codice!)
supabase secrets set RESEND_API_KEY=re_xxx

# 3. Deploy
supabase functions deploy send-newsletter

# 4. Testa
supabase functions logs send-newsletter
```

## 📚 Risorse

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend API Best Practices](https://resend.com/docs/send-with-supabase-edge-functions)

---

**Ricorda**: La sicurezza è un processo continuo, non un evento una tantum!
