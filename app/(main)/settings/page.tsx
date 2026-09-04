import { Store, Edit2, ShoppingCart, ShoppingBag, Smartphone } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="w-full max-w-5xl space-y-8 pb-12 md:mx-auto">
      <div className="mb-2 flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Pengaturan
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
            Total Toko Terhubung
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">12 Toko</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">Status API</p>
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-green-500"></span>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Aktif</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
            Paket Langganan
          </p>
          <p className="text-primary text-2xl font-bold">Enterprise</p>
        </div>
      </div>

      <div className="custom-scrollbar flex gap-8 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <a
          href="#profil"
          className="border-primary text-primary border-b-2 py-4 text-sm font-bold whitespace-nowrap"
        >
          Profil Toko
        </a>
        <a
          href="#integrasi"
          className="border-b-2 border-transparent py-4 text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200"
        >
          Integrasi Marketplace
        </a>
        <a
          href="#metode"
          className="border-b-2 border-transparent py-4 text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200"
        >
          Metode Perhitungan
        </a>
        <a
          href="#keamanan"
          className="border-b-2 border-transparent py-4 text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200"
        >
          Keamanan
        </a>
      </div>

      <div className="space-y-12">
        <section id="profil">
          <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">
            Profil Toko & Akun
          </h3>
          <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <Store className="size-10 text-slate-400" />
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Edit photo"
                >
                  <Edit2 className="size-6 text-white" />
                </button>
              </div>
              <div className="w-full flex-1 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
                      Nama Bisnis
                    </label>
                    <input
                      type="text"
                      defaultValue="Pebisnice Indonesia"
                      className="focus:ring-primary w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow outline-none focus:border-transparent focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
                      Mata Uang Utama
                    </label>
                    <select className="focus:ring-primary w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow outline-none focus:border-transparent focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
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
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Integrasi Marketplace
            </h3>
            <span className="hidden text-xs text-slate-500 italic sm:inline-block dark:text-slate-300">
              *Pembaruan otomatis setiap 15 menit
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ee4d2d]/20">
                  <ShoppingCart className="size-5 text-[#ee4d2d]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Shopee</p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                    Terhubung
                  </p>
                </div>
              </div>
              <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Putuskan
              </button>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-white/10">
                  <Smartphone className="size-5 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    TikTok Shop
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                    Terhubung
                  </p>
                </div>
              </div>
              <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Putuskan
              </button>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#42b549]/20">
                  <ShoppingBag className="size-5 text-[#42b549]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Tokopedia</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                    Belum Terhubung
                  </p>
                </div>
              </div>
              <button className="bg-primary hover:bg-opacity-90 text-primary-foreground shadow-primary/20 w-full rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-colors sm:w-auto">
                Hubungkan
              </button>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#000083]/10 dark:bg-[#000083]/20">
                  <Store className="size-5 text-[#000083] dark:text-[#4d4dff]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Lazada</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                    Belum Terhubung
                  </p>
                </div>
              </div>
              <button className="bg-primary hover:bg-opacity-90 text-primary-foreground shadow-primary/20 w-full rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-colors sm:w-auto">
                Hubungkan
              </button>
            </div>
          </div>
        </section>

        <section id="metode">
          <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">
            Pengaturan Metode Perhitungan
          </h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="space-y-4">
              <label className="border-primary bg-primary/5 dark:bg-primary/10 flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors">
                <input
                  type="radio"
                  name="calc_method"
                  defaultChecked
                  className="text-primary focus:ring-primary mt-1 size-4 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Berbasis Penghasilan (Default)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Laporan akan dihitung berdasarkan dana yang benar-benar masuk ke saldo/rekening
                    (settlement).
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition-colors hover:border-slate-200 dark:bg-slate-800/50 dark:hover:border-slate-700">
                <input
                  type="radio"
                  name="calc_method"
                  className="text-primary focus:ring-primary mt-1 size-4 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Berbasis Pesanan
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Laporan akan dihitung secara real-time berdasarkan pesanan yang masuk (gross
                    sales), termasuk yang belum selesai.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section id="keamanan" className="pb-4">
          <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">Keamanan</h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Google Login
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                    danixsofyan@gmail.com
                  </p>
                </div>
              </div>
              <button className="self-start text-xs font-bold text-slate-500 underline transition-colors hover:text-slate-900 sm:self-auto dark:text-slate-300 dark:hover:text-slate-200">
                Ganti Akun
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="bg-background-light dark:bg-background-dark sticky bottom-4 z-10 mt-8 -ml-4 flex w-[calc(100%+2rem)] flex-col-reverse justify-end gap-3 border-t border-slate-200 px-4 pt-8 pb-8 backdrop-blur-md sm:ml-0 sm:w-auto sm:flex-row sm:px-0 dark:border-slate-800">
        <button className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:mt-0 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          Batalkan Perubahan
        </button>
        <button className="bg-primary hover:bg-opacity-90 text-primary-foreground shadow-primary/20 z-20 w-full rounded-lg px-6 py-2.5 text-sm font-bold shadow-lg transition-all sm:w-auto">
          Simpan Pengaturan
        </button>
      </div>
    </div>
  )
}
