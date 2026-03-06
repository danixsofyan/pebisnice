import { 
  Store, 
  Edit2, 
  ShoppingCart, 
  ShoppingBag, 
  Smartphone
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="max-w-5xl md:mx-auto w-full space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Pengaturan</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <p className="text-slate-500 dark:text-slate-300 text-sm font-medium mb-1">Total Toko Terhubung</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">12 Toko</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <p className="text-slate-500 dark:text-slate-300 text-sm font-medium mb-1">Status API</p>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Aktif</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <p className="text-slate-500 dark:text-slate-300 text-sm font-medium mb-1">Paket Langganan</p>
          <p className="text-2xl font-bold text-primary">Enterprise</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-8 overflow-x-auto custom-scrollbar">
        <a href="#profil" className="py-4 border-b-2 border-primary text-primary font-bold text-sm whitespace-nowrap">Profil Toko</a>
        <a href="#integrasi" className="py-4 border-b-2 border-transparent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-sm whitespace-nowrap">Integrasi Marketplace</a>
        <a href="#metode" className="py-4 border-b-2 border-transparent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-sm whitespace-nowrap">Metode Perhitungan</a>
        <a href="#keamanan" className="py-4 border-b-2 border-transparent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-sm whitespace-nowrap">Keamanan</a>
      </div>

      <div className="space-y-12">
        <section id="profil">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Profil Toko & Akun</h3>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="size-24 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative group overflow-hidden shrink-0">
                <Store className="size-10 text-slate-400" />
                <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" aria-label="Edit photo">
                  <Edit2 className="text-white size-6" />
                </button>
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Nama Bisnis</label>
                    <input type="text" defaultValue="Pebisnice Indonesia" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none px-3 py-2 text-slate-900 dark:text-slate-100 transition-shadow" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Mata Uang Utama</label>
                    <select className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none px-3 py-2 text-slate-900 dark:text-slate-100 transition-shadow">
                      <option>IDR - Rupiah Indonesia</option>
                      <option>USD - US Dollar</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="integrasi">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Integrasi Marketplace</h3>
            <span className="text-xs text-slate-500 dark:text-slate-300 italic hidden sm:inline-block">*Pembaruan otomatis setiap 15 menit</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-[#ee4d2d]/20 flex items-center justify-center shrink-0">
                  <ShoppingCart className="text-[#ee4d2d] size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Shopee</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Terhubung</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors w-full sm:w-auto">Putuskan</button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Smartphone className="text-slate-900 dark:text-white size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">TikTok Shop</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Terhubung</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors w-full sm:w-auto">Putuskan</button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-[#42b549]/20 flex items-center justify-center shrink-0">
                  <ShoppingBag className="text-[#42b549] size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Tokopedia</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Belum Terhubung</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-primary hover:bg-opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-colors w-full sm:w-auto shadow-sm shadow-primary/20">Hubungkan</button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-[#000083]/10 dark:bg-[#000083]/20 flex items-center justify-center shrink-0">
                  <Store className="text-[#000083] dark:text-[#4d4dff] size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Lazada</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Belum Terhubung</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-primary hover:bg-opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-colors w-full sm:w-auto shadow-sm shadow-primary/20">Hubungkan</button>
            </div>

          </div>
        </section>

        <section id="metode">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Pengaturan Metode Perhitungan</h3>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="space-y-4">
              <label className="flex items-start gap-4 p-4 border-2 border-primary bg-primary/5 dark:bg-primary/10 rounded-xl cursor-pointer transition-colors">
                <input type="radio" name="calc_method" defaultChecked className="mt-1 size-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950" />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Berbasis Penghasilan (Default)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Laporan akan dihitung berdasarkan dana yang benar-benar masuk ke saldo/rekening (settlement).</p>
                </div>
              </label>
              
              <label className="flex items-start gap-4 p-4 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl cursor-pointer transition-colors shadow-sm">
                <input type="radio" name="calc_method" className="mt-1 size-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950" />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Berbasis Pesanan</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Laporan akan dihitung secara real-time berdasarkan pesanan yang masuk (gross sales), termasuk yang belum selesai.</p>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section id="keamanan" className="pb-4">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Keamanan</h3>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Google Login</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">danixsofyan@gmail.com</p>
                </div>
              </div>
              <button className="text-xs font-bold text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200 underline transition-colors self-start sm:self-auto">Ganti Akun</button>
            </div>
          </div>
        </section>

      </div>

      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-4 bg-background-light dark:bg-background-dark pb-8 backdrop-blur-md z-10 w-[calc(100%+2rem)] -ml-4 px-4 sm:w-auto sm:ml-0 sm:px-0">
        <button className="px-6 py-2.5 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto mt-4 sm:mt-0">Batalkan Perubahan</button>
        <button className="px-6 py-2.5 bg-primary hover:bg-opacity-90 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all w-full sm:w-auto z-20">Simpan Pengaturan</button>
      </div>

    </div>
  )
}
