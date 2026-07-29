<template>
  <div class="board">
    <aside class="side"></aside>
    <main class="main">
      <p class="placeholder">환경설정 — 준비중</p>
    </main>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  height: 100%;
}

.side {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #ddd;
}

.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  color: #999;
  font-size: 14px;
}
</style>
