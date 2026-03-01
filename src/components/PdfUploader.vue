<template>
  <div
    class="upload-zone rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer min-h-[220px] transition-all"
    :class="{ dragging: isDragging, 'opacity-60 cursor-not-allowed': disabled }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="!disabled && triggerInput()"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf"
      class="hidden"
      :disabled="disabled"
      @change="onFileChange"
    />

    <!-- No file loaded -->
    <template v-if="!file">
      <div class="text-5xl mb-4 select-none">📄</div>
      <p class="text-[var(--text-primary)] font-semibold text-base mb-1">{{ label }}</p>
      <p class="text-[var(--text-muted)] text-sm">Arrastra un PDF aquí o haz clic para seleccionar</p>
    </template>

    <!-- File loaded -->
    <template v-else>
      <div class="text-5xl mb-3 select-none">✅</div>
      <p class="text-[var(--accent-blue)] font-semibold text-base truncate max-w-full px-2">{{ file.name }}</p>
      <p class="text-[var(--text-muted)] text-xs mt-1">{{ fileSizeLabel }}</p>

      <a-button
        size="small"
        class="mt-4"
        danger
        @click.stop="clearFile"
      >
        Quitar archivo
      </a-button>
    </template>

    <!-- Loading progress -->
    <template v-if="loading">
      <a-progress
        class="mt-4 w-full"
        :percent="progress"
        status="active"
        :stroke-color="{ from: '#4f8ef7', to: '#7c5cbf' }"
      />
      <p class="text-[var(--text-muted)] text-xs mt-1">Extrayendo texto... {{ progress }}%</p>
    </template>

    <!-- Error -->
    <a-alert
      v-if="error"
      class="mt-3 w-full"
      type="error"
      :message="error"
      show-icon
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  label: { type: String, default: 'Cargar PDF' },
  loading: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  error: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['file-selected', 'file-cleared'])

const file = ref(null)
const isDragging = ref(false)
const fileInput = ref(null)

const fileSizeLabel = computed(() => {
  if (!file.value) return ''
  const size = file.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
})

function triggerInput() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const selected = e.target.files?.[0]
  if (selected && selected.type === 'application/pdf') {
    file.value = selected
    emit('file-selected', selected)
  }
}

function onDragOver() {
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e) {
  isDragging.value = false
  const dropped = e.dataTransfer.files?.[0]
  if (dropped && dropped.type === 'application/pdf') {
    file.value = dropped
    emit('file-selected', dropped)
  }
}

function clearFile() {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  emit('file-cleared')
}
</script>
