interface PanelProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Panel({ title, children, className }: PanelProps) {
  return (
    <div className={`panel panel-pad${className ? ` ${className}` : ''}`}>
      {title && <div className="panel-title">{title}</div>}
      {children}
    </div>
  )
}
