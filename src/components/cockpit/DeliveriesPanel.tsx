"use client"
import React, { useState } from 'react'
import JSZip from 'jszip'
import { useMayaDeliveries, ProjectGroup, MayaFile } from '../../hooks/useMayaDeliveries'

async function downloadZip(group: ProjectGroup) {
  const zip = new JSZip()
  for (const file of group.files) {
    const filename = file.path.includes('/') ? file.path.split('/').pop()! : file.path
    zip.file(filename, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${group.project_name.replace(/\s+/g, '_')}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadFile(file: MayaFile) {
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path.includes('/') ? file.path.split('/').pop()! : file.path
  a.click()
  URL.revokeObjectURL(url)
}

function ProjectCard({ group, onDelete }: { group: ProjectGroup; onDelete: () => void }) {
  const [open, setOpen] = useState(false)

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
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00d4ff', fontFamily: 'Orbitron, sans-serif' }}>
            📦 {group.project_name}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            {group.files.length} arquivo{group.files.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); downloadZip(group) }}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)',
              color: '#00d4ff', cursor: 'pointer', fontWeight: 600,
            }}
          >
            ⬇ ZIP
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              const confirmed = confirm(`Excluir projeto "${group.project_name}" e todos os ${group.files.length} arquivo${group.files.length !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`)
              if (confirmed) onDelete()
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

      {/* File list */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', padding: '6px 10px 8px' }}>
          {group.files.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Share Tech Mono, monospace' }}>
                {f.path.includes('/') ? f.path.split('/').pop() : f.path}
              </span>
              <button
                onClick={() => downloadFile(f)}
                style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3,
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
      <div>
        <div style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'Share Tech Mono, monospace' }}>
          📄 {file.path.includes('/') ? file.path.split('/').pop() : file.path}
        </div>
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
          {new Date(file.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => downloadFile(file)}
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
            const name = file.path.includes('/') ? file.path.split('/').pop() : file.path
            const confirmed = confirm(`Excluir arquivo "${name}"? Esta ação não pode ser desfeita.`)
            if (confirmed) onDelete()
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
        <div style={{ fontSize: 10, color: '#64748b', padding: '8px 0', textAlign: 'center' }}>
          Carregando...
        </div>
      )}
      {isEmpty && !loading && (
        <div style={{ fontSize: 10, color: '#475569', padding: '16px 0', textAlign: 'center' }}>
          Nenhuma entrega ainda.{'\n'}
          Peça ao MAYA para criar arquivos ou projetos.
        </div>
      )}
      {projects.map(g => <ProjectCard key={g.project_name} group={g} onDelete={() => deleteProject(g.project_name)} />)}
      {looseFiles.map(f => <LooseFileCard key={f.id} file={f} onDelete={() => deleteFile(f.id)} />)}
    </div>
  )
}

