export const URUT_STATUS = ['todo', 'proses', 'menunggu', 'selesai']
export const STATUS_TUGAS = { todo: 'Akan dikerjakan', proses: 'Sedang dikerjakan', menunggu: 'Menunggu / terkendala', selesai: 'Selesai' }
export const PRIORITAS = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' }
export const terlambatTugas = (t, hari) => t.status !== 'selesai' && !!t.tenggat && t.tenggat < hari
