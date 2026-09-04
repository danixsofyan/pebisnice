import PDFDocument from 'pdfkit'
import { formatRupiahFromDecimal } from '@/lib/formatters'

export interface ProfitLossPdfInput {
  businessName: string
  period: { start: string; end: string }
  pl: {
    marketplaceRevenue: string
    posRevenue: string
    revenue: string
    cogs: string
    grossProfit: string
    platformFees: string
    operatingExpenses: string
    netProfit: string
    grossMarginBasisPoints: number
    netMarginBasisPoints: number
  }
  expensesByCategory: Array<{ category: string; amount: string }>
}

const CATEGORY_LABEL: Record<string, string> = {
  rent: 'Sewa',
  salary: 'Gaji',
  utility: 'Utilitas',
  marketing: 'Pemasaran',
  shipping: 'Pengiriman',
  supply: 'Perlengkapan',
  tax: 'Pajak',
  other: 'Lainnya',
}

function pct(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`
}

export function buildProfitLossPdf(input: ProfitLossPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const width = right - left

    const row = (label: string, value: string, bold = false) => {
      const y = doc.y
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11)
      doc.text(label, left, y, { width: width - 140 })
      doc.text(value, left, y, { width, align: 'right' })
      doc.moveDown(0.4)
    }

    const rule = () => {
      doc.moveDown(0.2)
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.4)
    }

    doc.font('Helvetica-Bold').fontSize(18).text(input.businessName)
    doc.font('Helvetica').fontSize(12).fillColor('#444444').text('Laporan Laba-Rugi')
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(`Periode ${input.period.start} s/d ${input.period.end}`)
    doc.fillColor('#000000').moveDown(1)

    const { pl } = input
    row('Pendapatan marketplace', formatRupiahFromDecimal(pl.marketplaceRevenue))
    row('Pendapatan kasir (POS)', formatRupiahFromDecimal(pl.posRevenue))
    row('Total pendapatan', formatRupiahFromDecimal(pl.revenue), true)
    rule()
    row('Harga pokok penjualan (HPP)', formatRupiahFromDecimal(pl.cogs))
    row(
      `Laba kotor  (margin ${pct(pl.grossMarginBasisPoints)})`,
      formatRupiahFromDecimal(pl.grossProfit),
      true
    )
    rule()
    row('Biaya platform', formatRupiahFromDecimal(pl.platformFees))
    row('Biaya operasional', formatRupiahFromDecimal(pl.operatingExpenses))
    row(
      `Laba bersih  (margin ${pct(pl.netMarginBasisPoints)})`,
      formatRupiahFromDecimal(pl.netProfit),
      true
    )

    doc.moveDown(1.2)
    doc.font('Helvetica-Bold').fontSize(12).text('Rincian biaya operasional')
    doc.moveDown(0.4)
    if (input.expensesByCategory.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#666666')
        .text('Tidak ada pengeluaran pada periode ini.')
      doc.fillColor('#000000')
    } else {
      for (const item of input.expensesByCategory) {
        row(CATEGORY_LABEL[item.category] ?? item.category, formatRupiahFromDecimal(item.amount))
      }
    }

    doc.moveDown(2)
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#999999')
      .text(`Dibuat oleh Pebisnice pada ${input.period.end}`, left, doc.y, {
        width,
        align: 'center',
      })

    doc.end()
  })
}
