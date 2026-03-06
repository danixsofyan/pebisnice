'use client'

import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/formatters'

interface TransactionDetail {
  serviceFee: number
  processingFee: number
  amsMarketing: number
  voucherDiscount: number
}

interface Transaction {
  id: string
  date: string
  channel: 'Shopee' | 'TikTok Shop' | 'Tokopedia' | 'Lazada'
  status: 'Selesai' | 'Diproses' | 'Dibatalkan'
  price: number
  discount: number
  hpp: number
  profit: number
  details?: TransactionDetail
}

const mockTransactions: Transaction[] = [
  {
    id: '#231012SHP001',
    date: '12 Okt 2023, 14:20',
    channel: 'Shopee',
    status: 'Selesai',
    price: 150000,
    discount: 12000,
    hpp: 85000,
    profit: 53000,
  },
  {
    id: '#231012TK015',
    date: '12 Okt 2023, 15:45',
    channel: 'TikTok Shop',
    status: 'Diproses',
    price: 210000,
    discount: 18500,
    hpp: 120000,
    profit: 71500,
    details: {
      serviceFee: 8400,
      processingFee: 3100,
      amsMarketing: 5000,
      voucherDiscount: 2000,
    },
  },
  {
    id: '#231012TKP088',
    date: '12 Okt 2023, 16:10',
    channel: 'Tokopedia',
    status: 'Dibatalkan',
    price: 450000,
    discount: 0,
    hpp: 0,
    profit: 0,
  },
]

export function TransactionTable() {
  const [expandedId, setExpandedId] = useState<string | null>('#231012TK015')

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getChannelStyle = (channel: Transaction['channel']) => {
    switch (channel) {
      case 'Shopee':
        return 'bg-orange-500'
      case 'TikTok Shop':
        return 'bg-black'
      case 'Tokopedia':
        return 'bg-emerald-500'
      case 'Lazada':
        return 'bg-blue-800'
      default:
        return 'bg-slate-500'
    }
  }

  const getStatusStyle = (status: Transaction['status']) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'Diproses':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Dibatalkan':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="dark:bg-slate-900/40 dark:border-slate-800 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="dark:bg-slate-800/50 dark:border-slate-800 border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Channel</th>
                <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Harga</th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Potongan</th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">HPP</th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Profit</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mockTransactions.map((tx) => (
                <React.Fragment key={tx.id}>
                  <tr 
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer",
                      expandedId === tx.id && "bg-primary/[0.03] dark:bg-primary/[0.05] border-l-4 border-l-primary"
                    )}
                    onClick={() => toggleExpand(tx.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{tx.id}</span>
                        <span className="text-[10px] text-slate-500">{tx.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("size-6 rounded flex items-center justify-center text-[10px] font-bold text-white", getChannelStyle(tx.channel))}>
                          {tx.channel[0]}
                        </div>
                        <span className="text-sm">{tx.channel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border", getStatusStyle(tx.status))}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">{formatRupiah(tx.price)}</td>
                    <td className="px-6 py-4 text-right text-sm text-rose-500">-{formatRupiah(tx.discount)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-400">{formatRupiah(tx.hpp)}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-emerald-500">{formatRupiah(tx.profit)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 transition-transform group-hover:text-primary" style={{ transform: expandedId === tx.id ? 'rotate(180deg)' : 'none' }}>
                        <ChevronDown className="size-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {expandedId === tx.id && tx.details && (
                    <tr className="bg-primary/[0.02] dark:bg-primary/[0.04]">
                      <td className="px-6 py-6 border-b border-slate-100 dark:border-slate-800" colSpan={8}>
                        <div className="flex flex-col gap-4">
                          <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">Rincian Potongan Marketplace</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Biaya Layanan</p>
                              <p className="text-sm font-bold text-rose-500">-{formatRupiah(tx.details.serviceFee)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Biaya Proses</p>
                              <p className="text-sm font-bold text-rose-500">-{formatRupiah(tx.details.processingFee)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">AMS Marketing</p>
                              <p className="text-sm font-bold text-rose-500">-{formatRupiah(tx.details.amsMarketing)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Potongan Voucher</p>
                              <p className="text-sm font-bold text-rose-500">-{formatRupiah(tx.details.voucherDiscount)}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <p className="text-xs text-slate-500 font-medium">Menampilkan 1-10 dari 1.250 Transaksi</p>
        <div className="flex items-center gap-1">
          <button className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">1</button>
          <button className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">2</button>
          <button className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">3</button>
          <span className="mx-1 text-slate-500">...</span>
          <button className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">125</button>
          <button className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}


