// OPSIONAL - salin pengajuan relawan ke Google Sheet.
// 1. Buka Google Sheet baru > Extensions > Apps Script > tempel kode ini > Save.
// 2. Deploy > New deployment > Type: Web app > Execute as: Me > Who has access: Anyone > Deploy.
// 3. Salin URL Web app, isi ke variabel NEXT_PUBLIC_SHEETS_WEBHOOK di Vercel, lalu Redeploy.
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Pengajuan') || ss.insertSheet('Pengajuan');
  var cols = ['program','nama_pengaju','no_telp','organisasi','alamat_pengaju','nama_pondok','jenis','kota',
              'alamat_pondok','jumlah_penghuni','pimpinan','konsumsi_beras_kg','kategori','story','rekomendasi',
              'latitude','longitude','lokasi_maps','foto_urls','dokumen_santri'];
  if (sh.getLastRow() === 0) sh.appendRow(['waktu'].concat(cols));
  sh.appendRow([new Date()].concat(cols.map(function (c) { return d[c] == null ? '' : d[c]; })));
  return ContentService.createTextOutput('ok');
}
