'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ambil data tabel + update otomatis (realtime) saat ada perubahan
export function useTable(table, { order = 'id', asc = true } = {}) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending: asc }).limit(5000)
    if (error) setError(error.message)
    else { setError(''); setRows(data || []) }
    setLoading(false)
  }, [table, order, asc])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => load())
      .subscribe()
    // cadangan bila realtime tidak aktif: muat ulang saat tab dibuka kembali dan tiap 30 detik
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(load, 30000)
    return () => {
      supabase.removeChannel(ch)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [load, table])

  return { rows, error, loading, reload: load }
}
