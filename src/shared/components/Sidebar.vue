<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/iam/application/auth.store.js'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

const citizenNav = [
  { label: 'Inicio',        icon: '🏠', to: '/citizen/buscar-entidad' },
  { label: 'Mis turnos',    icon: '🎫', to: '/citizen/mis-turnos' },
  { label: 'Buscar entidad',icon: '🔍', to: '/citizen/buscar-entidad' },
  { label: 'Notificaciones',icon: '🔔', to: '/citizen/notificaciones' },
  { label: 'Historial',     icon: '📄', to: '/citizen/historial' },
  { divider: true, label: 'CONFIGURACIÓN' },
  { label: 'Ajustes',       icon: '⚙️', to: '/citizen/ajustes' },
]

const operatorNav = [
  { label: 'Mi ventanilla', icon: '🖥️', to: '/operator' },
  { label: 'Cola activa',   icon: '📋', to: '/operator/cola' },
  { label: 'Pausar',        icon: '⏸️', to: '/operator/configuracion' },
  { label: 'Estadísticas',  icon: '📊', to: '/operator/estadisticas' },
  { label: 'Notificaciones',icon: '🔔', to: '/operator/notificaciones' },
]

const supervisorNav = [
  { label: 'Dashboard',  icon: '📊', to: '/supervisor' },
  { label: 'Analítica',  icon: '⚙️', to: '/supervisor/analitica' },
  { label: 'Sedes',      icon: '🏛️', to: '/supervisor/sedes' },
  { label: 'Servicios',  icon: '🛠️', to: '/supervisor/gestionar-turnos' },
  { label: 'Operadores', icon: '👥', to: '/supervisor/usuarios' },
  { label: 'Reportes',   icon: '📄', to: '/supervisor/reportes' },
]

const navItems = computed(() => {
  if (auth.user?.isOperator) return operatorNav
  if (auth.user?.isSupervisor) return supervisorNav
  return citizenNav
})

const roleTitle = computed(() => {
  if (auth.user?.isOperator) return 'OPERADOR'
  if (auth.user?.isSupervisor) return 'ADMINISTRADOR'
  return 'MENÚ PRINCIPAL'
})

const roleLabel = computed(() => {
  if (auth.user?.isOperator) return 'Ventanilla 3'
  if (auth.user?.isSupervisor) return 'Supervisor'
  return 'Citizen'
})

function isActive(item) {
  if (!item.to) return false
  if (item.to === '/operator' || item.to === '/supervisor') return route.path === item.to
  return route.path.startsWith(item.to)
}

function navigate(to) { router.push(to) }
function handleLogout() { auth.logout(); router.push('/login') }
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo" @click="navigate(auth.user?.isSupervisor ? '/supervisor' : auth.user?.isOperator ? '/operator' : '/citizen/buscar-entidad')">
      <div class="logo-icon">FQ</div>
      <span class="logo-name">FlowQueue</span>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">{{ roleTitle }}</div>
      <template v-for="item in navItems" :key="item.label">
        <div v-if="item.divider" class="nav-section divider-section">{{ item.label }}</div>
        <a v-else class="nav-item" :class="{ active: isActive(item) }" href="#" @click.prevent="navigate(item.to)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="user-avatar">{{ auth.user?.nombre?.charAt(0) ?? '?' }}</div>
      <div class="user-meta">
        <span class="user-name">{{ auth.user?.nombre }}</span>
        <span class="user-role">{{ roleLabel }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout" title="Cerrar sesión">⎋</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed; left: 0; top: 0; bottom: 0;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  display: flex; flex-direction: column;
  z-index: 100;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 0.65rem;
  padding: 1.05rem 1.25rem;
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0; cursor: pointer;
}
.logo-icon { width: 30px; height: 30px; background: #1d6fe9; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; color: #fff; }
.logo-name { font-size: 0.95rem; font-weight: 800; color: #fff; }
.sidebar-nav { flex: 1; padding: 0.85rem 0; display: flex; flex-direction: column; overflow-y: auto; }
.nav-section { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #738196; padding: 0.65rem 1.25rem 0.45rem; }
.divider-section { border-top: 1px solid var(--sidebar-border); margin-top: 0.7rem; padding-top: 0.95rem; }
.nav-item { display: flex; align-items: center; gap: 0.7rem; padding: 0.62rem 1.25rem; font-size: 0.84rem; font-weight: 500; color: var(--sidebar-text); text-decoration: none; cursor: pointer; transition: background 0.14s, color 0.14s; position: relative; }
.nav-item:hover { background: var(--sidebar-hover); color: #e5eefb; }
.nav-item.active { background: var(--sidebar-active); color: var(--sidebar-text-active); font-weight: 700; }
.nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #1d6fe9; }
.nav-icon { width: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.86rem; opacity: 0.9; }
.nav-label { flex: 1; }
.sidebar-footer { display: flex; align-items: center; gap: 0.65rem; padding: 0.95rem 1.25rem; border-top: 1px solid var(--sidebar-border); flex-shrink: 0; background: rgba(0,0,0,0.12); }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1d6fe9; color: #fff; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.user-name { font-size: 0.76rem; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.65rem; color: #8ca0b8; margin-top: 2px; }
.logout-btn { background: transparent; border: none; color: #8ca0b8; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0; }
.logout-btn:hover { color: #ef4444; }
</style>
