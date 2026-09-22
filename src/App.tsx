import { useState } from 'react'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Select } from './components/ui/Select'
import { Badge } from './components/ui/Badge'
import { Avatar } from './components/ui/Avatar'

import { supabase } from './lib/supabase';

supabase.from('teams').select('*').then(({ data, error }) => {
  console.log({ data, error });
});

function App() {
  const [name, setName] = useState('')

  return (
    <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
      <h1 className="font-display text-3xl mb-1">TEKO — sistema visual</h1>
      <p className="label opacity-60 mb-10">Página de prueba /// Día 2</p>

      <div className="max-w-md flex flex-col gap-6">
        <div className="flex gap-3">
          <Button variant="primary">Guardar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="accent">Crear</Button>
        </div>

        <Input
          label="Nombre del proyecto"
          placeholder="Ej. Rediseño landing"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Select
          label="Responsable"
          placeholder="Selecciona un responsable"
          options={[
            { value: 'santiago', label: 'Santiago' },
            { value: 'carol', label: 'Carol' },
          ]}
        />

        <div className="flex items-center gap-3">
          <Badge variant="accent">Urgente</Badge>
          <Badge variant="outline">Backlog</Badge>
          <Avatar name={name || 'Santiago Gómez'} />
        </div>
      </div>
    </main>
  )
}

export default App