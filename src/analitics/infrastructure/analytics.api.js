export async function getMetricasHorarias(sedeId, fecha) {
  // Cambiamos '=' por '=eq.'
  return http.get(`/metricas_horarias?sede_id=eq.${sedeId}&fecha=eq.${fecha}`)
}

export async function getMostradores(sedeId) {
  // Supabase permite hacer "joins" directamente en la URL si las tablas están relacionadas
  // Esto es mucho más eficiente que hacer dos llamadas por separado
  const path = `/mostradores?sede_id=eq.${sedeId}&select=*,servicios(nombre)`
  const mostradores = await http.get(path)

  return mostradores.map(m => ({
    ...m,
    servicioNombre: m.servicios?.nombre ?? 'N/A',
  }))
}