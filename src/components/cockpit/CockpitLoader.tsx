'use client'
import dynamic from 'next/dynamic'

const JarvisCockpit = dynamic(
  () => import('./JarvisCockpit'),
  { ssr: false }
)

export default function CockpitLoader() {
  return <JarvisCockpit />
}
