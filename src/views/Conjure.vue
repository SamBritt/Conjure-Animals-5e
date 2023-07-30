<script setup>
import { computed, ref } from 'vue';


const creatureClass = (type) => {
    const styles = [
        `flex`,
        `justify-center`,
        `items-center`,
        `h-1/3`,
        `hover:cursor-pointer`,
    ]

    switch (type) {
        case 'beast':
            styles.push('bg-green-200')
            break
        case 'elemental':
            styles.push('bg-red-200')
            break
        case 'fey':
            styles.push('bg-sky-200')
            break
    }
    return styles
}
</script>

<template>
    <div :class="creatureClass('beast')">
        <h2 class="text-2xl">
            Beast
        </h2>
    </div>
    <div :class="creatureClass('elemental')">
        <h2 class="text-2xl">
            Elemental
        </h2>
    </div>
    <div :class="creatureClass('fey')">
        <h2 class="text-2xl">
            Beast
        </h2>
    </div>
</template>
