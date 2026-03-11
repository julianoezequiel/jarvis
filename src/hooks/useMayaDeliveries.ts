"use client"
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MayaFile {
  id: string
  path: string
  content: string
  project_name: string | null
  session_id: string | null
  created_at: string
}

export interface ProjectGroup {
  project_name: string
  files: MayaFile[]
  created_at: string
}

export interface DeliveriesState {
  projects: ProjectGroup[]
  looseFiles: MayaFile[]
  totalCount: number
  loading: boolean
}

export function useMayaDeliveries() {
  const [state, setState] = useState<DeliveriesState>({
    projects: [],
    looseFiles: [],
    totalCount: 0,
    loading: false,
  })

  const fetchDeliveries = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('jarvis_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !data) return

    const projects: Record<string, MayaFile[]> = {}
    const looseFiles: MayaFile[] = []

    for (const file of data as MayaFile[]) {
      if (file.project_name) {
        if (!projects[file.project_name]) projects[file.project_name] = []
        projects[file.project_name].push(file)
      } else {
        looseFiles.push(file)
      }
    }

    const projectGroups: ProjectGroup[] = Object.entries(projects).map(([name, files]) => ({
      project_name: name,
      files,
      created_at: files[0]?.created_at ?? '',
    }))

    const newTotal = data.length

    setState(prev => {
      if (newTotal > prev.totalCount && prev.totalCount > 0) {
        window.dispatchEvent(new CustomEvent('maya:new-delivery'))
      }
      return { projects: projectGroups, looseFiles, totalCount: newTotal, loading: false }
    })
  }, [])

  useEffect(() => {
    fetchDeliveries()
    const interval = setInterval(fetchDeliveries, 5000)
    return () => clearInterval(interval)
  }, [fetchDeliveries])

  const deleteFile = useCallback(async (id: string) => {
    if (!supabase) return false
    const { error } = await supabase.from('jarvis_files').delete().eq('id', id)
    if (!error) await fetchDeliveries()
    return !error
  }, [fetchDeliveries])

  const deleteProject = useCallback(async (projectName: string) => {
    if (!supabase) return false
    const { error } = await supabase.from('jarvis_files').delete().eq('project_name', projectName)
    if (!error) await fetchDeliveries()
    return !error
  }, [fetchDeliveries])

  return { ...state, refetch: fetchDeliveries, deleteFile, deleteProject }
}
