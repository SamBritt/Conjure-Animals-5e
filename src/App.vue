<script setup>
import { RouterLink, RouterView } from 'vue-router'
import Button from '@/components/Button.vue'
</script>

<template>
  <header>
    <nav class="flex justify-center gap-4 py-4">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/conjure">Conjure</RouterLink>
      <RouterLink to="/battle">Battle</RouterLink>
    </nav>
  </header>
  <main class="h-screen bg-gray-700">
    

    <RouterView />
  </main>
</template>

<style scoped></style>
