<template>
  <aside class="sidebar">
    <ul>
      <li><router-link to="/home">Home</router-link></li>
      <li><router-link to="/library">Library</router-link></li>
      <li><router-link to="/friends">Friends</router-link></li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
</script>

<style scoped>
.sidebar {
  width: 200px;
  background-color: #f4f4f4;
  padding: 1rem;
  height: 100vh;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  margin-bottom: 1rem;
}
</style>
