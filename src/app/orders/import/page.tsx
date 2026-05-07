import UniversalImportWizard from '@/components/UniversalImportWizard'

export const metadata = {
  title: '万能导入 - 订单中心',
}

export default function OrderImportPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>万能导入下单</h1>
        <p style={{ color: '#666', marginTop: '4px' }}>支持上传各类格式的 Excel 运单数据，自动识别并批量导入。</p>
      </div>
      
      <UniversalImportWizard />
    </div>
  )
}
