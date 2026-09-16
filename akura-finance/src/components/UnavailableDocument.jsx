import { Card, Empty, Typography } from 'antd'

export default function UnavailableDocument({ title }) {
  return <section className="finance-page">
    <div className="finance-heading"><div><Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Text type="secondary">Akura Finance</Typography.Text></div></div>
    <Card><Empty description={<><Typography.Title level={4}>{title} is not available yet</Typography.Title>
      <Typography.Paragraph type="secondary">This module is ready for integration. Document data and actions will be available once the finance service supports {title.toLowerCase()}.</Typography.Paragraph></>} /></Card>
  </section>
}
