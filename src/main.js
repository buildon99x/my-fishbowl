import './styles/index.css';

const SELECTORS = {
  app: '#app',
  counter: '#counter',
};

const state = {
  count: 0,
};

function renderApp(root) {
  root.innerHTML = `
    <main class="container">
      <h1>간단 웹앱 하네스</h1>
      <p>기본 화면, 상태, 이벤트 구조가 준비되었습니다.</p>
      <button id="counter">클릭: ${state.count}</button>
    </main>
  `;
}

function updateCounter(button) {
  state.count += 1;
  button.textContent = `클릭: ${state.count}`;
}

function bindEvents(root) {
  const button = root.querySelector(SELECTORS.counter);

  button.addEventListener('click', () => {
    updateCounter(button);
  });
}

function initApp() {
  const app = document.querySelector(SELECTORS.app);

  renderApp(app);
  bindEvents(app);
}

initApp();
