# 🛠️ OPERATIONS — Troubleshooting, Monitoramento, Suporte

> Documentação focada em **QUANDO ALGO DÁ ERRADO**. Troubleshooting, monitoramento, logs, incident response, maintenance, runbooks.
>
> **Público**: Operations, Suporte, Tech Leads, SREs

---

## 📁 Conteúdo desta Pasta

```
06-OPERATIONS/
├── README.md                    ← Você está aqui
├── TROUBLESHOOTING.md           ← Problemas comuns e soluções
├── MONITORING.md                ← Logs, métricas, alertas
├── INCIDENT_RESPONSE.md         ← Como responder a incidents
├── DEBUGGING.md                 ← Debugging em produção
├── PERFORMANCE.md               ← Profiling, otimização, bottlenecks
├── SCALING_OPS.md               ← Escalabilidade em produção
├── BACKUP_RESTORE.md            ← Backup strategy, restore procedures
├── MAINTENANCE.md               ← Manutenção programada, upgrades
├── RUNBOOKS.md                  ← Procedimentos passo-a-passo
└── dashboards/
    └── GRAFANA.md               ← Dashboards Grafana (se aplicável)
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **TROUBLESHOOTING.md** | Problemas comuns (wake word, SSE, memória) | 20–30 min | Todos |
| **MONITORING.md** | Logs Vercel, métricas Datadog, alertas | 30–45 min | Ops, SRE |
| **INCIDENT_RESPONSE.md** | Escalação, comunicação, post-mortem | 20–30 min | Leads, Ops |
| **DEBUGGING.md** | Debugar em produção, logs verbosos | 15–20 min | Devs, Ops |
| **PERFORMANCE.md** | Profiling, N+1 queries, caching | 30–45 min | Arch, Devs |
| **SCALING_OPS.md** | Autoscaling, rate limits, load balancing | 30–45 min | Ops, Arch |
| **BACKUP_RESTORE.md** | Estratégia backup, restore Supabase | 20–30 min | Ops, DevOps |
| **MAINTENANCE.md** | Manutenção, upgrades, downtime | 20–30 min | Ops |
| **RUNBOOKS.md** | Procedimentos passo-a-passo | 20–30 min | Ops |

---

## 🎯 Guia de Navegação

### "O sistema está lento!"
→ Leia **PERFORMANCE.md** (45 min)

### "Erro no chat!"
→ Leia **TROUBLESHOOTING.md** (30 min) → **DEBUGGING.md** (20 min)

### "Como monitoro?"
→ Leia **MONITORING.md** (45 min)

### "Incident em produção!"
→ Leia **INCIDENT_RESPONSE.md** (30 min)

### "Como faço backup?"
→ Leia **BACKUP_RESTORE.md** (30 min)

### "Como escalo?"
→ Leia **SCALING_OPS.md** (45 min)

### "Need a runbook?"
→ Leia **RUNBOOKS.md** (30 min)

---

## 🆘 Troubleshooting Rápido

| Problema | Causa Provável | Solução |
|---|---|---|
| **Chat não responde** | Claude API offline ou rate limit | Verifique `ANTHROPIC_API_KEY`, logs |
| **Voz não funciona** | Não é Chrome ou sem permissão | Tente Chrome, permitting mic |
| **Agentes não aparecem** | Supabase down ou RLS broken | Verifique Supabase status, RLS policies |
| **Deploy falhou** | Build error ou env vars faltando | `npm run build` local, check Vercel logs |
| **Lento demais** | N+1 queries ou cache miss | Veja **PERFORMANCE.md** |

---

## 📊 Monitoramento Essencial

| O Quê Monitorar | Ferramenta | Normal | Alerta |
|---|---|---|---|
| **Errors** | Vercel Logs | <0.1% req | >0.1% req |
| **Latency** | Datadog | <200ms p95 | >500ms p95 |
| **CPU** | Vercel Metrics | <50% | >80% |
| **DB Connections** | Supabase | <50 | >100 |
| **API calls/min** | Anthropic | <1000 | >5000 |

---

## 🔗 Links Relacionados

- **Development (debugging local)** → [`03-DEVELOPMENT/DEBUGGING.md`](../03-DEVELOPMENT/DEBUGGING.md)
- **Deployment (health checks)** → [`05-DEPLOYMENT/MONITORING.md`](../05-DEPLOYMENT/MONITORING.md)
- **Architecture** → [`02-ARCHITECTURE/`](../02-ARCHITECTURE/)

---

## 📝 Checklist para Ops

- [ ] Monitoring alertas configurados
- [ ] Logs centralizados (Vercel + Datadog)
- [ ] Backup strategy definido
- [ ] Incident response plan documentado
- [ ] Runbooks para tarefas críticas
- [ ] Post-mortem process definido
- [ ] Escalation matrix clara

---

## 🚨 Incident Response Flow

```
1. Detectar (alert ou user report)
2. Confirmar (é real?)
3. Comunicar (Slack, status page)
4. Investigar (logs, metrics, debugging)
5. Remediate (fix, rollback, scaling)
6. Verify (health checks, customer testing)
7. Post-mortem (why did it happen?)
8. Prevent (guardrails, monitoring)
```

---

## 📞 Escalation

| P1 (Critical) | P2 (High) | P3 (Medium) |
|---|---|---|
| System down | Features broken | Performance issue |
| Data loss | API errors | Minor bugs |
| Security breach | Users impacted | Non-blocking |
| → Contact on-call imediatamente | → 30 min response | → 4h response |

---

**Próximo**: Leia [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: Operations Team
