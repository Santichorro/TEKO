import { useState, type ReactNode } from 'react'

interface Tab {
  value: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultValue?: string
}

export function Tabs({ tabs, defaultValue }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value)

  return (
    <div>
      <div role="tablist" className="flex border-2 border-ink">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active === tab.value}
            onClick={() => setActive(tab.value)}
            className={`label flex-1 px-4 py-2.5 border-r-2 border-ink last:border-r-0 focus-visible:outline-none focus-visible:bg-accent focus-visible:text-surface ${
              active === tab.value ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-ink/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {tabs.find((t) => t.value === active)?.content}
      </div>
    </div>
  )
}