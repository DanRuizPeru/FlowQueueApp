<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/shared/components/AppLayout.vue'
import { useAuthStore } from '@/iam/application/auth.store.js'
import { useLocationStore } from '@/location/application/location.store.js'
import { useQueueStore } from '@/queue/application/queue.store.js'
import { http } from '@/shared/services/http.js'

const router = useRouter()
const auth = useAuthStore()
const location = useLocationStore()
const queue = useQueueStore()

const search = ref('')
const selectedType = ref('Todas')
const creatingId = ref(null)
const searched = ref(false)
const selectedInstitution = ref(null)

const types = ['Todas', 'Documentos', 'Salud', 'Bancario', 'Municipal']
const palette = ['blue', 'green', 'orange', 'purple', 'blue', 'green']

onMounted(() => {
  location.loadCatalog()
})

function applySearch() {
  searched.value = true
}

const catalogCards = computed(() => {
  const institutions = location.instituciones.map((institution, index) => {
    const sedes = location.sedes.filter(
        sede => String(sede.institucionId ?? sede.institucion_id) === String(institution.id)
    )

    const servicios = location.servicios.filter(service =>
        sedes.some(sede => String(sede.id) === String(service.sedeId ?? service.sede_id))
    )

    const type =
        institution.tipo ??
        ['Documentos', 'Salud', 'Bancario', 'Tributario', 'Municipal', 'Documentos'][index % 6]

    return {
      ...institution,
      type,
      sedes,
      servicios,
      color: palette[index % palette.length],
      waiting: 12 + index * 4,
      queue: 12 + index * 5,
    }
  })

  return institutions.filter(item => {
    const query = search.value.trim().toLowerCase()
    const typeOk = selectedType.value === 'Todas' || item.type === selectedType.value

    const textOk =
        !query ||
        item.nombre?.toLowerCase().includes(query) ||
        item.descripcion?.toLowerCase().includes(query)

    return typeOk && textOk
  })
})

function openSedes(item) {
  // Buscamos la versión más reciente del item en nuestro computed para evitar datos viejos
  const freshItem = catalogCards.value.find(c => c.id === item.id)
  selectedInstitution.value = freshItem || item
}

function closeSedes() {
  selectedInstitution.value = null
}

async function generateTicket(institution, sede, service) {
  if (!sede || !service) return

  creatingId.value = `${sede.id}-${service.id}`

  try {
    const turns = await http.get(`/turnos?servicioId=eq.${service.id}`)
    const next = String(turns.length + 1).padStart(3, '0')

    const payload = {
      codigo: `${service.prefijo ?? 'A'}-${next}`,
      ciudadanoNombre: auth.user?.nombre ?? 'Alexander M.',
      ciudadanoDNI: auth.user?.dni ?? '76543210',
      servicioId: Number(service.id),
      mostradorId: null,
      sedeId: Number(sede.id),
      estado: 'en_espera',
      horaIngreso: new Date().toISOString(),
      horaLlamado: null,
      horaFin: null,
    }

    const created = await queue.createTicket(payload)

    localStorage.setItem('fq_active_ticket_id', created.id)
    closeSedes()
    router.push('/citizen/mis-turnos')
  } finally {
    creatingId.value = null
  }
}

function serviciosBySede(sedeId) {
  if (!location.servicios) return []
  return location.servicios.filter(
      service => String(service.sedeId ?? service.sede_id) === String(sedeId)
  )
}
</script>

<template>
  <AppLayout
      title="Buscar entidad"
      subtitle="Selecciona la institución, sede y trámite donde realizarás tu atención"
  >
    <section class="search-card card">
      <div class="search-row">
        <input
            v-model="search"
            placeholder="Buscar institución, trámite o entidad pública..."
            @keyup.enter="applySearch"
        />
        <button class="btn btn-primary" @click="applySearch">
          Buscar
        </button>
      </div>

      <div class="filters">
        <span>Filtrar por:</span>
        <button
            v-for="type in types"
            :key="type"
            class="filter-chip"
            :class="{ active: selectedType === type }"
            @click="selectedType = type"
        >
          {{ type }}
        </button>
      </div>
    </section>

    <p v-if="searched" class="search-result">
      {{ catalogCards.length }} entidades encontradas para tu búsqueda.
    </p>

    <section class="entity-grid">
      <article
          v-for="item in catalogCards"
          :key="item.id"
          class="entity-card card"
          :class="`card-${item.color}`"
      >
        <div class="entity-head">
          <div class="entity-icon">
            {{ item.nombre?.slice(0, 2).toUpperCase() }}
          </div>

          <div>
            <h3>{{ item.nombre }}</h3>
            <p>{{ item.descripcion }}</p>
          </div>
        </div>

        <div class="entity-line"></div>

        <div class="entity-meta">
          <span>{{ item.sedes.length }} sede(s) disponible(s)</span>
          <span class="available">Disponible</span>
        </div>

        <div class="entity-meta small">
          <span>{{ item.waiting }} min estimado</span>
          <span>{{ item.queue }} personas en cola</span>
        </div>

        <button class="entity-btn" @click="openSedes(item)">
          Ver sedes
        </button>
      </article>
    </section>

    <div v-if="selectedInstitution" class="modal-overlay">
      <section class="modal-card">
        <header class="modal-header">
          <div>
            <p class="modal-label">Sedes disponibles</p>
            <h2>{{ selectedInstitution.nombre }}</h2>
          </div>

          <button class="close-btn" @click="closeSedes">
            ×
          </button>
        </header>

        <div v-if="!selectedInstitution.sedes.length" class="empty-state">
          <h3>No hay sedes disponibles</h3>
          <p>Esta entidad aún no tiene sedes registradas.</p>
        </div>

        <div v-else class="sede-list">
          <article
              v-for="sede in selectedInstitution.sedes"
              :key="sede.id"
              class="sede-card"
          >
            <div class="sede-info">
              <h3>{{ sede.nombre }}</h3>
              <p>{{ sede.direccion }}</p>
              <span>{{ sede.distrito }}</span>
            </div>

            <div class="service-list">
              <button
                  v-for="service in serviciosBySede(sede.id)"
                  :key="service.id"
                  class="service-btn"
                  :disabled="creatingId === `${sede.id}-${service.id}`"
                  @click="generateTicket(selectedInstitution, sede, service)"
              >
                {{ creatingId === `${sede.id}-${service.id}` ? 'Generando...' : service.nombre }}
              </button>

              <p v-if="!serviciosBySede(sede.id).length" class="no-services">
                Esta sede no tiene servicios disponibles.
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.search-card {
  padding: 1rem;
  margin-bottom: 1rem;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: .75rem;
}

.search-row input {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: .65rem .9rem;
  font-size: .86rem;
  outline: none;
}

.search-row input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(29,111,233,.08);
}

.filters {
  display: flex;
  align-items: center;
  gap: .45rem;
  margin-top: .85rem;
  flex-wrap: wrap;
  font-size: .75rem;
  color: var(--text-muted);
}

.filter-chip {
  border: none;
  background: #eef2f7;
  color: var(--text-muted);
  padding: .35rem 1.15rem;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 700;
  cursor: pointer;
}

.filter-chip.active {
  background: #1d6fe9;
  color: white;
}

.search-result {
  margin: -.35rem 0 1rem;
  color: var(--text-muted);
  font-size: .82rem;
  font-weight: 700;
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.entity-card {
  padding: 1rem;
  border-top: 4px solid #1d6fe9;
}

.card-green {
  border-top-color: #22c55e;
}

.card-orange {
  border-top-color: #f59e0b;
}

.card-purple {
  border-top-color: #7c3aed;
}

.entity-head {
  display: flex;
  gap: .75rem;
  align-items: flex-start;
}

.entity-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  color: #1d4ed8;
  font-size: .8rem;
  font-weight: 900;
  flex-shrink: 0;
}

.entity-head h3 {
  font-size: .95rem;
  font-weight: 800;
}

.entity-head p {
  font-size: .72rem;
  color: var(--text-muted);
  margin-top: .15rem;
}

.entity-line {
  border-top: 1px solid var(--border);
  margin: .85rem 0;
}

.entity-meta {
  display: flex;
  justify-content: space-between;
  gap: .8rem;
  align-items: center;
  font-size: .75rem;
  color: var(--text-muted);
  margin-bottom: .55rem;
}

.entity-meta.small {
  font-size: .7rem;
}

.available {
  background: #dcfce7;
  color: #15803d;
  padding: .18rem .65rem;
  border-radius: 999px;
  font-weight: 700;
}

.entity-btn {
  width: 100%;
  margin-top: .4rem;
  border: none;
  background: #1d6fe9;
  color: white;
  border-radius: 7px;
  padding: .55rem;
  font-weight: 800;
  font-size: .78rem;
  cursor: pointer;
}

.entity-btn:hover {
  background: #155ec9;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, .58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  width: min(760px, 96vw);
  max-height: 88vh;
  overflow-y: auto;
  background: white;
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .28);
  padding: 1.4rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.modal-label {
  font-size: .72rem;
  color: var(--text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: .2rem;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text);
}

.close-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: var(--text);
  font-size: 1.45rem;
  line-height: 1;
  cursor: pointer;
}

.sede-list {
  display: flex;
  flex-direction: column;
  gap: .85rem;
}

.sede-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
  background: #fbfdff;
}

.sede-info h3 {
  font-size: .95rem;
  font-weight: 850;
  color: var(--text);
}

.sede-info p {
  margin-top: .25rem;
  font-size: .78rem;
  color: var(--text-muted);
}

.sede-info span {
  display: inline-block;
  margin-top: .45rem;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 999px;
  padding: .18rem .6rem;
  font-size: .7rem;
  font-weight: 800;
}

.service-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .55rem;
  margin-top: .9rem;
}

.service-btn {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 9px;
  padding: .65rem .75rem;
  font-size: .76rem;
  font-weight: 800;
  cursor: pointer;
  text-align: left;
}

.service-btn:hover {
  background: #dbeafe;
}

.service-btn:disabled {
  opacity: .6;
  cursor: wait;
}

.no-services {
  font-size: .76rem;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 14px;
}

.empty-state h3 {
  font-size: 1rem;
  font-weight: 900;
}

.empty-state p {
  margin-top: .3rem;
  color: var(--text-muted);
  font-size: .82rem;
}

@media (max-width: 1000px) {
  .entity-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .entity-grid,
  .search-row {
    grid-template-columns: 1fr;
  }

  .modal-card {
    padding: 1rem;
  }
}
</style>