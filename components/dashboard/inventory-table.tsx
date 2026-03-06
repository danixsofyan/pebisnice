'use client'

import { useState } from 'react'
import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/formatters'
import Image from 'next/image'

interface Product {
  sku: string
  name: string
  image: string
  marketplaces: string[]
  category: string
  stock: number
  hpp: number
  price: number
}

const mockProducts: Product[] = [
  {
    sku: 'SKU-2024-NK01',
    name: 'Nike Air Max Blue',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyYg8BST_gDvQCSwN-gb5vppopbrRAo3Bc4K8ebOHk3IcMwyb83f-mJy4OTmApLjAcAwA9xQ-DLIeI6EFkoJVujk6Du0TL8umiJ-heh6R9SSaPFRD4R2tHWbq-WKD5S3Xz7TgkLnG92VvWVKy9iukkf4uUJwMslGaOIuGMxbwGf54vVyqAjgVVulB83NZr-qrNb95tVb0GWVYOJQTJtoi72DDxhqGYXHSZexaL4ZbREOxry8hOflczb0RlLWAK1xAwfg_jYvAFJqnr',
    marketplaces: ['Shopee', 'TikTok'],
    category: 'Sepatu Pria',
    stock: 85,
    hpp: 850000,
    price: 1250000,
  },
  {
    sku: 'SKU-2024-WT05',
    name: 'Quartz Minimalist Watch',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaNLIIBWUrYYJwLxRp44T0WnwkKHGH3e-lrUasvogSErbKBlDvW52gH9EaCBKL8dQQaLycnh23LNzatlq4ycLNnk3hKtHJkH3EdPf6iGV_uJqnqZ62lh7Wt9w66JUb2Kw5BiUY-SZzgvWDsZ-a8SrRTYTZqZHufE-F6pUMJPmQ9jiD5gCU_39i3l4In_f3MJdF7fJemvG-sRa7TiaaEhwwagDTMIL9HA2fNgGEqS2Om0DKmKiSRL4C8hnkLywpm_FCTV2KifyP3FfO',
    marketplaces: ['Tokopedia'],
    category: 'Aksesoris',
    stock: 4,
    hpp: 210000,
    price: 450000,
  },
  {
    sku: 'SKU-2024-SN12',
    name: 'Sony WH-1000XM4',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYUEnHW5tPBhy_nmXx6xlxNozGivMCR88Js7J8qOog9WcGMYYqUOaIyrgcuyXV-diEokCa9dGxg1kf9t4wlIvdrsjQGfXogTSwdag7YQdcBxMZxcYOyO_cUgOxIe-44EephgqPYAdcWMfLdaSWI5C7RsQNRtBNY6iLugsI5QgdNrT1VslIWSfQlzgk_RwUStI6R6yzruIhD96Mh5oL5SIOunjh51pOrAry5EKrjCawLPpaJo7JWiFckqb-WaD8cwzq0XDpXNEgZBV4',
    marketplaces: ['Lazada', 'Shopee'],
    category: 'Elektronik',
    stock: 22,
    hpp: 3150000,
    price: 4299000,
  },
  {
    sku: 'SKU-2024-RB09',
    name: 'Rayban Wayfarer Classic',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjiRgT8PpBEVtieceae7D7lfzNFnBD3SX5kqs5P8xgOqcCo2RIHiP1nZ97uw1e-4nmYTwKvCINNBb1GX33U_pORtolhjq1gDX0JylieGxFsMYEutuwZuOX2bSerjyvGCw4KevnubYH_JGKWdAthQbSH03_NSu2D0-XxYZssR6j7afy-MjgqOX4whsIcBymuc5IvzSZn9aUdRZ3fszndN8LieVXUu2DPr5SAFc7X-Ct2pjFEpCZLxvPQnvoPfuIAxGvFyKXjVl1IpcC',
    marketplaces: ['Shopee'],
    category: 'Aksesoris',
    stock: 0,
    hpp: 1550000,
    price: 2100000,
  },
]

export function InventoryTable() {
  const [products, setProducts] = useState(mockProducts)

  const getMarketplaceBadge = (marketplace: string) => {
    switch (marketplace) {
      case 'Shopee':
        return 'bg-orange-500'
      case 'TikTok':
        return 'bg-black'
      case 'Tokopedia':
        return 'bg-emerald-500'
      case 'Lazada':
        return 'bg-blue-800'
      default:
        return 'bg-slate-500'
    }
  }

  const handleHppChange = (sku: string, value: string) => {
    const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0
    setProducts(products.map(p => p.sku === sku ? { ...p, hpp: numericValue } : p))
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[180px]">Produk / SKU</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[120px]">Marketplace</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-center min-w-[80px]">Stok</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-primary/5 text-primary min-w-[140px]">HPP (Modal)</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-right min-w-[120px]">Harga Jual</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-right min-w-[100px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {products.map((p) => (
              <tr key={p.sku} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors", p.stock === 0 && "text-slate-400 opacity-60")}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <Image src={p.image} alt={p.name} width={36} height={36} className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate leading-tight">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.marketplaces.map(m => (
                      <span key={m} className={cn("px-1.5 py-0.5 rounded text-[8px] font-extrabold text-white uppercase", getMarketplaceBadge(m))}>
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "font-bold px-1.5 py-0.5 rounded-full text-[10px]",
                    p.stock === 0 ? "text-red-500 bg-red-500/10" : 
                    p.stock < 10 ? "text-orange-500 bg-orange-500/10" : 
                    "text-slate-700 dark:text-slate-200"
                  )}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3 bg-primary/5">
                  <div className="flex items-center gap-1">
                    <span className="text-primary font-bold text-[10px]">Rp</span>
                    <input 
                      type="text" 
                      value={p.hpp.toLocaleString('id-ID')}
                      onChange={(e) => handleHppChange(p.sku, e.target.value)}
                      className="w-full bg-transparent border-b border-primary/20 focus:border-primary text-primary font-bold text-xs outline-none px-1 py-0 transition-colors"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-xs">
                  {formatRupiah(p.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-all">
                      <Edit2 className="size-3.5" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-medium bg-slate-50/50 dark:bg-slate-800/30">
        <p className="text-slate-500 dark:text-slate-400">Menampilkan {products.length} dari 1.240 produk</p>
        <div className="flex gap-2">
          <button className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            <ChevronLeft className="size-3.5" />
          </button>
          <button className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
