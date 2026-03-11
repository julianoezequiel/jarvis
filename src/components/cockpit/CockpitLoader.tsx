'use client'
import dynamic from 'next/dynamic'

const MayaCockpit = dynamic(
  () => import('./MayaCockpit'),
  { ssr: false }
)

export default function CockpitLoader() {
  return <MayaCockpit />
}
