<script setup lang="ts">
import Counter from './Counter.vue'
import CheckIcon from '../assets/check.svg?component'
import CancelIcon from '../assets/cancel.svg?component'

const emits = defineEmits(['increase', 'decrease', 'submit', 'cancel'])

</script>

<template>
    <div class="flex">
        <div class="p-4">
            <h4 class="text-center mb-2">
                <slot />
            </h4>
            <Counter
                @increase="(count: any) =>emits('increase', count)"
                @decrease="(count: any) => emits('decrease', count)" />
        </div>

        <div class="">
            <button
            @click="emits('submit')"
            class="flex items-center justify-center p-2 bg-emerald-300 hover:bg-emerald-400 transition-all ease w-9 h-1/2 rounded-tr-md">
            <CheckIcon class="fill-white" />
            </button>

            <button
            @click="emits('cancel')"
            class="flex items-center justify-center p-2 bg-rose-400 hover:bg-rose-500 transition-all ease w-9 h-1/2 rounded-br-md">
            <CancelIcon class="fill-white" />
            </button>
        </div>
    </div>
</template>