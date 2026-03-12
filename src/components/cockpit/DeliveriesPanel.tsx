"use client"
import React, { useState } from 'react'
import JSZip from 'jszip'
import { useMayaDeliveries, ProjectGroup, MayaFile } from '../../hooks/useMayaDeliveries'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Gera um nome curto e descritivo a partir do nome do projeto */
function shortProjectName(name: string): string {
  return name
    .replace(/[_\-]+/g, ' ')        // underscores/hífens → espaço
    .replace(/\s{2,}/g, ' ')        // espaços duplos
    .trim()
    .slice(0, 32)                   // máximo 32 chars
}

/** Nome de arquivo curto para zip */
function zipName(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^\w\-]/g, '').slice(0, 28) +
    '_' + new Date().toISOString().slice(0, 10) + '.zip'
}

/** Nome de arquivo curto para arquivo solto */
function singleFileName(path: string): string {
  const base = path.includes('/') ? path.split('/').pop()! : path
  // Mantém extensão, encurta stem se necessário
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  return stem.slice(0, 24) + (ext || '')
}

// ── download functions ────────────────────────────────────────────────────────

async function downloadZip(group: ProjectGroup) {
  const zip = new JSZip()
  for (const file of group.files) {
    const filename = file.path.includes('/') ? file.path.split('/').pop()! : file.path
    zip.file(filename, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, zipName(group.project_name))
}

function downloadFile(file: MayaFile) {
  const blob = new Blob([file.content], { type: 'text/plain' })
  triggerDownload(blob, singleFileName(file.path))
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Baixa automaticamente: ZIP se múltiplos arquivos, direto se único */
export async function autoDownloadGroup(group: ProjectGroup) {
  if (group.files.length === 1) {
    downloadFile(group.files[0])
  } else {
    await downloadZip(group)
  }
}

export function autoDownloadFile(file: MayaFile) {
  downloadFile(file)
}

// ── components ────────────────────────────────────────────────────────────────

function ProjectCard({ group, onDelete }: { group: ProjectGroup; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const multiFile = group.files.length > 1

  return (
    <div style={{
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 6,
      marginBottom: 8,
      background: 'rgba(0,212,255,0.03)',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00d4ff', fontFamily: 'Orbitron, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📦 {shortProjectName(group.project_name)}
          </div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
            {group.files.length} arquivo{group.files.length !== 1 ? 's' : ''}
            {' · '}
            <span style={{ color: '#475569' }}>{fmtDate(group.created_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); autoDownloadGroup(group) }}
            title={multiFile ? 'Baixar como ZIP' : 'Baixar arquivo'}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)',
              color: '#00d4ff', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {multiFile ? '⬇ ZIP' : '⬇'}
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              if (confirm(`Excluir “${shortProjectName(group.project_name)}” (${group.files.length} arquivo${group.files.length !== 1 ? 's' : ''})? Irreversível.`))
                onDelete()
            }}
            title="Excluir projeto"
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444', cursor: 'pointer', fontWeight: 600,
            }}
          >
            🗑
          </button>
          <span style={{ color: '#64748b', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* File list (expanded) */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', padding: '6px 10px 8px' }}>
          {group.files.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Share Tech Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {singleFileName(f.path)}
              </span>
              <button
                onClick={() => downloadFile(f)}
                style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                  background: 'transparent', border: '1px solid rgba(100,116,139,0.3)',
                  color: '#64748b', cursor: 'pointer',
                }}
              >
                ⬇
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LooseFileCard({ file, onDelete }: { file: MayaFile; onDelete: () => void }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', marginBottom: 6,
      border: '1px solid rgba(167,139,250,0.2)', borderRadius: 6,
      background: 'rgba(167,139,250,0.03)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'Share Tech Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📄 {singleFileName(file.path)}
        </div>
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
          {fmtDate(file.created_at)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => downloadFile(file)}
          title="Baixar arquivo"
          style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
            color: '#a78bfa', cursor: 'pointer', fontWeight: 600,
          }}
        >
          ⬇
        </button>
        <button
          onClick={() => {
            if (confirm(`Excluir “${singleFileName(file.path)}”? Irreversível.`))
              onDelete()
          }}
          title="Excluir arquivo"
          style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444', cursor: 'pointer', fontWeight: 600,
          }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export default function DeliveriesPanel() {
  const { projects, looseFiles, loading, deleteFile, deleteProject } = useMayaDeliveries()
  const isEmpty = projects.length === 0 && looseFiles.length === 0

  return (
    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
      {loading && (
        <div style={{ fontSize: 10, color: '#64748b', padding: '8px 0', textAlign: 'center' }}>Carregando...</div>
      )}
      {isEmpty && !loading && (
        <div style={{ fontSize: 10, color: '#475569', padding: '16px 0', textAlign: 'center' }}>
          Nenhuma entrega ainda.{' Peça ao MAYA para criar arquivos ou projetos.'}
        </div>
      )}
      {projects.map(g => (
        <ProjectCard key={g.project_name} group={g} onDelete={() => deleteProject(g.project_name)} />
      ))}
      {looseFiles.map(f => (
        <LooseFileCard key={f.id} file={f} onDelete={() => deleteFile(f.id)} />
      ))}
    </div>
  )
}


