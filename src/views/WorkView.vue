<template>
  <div class="board">
    <aside class="side"></aside>
    <main class="main">
      <p class="placeholder">업무일지 — 준비중</p>
    </main>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  height: 100%;
}

.side {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
